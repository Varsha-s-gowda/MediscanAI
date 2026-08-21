import time
import os
import io
import json
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import numpy as np
from typing import List, Dict, Any, Optional

# Modular imports
from config import API_VERSION, CONFIDENCE_THRESHOLD, MODEL_PATH
from constants import DISEASE_CLASSES
from device import get_device
from logger import get_logger, get_memory_usage
from predict import InferenceEngine
from ocr.extract_text import MedicalReportOCR
from report_analysis.report_analyzer import MedicalReportAnalyzer

import database
import report_analyzer

logger = get_logger("app")

# Initialize database
database.seed_default_doctor()

# Initialize FastAPI App
app = FastAPI(
    title="MediScan AI Engine",
    description="Production-grade Chest X-Ray disease classifier and medical OCR parsing system.",
    version=API_VERSION,
)

# Robust CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mediscan-ai-delta.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Thread-safe Single Instance Inference Engine & OCR
inference_engine = InferenceEngine()
ocr_processor = MedicalReportOCR()

# --------------------------------------------
# Middleware for Request Timing & Performance Tracking
# --------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.info(f"Incoming request: {request.method} {request.url.path} | RAM: {get_memory_usage()}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f} sec"
        logger.info(f"Completed request: {request.method} {request.url.path} in {process_time:.4f}s")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Failed request: {request.method} {request.url.path} - Error: {e} - Time: {process_time:.4f}s")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Internal Server Error: {str(e)}"}
        )

# --------------------------------------------
# Helper: Image Validation
# --------------------------------------------
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"]

def validate_image_file(file: UploadFile):
    """Validates the uploaded file size and extension type."""
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only JPEG and PNG are allowed."
        )

def is_xray(img: Image.Image) -> bool:
    """Accept all uploaded images and let the AI model determine the content.
    Previous channel-diff heuristic was rejecting real X-rays (TB, COVID-19)
    that were JPEG-encoded or had slight color channel variation."""
    return True

# --------------------------------------------
# API Endpoints
# --------------------------------------------
@app.get("/", tags=["General"])
async def root():
    return {"message": "MediScan AI Backend running with FastAPI"}

@app.get("/health", tags=["General"])
async def health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "memory": get_memory_usage(),
        "device": str(get_device())
    }

@app.get("/version", tags=["General"])
async def get_version():
    return {"version": API_VERSION}

@app.get("/classes", tags=["Model"])
async def get_classes():
    return {"classes": inference_engine.classes}

@app.get("/model-info", tags=["Model"])
async def model_info():
    return {
        "model_name": "DenseNet121 / ResNet50 (Auto-Loaded)",
        "weights_path": MODEL_PATH,
        "input_shape": [3, 224, 224],
        "device": str(inference_engine.device)
    }

@app.get("/metrics", tags=["Model"])
async def get_metrics():
    metrics_path = "metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {"message": "No historical evaluation metrics found. Please run evaluate.py first."}

