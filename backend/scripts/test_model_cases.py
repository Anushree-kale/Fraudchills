import joblib
import pandas as pd


MODEL_PATH = "ml/fraud_xgb.pkl"

FEATURES = [
    "amount",
    "account_age_days",
    "transaction_hour",
    "ip_mismatch",
    "device_mismatch",
    "order_velocity_24h",
    "new_account",
]


model = joblib.load(MODEL_PATH)


cases = {
    "Case A - Normal": {
        "amount": 500,
        "account_age_days": 365,
        "transaction_hour": 10,
        "ip_mismatch": 0,
        "device_mismatch": 0,
        "order_velocity_24h": 1,
        "new_account": 0,
    },

    "Case B - Suspicious": {
        "amount": 50000,
        "account_age_days": 0,
        "transaction_hour": 10,
        "ip_mismatch": 0,
        "device_mismatch": 0,
        "order_velocity_24h": 9,
        "new_account": 1,
    },

    "Case C - Very Suspicious": {
        "amount": 50000,
        "account_age_days": 0,
        "transaction_hour": 10,
        "ip_mismatch": 1,
        "device_mismatch": 1,
        "order_velocity_24h": 20,
        "new_account": 1,
    },
}


for name, values in cases.items():

    X = pd.DataFrame([values])[FEATURES]

    probability = float(
        model.predict_proba(X)[0][1]
    )

    print("=" * 60)
    print(name)
    print(f"Features: {values}")
    print(f"Fraud probability: {probability:.4f}")
    print(f"Fraud probability: {probability * 100:.2f}%")