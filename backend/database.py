import os
import sqlite3
import uuid
import datetime
import json
from typing import Dict, Any, List, Optional
import hashlib

# Check for MongoDB option (optional, fall back to SQLite for robust local run)
MONGO_URI = os.getenv("MONGO_URI", "")
USE_MONGO = False

if MONGO_URI:
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGO_URI)
        db = client["mediscan_db"]
        USE_MONGO = True
        print("[DB] Using MongoDB database connection.")
    except Exception as e:
        print(f"[DB] Failed to connect to MongoDB, falling back to SQLite: {e}")

# If SQLite is used:
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BACKEND_DIR, "mediscan.db")

def get_sqlite_conn():
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if USE_MONGO:
        # MongoDB creates collections lazily
        return
    
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    
    # Create Doctors table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL
    )
    """)
    
    # Create Patients table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        patient_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        contact TEXT,
        created_at TEXT NOT NULL
    )
    """)
    
    # Create Medical Files table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medical_files (
        file_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY(patient_id) REFERENCES patients(patient_id)
    )
    """)
    
    # Create Analysis Results table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analysis_results (
        analysis_id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        file_id TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        prediction TEXT,
        confidence REAL,
        gradcam_path TEXT,
        report_findings TEXT, -- JSON string
        report_summary TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(patient_id) REFERENCES patients(patient_id),
        FOREIGN KEY(file_id) REFERENCES medical_files(file_id)
    )
    """)
    
    conn.commit()
    
    # Run schema migrations to add new columns if they do not exist
    try:
        cursor.execute("ALTER TABLE analysis_results ADD COLUMN doctor_note TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE patients ADD COLUMN archived INTEGER DEFAULT 0")
        conn.commit()
    except sqlite3.OperationalError:
        pass

    conn.close()
    print("[DB] SQLite database initialized and migrated successfully.")

# Create default doctor if not exists
def seed_default_doctor():
    init_db()
    hashed = hashlib.sha256("admin123".encode()).hexdigest()
    if USE_MONGO:
        if not db["doctors"].find_one({"username": "admin"}):
            db["doctors"].insert_one({
                "username": "admin",
                "password_hash": hashed,
                "name": "Dr. Varsha Gowda"
            })
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM doctors WHERE username = ?", ("admin",))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO doctors (username, password_hash, name) VALUES (?, ?, ?)", ("admin", hashed, "Dr. Varsha Gowda"))
            conn.commit()
        conn.close()

# --- Auth Helpers ---
def verify_doctor(username: str, password_plain: str) -> bool:
    hashed = hashlib.sha256(password_plain.encode()).hexdigest()
    if USE_MONGO:
        doc = db["doctors"].find_one({"username": username, "password_hash": hashed})
        return doc is not None
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM doctors WHERE username = ? AND password_hash = ?", (username, hashed))
        res = cursor.fetchone()
        conn.close()
        return res is not None

def get_doctor_name(username: str) -> str:
    if USE_MONGO:
        doc = db["doctors"].find_one({"username": username})
        return doc.get("name", "Doctor") if doc else "Doctor"
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM doctors WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        return row["name"] if row else "Doctor"


def register_doctor(username: str, password_plain: str, name: str) -> bool:
    hashed = hashlib.sha256(password_plain.encode()).hexdigest()
    if USE_MONGO:
        if db["doctors"].find_one({"username": username}):
            return False
        db["doctors"].insert_one({
            "username": username,
            "password_hash": hashed,
            "name": name
        })
        return True
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO doctors (username, password_hash, name) VALUES (?, ?, ?)", (username, hashed, name))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

# --- Patient Management ---
def create_patient(name: str, age: int, gender: str, contact: Optional[str] = None) -> Dict[str, Any]:
    now_str = datetime.datetime.now().isoformat()
    if USE_MONGO:
        count = db["patients"].count_documents({})
        patient_id = f"P{1001 + count}"
        patient_data = {
            "patientId": patient_id,
            "name": name,
            "age": age,
            "gender": gender,
            "contact": contact,
            "createdAt": now_str
        }
        db["patients"].insert_one(patient_data)
        patient_data.pop("_id", None)
        return patient_data
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM patients")
        count = cursor.fetchone()[0]
        patient_id = f"P{1001 + count}"
        cursor.execute(
            "INSERT INTO patients (patient_id, name, age, gender, contact, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (patient_id, name, age, gender, contact, now_str)
        )
        conn.commit()
        conn.close()
        return {
            "patientId": patient_id,
            "name": name,
            "age": age,
            "gender": gender,
            "contact": contact,
            "createdAt": now_str
        }

