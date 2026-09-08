"""
Train the Fraudchills XGBoost fraud detection model.

Uses the real merged_training_data.csv dataset.

Production features:
    amount
    account_age_days
    transaction_hour
    ip_mismatch
    device_mismatch
    order_velocity_24h
    new_account

Target:
    is_fraud

The trained model is saved to:
    backend/ml/fraud_xgb.pkl
"""

from __future__ import annotations

import os
import pickle

import pandas as pd
import xgboost as xgb

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
)


# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

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

DATASET_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "merged_training_data.csv",
    )
)


# ─────────────────────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────────────────────

def train_baseline():

    print("=" * 70)
    print("FRAUDCHILLS - REAL DATA XGBOOST TRAINING")
    print("=" * 70)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Load dataset
    # ─────────────────────────────────────────────────────────────────────────

    print("\nML: Loading dataset...")
    print(f"ML: Dataset path: {DATASET_PATH}")

    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            f"Dataset not found:\n{DATASET_PATH}\n\n"
            "Place merged_training_data.csv in the project root."
        )

    df = pd.read_csv(DATASET_PATH)

    print(f"ML: Dataset loaded: {len(df):,} rows")
    print(f"ML: Columns: {list(df.columns)}")

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Validate required columns
    # ─────────────────────────────────────────────────────────────────────────

    required_columns = FEATURES + [TARGET]

    missing_columns = [
        col for col in required_columns
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Remove exact duplicate rows
    # ─────────────────────────────────────────────────────────────────────────

    before_duplicates = len(df)

    df = df.drop_duplicates().reset_index(drop=True)

    duplicates_removed = (
        before_duplicates - len(df)
    )

    print(
        f"\nML: Removed exact duplicates: "
        f"{duplicates_removed:,}"
    )

    print(
        f"ML: Rows after duplicate removal: "
        f"{len(df):,}"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Keep only required columns
    # ─────────────────────────────────────────────────────────────────────────

    df = df[required_columns].copy()

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Convert columns to numeric
    # ─────────────────────────────────────────────────────────────────────────

    print("\nML: Converting features to numeric...")

    for column in required_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Remove missing values
    # ─────────────────────────────────────────────────────────────────────────

    before_missing = len(df)

    df = df.dropna(
        subset=required_columns
    ).reset_index(drop=True)

    missing_removed = (
        before_missing - len(df)
    )

    print(
        f"ML: Rows removed because of missing values: "
        f"{missing_removed:,}"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Ensure target is binary
    # ─────────────────────────────────────────────────────────────────────────

    invalid_labels = (
        ~df[TARGET].isin([0, 1])
    ).sum()

    if invalid_labels > 0:
        raise ValueError(
            f"Found {invalid_labels:,} rows with invalid "
            f"{TARGET} values. Expected only 0 or 1."
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Dataset statistics
    # ─────────────────────────────────────────────────────────────────────────

    legitimate = (
        df[TARGET] == 0
    ).sum()

    fraud = (
        df[TARGET] == 1
    ).sum()

    total = len(df)

    print("\n" + "=" * 70)
    print("DATASET SUMMARY")
    print("=" * 70)

    print(f"Total transactions : {total:,}")
    print(f"Legitimate         : {legitimate:,}")
    print(f"Fraud              : {fraud:,}")

    print(
        f"Fraud rate         : "
        f"{(fraud / total) * 100:.2f}%"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # 9. Prepare X and y
    # ─────────────────────────────────────────────────────────────────────────

    X = df[FEATURES].copy()
    y = df[TARGET].astype(int)

    print("\nML: Features used for training:")

    for feature in FEATURES:
        print(f"  - {feature}")

    print(f"\nML: Target: {TARGET}")

    # ─────────────────────────────────────────────────────────────────────────
    # 10. Train/test split
    # ─────────────────────────────────────────────────────────────────────────

    print("\nML: Splitting dataset...")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    print(
        f"ML: Training samples: "
        f"{len(X_train):,}"
    )

    print(
        f"ML: Testing samples: "
        f"{len(X_test):,}"
    )

    # ─────────────────────────────────────────────────────────────────────────
    # 11. Train XGBoost
    # ─────────────────────────────────────────────────────────────────────────

    print("\nML: Training XGBoost model...")

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
    )

    print("ML: XGBoost training complete.")

    # ─────────────────────────────────────────────────────────────────────────
    # 12. Predictions
    # ─────────────────────────────────────────────────────────────────────────

    print("\nML: Evaluating model...")

    probabilities = model.predict_proba(
        X_test
    )[:, 1]

    # Default threshold.
    # We will tune this later based on fraud-detection metrics.
    predictions = (
        probabilities >= 0.20
    ).astype(int)

    # ─────────────────────────────────────────────────────────────────────────
    # 13. Evaluation
    # ─────────────────────────────────────────────────────────────────────────

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0,
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0,
    )

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0,
    )

    roc_auc = roc_auc_score(
        y_test,
        probabilities,
    )

    pr_auc = average_precision_score(
        y_test,
        probabilities,
    )

    print("\n" + "=" * 70)
    print("MODEL PERFORMANCE")
    print("=" * 70)

    print(f"Accuracy  : {accuracy:.4f}")
    print(f"Precision : {precision:.4f}")
    print(f"Recall    : {recall:.4f}")
    print(f"F1 Score  : {f1:.4f}")
    print(f"ROC-AUC   : {roc_auc:.4f}")
    print(f"PR-AUC    : {pr_auc:.4f}")

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            target_names=[
                "Legitimate",
                "Fraud",
            ],
            zero_division=0,
        )
    )

    print("Confusion Matrix:")
    print(
        confusion_matrix(
            y_test,
            predictions,
        )
    )

    # ─────────────────────────────────────────────────────────────────────────
    # 14. Feature importance
    # ─────────────────────────────────────────────────────────────────────────

    print("\n" + "=" * 70)
    print("FEATURE IMPORTANCE")
    print("=" * 70)

    importance = pd.Series(
        model.feature_importances_,
        index=FEATURES,
    ).sort_values(
        ascending=False
    )

    for feature, value in importance.items():
        print(
            f"{feature:25s}: "
            f"{value:.4f}"
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 15. Verify model feature names
    # ─────────────────────────────────────────────────────────────────────────

    print("\n" + "=" * 70)
    print("MODEL FEATURES")
    print("=" * 70)

    print(
        list(model.feature_names_in_)
    )

    # ─────────────────────────────────────────────────────────────────────────
    # 16. Save model
    # ─────────────────────────────────────────────────────────────────────────

    target_dir = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "ml",
        )
    )

    os.makedirs(
        target_dir,
        exist_ok=True,
    )

    target_path = os.path.join(
        target_dir,
        "fraud_xgb.pkl",
    )

    with open(
        target_path,
        "wb",
    ) as f:
        pickle.dump(
            model,
            f,
        )

    print("\n" + "=" * 70)
    print("MODEL SAVED")
    print("=" * 70)

    print(
        f"ML: Model saved successfully to:"
    )

    print(target_path)

    print("\nML: Training completed successfully.")


if __name__ == "__main__":
    train_baseline()