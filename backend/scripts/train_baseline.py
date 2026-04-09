import os
import pickle
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split

def train_baseline():
    print("ML: Starting baseline model training...")
    
    # 1. Generate Synthetic Data
    # Features: [amount, num_orders_24h, ip_len, fp_len]
    np.random.seed(42)
    n_samples = 1000
    
    # Normal samples
    X_normal = np.random.rand(n_samples // 2, 4)
    X_normal[:, 0] *= 5000  # Amount 0-5000
    X_normal[:, 1] *= 5     # Velocity 0-5
    X_normal[:, 2] = np.random.randint(7, 15, n_samples // 2) # IP len
    X_normal[:, 3] = np.random.randint(20, 40, n_samples // 2) # FP len
    y_normal = np.zeros(n_samples // 2)
    
    # Fraud samples
    X_fraud = np.random.rand(n_samples // 2, 4)
    X_fraud[:, 0] = 10000 + X_fraud[:, 0] * 50000 # High Amount
    X_fraud[:, 1] = 15 + X_fraud[:, 1] * 50       # High Velocity
    X_fraud[:, 2] = np.random.randint(3, 30, n_samples // 2)
    X_fraud[:, 3] = np.random.randint(10, 60, n_samples // 2)
    y_fraud = np.ones(n_samples // 2)
    
    X = np.concatenate([X_normal, X_fraud], axis=0).astype(np.float32)
    y = np.concatenate([y_normal, y_fraud], axis=0)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 2. Train XGBoost Model
    print("ML: Training XGBClassifier...")
    model = xgb.XGBClassifier(
        n_estimators=50,
        max_depth=3,
        learning_rate=0.1,
        objective='binary:logistic'
    )
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    print(f"ML: Baseline model accuracy: {accuracy:.4f}")
    
    # 3. Save Model
    target_dir = os.path.join(os.path.dirname(__file__), "..", "ml")
    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, "fraud_xgb.pkl")
    
    with open(target_path, "wb") as f:
        pickle.dump(model, f)
    
    print(f"ML: Model saved successfully to {target_path}")

if __name__ == "__main__":
    train_baseline()
