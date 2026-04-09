import json
import os
import shutil
import uuid
from uuid import UUID
from fastapi.middleware.cors import CORSMiddleware


from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import traceback

from auth import get_current_user
from database import Base, engine, get_db
from jobs import start_scheduler
import models
import schemas
from dotenv import load_dotenv

# Try loading from current dir, then from parent (root)
load_dotenv()
if not os.getenv("DATABASE_URL"):
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from routers import activity, admin, analytics, api, auth_api, brands, cases, complaints, dashboard, users

# Create tables
Base.metadata.create_all(bind=engine)

# Start background jobs (non-fatal if the host disallows background threads)
try:
    start_scheduler()
except Exception as exc:
    print(f"Warning: background scheduler not started: {exc}")

app = FastAPI(
    title="Fraudchills API",
    description="Backend for the Fraudchills Platform",
    version="1.0.0",
    # ── FIX: prevent 307 redirects at the app level ──────────────────────
    # Without this, POST /complaints → 307 → /complaints/ which causes
    # Node fetch to re-slice the already-consumed ArrayBuffer in the BFF.
    redirect_slashes=False,
)

# Ensure uploads directory exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static files for serving uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS middleware — must be before routes (comma-separated). Override with CLIENT_URL in .env / host env.
_default_origins = "https://fraudchills.vercel.app"
CLIENT_ORIGINS = [
    o.strip()
    for o in os.getenv("CLIENT_URL", _default_origins).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CLIENT_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DEBUGGING: Global Exception Handler ───────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"ERROR: {exc}\n{tb}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "traceback": tb.split("\n")
        }
    )

# ── File Upload ────────────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".pdf"}
MAX_FILE_SIZE_MB = 10

@app.post("/upload", tags=["Upload"])
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    raw_name = file.filename or "upload"
    ext = os.path.splitext(raw_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed.")

    # Read and check size
    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit.")

    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    # Generate dynamic URL based on request host (e.g. Render)
    base_url = str(request.base_url).rstrip("/")
    return {"fileUrl": f"{base_url}/uploads/{unique_filename}"}

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(complaints.router, prefix="/complaints", tags=["Complaints"])
app.include_router(brands.router, prefix="/brands", tags=["Brands"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(api.router, prefix="/api", tags=["B2B API"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(auth_api.router, prefix="/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(cases.router, prefix="/cases", tags=["Cases"])
app.include_router(activity.router, prefix="/activity", tags=["Activity"])

# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def read_root():
    from ml.predict_fraud import get_ml_status
    from ml.scorer import get_ml_health
    ml_status = get_ml_status()["loaded"] and get_ml_health()["loaded"]
    return {
        "message": "Fraudchills API is running",
        "version": "1.0.0",
        "ml_engine": "ACTIVE" if ml_status else "DEGRADED"
    }


@app.get("/health/ml", tags=["Health"])
def get_ml_health_combined():
    """Aggregated health status of all ML components."""
    from ml.predict_fraud import get_ml_status
    from ml.scorer import get_ml_health
    return {
        "xgboost_model": get_ml_status(),
        "kaggle_dataset": get_ml_health()
    }

@app.get("/debug/schema", tags=["Debug"])
def debug_schema(db: Session = Depends(get_db)):
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = {}
    for table_name in inspector.get_table_names():
        tables[table_name] = [c['name'] for c in inspector.get_columns(table_name)]
    
    # Check for missing columns in complaints
    required = ["platform", "order_id", "amount", "score", "deadline", "proof_urls", "external_links"]
    missing = [c for c in required if c not in tables.get("complaints", [])]
    
    return {
        "tables": list(tables.keys()),
        "complaints_columns": tables.get("complaints", []),
        "missing_complaints_columns": missing,
        "status": "MISSING_COLUMNS" if missing else "OK"
    }


@app.post(
    "/predict-fraud",
    response_model=schemas.FraudPredictResponse,
    tags=["ML"],
)
def predict_fraud(
    body: schemas.FraudPredictRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Real-time fraud score (0–1) with audit row in fraud_logs."""
    from ml.predict_fraud import score_request

    risk, flagged, reason = score_request(body)
    complaint_uuid = None
    if body.complaint_id:
        try:
            complaint_uuid = UUID(body.complaint_id)
        except ValueError:
            complaint_uuid = None

    log = models.FraudLog(
        complaint_id=complaint_uuid,
        user_id=current_user.id,
        risk_score=risk,
        reason=reason,
        raw_payload=json.dumps(body.model_dump()),
    )
    try:
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
        # Still return score if logging fails (e.g. missing fraud_logs table)
        pass

    return schemas.FraudPredictResponse(risk_score=risk, flagged=flagged, reason=reason)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)