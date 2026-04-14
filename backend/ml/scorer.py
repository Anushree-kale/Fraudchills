import os
import pandas as pd
import numpy as np
from typing import Optional
from schemas import ComplaintCreate

# ── Kaggle Dataset Singleton ──────────────────────────────────────────────────
_dataset = None
_model_status = {
    "model_loaded": False,
    "dataset_rows": 0,
    "feature_columns": []
}

import json

def load_ml_resources():
    global _dataset, _model_status
    try:
        # Load pre-calculated stats for optimization
        stats_path = os.path.join(os.path.dirname(__file__), "baseline_stats.json")
        if os.path.exists(stats_path):
            with open(stats_path, "r") as f:
                stats = json.load(f)
            
            _model_status["model_loaded"] = True
            _model_status["dataset_rows"] = stats.get("total_rows", 0)
            _model_status["feature_columns"] = stats.get("feature_columns", [])
            _model_status["avg_amount"] = stats.get("avg_amount", 226.77)
            _model_status["fraud_rate"] = stats.get("fraud_rate", 0.05)
            
            print(f"ML: Loaded optimized baseline stats from {stats_path}")
        else:
            print(f"ML: Optimized stats NOT found at {stats_path}. Run generate_baseline_stats.py first.")
    except Exception as e:
        print(f"ML: Error loading optimized resources: {e}")

# Initial load
load_ml_resources()

def get_ml_health():
    """Standardized health check for Kaggle-based scorer."""
    return {
        "loaded": _model_status["model_loaded"],
        "status": "OK" if _model_status["model_loaded"] else "MISSING",
        "rows": _model_status["dataset_rows"],
        "columns": _model_status["feature_columns"],
    }

def score_complaint(complaint: ComplaintCreate, user_credibility: float = 50.0) -> float:
    """
    Kaggle-driven scoring function using weighted features from the dataset.
    """
    try:
        # Fallback to rule-based if dataset not loaded
        if not _model_status["model_loaded"]:
            return _rule_based_fallback(complaint)

        # 1. Type Weight (Fallback to rule-based since raw data doesn't have fraud_type weights)
        # We can use the global fraud rate from the dataset as a baseline
        base_weight = _model_status.get("fraud_rate", 0.1)
        score = base_weight * 100  # Base score from 0-100 based on global risk
        
        # Adjust based on type if known
        if complaint.type in ["SELLER_FRAUD", "PHISHING", "IDENTITY_THEFT"]:
            score += 20.0

        # 2. Amount Scaling (normalized against average in dataset)
        avg_amt = _model_status.get("avg_amount", 1000.0)

        if complaint.amount > 0 and avg_amt > 0:
            amt_factor = min(complaint.amount / avg_amt, 2.5)
            score += amt_factor * 15  # Up to 37.5 points for high amount

        # 3. Text analysis (keywords)
        text = (complaint.details or "").lower()
        keyword_hits = sum(1 for kw in ["scam", "cheat", "fake", "stolen"] if kw in text)
        score += min(keyword_hits * 5, 20)  # Up to 20 points

        # 4. User Credibility Modifier (Inverse relationship)
        # Higher credibility (closer to 100) reduces the "Fraud" probability for the initial score
        cred_modifier = (100 - user_credibility) / 100
        score = score * cred_modifier

        return round(max(0.0, min(score, 100.0)), 2)

    except Exception as e:
        print(f"ML: Scoring error: {e}, falling back.")
        return _rule_based_fallback(complaint)

def _rule_based_fallback(complaint: ComplaintCreate) -> float:
    score = 30.0 if complaint.type in ["SELLER_FRAUD", "PHISHING"] else 15.0
    if len(complaint.details or "") < 50:
        score += 15.0
    return score

def risk_label(score: float) -> str:
    if score >= 70: return "HIGH"
    if score >= 40: return "MEDIUM"
    return "LOW"