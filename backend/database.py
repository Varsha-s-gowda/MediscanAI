"""Data layer for MediScan AI (MongoDB Atlas with a local SQLite fallback).

Model: **users own records**. There is no separate doctor/patient split — the
person who logs in is the owner of the uploads and analyses stored for them.

Collections / tables
    users    -> userId, username, passwordHash, name, phone, age, gender,
                contact, archived, createdAt
    records  -> recordId, userId, fileName, fileType, filePath, analysisType,
                prediction, confidence, gradcamPath, reportFindings,
                reportSummary, note, createdAt

Storage selection
    If MONGO_URI is configured *and* Atlas answers a ping, MongoDB Atlas is used.
    Otherwise the backend transparently falls back to the local SQLite vault
    (backend/mediscan.db) so the API can still start (e.g. offline development
    or an Atlas outage). Legacy `doctors`, `patients`, `medical_files` and
    `analysis_results` tables are migrated into the new model on first run.

The legacy "/api/patients" endpoints are kept as thin aliases over this model so
the existing UI keeps working: a "patient" is simply the signed-in user's own
profile (patientId == userId).
"""

import os
import json
import uuid
import datetime
import hashlib
import sqlite3
import threading
from typing import Dict, Any, List, Optional

# Load backend/.env regardless of the current working directory.
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:  # pragma: no cover
    pass

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BACKEND_DIR, "mediscan.db")

# ----------------------------------------------------------------------------
# Backend selection
# ----------------------------------------------------------------------------
MONGO_URI = (os.getenv("MONGO_URI") or "").strip()
DB_NAME = os.getenv("MONGO_DB_NAME", "mediscan_db")

USE_MONGO = False
BACKEND_NAME = "SQLite"
client = None
db = None
users = None
records = None

try:  # pymongo is optional so the app can still run offline.
    from pymongo import MongoClient, ASCENDING
    from pymongo.errors import PyMongoError
except ImportError:  # pragma: no cover
    MongoClient = None
    ASCENDING = 1
    PyMongoError = Exception


def _connect_mongo() -> bool:
    """Try Atlas; never raise. Returns True when Mongo is usable."""
    global USE_MONGO, BACKEND_NAME, client, db, users, records

    if not MONGO_URI:
        print("[DB] MONGO_URI not configured - using local SQLite vault.")
        return False
    if MongoClient is None:
        print("[DB] pymongo not installed - using local SQLite vault.")
        return False

    try:
        candidate = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            appname="mediscan-ai",
        )
        candidate.admin.command("ping")
    except Exception as exc:  # network, auth, paused/deleted cluster ...
        print(
            f"[DB] MongoDB Atlas unavailable ({type(exc).__name__}: {exc}). "
            "Falling back to local SQLite vault."
        )
        return False

    client = candidate
    db = candidate[DB_NAME]
    users = db["users"]
    records = db["records"]
    USE_MONGO = True
    BACKEND_NAME = "MongoDB Atlas"
    print(f"[DB] Connected to MongoDB Atlas database '{DB_NAME}'.")
    return True


FALLBACK_REASON = None if _connect_mongo() else "local SQLite vault"
if not USE_MONGO and MONGO_URI:
    FALLBACK_REASON = "MongoDB Atlas unreachable - local SQLite vault"

ANALYSIS_TYPE_XRAY = "Chest X-Ray"
ANALYSIS_TYPE_REPORT = "Medical Report"

# Columns kept in sync with the document shape above.
USER_FIELDS = [
    "userId", "username", "passwordHash", "name", "phone", "age", "gender",
    "contact", "archived", "createdAt",
]
RECORD_FIELDS = [
    "recordId", "userId", "fileName", "fileType", "filePath", "analysisType",
    "prediction", "confidence", "gradcamPath", "reportFindings",
    "reportSummary", "note", "createdAt",
]

_sqlite_lock = threading.Lock()