def get_all_patients() -> List[Dict[str, Any]]:
    if USE_MONGO:
        patients = list(db["patients"].find({}, {"_id": 0}))
        return patients
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [{
            "patientId": r["patient_id"],
            "name": r["name"],
            "age": r["age"],
            "gender": r["gender"],
            "contact": r["contact"],
            "createdAt": r["created_at"]
        } for r in rows]

def get_patient(patient_id: str) -> Optional[Dict[str, Any]]:
    if USE_MONGO:
        return db["patients"].find_one({"patientId": patient_id}, {"_id": 0})
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "patientId": row["patient_id"],
                "name": row["name"],
                "age": row["age"],
                "gender": row["gender"],
                "contact": row["contact"],
                "createdAt": row["created_at"]
            }
        return None

# --- Medical Files & Analysis Result ---
def save_file_and_result(
    patient_id: str,
    file_name: str,
    file_type: str,
    file_path: str,
    analysis_type: str,
    prediction: Optional[str] = None,
    confidence: Optional[float] = None,
    gradcam_path: Optional[str] = None,
    report_findings: Optional[Dict[str, Any]] = None,
    report_summary: Optional[str] = None
) -> Dict[str, Any]:
    file_id = f"F_{uuid.uuid4().hex[:8].upper()}"
    analysis_id = f"A_{uuid.uuid4().hex[:8].upper()}"
    now_str = datetime.datetime.now().isoformat()
    
    findings_str = json.dumps(report_findings) if report_findings else None

    if USE_MONGO:
        file_doc = {
            "fileId": file_id,
            "patientId": patient_id,
            "fileName": file_name,
            "fileType": file_type,
            "filePath": file_path,
            "uploadedAt": now_str
        }
        analysis_doc = {
            "analysisId": analysis_id,
            "patientId": patient_id,
            "fileId": file_id,
            "analysisType": analysis_type,
            "prediction": prediction,
            "confidence": confidence,
            "gradcamPath": gradcam_path,
            "reportFindings": report_findings,
            "reportSummary": report_summary,
            "createdAt": now_str
        }
        db["medical_files"].insert_one(file_doc)
        db["analysis_results"].insert_one(analysis_doc)
        return {"file_id": file_id, "analysis_id": analysis_id}
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO medical_files (file_id, patient_id, file_name, file_type, file_path, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)",
            (file_id, patient_id, file_name, file_type, file_path, now_str)
        )
        cursor.execute(
            "INSERT INTO analysis_results (analysis_id, patient_id, file_id, analysis_type, prediction, confidence, gradcam_path, report_findings, report_summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (analysis_id, patient_id, file_id, analysis_type, prediction, confidence, gradcam_path, findings_str, report_summary, now_str)
        )
        conn.commit()
        conn.close()
        return {"file_id": file_id, "analysis_id": analysis_id}

