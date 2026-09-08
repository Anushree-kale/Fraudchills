"""
Real-time fraud scoring for POST /predict-fraud.

Uses interpretable heuristics (0–1 scale). Optional XGBoost pickle at ml/fraud_xgb.pkl — if present, blends with heuristics.
"""

from __future__ import annotations

import hashlib
import os
import re
from typing import List, Tuple

import requests

from schemas import FraudPredictRequest

MODEL_URL = os.getenv("HF_MODEL_URL", "https://huggingface.co/Anushree-028/Fraudchills/resolve/main/fraud_xgb.pkl")
_MODEL = None
_MODEL_TRIED = False
_HF_TOKEN = os.getenv("HF_TOKEN")


def _allow_hf_download() -> bool:
    """
    Hugging Face download on first /predict-fraud hit can take 10–30s+ and blocks users.
    On Render (RENDER=true) it is off unless ML_AUTO_DOWNLOAD=true. Locally it stays on
    unless ML_AUTO_DOWNLOAD=false.
    """
    v = os.getenv("ML_AUTO_DOWNLOAD", "").strip().lower()
    if v in ("1", "true", "yes"):
        return True
    if v in ("0", "false", "no"):
        return False
    return os.getenv("RENDER") != "true"


def _download_model(path: str):
    """Download the model from Hugging Face if it doesn't exist."""
    if os.path.exists(path):
        return
    if not _allow_hf_download():
        print("ML: Skipping Hugging Face download (set ML_AUTO_DOWNLOAD=true or bundle ml/fraud_xgb.pkl in the image).")
        return

    print(f"ML: Downloading model from {MODEL_URL}...")
    try:
        headers = {}
        if _HF_TOKEN:
            headers["Authorization"] = f"Bearer {_HF_TOKEN}"
        
        response = requests.get(MODEL_URL, stream=True, timeout=30, headers=headers)
        response.raise_for_status()
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        with open(path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"ML: Model downloaded successfully to {path}")
    except Exception as e:
        print(f"ML: Failed to download model: {e}")


def _load_xgb():
    global _MODEL, _MODEL_TRIED
    if _MODEL_TRIED:
        return _MODEL

    path = os.path.join(os.path.dirname(__file__), "fraud_xgb.pkl")
    _MODEL_TRIED = True

    # Attempt download if missing
    _download_model(path)

    if not os.path.exists(path):
        return None
    try:
        import pickle

        with open(path, "rb") as f:
            _MODEL = pickle.load(f)
        return _MODEL
    except Exception:
        return None


def get_ml_status():
    """Check if the XGBoost model is available."""
    model = _load_xgb()
    return {
        "loaded": model is not None,
        "status": "OK" if model is not None else "MISSING",
        "path": os.path.join(os.path.dirname(__file__), "fraud_xgb.pkl")
    }


def _ip_mismatch_heuristic(ip: str, fingerprint: str) -> Tuple[float, List[str]]:
    """Toy signal: stable hash bucket vs fingerprint hash — not real geo-IP."""
    reasons: List[str] = []
    if not ip or not fingerprint:
        return 0.0, reasons
    ip_bucket = int(hashlib.sha256(ip.encode()).hexdigest()[:8], 16) % 97
    fp_bucket = int(hashlib.sha256(fingerprint.encode()).hexdigest()[:8], 16) % 97
    if abs(ip_bucket - fp_bucket) > 40:
        reasons.append("IP mismatch")
        return 0.22, reasons
    return 0.0, reasons

def score_request(req: FraudPredictRequest, db=None, user=None) -> Tuple[float, bool, str]:
    """
    Returns:
        risk_score: 0–1
        flagged: whether transaction is classified as fraud
        reason: human-readable explanation

    Production scoring:
        35% heuristic score
        65% XGBoost probability

    The heuristic uses the same live feature definitions
    used by the ML model.
    """

    score = 0.08
    reasons: List[str] = []

    # ---------------------------------------------------------
    # Build live features when database/user are available
    # ---------------------------------------------------------

    feats = None

    if db is not None and user is not None:
        try:
            from services.tracing import live_features

            feats = live_features(
                db,
                user,
                amount=req.amount,
                ip=req.ip_address,
                device_fp=req.device_fingerprint,
            )
            
        except Exception as exc:
            print(f"ML: live feature extraction failed: {exc!r}")

    # ---------------------------------------------------------
    # Heuristic signals
    # ---------------------------------------------------------

    # Amount
    if req.amount > 25_000:
        score += 0.18
        reasons.append("High transaction amount")

    elif req.amount > 8_000:
        score += 0.10
        reasons.append("Elevated transaction amount")

    # Order velocity
    if feats is not None:
        velocity = feats["order_velocity_24h"]

        if velocity > 12:
            score += 0.28
            reasons.append("High order velocity")

        elif velocity > 6:
            score += 0.14
            reasons.append("Elevated order velocity")

    else:
        # Fallback when database history is unavailable
        if req.num_orders_last_24h > 12:
            score += 0.28
            reasons.append("High order velocity")

        elif req.num_orders_last_24h > 6:
            score += 0.14
            reasons.append("Elevated order velocity")

    # IP mismatch
    if feats is not None:

        if feats["ip_mismatch"]:
            score += 0.22
            reasons.append("New IP for this account")

    else:
        s, r = _ip_mismatch_heuristic(
            req.ip_address,
            req.device_fingerprint
        )

        score += s
        reasons.extend(r)

    # Device mismatch
    if feats is not None:

        if feats["device_mismatch"]:
            score += 0.10
            reasons.append("New device for this account")

    # Card format check
    if (
        req.card_last4
        and not re.fullmatch(
            r"\d{4}",
            req.card_last4.strip()
        )
    ):
        score += 0.05
        reasons.append("Irregular card pattern")

    # Keep heuristic score within [0,1]
    score = float(
        max(0.0, min(1.0, score))
    )

    # ---------------------------------------------------------
    # XGBoost
    # ---------------------------------------------------------

    xgb = _load_xgb()

    if xgb is not None and feats is not None:

        try:
            import pandas as pd

            X = pd.DataFrame([feats])[
                list(xgb.feature_names_in_)
            ]

            proba = float(
                xgb.predict_proba(X)[0][1]
            )
          
            # Production blend
            score = (
                0.35 * score
                + 0.65 * proba
            )

            reasons.append(
                f"Model score {proba:.2f}"
            )

        except Exception as exc:

            print(
                f"ML: model scoring failed, "
                f"using heuristics only: {exc!r}"
            )

            reasons.append("Model unavailable")

    # ---------------------------------------------------------
    # Final score
    # ---------------------------------------------------------

    score = float(
        max(0.0, min(1.0, score))
    )

    # Tuned production threshold
    flagged = score >= 0.20

    reason = (
        " + ".join(reasons)
        if reasons
        else "Within normal parameters"
    )

    return round(score, 4), flagged, reason