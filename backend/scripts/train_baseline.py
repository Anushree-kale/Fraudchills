import os
import pickle
import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


FEATURES = [
    "amount",
    "account_age_days",
    "transaction_hour",
    "ip_mismatch",
    "device_mismatch",
    "order_velocity_24h",
    "prior_complaints",
]


def train_baseline():
    print("ML: Starting 7-feature baseline model training...")

    np.random.seed(42)
    n_samples = 2000

    # ------------------------------------------------------------
    # 1. Generate synthetic training data
    # ------------------------------------------------------------

    X = pd.DataFrame({
        "amount": np.random.uniform(10, 50000, n_samples),

        "account_age_days": np.random.randint(
            1, 1500, n_samples
        ),

        "transaction_hour": np.random.randint(
            0, 24, n_samples
        ),

        "ip_mismatch": np.random.randint(
            0, 2, n_samples
        ),

        "device_mismatch": np.random.randint(
            0, 2, n_samples
        ),

        "order_velocity_24h": np.random.randint(
            0, 30, n_samples
        ),

        "prior_complaints": np.random.randint(
            0, 10, n_samples
        ),
    })

    # ------------------------------------------------------------
    # 2. Create synthetic fraud labels
    #
    # These rules are ONLY for creating a baseline training set.
    # They are not the final production fraud rules.
    # ------------------------------------------------------------

    fraud_signal = (
        (X["amount"] > 10000).astype(int)
        + (X["account_age_days"] < 30).astype(int)
        + (X["ip_mismatch"] == 1).astype(int)
        + (X["device_mismatch"] == 1).astype(int)
        + (X["order_velocity_24h"] > 10).astype(int)
        + (X["prior_complaints"] > 2).astype(int)
    )

    # Fraud when several suspicious signals occur together.
    y = (fraud_signal >= 3).astype(int)

    print(f"ML: Normal samples: {(y == 0).sum()}")
    print(f"ML: Fraud samples: {(y == 1).sum()}")

    # ------------------------------------------------------------
    # 3. Train/test split
    # ------------------------------------------------------------

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # ------------------------------------------------------------
    # 4. Train XGBoost
    # ------------------------------------------------------------

    print("ML: Training XGBClassifier...")

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )

    model.fit(X_train, y_train)

    # ------------------------------------------------------------
    # 5. Evaluate
    # ------------------------------------------------------------

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print(f"ML: Baseline model accuracy: {accuracy:.4f}")
    print("\nClassification report:")
    print(classification_report(y_test, predictions))

    # Verify that the model contains exactly the features
    print("\nML: Model features:")
    print(list(model.feature_names_in_))

    # ------------------------------------------------------------
    # 6. Save model
    # ------------------------------------------------------------

    target_dir = os.path.join(
        os.path.dirname(__file__),
        "..",
        "ml",
    )

    target_dir = os.path.abspath(target_dir)

    os.makedirs(target_dir, exist_ok=True)

    target_path = os.path.join(
        target_dir,
        "fraud_xgb.pkl",
    )

    with open(target_path, "wb") as f:
        pickle.dump(model, f)

    print(f"\nML: Model saved successfully to:")
    print(target_path)


if __name__ == "__main__":
    train_baseline()