# ----------------------------------------------------------------------------
# SQLite primitives
# ----------------------------------------------------------------------------
def _sqlite_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _legacy_tables(conn: sqlite3.Connection) -> set:
    return {
        row[0]
        for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }


def _sqlite_next_user_id(conn: sqlite3.Connection) -> str:
    highest = 1000
    for row in conn.execute("SELECT userId FROM users"):
        user_id = str(row["userId"] or "")
        if user_id.startswith("U") and user_id[1:].isdigit():
            highest = max(highest, int(user_id[1:]))
    return f"U{highest + 1}"


def _migrate_legacy_users(conn: sqlite3.Connection) -> None:
    """Copy the old `doctors` table into `users` (same SHA-256 hashes)."""
    if "doctors" not in _legacy_tables(conn):
        return
    rows = conn.execute("SELECT username, password_hash, name FROM doctors").fetchall()
    for row in rows:
        username = (row["username"] or "").strip().lower()
        if not username:
            continue
        if conn.execute("SELECT 1 FROM users WHERE username = ?", (username,)).fetchone():
            continue
        conn.execute(
            "INSERT INTO users (userId, username, passwordHash, name, phone, age, gender, "
            "contact, archived, createdAt) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, ?)",
            (
                _sqlite_next_user_id(conn),
                username,
                row["password_hash"],
                (row["name"] or "").strip() or username,
                _now_iso(),
            ),
        )
    conn.commit()


def _migrate_legacy_records(conn: sqlite3.Connection) -> None:
    """Copy old patient files/analyses into the user-owned `records` table."""
    tables = _legacy_tables(conn)
    if not {"medical_files", "analysis_results", "patients"} <= tables:
        return
    if conn.execute("SELECT COUNT(*) FROM records").fetchone()[0]:
        return

    rows = conn.execute(
        """
        SELECT a.analysis_id, a.analysis_type, a.prediction, a.confidence,
               a.gradcam_path, a.report_findings, a.report_summary, a.created_at,
               a.doctor_note, f.file_name, f.file_type, f.file_path,
               p.doctor_username
        FROM analysis_results a
        LEFT JOIN medical_files f ON f.file_id = a.file_id
        LEFT JOIN patients p ON p.patient_id = a.patient_id
        """
    ).fetchall()

    for row in rows:
        owner = (row["doctor_username"] or "").strip().lower()
        if not owner:
            continue
        user = conn.execute(
            "SELECT userId FROM users WHERE username = ?", (owner,)
        ).fetchone()
        if not user:
            continue
        conn.execute(
            "INSERT OR IGNORE INTO records (recordId, userId, fileName, fileType, filePath, "
            "analysisType, prediction, confidence, gradcamPath, reportFindings, "
            "reportSummary, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                row["analysis_id"],
                user["userId"],
                row["file_name"] or "Unknown File",
                row["file_type"] or row["analysis_type"] or "Unknown",
                row["file_path"] or "",
                row["analysis_type"],
                row["prediction"],
                row["confidence"],
                row["gradcam_path"],
                row["report_findings"],
                row["report_summary"],
                row["doctor_note"],
                row["created_at"],
            ),
        )
    conn.commit()


def init_db() -> None:
    """Create indexes/tables. Safe to call repeatedly."""
    if USE_MONGO:
        try:
            users.create_index([("username", ASCENDING)], unique=True)
            users.create_index([("userId", ASCENDING)], unique=True)
            records.create_index([("recordId", ASCENDING)], unique=True)
            records.create_index([("userId", ASCENDING)])
            records.create_index([("createdAt", ASCENDING)])
        except PyMongoError as exc:
            print(f"[DB] Index creation skipped: {exc}")
        return

    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    userId TEXT PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE,
                    passwordHash TEXT NOT NULL,
                    name TEXT,
                    phone TEXT,
                    age INTEGER,
                    gender TEXT,
                    contact TEXT,
                    archived INTEGER DEFAULT 0,
                    createdAt TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS records (
                    recordId TEXT PRIMARY KEY,
                    userId TEXT NOT NULL,
                    fileName TEXT,
                    fileType TEXT,
                    filePath TEXT,
                    analysisType TEXT,
                    prediction TEXT,
                    confidence REAL,
                    gradcamPath TEXT,
                    reportFindings TEXT,
                    reportSummary TEXT,
                    note TEXT,
                    createdAt TEXT
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_records_user ON records(userId)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_records_created ON records(createdAt)"
            )
            conn.commit()

            _migrate_legacy_users(conn)
            _migrate_legacy_records(conn)
        finally:
            conn.close()