def get_patient_history(patient_id: str) -> List[Dict[str, Any]]:
    if USE_MONGO:
        files = {f["fileId"]: f for f in db["medical_files"].find({"patientId": patient_id})}
        analyses = list(db["analysis_results"].find({"patientId": patient_id}))
        
        history = []
        for ans in analyses:
            fid = ans.get("fileId")
            file_info = files.get(fid, {})
            history.append({
                "analysisId": ans.get("analysisId"),
                "fileId": fid,
                "fileName": file_info.get("fileName", "Unknown File"),
                "fileType": file_info.get("fileType", "Unknown"),
                "filePath": file_info.get("filePath", ""),
                "analysisType": ans.get("analysisType"),
                "prediction": ans.get("prediction"),
                "confidence": ans.get("confidence"),
                "gradcamPath": ans.get("gradcamPath"),
                "reportFindings": ans.get("reportFindings"),
                "reportSummary": ans.get("reportSummary"),
                "doctorNote": ans.get("doctorNote") or ans.get("doctor_note"),
                "doctor_note": ans.get("doctorNote") or ans.get("doctor_note"),
                "date": ans.get("createdAt")
            })
        history.sort(key=lambda x: x["date"], reverse=True)
        return history
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                a.analysis_id, a.file_id, a.analysis_type, a.prediction, a.confidence, 
                a.gradcam_path, a.report_findings, a.report_summary, a.doctor_note, a.created_at,
                f.file_name, f.file_type, f.file_path
            FROM analysis_results a
            JOIN medical_files f ON a.file_id = f.file_id
            WHERE a.patient_id = ?
            ORDER BY a.created_at DESC
        """, (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for r in rows:
            findings = None
            if r["report_findings"]:
                try:
                    findings = json.loads(r["report_findings"])
                except Exception:
                    pass
            history.append({
                "analysisId": r["analysis_id"],
                "fileId": r["file_id"],
                "fileName": r["file_name"],
                "fileType": r["file_type"],
                "filePath": r["file_path"],
                "analysisType": r["analysis_type"],
                "prediction": r["prediction"],
                "confidence": r["confidence"],
                "gradcamPath": r["gradcam_path"],
                "reportFindings": findings,
                "reportSummary": r["report_summary"],
                "doctorNote": r["doctor_note"],
                "doctor_note": r["doctor_note"],
                "date": r["created_at"]
            })
        return history

def get_all_analyses_stats() -> Dict[str, Any]:
    if USE_MONGO:
        total = db["analysis_results"].count_documents({})
        xrays = db["analysis_results"].count_documents({"analysisType": "Chest X-Ray"})
        reports = db["analysis_results"].count_documents({"analysisType": "Medical Report"})
        recent = db["analysis_results"].find_one(sort=[("createdAt", -1)])
        recent_type = recent.get("analysisType", "None") if recent else "None"
        return {
            "total": total,
            "xrays": xrays,
            "reports": reports,
            "recent_type": recent_type
        }
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM analysis_results")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE analysis_type = 'Chest X-Ray'")
        xrays = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE analysis_type = 'Medical Report'")
        reports = cursor.fetchone()[0]
        cursor.execute("SELECT analysis_type FROM analysis_results ORDER BY created_at DESC LIMIT 1")
        recent = cursor.fetchone()
        recent_type = recent[0] if recent else "None"
        conn.close()
        return {
            "total": total,
            "xrays": xrays,
            "reports": reports,
            "recent_type": recent_type
        }

def get_dashboard_data(period: str = "30d") -> Dict[str, Any]:
    """Retrieves dynamic, real-time statistics, trends, disease distribution, and activities for the Doctor Dashboard."""
    days = 30
    if period == "7d":
        days = 7
    elif period == "3m":
        days = 90
        
    cutoff_date = (datetime.datetime.now() - datetime.timedelta(days=days)).isoformat()
    
    if USE_MONGO:
        # Simple fallback mockup fields for MongoDB (if enabled, though SQLite is local default)
        try:
            total_patients = db["patients"].count_documents({})
            total_analyses = db["analysis_results"].count_documents({})
            total_xray = db["analysis_results"].count_documents({"analysisType": "Chest X-Ray"})
            total_reports = db["analysis_results"].count_documents({"analysisType": "Medical Report"})
            gradcam_count = db["analysis_results"].count_documents({"analysisType": "Chest X-Ray", "gradcamPath": {"$ne": None}})
        except Exception:
            total_patients = 0
            total_analyses = 0
            total_xray = 0
            total_reports = 0
            gradcam_count = 0
            
        trend_list = []
        for i in range(days):
            d = (datetime.datetime.now() - datetime.timedelta(days=days - 1 - i)).date().isoformat()
            trend_list.append({"date": d, "xray": 0, "report": 0})
            
        return {
            "stats": {
                "total_patients": total_patients,
                "patients_trend": "+0 this week",
                "total_analyses": total_analyses,
                "analyses_trend": "+0 this month",
                "total_xray": total_xray,
                "xray_awaiting": 0,
                "total_reports": total_reports,
                "reports_awaiting": 0,
                "gradcam_analyses": gradcam_count
            },
            "trends": trend_list,
            "distribution": {"COVID-19": 0, "Normal": 0, "Pneumonia": 0, "Tuberculosis": 0},
            "recent_analyses": [],
            "activities": []
        }
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        
        # 1. Total Patients
        cursor.execute("SELECT COUNT(*) FROM patients")
        total_patients = cursor.fetchone()[0]
        
        # Delta patients registered in last 7 days
        week_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).isoformat()
        cursor.execute("SELECT COUNT(*) FROM patients WHERE created_at >= ?", (week_ago,))
        patients_this_week = cursor.fetchone()[0]
        
        # 2. Total Analyses
        cursor.execute("SELECT COUNT(*) FROM analysis_results")
        total_analyses = cursor.fetchone()[0]
        
        # Delta analyses this month (last 30 days)
        month_ago = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE created_at >= ?", (month_ago,))
        analyses_this_month = cursor.fetchone()[0]
        
        # 3. X-Ray Analyses
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE analysis_type = 'Chest X-Ray'")
        total_xray = cursor.fetchone()[0]
        
        # Awaiting review count: count X-rays where confidence is below 50% or prediction is null
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE analysis_type = 'Chest X-Ray' AND (prediction IS NULL OR confidence < 0.50)")
        xray_awaiting = cursor.fetchone()[0]
        
        # 4. Report Analyses
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE analysis_type = 'Medical Report'")
        total_reports = cursor.fetchone()[0]
        
        # Awaiting review count for reports
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE analysis_type = 'Medical Report' AND prediction IS NULL")
        report_awaiting = cursor.fetchone()[0]
        
        # 5. Grad-CAM analyses count
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE analysis_type = 'Chest X-Ray' AND gradcam_path IS NOT NULL AND gradcam_path != ''")
        gradcam_count = cursor.fetchone()[0]
        
        # 6. Trend data: count analyses per day within the period
        cursor.execute("""
            SELECT substr(created_at, 1, 10) as date,
                   SUM(case when analysis_type = 'Chest X-Ray' then 1 else 0 end) as xray_cnt,
                   SUM(case when analysis_type = 'Medical Report' then 1 else 0 end) as report_cnt
            FROM analysis_results
            WHERE created_at >= ?
            GROUP BY date
            ORDER BY date ASC
        """, (cutoff_date,))
        trend_rows = cursor.fetchall()
        
        # Generate complete daily timeseries list to pad empty dates
        trend_dict = {r["date"]: {"xray": r["xray_cnt"], "report": r["report_cnt"]} for r in trend_rows}
        trend_list = []
        for i in range(days):
            d = (datetime.datetime.now() - datetime.timedelta(days=days - 1 - i)).date().isoformat()
            vals = trend_dict.get(d, {"xray": 0, "report": 0})
            trend_list.append({
                "date": d,
                "xray": vals["xray"],
                "report": vals["report"]
            })
            
        # 7. Disease distribution (limited to COVID-19, Normal, Pneumonia, Tuberculosis)
        cursor.execute("SELECT prediction, COUNT(*) as count FROM analysis_results WHERE analysis_type = 'Chest X-Ray' GROUP BY prediction")
        dist_rows = cursor.fetchall()
        
        dist_counts = {"COVID-19": 0, "Normal": 0, "Pneumonia": 0, "Tuberculosis": 0}
        for r in dist_rows:
            pred = r["prediction"]
            if not pred:
                continue
            pred_norm = pred.strip().upper()
            if "COVID" in pred_norm:
                dist_counts["COVID-19"] += r["count"]
            elif "NORMAL" in pred_norm:
                dist_counts["Normal"] += r["count"]
            elif "PNEUMONIA" in pred_norm:
                dist_counts["Pneumonia"] += r["count"]
            elif "TUBERCULOSIS" in pred_norm or "TB" in pred_norm or "TURBERCULOSIS" in pred_norm:
                dist_counts["Tuberculosis"] += r["count"]
                
        # 8. Recent analyses (limit 5)
        cursor.execute("""
            SELECT a.analysis_id, a.patient_id, a.analysis_type, a.prediction, a.confidence, a.created_at, f.file_name
            FROM analysis_results a
            LEFT JOIN medical_files f ON a.file_id = f.file_id
            ORDER BY a.created_at DESC
            LIMIT 5
        """)
        recent_rows = cursor.fetchall()
        recent_analyses = []
        for r in recent_rows:
            recent_analyses.append({
                "analysisId": r["analysis_id"],
                "patientId": r["patient_id"],
                "type": "X-Ray" if r["analysis_type"] == "Chest X-Ray" else "Report",
                "result": r["prediction"] or "Awaiting Review",
                "confidence": round(r["confidence"], 1) if (r["confidence"] is not None and r["analysis_type"] == "Chest X-Ray") else None,
                "date": r["created_at"],
                "fileName": r["file_name"] or "Unknown"
            })
            
        # 9. Recent activities (Patients registry & Analyses)
        # Fetch latest 5 patients
        cursor.execute("SELECT name, patient_id, created_at FROM patients ORDER BY created_at DESC LIMIT 5")
        patient_activities = [{"type": "patient", "text": f"New patient registered: {p['name']} ({p['patient_id']})", "date": p["created_at"]} for p in cursor.fetchall()]
        
        # Fetch latest 5 analyses
        cursor.execute("SELECT patient_id, analysis_type, prediction, created_at FROM analysis_results ORDER BY created_at DESC LIMIT 5")
        analysis_activities = []
        for a in cursor.fetchall():
            atype = "X-ray" if a["analysis_type"] == "Chest X-Ray" else "Report"
            pred = a["prediction"] or "Normal"
            analysis_activities.append({
                "type": "analysis",
                "text": f"{atype} analyzed for {a['patient_id']}: {pred} findings recorded.",
                "date": a["created_at"]
            })
            
        activities = sorted(patient_activities + analysis_activities, key=lambda x: x["date"], reverse=True)[:5]
        
        conn.close()
        
        return {
            "stats": {
                "total_patients": total_patients,
                "patients_trend": f"+{patients_this_week} this week" if patients_this_week > 0 else "No new registrations",
                "total_analyses": total_analyses,
                "analyses_trend": f"+{analyses_this_month} this month" if analyses_this_month > 0 else "No new analyses",
                "total_xray": total_xray,
                "xray_awaiting": xray_awaiting,
                "total_reports": total_reports,
                "reports_awaiting": report_awaiting,
                "gradcam_analyses": gradcam_count
            },
            "trends": trend_list,
            "distribution": dist_counts,
            "recent_analyses": recent_analyses,
            "activities": activities
        }

def update_patient(patient_id: str, name: str, age: int, gender: str, contact: Optional[str] = None) -> bool:
    """Updates basic demographic parameters for an existing patient record."""
    if USE_MONGO:
        try:
            res = db["patients"].update_one(
                {"patientId": patient_id},
                {"$set": {"name": name, "age": age, "gender": gender, "contact": contact}}
            )
            return res.modified_count > 0
        except Exception:
            return False
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE patients SET name = ?, age = ?, gender = ?, contact = ? WHERE patient_id = ?",
            (name, age, gender, contact, patient_id)
        )
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success

def get_patients_registry_stats() -> Dict[str, Any]:
    """Calculates Patient Registry summary metrics directly from database records."""
    if USE_MONGO:
        try:
            total = db["patients"].count_documents({})
            active = len(db["analysis_results"].distinct("patientId"))
            this_month_start = datetime.datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
            this_month_cnt = db["analysis_results"].count_documents({"createdAt": {"$gte": this_month_start}})
            recent_cutoff = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
            recent_pat = db["patients"].count_documents({"createdAt": {"$gte": recent_cutoff}})
        except Exception:
            total = active = this_month_cnt = recent_pat = 0
            
        return {
            "total_patients": total,
            "active_cases": active,
            "analyses_this_month": this_month_cnt,
            "recently_added": recent_pat
        }
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        
        # 1. Total patients
        cursor.execute("SELECT COUNT(*) FROM patients")
        total = cursor.fetchone()[0]
        
        # 2. Active cases (any patient with an analysis record)
        cursor.execute("SELECT COUNT(DISTINCT patient_id) FROM analysis_results")
        active = cursor.fetchone()[0]
        
        # 3. Analyses this month (first of current month cutoff)
        month_start = datetime.datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        cursor.execute("SELECT COUNT(*) FROM analysis_results WHERE created_at >= ?", (month_start,))
        this_month_cnt = cursor.fetchone()[0]
        
        # 4. Recently added (patients registered in last 30 days)
        recent_cutoff = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()
        cursor.execute("SELECT COUNT(*) FROM patients WHERE created_at >= ?", (recent_cutoff,))
        recent_pat = cursor.fetchone()[0]
        
        conn.close()
        return {
            "total_patients": total,
            "active_cases": active,
            "analyses_this_month": this_month_cnt,
            "recently_added": recent_pat
        }

def get_patients_registry() -> List[Dict[str, Any]]:
    """Fetches the directory of patients combined with their latest analysis metrics."""
    if USE_MONGO:
        try:
            patients = list(db["patients"].find())
        except Exception:
            patients = []
        result = []
        for p in patients:
            pid = p.get("patientId")
            try:
                last_an = db["analysis_results"].find_one({"patientId": pid}, sort=[("createdAt", -1)])
            except Exception:
                last_an = None
            an_data = None
            if last_an:
                an_data = {
                    "type": "X-Ray" if last_an.get("analysisType") == "Chest X-Ray" else "Report",
                    "result": last_an.get("prediction"),
                    "confidence": last_an.get("confidence"),
                    "date": last_an.get("createdAt"),
                    "abnormalCount": 0
                }
            result.append({
                "patientId": pid,
                "name": p.get("name"),
                "age": p.get("age"),
                "gender": p.get("gender"),
                "contact": p.get("contact"),
                "createdAt": p.get("createdAt"),
                "lastAnalysis": an_data
            })
        return result
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.patient_id, p.name, p.age, p.gender, p.contact, p.created_at,
                   a.analysis_type, a.prediction, a.confidence, a.report_findings, a.created_at as last_analysis_date
            FROM patients p
            LEFT JOIN (
                SELECT patient_id, analysis_type, prediction, confidence, report_findings, created_at,
                       ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) as rn
                FROM analysis_results
            ) a ON p.patient_id = a.patient_id AND a.rn = 1
        """)
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for r in rows:
            an_data = None
            if r["analysis_type"]:
                num_findings = 0
                if r["analysis_type"] == "Medical Report" and r["report_findings"]:
                    try:
                        import json
                        findings = json.loads(r["report_findings"])
                        if isinstance(findings, list):
                            num_findings = len([f for f in findings if f.get("status", "").upper() in ["HIGH", "LOW", "ABNORMAL"]])
                    except Exception:
                        pass
                
                an_data = {
                    "type": "X-Ray" if r["analysis_type"] == "Chest X-Ray" else "Report",
                    "result": r["prediction"],
                    "confidence": round(r["confidence"], 1) if (r["confidence"] is not None and r["analysis_type"] == "Chest X-Ray") else None,
                    "date": r["last_analysis_date"],
                    "abnormalCount": num_findings
                }
            result.append({
                "patientId": r["patient_id"],
                "name": r["name"],
                "age": r["age"],
                "gender": r["gender"],
                "contact": r["contact"],
                "createdAt": r["created_at"],
                "lastAnalysis": an_data
            })
        return result