@app.post("/predict", tags=["Inference"])
async def predict(image: UploadFile = File(...)):
    validate_image_file(image)
    
    # Read file
    contents = await image.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size too large. Limit is 10MB."
        )
        
    try:
        image_pil = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image file."
        )

    # Chest X-Ray Check
    if not is_xray(image_pil):
        return {
            "prediction": "Invalid image / Not an X-ray",
            "confidence": 0.0,
            "severity": "Low",
            "top_predictions": [],
            "heatmap": "",
            "processing_time": "0.00 sec"
        }

    # Run Prediction
    try:
        prediction_result = inference_engine.predict(image_pil)
        
        # Save files physically and add URL paths
        gradcam_image_url = None
        gradcam_heatmap_url = None
        original_image_url = None
        gradcam_error = None
        
        uploads_dir = os.path.join(os.path.dirname(__file__), "static", "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        
        timestamp = int(time.time())
        original_filename = f"public_{timestamp}_original.png"
        original_path = os.path.join(uploads_dir, original_filename)
        
        try:
            image_pil.save(original_path)
            original_image_url = f"/static/uploads/{original_filename}"
        except Exception as img_err:
            logger.error(f"Failed to save original image: {img_err}")
            
        if prediction_result.get("success"):
            heatmap_b64 = prediction_result.get("heatmap")
            heatmap_only_b64 = prediction_result.get("heatmap_only")
            
            if heatmap_b64 and heatmap_only_b64:
                try:
                    import base64
                    
                    heatmap_filename = f"gradcam_heatmap_public_{timestamp}.png"
                    overlay_filename = f"gradcam_overlay_public_{timestamp}.png"
                    
                    heatmap_path = os.path.join(uploads_dir, heatmap_filename)
                    overlay_path = os.path.join(uploads_dir, overlay_filename)
                    
                    h_clean = heatmap_only_b64
                    if "," in h_clean:
                        h_clean = h_clean.split(",")[1]
                    o_clean = heatmap_b64
                    if "," in o_clean:
                        o_clean = o_clean.split(",")[1]
                        
                    with open(heatmap_path, "wb") as h_buffer:
                        h_buffer.write(base64.b64decode(h_clean))
                    with open(overlay_path, "wb") as o_buffer:
                        o_buffer.write(base64.b64decode(o_clean))
                        
                    gradcam_heatmap_url = f"/static/uploads/{heatmap_filename}"
                    gradcam_image_url = f"/static/uploads/{overlay_filename}"
                except Exception as gc_save_err:
                    logger.error(f"Failed to save Grad-CAM physical files: {gc_save_err}")
                    gradcam_error = f"Grad-CAM generation failed: {str(gc_save_err)}"
            else:
                gradcam_error = "Grad-CAM generation failed: Heatmap not generated"
        else:
            gradcam_error = "Grad-CAM generation failed: Prediction unsuccessful"
            
        prediction_result["gradcam_image"] = gradcam_image_url
        prediction_result["gradcam_heatmap"] = gradcam_heatmap_url
        prediction_result["original_image"] = original_image_url
        if gradcam_error:
            prediction_result["gradcam_error"] = gradcam_error
            
        return prediction_result
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference computation failed: {str(e)}"
        )

