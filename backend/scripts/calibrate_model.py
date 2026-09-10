"""
Fraudchills - XGBoost probability calibration analysis.

This script does NOT replace the current production model.

It recreates the same deduplicated dataset and original 80/20 split,
uses half of the untouched test portion for calibration and the other
half for final evaluation, then compares raw vs calibrated probabilities.
"""

from __future__ import annotations

import os
import pickle

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split


FEATURES = [
    "amount",
    "account_age_days",
    "transaction_hour",
    "ip_mismatch",
    "device_mismatch",
    "order_velocity_24h",
    "new_account",
]
TARGET = "is_fraud"

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATASET_PATH = os.path.join(BASE_DIR, "merged_training_data.csv")
MODEL_PATH = os.path.join(BASE_DIR, "backend", "ml", "fraud_xgb.pkl")


def fit_sigmoid_calibrator(raw_probabilities, y):
    p = np.clip(np.asarray(raw_probabilities, dtype=float), 1e-6, 1 - 1e-6)
    logit = np.log(p / (1.0 - p)).reshape(-1, 1)

    calibrator = LogisticRegression(
        solver="lbfgs",
        max_iter=1000,
        random_state=42,
    )
    calibrator.fit(logit, np.asarray(y, dtype=int))
    return calibrator


def apply_calibration(calibrator, raw_probabilities):
    p = np.clip(np.asarray(raw_probabilities, dtype=float), 1e-6, 1 - 1e-6)
    logit = np.log(p / (1.0 - p)).reshape(-1, 1)
    return calibrator.predict_proba(logit)[:, 1]


def threshold_table(probabilities, y):
    thresholds = [
        0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40,
        0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80,
    ]

    rows = []
    for threshold in thresholds:
        pred = (probabilities >= threshold).astype(int)
        rows.append({
            "threshold": threshold,
            "precision": precision_score(y, pred, zero_division=0),
            "recall": recall_score(y, pred, zero_division=0),
            "f1": f1_score(y, pred, zero_division=0),
        })

    return pd.DataFrame(rows)


def main():
    print("=" * 70)
    print("FRAUDCHILLS - PROBABILITY CALIBRATION ANALYSIS")
    print("=" * 70)

    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    print("\nML: Loading dataset...")
    df = pd.read_csv(DATASET_PATH)
    print(f"ML: Original rows: {len(df):,}")

    df = df.drop_duplicates().reset_index(drop=True)
    print(f"ML: After duplicate removal: {len(df):,}")

    required = FEATURES + [TARGET]
    df = df[required].copy()

    for column in required:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=required).reset_index(drop=True)

    if not df[TARGET].isin([0, 1]).all():
        raise ValueError(f"{TARGET} must contain only 0 and 1.")

    X = df[FEATURES].copy()
    y = df[TARGET].astype(int)

    # Recreate the same original split used by train_baseline.py.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    # The current model was trained on X_train/y_train.
    # Split the untouched X_test/y_test into calibration and final evaluation.
    X_cal, X_eval, y_cal, y_eval = train_test_split(
        X_test,
        y_test,
        test_size=0.50,
        random_state=42,
        stratify=y_test,
    )

    print(f"\nOriginal training portion: {len(X_train):,}")
    print(f"Original test portion    : {len(X_test):,}")
    print(f"Calibration set          : {len(X_cal):,}")
    print(f"Final evaluation set     : {len(X_eval):,}")

    print("\nML: Loading current fraud_xgb.pkl...")
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)

    print(f"ML: Model features: {list(model.feature_names_in_)}")

    raw_cal = model.predict_proba(X_cal)[:, 1]
    raw_eval = model.predict_proba(X_eval)[:, 1]

    print("\nML: Fitting sigmoid (Platt) calibration...")
    calibrator = fit_sigmoid_calibrator(raw_cal, y_cal)
    calibrated_eval = apply_calibration(calibrator, raw_eval)

    raw_brier = brier_score_loss(y_eval, raw_eval)
    calibrated_brier = brier_score_loss(y_eval, calibrated_eval)

    raw_auc = roc_auc_score(y_eval, raw_eval)
    calibrated_auc = roc_auc_score(y_eval, calibrated_eval)

    raw_pr_auc = average_precision_score(y_eval, raw_eval)
    calibrated_pr_auc = average_precision_score(y_eval, calibrated_eval)

    print("\n" + "=" * 70)
    print("RAW vs CALIBRATED")
    print("=" * 70)
    print(f"Raw Brier score        : {raw_brier:.6f}")
    print(f"Calibrated Brier score : {calibrated_brier:.6f}")
    print(f"\nRaw ROC-AUC            : {raw_auc:.4f}")
    print(f"Calibrated ROC-AUC     : {calibrated_auc:.4f}")
    print(f"\nRaw PR-AUC             : {raw_pr_auc:.4f}")
    print(f"Calibrated PR-AUC      : {calibrated_pr_auc:.4f}")

    print("\nProbability averages:")
    print(f"Raw mean probability        : {raw_eval.mean():.4f}")
    print(f"Calibrated mean probability : {calibrated_eval.mean():.4f}")
    print(f"Actual fraud rate           : {y_eval.mean():.4f}")

    table = threshold_table(calibrated_eval, y_eval)

    print("\n" + "=" * 70)
    print("CALIBRATED THRESHOLD EVALUATION")
    print("=" * 70)
    print(table.to_string(
        index=False,
        formatters={
            "threshold": "{:.2f}".format,
            "precision": "{:.4f}".format,
            "recall": "{:.4f}".format,
            "f1": "{:.4f}".format,
        },
    ))

    best_f1 = table.loc[table["f1"].idxmax()]
    print("\nBest F1 threshold:")
    print(
        f"  threshold={best_f1['threshold']:.2f}, "
        f"precision={best_f1['precision']:.4f}, "
        f"recall={best_f1['recall']:.4f}, "
        f"f1={best_f1['f1']:.4f}"
    )

    acceptable = table[table["precision"] >= 0.20]
    if not acceptable.empty:
        best_recall = acceptable.loc[acceptable["recall"].idxmax()]
        print("\nBest recall with precision >= 20%:")
        print(
            f"  threshold={best_recall['threshold']:.2f}, "
            f"precision={best_recall['precision']:.4f}, "
            f"recall={best_recall['recall']:.4f}, "
            f"f1={best_recall['f1']:.4f}"
        )

    print("\n" + "=" * 70)
    print("CALIBRATION COMPLETE")
    print("=" * 70)
    print("fraud_xgb.pkl was NOT modified.")
    print("Review the results before changing production scoring.")


if __name__ == "__main__":
    main()
