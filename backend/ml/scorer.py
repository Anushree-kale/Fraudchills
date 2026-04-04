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

def load_ml_resources():
    global _dataset, _model_status
    try:
        csv_path = os.path.join(os.path.dirname(__file__), "fraud_data_kaggle.csv")
        if os.path.exists(csv_path):
            _dataset = pd.read_csv(csv_path)
            _model_status["model_loaded"] = True
            _model_status["dataset_rows"] = len(_dataset)
            _model_status["feature_columns"] = _dataset.columns.tolist()
            print(f"ML: Loaded Kaggle dataset from {csv_path}")
        else:
            print(f"ML: Dataset NOT found at {csv_path}")
    except Exception as e:
        print(f"ML: Error loading resources: {e}")

# Initial load
load_ml_resources()

def get_ml_health():
    return {
        "modelLoaded": _model_status["model_loaded"],
        "datasetRows": _model_status["dataset_rows"],
        "featureColumns": _model_status["feature_columns"],
    }

def score_complaint(complaint: ComplaintCreate, user_credibility: float = 50.0) -> float:
    """
    Kaggle-driven scoring function using weighted features from the dataset.
    """
    try:
        # Fallback to rule-based if dataset not loaded
        if not _model_status["model_loaded"]:
            return _rule_based_fallback(complaint)

        # 1. Type Weight (from Kaggle dataset)
        type_row = _dataset[_dataset['fraud_type'] == complaint.type]
        weight = float(type_row['weight'].values[0]) if not type_row.empty else 0.5
        
        score = weight * 50  # Base score from 0-50 based on type risk

        # 2. Amount Scaling (normalized against average in dataset)
        avg_amt = float(type_row['avg_amount'].values[0]) if not type_row.empty else 1000.0
        if complaint.amount > 0 and avg_amt > 0:
            amt_factor = min(complaint.amount / avg_amt, 2.0)
            score += amt_factor * 15  # Up to 30 points for high amount

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