@app.post("/predict/batch", tags=["Inference"])
async def predict_batch(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        validate_image_file(file)
        contents = await file.read()
        try:
            image = Image.open(io.BytesIO(contents)).convert("RGB")
            if not is_xray(image):
                results.append({
                    "filename": file.filename,
                    "error": "Not an X-ray image"
                })
            else:
                pred = inference_engine.predict(image)
                results.append({
                    "filename": file.filename,
                    "prediction": pred["prediction"],
                    "confidence": pred["confidence"],
                    "severity": pred["severity"]
                })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    return {"batch_results": results}

@app.post("/heatmap", tags=["Inference"])
async def generate_heatmap_endpoint(image: UploadFile = File(...)):
    validate_image_file(image)
    contents = await image.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        pred = inference_engine.predict(image)
        return {
            "heatmap": pred["heatmap"],
            "heatmap_only": pred["heatmap_only"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/ocr", tags=["OCR"])
async def perform_ocr(image: UploadFile = File(...)):
    validate_image_file(image)
    contents = await image.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        ocr_result = ocr_processor.extract_text(image)
        return ocr_result
    except Exception as e:
        logger.error(f"OCR failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR execution failed: {str(e)}"
        )

@app.post("/api/reports/analyze", tags=["OCR"])
async def public_report_analyze(file: UploadFile = File(...)):
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in [".png", ".jpg", ".jpeg", ".pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and PDF are allowed."
        )
    contents = await file.read()
    try:
        report_analyzer_mod = MedicalReportAnalyzer()
        res = report_analyzer_mod.analyze_report(contents, file.filename, file.content_type)
        return {
            "success": True,
            "reportFindings": res["findings"],
            "reportSummary": res["summary"]
        }
    except Exception as e:
        logger.error(f"Public report analysis failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report analysis failed: {str(e)}"
        )



# --------------------------------------------
# Doctor Auth Endpoints
# --------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str

@app.post("/api/auth/login", tags=["Auth"])
async def login(req: LoginRequest):
    valid = database.verify_doctor(req.username, req.password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    doc_name = database.get_doctor_name(req.username)
    return {"token": f"mock-jwt-token-{req.username}", "name": doc_name}

@app.post("/api/auth/register", tags=["Auth"])
async def register(req: RegisterRequest):
    success = database.register_doctor(req.username, req.password, req.name)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    return {"message": "Doctor registered successfully"}

# --------------------------------------------
# Patient Management Endpoints
# --------------------------------------------
class PatientCreateRequest(BaseModel):
    name: str
    age: int
    gender: str
    contact: Optional[str] = None

@app.get("/api/patients", tags=["Patients"])
async def get_patients():
    return database.get_all_patients()

@app.post("/api/patients", tags=["Patients"])
async def create_patient(patient: PatientCreateRequest):
    try:
        return database.create_patient(patient.name, patient.age, patient.gender, patient.contact)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.get("/api/patients/{patient_id}", tags=["Patients"])
async def get_patient_details(patient_id: str):
    p = database.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return p

def get_longitudinal_summary(history: list) -> dict:
    xrays = [h for h in history if h.get("analysisType") == "Chest X-Ray" or h.get("fileType") == "Chest X-Ray"]
    reports = [h for h in history if h.get("analysisType") == "Medical Report" or h.get("fileType") == "Medical Report"]
    
    # X-ray summary
    xray_part = None
    if xrays:
        latest_xray = next((x for x in xrays if x.get("prediction")), None)
        if latest_xray:
            pred = latest_xray.get("prediction")
            if pred.lower() == "normal":
                xray_part = "Previous chest X-ray analyses were predicted as Normal."
            else:
                xray_part = f"Previous chest X-ray analysis predicted {pred}."
                
    # Report summary
    report_part = None
    if reports:
        latest_report = next((r for r in reports if r.get("reportFindings")), None)
        if latest_report:
            findings = latest_report.get("reportFindings")
            if isinstance(findings, list):
                abnormals = []
                for f in findings:
                    status = str(f.get("status", "")).upper()
                    if status in ["HIGH", "LOW", "ABNORMAL"]:
                        abnormals.append(f"{status.lower()} {f.get('test_name')}")
                if abnormals:
                    report_part = "Recent report analysis identified " + ", ".join(abnormals) + "."
                else:
                    report_part = "Recent report analysis showed all laboratory values within reference ranges."
                    
    # Combine
    if xray_part and report_part:
        overall_summary = f"{xray_part} {report_part}"
    elif xray_part:
        overall_summary = f"{xray_part} No report findings are available yet."
    elif report_part:
        overall_summary = f"No chest X-ray findings are available yet. {report_part}"
    else:
        overall_summary = "No previous AI-assisted analysis is available."
        
    # Last Analysis
    last_analysis_str = "No analyses yet"
    if history:
        last = history[0]
        ltype = last.get("analysisType") or last.get("fileType")
        if ltype == "Chest X-Ray":
            last_analysis_str = f"{last.get('prediction')} — {last.get('confidence')}%"
        else:
            last_analysis_str = "Report analyzed"
            
    # Findings summaries
    xray_findings = "No X-ray findings yet."
    if xrays:
        preds = [x.get("prediction") for x in xrays if x.get("prediction")]
        if preds:
            from collections import Counter
            most_common = Counter(preds).most_common(1)[0][0]
            xray_findings = f"Most frequent: {most_common}"
            
    report_abnormal = 0
    report_normal = 0
    for r in reports:
        findings = r.get("reportFindings")
        if isinstance(findings, list):
            for f in findings:
                status = str(f.get("status", "")).upper()
                if status in ["HIGH", "LOW", "ABNORMAL"]:
                    report_abnormal += 1
                else:
                    report_normal += 1
                    
    # Overview counts
    xray_overview = {}
    for x in xrays:
        pred = x.get("prediction")
        if pred:
            xray_overview[pred] = xray_overview.get(pred, 0) + 1
            
    report_overview = {"HIGH": 0, "LOW": 0, "NORMAL": 0}
    for r in reports:
        findings = r.get("reportFindings")
        if isinstance(findings, list):
            for f in findings:
                status = str(f.get("status", "")).upper()
                if status in ["HIGH", "LOW", "ABNORMAL"]:
                    report_overview[status] = report_overview.get(status, 0) + 1
                else:
                    report_overview["NORMAL"] = report_overview.get("NORMAL", 0) + 1
                    
    return {
        "overallSummary": overall_summary,
        "stats": {
            "total": len(history),
            "xrays": len(xrays),
            "reports": len(reports),
            "lastAnalysis": last_analysis_str,
            "xrayFindings": xray_findings,
            "reportFindingsAbnormal": report_abnormal,
            "reportFindingsNormal": report_normal,
            "xrayOverview": xray_overview,
            "reportOverview": report_overview
        }
    }

@app.get("/api/patients/{patient_id}/history", tags=["Patients"])
async def get_patient_timeline(patient_id: str):
    history = database.get_patient_history(patient_id)
    summary_data = get_longitudinal_summary(history)
    return {
        "history": history,
        "overallSummary": summary_data["overallSummary"],
        "stats": summary_data["stats"]
    }

class PatientUpdateRequest(BaseModel):
    name: str
    age: int
    gender: str
    contact: Optional[str] = None

@app.get("/api/patients/registry/data", tags=["Patients"])
async def get_patients_registry_data():
    try:
        stats = database.get_patients_registry_stats()
        patients = database.get_patients_registry()
        return {"stats": stats, "patients": patients}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.put("/api/patients/{patient_id}", tags=["Patients"])
async def update_patient_info(patient_id: str, req: PatientUpdateRequest):
    success = database.update_patient(patient_id, req.name, req.age, req.gender, req.contact)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found or update failed")
    return {"message": "Patient updated successfully"}

@app.get("/api/analyses/stats", tags=["Patients"])
async def get_analyses_stats():
    return database.get_all_analyses_stats()

@app.get("/api/dashboard/summary", tags=["Dashboard"])
async def get_dashboard_summary(period: str = "30d"):
    try:
        # Check system health status
        xray_online = "Online" if (inference_engine.model is not None or os.path.exists(MODEL_PATH)) else "Unavailable"
        validation_status = "Available" if os.path.exists("xray_validator.pth") else "Unavailable"
        
        report_status = "Available"
        try:
            from report_analysis.report_analyzer import MedicalReportAnalyzer
        except Exception:
            report_status = "Unavailable"
            
        db_status = "Connected"
        try:
            conn = database.get_sqlite_conn()
            conn.close()
        except Exception:
            db_status = "Disconnected"
            
        device_name = "CPU"
        if inference_engine.device is not None:
            device_name = str(inference_engine.device).upper()
            
        db_data = database.get_dashboard_data(period)
        db_data["system_health"] = {
            "xray_model": xray_online,
            "validation": validation_status,
            "report_analysis": report_status,
            "database": db_status,
            "device": device_name
        }
        return db_data
    except Exception as e:
        logger.error(f"Dashboard summary API failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Dashboard summary failed: {str(e)}")



# --------------------------------------------
# File Upload & Diagnostic Analysis Integration
# --------------------------------------------
@app.post("/api/patients/{patient_id}/files", tags=["Patient Diagnostics"])
async def upload_patient_file(patient_id: str, file: UploadFile = File(...), analysis_type: Optional[str] = None):
    p = database.get_patient(patient_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        
    # Ensure static uploads directory exists
    uploads_dir = os.path.join(os.path.dirname(__file__), "static", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    local_filename = f"{patient_id}_{int(time.time())}{file_extension}"
    local_path = os.path.join(uploads_dir, local_filename)
    
    # Read file bytes first
    contents = await file.read()
    
    # Save file to disk
    with open(local_path, "wb") as buffer:
        buffer.write(contents)
        
    # File Web URL path
    web_file_path = f"/static/uploads/{local_filename}"
    
    # Check if the file is a Chest X-ray (Image format) or a report (PDF or Image)
    is_image = file_extension in [".png", ".jpg", ".jpeg"]
    
    prediction = None
    confidence = None
    gradcam_path = None
    report_findings = None
    report_summary = None
    
    force_xray = (analysis_type == "Chest X-Ray")
    force_report = (analysis_type == "Medical Report")
    
    if force_xray:
        if not is_image:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chest X-Ray must be a JPEG or PNG image.")
        try:
            img = Image.open(local_path).convert("RGB")
            xray_result = inference_engine.predict(img)
            if xray_result.get("success"):
                analysis_type = "Chest X-Ray"
                prediction = xray_result.get("prediction")
                confidence = xray_result.get("confidence")
                if xray_result.get("heatmap"):
                    heatmap_filename = f"heatmap_{local_filename}"
                    heatmap_path = os.path.join(uploads_dir, heatmap_filename)
                    import base64
                    h_data_str = xray_result.get("heatmap")
                    if "," in h_data_str:
                        h_data_str = h_data_str.split(",")[1]
                    h_data = base64.b64decode(h_data_str)
                    with open(heatmap_path, "wb") as h_buffer:
                        h_buffer.write(h_data)
                    gradcam_path = f"/static/uploads/{heatmap_filename}"
            else:
                raise HTTPException(status_code=500, detail="X-Ray model inference computation failed or image is invalid.")
        except Exception as e:
            logger.error(f"Forced X-ray inference failed: {e}")
            raise HTTPException(status_code=500, detail=f"X-Ray model inference failed: {str(e)}")
    elif force_report:
        try:
            report_analyzer_mod = MedicalReportAnalyzer()
            res = report_analyzer_mod.analyze_report(contents, file.filename, file.content_type)
            analysis_type = "Medical Report"
            report_findings = res["findings"]
            report_summary = res["summary"]
        except Exception as e:
            logger.error(f"Forced report analysis failed: {e}")
            raise HTTPException(status_code=500, detail=f"Report analysis failed: {str(e)}")
    else:
        # Fallback to legacy automatic routing based on image check
        analysis_type = "Medical Report"
        if is_image:
            try:
                img = Image.open(local_path).convert("RGB")
                xray_result = inference_engine.predict(img)
                if xray_result.get("success"):
                    analysis_type = "Chest X-Ray"
                    prediction = xray_result.get("prediction")
                    confidence = xray_result.get("confidence")
                    if xray_result.get("heatmap"):
                        heatmap_filename = f"heatmap_{local_filename}"
                        heatmap_path = os.path.join(uploads_dir, heatmap_filename)
                        import base64
                        h_data_str = xray_result.get("heatmap")
                        if "," in h_data_str:
                            h_data_str = h_data_str.split(",")[1]
                        h_data = base64.b64decode(h_data_str)
                        with open(heatmap_path, "wb") as h_buffer:
                            h_buffer.write(h_data)
                        gradcam_path = f"/static/uploads/{heatmap_filename}"
                else:
                    report_analyzer_mod = MedicalReportAnalyzer()
                    res = report_analyzer_mod.analyze_report(contents, file.filename, file.content_type)
                    report_findings = res["findings"]
                    report_summary = res["summary"]
            except Exception as e:
                logger.error(f"Image auto-route failure: {e}")
                try:
                    report_analyzer_mod = MedicalReportAnalyzer()
                    res = report_analyzer_mod.analyze_report(contents, file.filename, file.content_type)
                    report_findings = res["findings"]
                    report_summary = res["summary"]
                except Exception as ocr_err:
                    raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {ocr_err}")
        else:
            try:
                report_analyzer_mod = MedicalReportAnalyzer()
                res = report_analyzer_mod.analyze_report(contents, file.filename, file.content_type)
                report_findings = res["findings"]
                report_summary = res["summary"]
            except Exception as e:
                logger.error(f"PDF report analysis failure: {e}")
                raise HTTPException(status_code=500, detail=f"Failed to process PDF report: {str(e)}")

    db_result = database.save_file_and_result(
        patient_id=patient_id,
        file_name=file.filename,
        file_type=analysis_type,
        file_path=web_file_path,
        analysis_type=analysis_type,
        prediction=prediction,
        confidence=confidence,
        gradcam_path=gradcam_path,
        report_findings=report_findings,
        report_summary=report_summary
    )
    
    return {
        "success": True,
        "fileId": db_result["file_id"],
        "analysisId": db_result["analysis_id"],
        "analysisType": analysis_type,
        "prediction": prediction,
        "confidence": confidence,
        "gradcamPath": gradcam_path,
        "reportFindings": report_findings,
        "reportSummary": report_summary,
        "filePath": web_file_path
    }

class UpdateNoteRequest(BaseModel):
    doctor_note: str

@app.put("/api/analyses/{analysis_id}", tags=["Patient Diagnostics"])
async def update_analysis(analysis_id: str, req: UpdateNoteRequest):
    success = database.update_analysis_note(analysis_id, req.doctor_note)
    if not success:
        raise HTTPException(status_code=404, detail="Analysis result not found or update failed")
    return {"message": "Analysis note updated successfully"}

@app.delete("/api/analyses/{analysis_id}", tags=["Patient Diagnostics"])
async def delete_analysis_endpoint(analysis_id: str):
    conn = database.get_sqlite_conn()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT f.file_path, a.gradcam_path 
        FROM analysis_results a 
        JOIN medical_files f ON a.file_id = f.file_id 
        WHERE a.analysis_id = ?
    """, (analysis_id,))
    row = cursor.fetchone()
    conn.close()
    
    success = database.delete_analysis(analysis_id)
    if not success:
        raise HTTPException(status_code=404, detail="Analysis result not found or delete failed")
        
    if row:
        uploads_dir = os.path.join(os.path.dirname(__file__), "static", "uploads")
        if row["file_path"]:
            file_name = os.path.basename(row["file_path"])
            file_path = os.path.join(uploads_dir, file_name)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.error(f"Failed to delete original file {file_path}: {e}")
        if row["gradcam_path"]:
            heatmap_name = os.path.basename(row["gradcam_path"])
            heatmap_path = os.path.join(uploads_dir, heatmap_name)
            if os.path.exists(heatmap_path):
                try:
                    os.remove(heatmap_path)
                except Exception as e:
                    logger.error(f"Failed to delete Grad-CAM overlay file {heatmap_path}: {e}")
                    
    return {"message": "Analysis deleted successfully"}

@app.post("/api/patients/{patient_id}/archive", tags=["Patients"])
async def archive_patient_endpoint(patient_id: str):
    success = database.archive_patient(patient_id)
    if not success:
        raise HTTPException(status_code=404, detail="Patient not found or archive failed")
    return {"message": "Patient archived successfully"}

# Mount static folder for uploads serving
from fastapi.staticfiles import StaticFiles
os.makedirs(os.path.join(os.path.dirname(__file__), "static"), exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    from config import HOST, PORT
    uvicorn.run("app:app", host=HOST, port=PORT, reload=False)
