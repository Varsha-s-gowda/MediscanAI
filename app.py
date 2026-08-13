import time
import os
import io
import json
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image
import numpy as np
from typing import List, Dict, Any

# Modular imports
from config import API_VERSION, CONFIDENCE_THRESHOLD, MODEL_PATH
from constants import DISEASE_CLASSES
from device import get_device
from logger import get_logger, get_memory_usage
from predict import InferenceEngine
from ocr.extract_text import MedicalReportOCR

logger = get_logger("app")

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
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image file."
        )

    # Chest X-Ray Check
    if not is_xray(image):
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
        prediction_result = inference_engine.predict(image)
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

if __name__ == "__main__":
    import uvicorn
    from config import HOST, PORT
    uvicorn.run("app:app", host=HOST, port=PORT, reload=False)