def check_connection() -> bool:
    """True when the active backend answers a ping."""
    if USE_MONGO:
        try:
            client.admin.command("ping")
            return True
        except Exception:
            return False
    try:
        with _sqlite_lock:
            conn = _sqlite_conn()
            try:
                conn.execute("SELECT 1 FROM users LIMIT 1").fetchall()
                return True
            finally:
                conn.close()
    except Exception:
        return False


def backend_status() -> str:
    return BACKEND_NAME


# ----------------------------------------------------------------------------
# Document helpers
# ----------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.datetime.now().isoformat()


def _row_to_user(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    return {key: row[key] for key in row.keys()} if row is not None else None


def _decode_report_findings(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return value


def _row_to_record(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    doc = {key: row[key] for key in row.keys()}
    doc["reportFindings"] = _decode_report_findings(doc.get("reportFindings"))
    return doc


# --- user primitives -------------------------------------------------------
def _find_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            row = conn.execute(
                "SELECT * FROM users WHERE username = ?", (username,)
            ).fetchone()
        finally:
            conn.close()
    return _row_to_user(row)


def _find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            row = conn.execute(
                "SELECT * FROM users WHERE userId = ?", (user_id,)
            ).fetchone()
        finally:
            conn.close()
    return _row_to_user(row)


def _insert_user(document: Dict[str, Any]) -> None:
    values = [document.get(field) for field in USER_FIELDS]
    placeholders = ", ".join("?" for _ in USER_FIELDS)
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            conn.execute(
                f"INSERT INTO users ({', '.join(USER_FIELDS)}) VALUES ({placeholders})",
                values,
            )
            conn.commit()
        finally:
            conn.close()


def _update_user(user_id: str, changes: Dict[str, Any]) -> bool:
    if not changes:
        return False
    assignments = ", ".join(f"{field} = ?" for field in changes)
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            cursor = conn.execute(
                f"UPDATE users SET {assignments} WHERE userId = ?",
                list(changes.values()) + [user_id],
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


# --- record primitives -----------------------------------------------------
def _insert_record(document: Dict[str, Any]) -> None:
    values = []
    for field in RECORD_FIELDS:
        value = document.get(field)
        if field == "reportFindings" and value is not None and not isinstance(value, str):
            value = json.dumps(value)
        values.append(value)
    placeholders = ", ".join("?" for _ in RECORD_FIELDS)
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            conn.execute(
                f"INSERT INTO records ({', '.join(RECORD_FIELDS)}) VALUES ({placeholders})",
                values,
            )
            conn.commit()
        finally:
            conn.close()


def _find_record(record_id: str) -> Optional[Dict[str, Any]]:
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            row = conn.execute(
                "SELECT * FROM records WHERE recordId = ?", (record_id,)
            ).fetchone()
        finally:
            conn.close()
    return _row_to_record(row)


def _records_for_user(user_id: str) -> List[Dict[str, Any]]:
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM records WHERE userId = ?", (user_id,)
            ).fetchall()
        finally:
            conn.close()
    return [_row_to_record(row) for row in rows]


def _update_record(record_id: str, changes: Dict[str, Any]) -> bool:
    if not changes:
        return False
    assignments = ", ".join(f"{field} = ?" for field in changes)
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            cursor = conn.execute(
                f"UPDATE records SET {assignments} WHERE recordId = ?",
                list(changes.values()) + [record_id],
            )
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def _delete_record(record_id: str, user_id: Optional[str] = None) -> bool:
    query = "DELETE FROM records WHERE recordId = ?"
    params: List[Any] = [record_id]
    if user_id:
        query += " AND userId = ?"
        params.append(user_id)
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            cursor = conn.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()


def _next_user_id() -> str:
    if USE_MONGO:
        highest = 1000
        for doc in users.find({"userId": {"$regex": r"^U\d+$"}}, {"userId": 1}):
            try:
                highest = max(highest, int(str(doc["userId"])[1:]))
            except (KeyError, ValueError):
                continue
        return f"U{highest + 1}"
    with _sqlite_lock:
        conn = _sqlite_conn()
        try:
            return _sqlite_next_user_id(conn)
        finally:
            conn.close()


# ----------------------------------------------------------------------------
# Users (accounts + profile)
# ----------------------------------------------------------------------------
def seed_default_user() -> None:
    """Demo account so a fresh database is usable immediately."""
    init_db()
    _create_user_document(
        username="admin",
        password_plain="admin123",
        name="Dr. Varsha Gowda",
        phone=None,
    )


# Backwards-compatible alias for code that still calls the old name.
seed_default_doctor = seed_default_user


def _hash(password_plain: str) -> str:
    return hashlib.sha256(password_plain.encode()).hexdigest()


def _create_user_document(
    username: str,
    password_plain: str,
    name: str,
    phone: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    clean_username = (username or "").strip().lower()
    if not clean_username or get_user(clean_username):
        return None

    document = {
        "userId": _next_user_id(),
        "username": clean_username,
        "passwordHash": _hash(password_plain),
        "name": (name or "").strip(),
        "phone": phone,
        "age": None,
        "gender": None,
        "contact": phone,
        "archived": 0,
        "createdAt": _now_iso(),
    }
    if USE_MONGO:
        users.insert_one(dict(document))
    else:
        _insert_user(document)
    return document


def create_user(
    username: str,
    password_plain: str,
    name: str,
    phone: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Registers a new account. Returns the user document, or None if taken."""
    return _create_user_document(username, password_plain, name, phone)


# Legacy aliases used by older call sites.
def register_doctor(username: str, password_plain: str, name: str) -> bool:
    return _create_user_document(username, password_plain, name) is not None


def verify_user(username: str, password_plain: str) -> bool:
    clean_username = (username or "").strip().lower()
    user = get_user(clean_username)
    return bool(user) and user.get("passwordHash") == _hash(password_plain)


verify_doctor = verify_user


def get_user(username: str) -> Optional[Dict[str, Any]]:
    clean_username = (username or "").strip().lower()
    if not clean_username:
        return None
    if USE_MONGO:
        return users.find_one({"username": clean_username}, {"_id": 0})
    return _find_user_by_username(clean_username)


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    if not user_id:
        return None
    if USE_MONGO:
        return users.find_one({"userId": user_id}, {"_id": 0})
    return _find_user_by_id(user_id)


def get_user_name(username: str) -> str:
    user = get_user(username)
    return (user.get("name") or "There") if user else "There"


get_doctor_name = get_user_name


def update_user_profile(
    user_id: str,
    name: Optional[str] = None,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    contact: Optional[str] = None,
) -> bool:
    changes = {}
    if name is not None:
        changes["name"] = name
    if age is not None:
        changes["age"] = age
    if gender is not None:
        changes["gender"] = gender
    if contact is not None:
        changes["contact"] = contact
    if not changes:
        return False
    if USE_MONGO:
        result = users.update_one({"userId": user_id}, {"$set": changes})
        return result.matched_count > 0
    return _update_user(user_id, changes)


def _resolve_user(user_key: Optional[str]) -> Optional[Dict[str, Any]]:
    """Accepts either a userId (U1001) or a username/email."""
    if not user_key:
        return None
    user = get_user_by_id(user_key)
    if user:
        return user
    return get_user(user_key)


def user_public_profile(user: Dict[str, Any]) -> Dict[str, Any]:
    """Profile shape consumed by the UI (legacy 'patient' contract)."""
    return {
        "patientId": user.get("userId"),
        "userId": user.get("userId"),
        "name": user.get("name"),
        "username": user.get("username"),
        "age": user.get("age") if user.get("age") is not None else 0,
        "gender": user.get("gender") or "Other",
        "contact": user.get("contact") or user.get("phone"),
        "doctorUsername": user.get("username"),
        "createdAt": user.get("createdAt"),
    }


# ----------------------------------------------------------------------------
# Records (uploads + analysis results)
# ----------------------------------------------------------------------------
def save_record(
    user_id: str,
    file_name: str,
    file_type: str,
    file_path: str,
    analysis_type: str,
    prediction: Optional[str] = None,
    confidence: Optional[float] = None,
    gradcam_path: Optional[str] = None,
    report_findings: Any = None,
    report_summary: Optional[str] = None,
) -> Dict[str, Any]:
    record_id = f"R_{uuid.uuid4().hex[:8].upper()}"
    document = {
        "recordId": record_id,
        "userId": user_id,
        "fileName": file_name,
        "fileType": file_type,
        "filePath": file_path,
        "analysisType": analysis_type,
        "prediction": prediction,
        "confidence": confidence,
        "gradcamPath": gradcam_path,
        "reportFindings": report_findings,
        "reportSummary": report_summary,
        "note": None,
        "createdAt": _now_iso(),
    }
    if USE_MONGO:
        records.insert_one(dict(document))
    else:
        _insert_record(document)
    return document


def get_records(user_id: str) -> List[Dict[str, Any]]:
    """All records for a user, newest first, in the shape the UI expects."""
    documents = (
        list(records.find({"userId": user_id}))
        if USE_MONGO
        else _records_for_user(user_id)
    )
    history = []
    for doc in documents:
        note = doc.get("note")
        history.append({
            "analysisId": doc.get("recordId"),
            "recordId": doc.get("recordId"),
            "fileId": doc.get("recordId"),
            "fileName": doc.get("fileName", "Unknown File"),
            "fileType": doc.get("fileType", "Unknown"),
            "filePath": doc.get("filePath", ""),
            "analysisType": doc.get("analysisType"),
            "prediction": doc.get("prediction"),
            "confidence": doc.get("confidence"),
            "gradcamPath": doc.get("gradcamPath"),
            "reportFindings": doc.get("reportFindings"),
            "reportSummary": doc.get("reportSummary"),
            "doctorNote": note,
            "doctor_note": note,
            "date": doc.get("createdAt"),
        })
    history.sort(key=lambda item: str(item.get("date") or ""), reverse=True)
    return history


def get_record(record_id: str) -> Optional[Dict[str, Any]]:
    if USE_MONGO:
        return records.find_one({"recordId": record_id})
    return _find_record(record_id)


def update_record_note(record_id: str, note: str) -> bool:
    changes = {"note": note, "doctorNote": note, "doctor_note": note}
    if USE_MONGO:
        result = records.update_one({"recordId": record_id}, {"$set": changes})
        return result.matched_count > 0
    return _update_record(record_id, {"note": note})


def record_file_paths(record_id: str) -> Optional[Dict[str, Any]]:
    doc = get_record(record_id)
    if not doc:
        return None
    return {"filePath": doc.get("filePath"), "gradcamPath": doc.get("gradcamPath")}


def delete_record(record_id: str, user_id: Optional[str] = None) -> bool:
    if USE_MONGO:
        query: Dict[str, Any] = {"recordId": record_id}
        if user_id:
            query["userId"] = user_id
        result = records.delete_one(query)
        return result.deleted_count > 0
    return _delete_record(record_id, user_id)


def record_stats(user_id: str) -> Dict[str, Any]:
    if USE_MONGO:
        total = records.count_documents({"userId": user_id})
        xrays = records.count_documents({"userId": user_id, "analysisType": ANALYSIS_TYPE_XRAY})
        reports = records.count_documents({"userId": user_id, "analysisType": ANALYSIS_TYPE_REPORT})
        latest = records.find_one({"userId": user_id}, sort=[("createdAt", -1)])
    else:
        docs = _records_for_user(user_id)
        total = len(docs)
        xrays = sum(1 for d in docs if d.get("analysisType") == ANALYSIS_TYPE_XRAY)
        reports = sum(1 for d in docs if d.get("analysisType") == ANALYSIS_TYPE_REPORT)
        latest = max(docs, key=lambda d: str(d.get("createdAt") or "")) if docs else None
    return {
        "total": total,
        "xrays": xrays,
        "reports": reports,
        "recent_type": latest.get("analysisType", "None") if latest else "None",
    }


def _short_type(analysis_type: Optional[str]) -> str:
    if analysis_type in ("CT Scan", "Kidney Stone CT", "CT Scan (Kidney)"):
        return "CT Scan"
    if analysis_type in ("Dental Cavity", "Dental X-Ray"):
        return "Dental Cavity"
    if analysis_type == ANALYSIS_TYPE_XRAY:
        return "X-Ray"
    return "Report"


def _abnormal_count(report_findings: Any) -> int:
    if not isinstance(report_findings, list):
        return 0
    return sum(
        1
        for finding in report_findings
        if isinstance(finding, dict)
        and str(finding.get("status", "")).upper() in ("HIGH", "LOW", "ABNORMAL")
    )


def user_dashboard(user_id: str, period: str = "30d") -> Dict[str, Any]:
    days = {"7d": 7, "3m": 90}.get(period, 30)
    now = datetime.datetime.now()
    week_ago = (now - datetime.timedelta(days=7)).isoformat()
    month_ago = (now - datetime.timedelta(days=30)).isoformat()
    window_start = (now - datetime.timedelta(days=days - 1)).date().isoformat()

    docs = (
        list(records.find({"userId": user_id}))
        if USE_MONGO
        else _records_for_user(user_id)
    )
    docs.sort(key=lambda d: str(d.get("createdAt") or ""), reverse=True)

    xrays = [d for d in docs if d.get("analysisType") == ANALYSIS_TYPE_XRAY]
    reports = [d for d in docs if d.get("analysisType") == ANALYSIS_TYPE_REPORT]

    this_week = sum(1 for d in docs if str(d.get("createdAt") or "") >= week_ago)
    this_month = sum(1 for d in docs if str(d.get("createdAt") or "") >= month_ago)

    xray_awaiting = sum(
        1
        for d in xrays
        if not d.get("prediction")
        or (isinstance(d.get("confidence"), (int, float)) and d["confidence"] < 0.50)
    )
    report_awaiting = sum(1 for d in reports if not d.get("prediction"))
    gradcam_count = sum(1 for d in xrays if d.get("gradcamPath"))

    trend_map: Dict[str, Dict[str, int]] = {}
    for doc in docs:
        day = str(doc.get("createdAt") or "")[:10]
        if not day or day < window_start:
            continue
        slot = trend_map.setdefault(day, {"xray": 0, "report": 0})
        if doc.get("analysisType") == ANALYSIS_TYPE_XRAY:
            slot["xray"] += 1
        elif doc.get("analysisType") == ANALYSIS_TYPE_REPORT:
            slot["report"] += 1

    trend_list = []
    for offset in range(days):
        day = (now - datetime.timedelta(days=days - 1 - offset)).date().isoformat()
        values = trend_map.get(day, {"xray": 0, "report": 0})
        trend_list.append({"date": day, "xray": values["xray"], "report": values["report"]})

    distribution = {"COVID-19": 0, "Normal": 0, "Pneumonia": 0, "Tuberculosis": 0}
    for doc in xrays:
        prediction = str(doc.get("prediction") or "").strip().upper()
        if "COVID" in prediction:
            distribution["COVID-19"] += 1
        elif "NORMAL" in prediction:
            distribution["Normal"] += 1
        elif "PNEUMONIA" in prediction:
            distribution["Pneumonia"] += 1
        elif "TUBERCULOSIS" in prediction or "TURBERCULOSIS" in prediction or "TB" in prediction:
            distribution["Tuberculosis"] += 1

    recent_records = []
    for doc in docs[:5]:
        confidence = doc.get("confidence")
        recent_records.append({
            "analysisId": doc.get("recordId"),
            "recordId": doc.get("recordId"),
            "patientId": user_id,
            "type": _short_type(doc.get("analysisType")),
            "result": doc.get("prediction") or "Awaiting Review",
            "confidence": round(confidence, 1) if isinstance(confidence, (int, float)) else None,
            "date": doc.get("createdAt"),
            "fileName": doc.get("fileName") or "Unknown",
        })

    activities = [
        {
            "type": "analysis",
            "text": (
                f"{_short_type(doc.get('analysisType')).replace('X-Ray', 'X-ray')} analyzed: "
                f"{doc.get('prediction') or 'Normal'} findings recorded."
            ),
            "date": doc.get("createdAt"),
        }
        for doc in docs[:5]
    ]

    return {
        "stats": {
            "total_patients": 1,
            "patients_trend": f"+{this_week} this week" if this_week else "No new records",
            "total_analyses": len(docs),
            "analyses_trend": f"+{this_month} this month" if this_month else "No new analyses",
            "total_records": len(docs),
            "total_xray": len(xrays),
            "xray_awaiting": xray_awaiting,
            "total_reports": len(reports),
            "reports_awaiting": report_awaiting,
            "gradcam_analyses": gradcam_count,
        },
        "trends": trend_list,
        "distribution": distribution,
        "recent_analyses": recent_records,
        "activities": activities,
    }


# ----------------------------------------------------------------------------
# Legacy "patient" API -> user-owned records
# ----------------------------------------------------------------------------
def get_all_patients(username: Optional[str] = None) -> List[Dict[str, Any]]:
    user = _resolve_user(username)
    return [user_public_profile(user)] if user else []


def create_patient(
    name: str,
    age: int,
    gender: str,
    contact: Optional[str] = None,
    doctor_username: Optional[str] = None,
) -> Dict[str, Any]:
    """The signed-in user's own profile - creates nothing but updates it."""
    user = _resolve_user(doctor_username)
    if not user:
        raise ValueError("No signed-in user found for this profile update.")
    update_user_profile(user["userId"], name=name, age=age, gender=gender, contact=contact)
    return user_public_profile(get_user_by_id(user["userId"]))


def get_patient(patient_id: str) -> Optional[Dict[str, Any]]:
    user = _resolve_user(patient_id)
    return user_public_profile(user) if user else None


def update_patient(
    patient_id: str,
    name: str,
    age: int,
    gender: str,
    contact: Optional[str] = None,
) -> bool:
    user = _resolve_user(patient_id)
    if not user:
        return False
    return update_user_profile(user["userId"], name=name, age=age, gender=gender, contact=contact)


def archive_patient(patient_id: str) -> bool:
    user = _resolve_user(patient_id)
    if not user:
        return False
    if USE_MONGO:
        result = users.update_one({"userId": user["userId"]}, {"$set": {"archived": 1}})
        return result.matched_count > 0
    return _update_user(user["userId"], {"archived": 1})


def get_patient_history(patient_id: str) -> List[Dict[str, Any]]:
    user = _resolve_user(patient_id)
    return get_records(user["userId"]) if user else []


def save_file_and_result(
    patient_id: str,
    file_name: str,
    file_type: str,
    file_path: str,
    analysis_type: str,
    prediction: Optional[str] = None,
    confidence: Optional[float] = None,
    gradcam_path: Optional[str] = None,
    report_findings: Any = None,
    report_summary: Optional[str] = None,
) -> Dict[str, Any]:
    user = _resolve_user(patient_id)
    if not user:
        raise ValueError(f"Unknown user '{patient_id}'.")
    document = save_record(
        user_id=user["userId"],
        file_name=file_name,
        file_type=file_type,
        file_path=file_path,
        analysis_type=analysis_type,
        prediction=prediction,
        confidence=confidence,
        gradcam_path=gradcam_path,
        report_findings=report_findings,
        report_summary=report_summary,
    )
    return {"file_id": document["recordId"], "analysis_id": document["recordId"]}


def get_patients_registry(username: Optional[str] = None) -> List[Dict[str, Any]]:
    user = _resolve_user(username)
    if not user:
        return []
    docs = (
        list(records.find({"userId": user["userId"]}))
        if USE_MONGO
        else _records_for_user(user["userId"])
    )
    latest = max(docs, key=lambda d: str(d.get("createdAt") or "")) if docs else None
    last_analysis = None
    if latest:
        confidence = latest.get("confidence")
        last_analysis = {
            "type": _short_type(latest.get("analysisType")),
            "result": latest.get("prediction"),
            "confidence": round(confidence, 1) if isinstance(confidence, (int, float)) else None,
            "date": latest.get("createdAt"),
            "abnormalCount": _abnormal_count(latest.get("reportFindings")),
        }
    profile = user_public_profile(user)
    return [{
        "patientId": profile["patientId"],
        "name": profile["name"],
        "age": profile["age"],
        "gender": profile["gender"],
        "contact": profile["contact"],
        "createdAt": profile["createdAt"],
        "lastAnalysis": last_analysis,
    }]


def get_patients_registry_stats(username: Optional[str] = None) -> Dict[str, Any]:
    user = _resolve_user(username)
    if not user:
        return {"total_patients": 0, "active_cases": 0, "analyses_this_month": 0, "recently_added": 0}
    month_start = datetime.datetime.now().replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    ).isoformat()
    recent_cutoff = (datetime.datetime.now() - datetime.timedelta(days=30)).isoformat()

    if USE_MONGO:
        total_records = records.count_documents({"userId": user["userId"]})
        this_month = records.count_documents(
            {"userId": user["userId"], "createdAt": {"$gte": month_start}}
        )
        recent = records.count_documents(
            {"userId": user["userId"], "createdAt": {"$gte": recent_cutoff}}
        )
    else:
        docs = _records_for_user(user["userId"])
        total_records = len(docs)
        this_month = sum(1 for d in docs if str(d.get("createdAt") or "") >= month_start)
        recent = sum(1 for d in docs if str(d.get("createdAt") or "") >= recent_cutoff)

    return {
        "total_patients": 1,
        "active_cases": 1 if total_records else 0,
        "analyses_this_month": this_month,
        "recently_added": recent,
    }


def get_all_analyses_stats(username: Optional[str] = None) -> Dict[str, Any]:
    user = _resolve_user(username)
    if not user:
        return {"total": 0, "xrays": 0, "reports": 0, "recent_type": "None"}
    return record_stats(user["userId"])


def get_dashboard_data(period: str = "30d", doctor_username: Optional[str] = None) -> Dict[str, Any]:
    user = _resolve_user(doctor_username)
    if not user:
        return {"stats": {}, "trends": [], "distribution": {}, "recent_analyses": [], "activities": []}
    return user_dashboard(user["userId"], period)


def delete_analysis(analysis_id: str) -> bool:
    return delete_record(analysis_id)


def update_analysis_note(analysis_id: str, doctor_note: str) -> bool:
    return update_record_note(analysis_id, doctor_note)


def get_analysis_file_paths(analysis_id: str) -> Optional[Dict[str, Any]]:
    return record_file_paths(analysis_id)
