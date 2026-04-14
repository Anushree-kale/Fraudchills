import os
import sys

# Mocking environment variables
os.environ["HF_TOKEN"] = "mock_token"
os.environ["HF_MODEL_URL"] = "https://huggingface.co/Anushree-028/Fraudchills/resolve/main/fraud_xgb.pkl"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

try:
    from ml.predict_fraud import get_ml_status
    print("Predict Fraud Status:", get_ml_status())
except Exception as e:
    print("Predict Fraud Error:", e)

try:
    from ml.scorer import get_ml_health
    print("Scorer Health:", get_ml_health())
except Exception as e:
    print("Scorer Error:", e)
