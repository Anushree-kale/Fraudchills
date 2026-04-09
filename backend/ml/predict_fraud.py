"""
Real-time fraud scoring for POST /predict-fraud.

Uses interpretable heuristics (0–1 scale). Optional XGBoost pickle at ml/fraud_xgb.pkl — if present, blends with heuristics.
"""

from __future__ import annotations

import hashlib
import os
import re
from typing import List, Tuple

import numpy as np

from schemas import FraudPredictRequest

_MODEL = None
_MODEL_TRIED = False


def _load_xgb():
    global _MODEL, _MODEL_TRIED
    if _MODEL_TRIED:
        return _MODEL

    path = os.path.join(os.path.dirname(__file__), "fraud_xgb.pkl")
    _MODEL_TRIED = True

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


def score_request(req: FraudPredictRequest) -> Tuple[float, bool, str]:
    """
    Returns risk_score in [0,1], flagged bool, human reason string.
    """
    score = 0.08
    reasons: List[str] = []

    if req.amount > 25_000:
        score += 0.18
        reasons.append("High transaction amount")
    elif req.amount > 8_000:
        score += 0.1

    if req.num_orders_last_24h > 12:
        score += 0.28
        reasons.append("High order velocity")
    elif req.num_orders_last_24h > 6:
        score += 0.14
        reasons.append("Elevated order velocity")

    s, r = _ip_mismatch_heuristic(req.ip_address, req.device_fingerprint)
    score += s
    reasons.extend(r)

    if req.card_last4 and not re.fullmatch(r"\d{4}", req.card_last4.strip()):
        score += 0.05
        reasons.append("Irregular card pattern")

    xgb = _load_xgb()
    if xgb is not None:
        try:
            X = np.array(
                [[req.amount, req.num_orders_last_24h, float(len(req.ip_address)), float(len(req.device_fingerprint))]],
                dtype=np.float32,
            )
            proba = float(xgb.predict_proba(X)[0][1])
            score = 0.5 * score + 0.5 * proba
            reasons.append("Model blend (XGBoost)")
        except Exception:
            pass

    score = float(max(0.0, min(1.0, score)))
    flagged = score >= 0.65
    reason = " + ".join(reasons) if reasons else "Within normal parameters"
    return round(score, 4), flagged, reason