def delete_analysis(analysis_id: str) -> bool:
    """Deletes a specific analysis record and its corresponding file reference from SQLite or MongoDB, returning True on success."""
    if USE_MONGO:
        try:
            ans = db["analysis_results"].find_one({"analysisId": analysis_id})
            if ans:
                file_id = ans.get("fileId")
                db["analysis_results"].delete_one({"analysisId": analysis_id})
                if file_id:
                    db["medical_files"].delete_one({"fileId": file_id})
                return True
            return False
        except Exception:
            return False
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT file_id FROM analysis_results WHERE analysis_id = ?", (analysis_id,))
        row = cursor.fetchone()
        if row:
            file_id = row["file_id"]
            cursor.execute("DELETE FROM analysis_results WHERE analysis_id = ?", (analysis_id,))
            cursor.execute("DELETE FROM medical_files WHERE file_id = ?", (file_id,))
            conn.commit()
            conn.close()
            return True
        conn.close()
        return False

def update_analysis_note(analysis_id: str, doctor_note: str) -> bool:
    """Updates the doctor note field in a specific analysis result record."""
    if USE_MONGO:
        try:
            res = db["analysis_results"].update_one(
                {"analysisId": analysis_id},
                {"$set": {"doctorNote": doctor_note, "doctor_note": doctor_note}}
            )
            return res.modified_count > 0
        except Exception:
            return False
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE analysis_results SET doctor_note = ? WHERE analysis_id = ?",
            (doctor_note, analysis_id)
        )
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success

def archive_patient(patient_id: str) -> bool:
    """Marks a patient record as archived (hides them from registry search)."""
    if USE_MONGO:
        try:
            res = db["patients"].update_one(
                {"patientId": patient_id},
                {"$set": {"archived": 1}}
            )
            return res.modified_count > 0
        except Exception:
            return False
    else:
        conn = get_sqlite_conn()
        cursor = conn.cursor()
        cursor.execute("UPDATE patients SET archived = 1 WHERE patient_id = ?", (patient_id,))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success


