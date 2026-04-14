"""
Fraudchills - Dataset Merger & XGBoost Retrainer
=================================================
Combines multiple fraud datasets into a unified feature schema
and retrains fraud_xgb.pkl.

Supported datasets:
  1. Fraudulent E-Commerce Transactions (PRIMARY)
  2. IEEE-CIS Fraud Detection (SECONDARY)
  3. Credit Card Fraud Detection (OPTIONAL)
  4. PaySim (OPTIONAL / skip if not relevant)

Usage:
  1. Download datasets from Kaggle and place CSVs in  ml/raw_data/
  2. Run:  python merge_and_retrain.py
  3. Output: ml/fraud_xgb.pkl  (replaces old model)
             ml/merged_training_data.csv  (full merged dataset)
"""

import os
import warnings
import pickle
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore")

# ─── Paths ───────────────────────────────────────────────────────────────────

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
RAW_DIR    = os.path.join(BASE_DIR, "ml", "raw_data")
OUTPUT_PKL = os.path.join(BASE_DIR, "ml", "fraud_xgb.pkl")
OUTPUT_CSV = os.path.join(BASE_DIR, "ml", "merged_training_data.csv")

os.makedirs(RAW_DIR, exist_ok=True)

# ─── Target schema (unified feature set) ─────────────────────────────────────

FEATURE_COLS = [
    "amount",
    "account_age_days",
    "transaction_hour",
    "ip_mismatch",
    "device_mismatch",
    "order_velocity_24h",
    "prior_complaints"
]
LABEL_COL = "is_fraud"


def get_xgb_device_params():
    """Check if CUDA is available and supported by XGBoost."""
    try:
        # Dummy fit to test CUDA initialization
        dummy_model = XGBClassifier(tree_method="hist", device="cuda", n_estimators=1)
        dummy_model.fit(np.zeros((10, 2)), np.zeros(10))
        print("  [SUCCESS] CUDA detected! GPU acceleration enabled.")
        return {"tree_method": "hist", "device": "cuda"}
    except Exception as e:
        print(f"  [!] CUDA not available or failed to initialize ({str(e).splitlines()[0]}).")
        print("      Falling back to CPU gracefully.")
        return {"tree_method": "hist", "device": "cpu"}


# ═════════════════════════════════════════════════════════════════════════════
# DATASET LOADERS
# ═════════════════════════════════════════════════════════════════════════════

def load_ecommerce(path: str) -> pd.DataFrame:
    print("  Loading E-Commerce dataset...")
    df = pd.read_csv(path)

    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    out = pd.DataFrame()
    out["amount"]             = pd.to_numeric(df.get("transaction_amount", df.get("amount", 0)), errors="coerce").fillna(0)
    out["account_age_days"]   = pd.to_numeric(df.get("account_age_days", 0), errors="coerce").fillna(0)
    out["transaction_hour"]   = pd.to_numeric(df.get("transaction_hour", 12), errors="coerce").fillna(12)
    out["order_velocity_24h"] = pd.to_numeric(df.get("quantity", 1), errors="coerce").fillna(1)
    out["prior_complaints"]   = 0

    if "billing_address" in df.columns and "shipping_address" in df.columns:
        out["ip_mismatch"] = (df["billing_address"] != df["shipping_address"]).astype(int)
    elif "ip_address" in df.columns:
        out["ip_mismatch"] = df["ip_address"].duplicated(keep=False).astype(int)
    else:
        out["ip_mismatch"] = 0

    if "device_used" in df.columns:
        device_enc = df["device_used"].str.lower().map({"mobile": 0, "desktop": 1, "tablet": 2}).fillna(1)
        out["device_mismatch"] = (device_enc == 0).astype(int)
    else:
        out["device_mismatch"] = 0

    out["new_account"] = (out["account_age_days"] < 30).astype(int)
    out["is_fraud"]    = pd.to_numeric(df.get("is_fraudulent", df.get("is_fraud", 0)), errors="coerce").fillna(0).astype(int)

    out["_source"] = "ecommerce"
    print(f"    -> {len(out):,} rows | fraud rate: {out['is_fraud'].mean():.2%}")
    return out


def load_ieee(transaction_path: str, identity_path: str = None) -> pd.DataFrame:
    print("  Loading IEEE-CIS dataset...")
    df = pd.read_csv(transaction_path)

    if identity_path and os.path.exists(identity_path):
        identity = pd.read_csv(identity_path)
        df = df.merge(identity, on="TransactionID", how="left")

    out = pd.DataFrame()
    out["amount"]             = pd.to_numeric(df.get("TransactionAmt", 0), errors="coerce").fillna(0)
    out["account_age_days"]   = 180
    out["transaction_hour"]   = pd.to_numeric(
        df.get("TransactionDT", pd.Series([43200] * len(df))) // 3600 % 24, errors="coerce"
    ).fillna(12).astype(int)
    out["order_velocity_24h"] = 1

    if "DeviceType" in df.columns:
        out["device_mismatch"] = (df["DeviceType"].str.lower() == "mobile").astype(int)
    else:
        out["device_mismatch"] = 0

    if "P_emaildomain" in df.columns and "R_emaildomain" in df.columns:
        out["ip_mismatch"] = (df["P_emaildomain"] != df["R_emaildomain"]).astype(int)
    else:
        out["ip_mismatch"] = 0

    out["prior_complaints"] = 0
    out["new_account"]      = 0
    out["is_fraud"]         = pd.to_numeric(df.get("isFraud", 0), errors="coerce").fillna(0).astype(int)

    out["_source"] = "ieee"
    print(f"    -> {len(out):,} rows | fraud rate: {out['is_fraud'].mean():.2%}")
    return out


def load_creditcard(path: str) -> pd.DataFrame:
    print("  Loading Credit Card dataset...")
    df = pd.read_csv(path)

    out = pd.DataFrame()
    out["amount"]             = pd.to_numeric(df.get("Amount", 0), errors="coerce").fillna(0)
    out["account_age_days"]   = 365
    out["transaction_hour"]   = (pd.to_numeric(df.get("Time", 0), errors="coerce").fillna(0) // 3600 % 24).astype(int)
    out["order_velocity_24h"] = 1

    v14 = pd.to_numeric(df.get("V14", 0), errors="coerce").fillna(0)
    v17 = pd.to_numeric(df.get("V17", 0), errors="coerce").fillna(0)
    out["ip_mismatch"]      = (v14.abs() > 2).astype(int)
    out["device_mismatch"]  = (v17.abs() > 2).astype(int)
    out["prior_complaints"] = 0
    out["new_account"]      = 0
    out["is_fraud"]         = pd.to_numeric(df.get("Class", 0), errors="coerce").fillna(0).astype(int)

    out["_source"] = "creditcard"
    print(f"    -> {len(out):,} rows | fraud rate: {out['is_fraud'].mean():.2%}")
    return out


def load_paysim(path: str) -> pd.DataFrame:
    print("  Loading PaySim dataset...")
    df = pd.read_csv(path)

    df = df[df["type"].isin(["TRANSFER", "CASH_OUT"])]

    # Cap at 1.5M rows
    if len(df) > 1500000:
        print(f"    PaySim cap triggered: Reducing from {len(df):,} to 1.5M rows...")
        df = df.sample(n=1500000, random_state=42)

    out = pd.DataFrame()
    out["amount"]             = pd.to_numeric(df.get("amount", 0), errors="coerce").fillna(0)
    out["account_age_days"]   = 90
    out["transaction_hour"]   = pd.to_numeric(df.get("step", 12), errors="coerce").fillna(12) % 24

    old_bal = pd.to_numeric(df.get("oldbalanceOrg", 1), errors="coerce").fillna(1)
    new_bal = pd.to_numeric(df.get("newbalanceOrig", 0), errors="coerce").fillna(0)
    out["ip_mismatch"]        = ((old_bal > 0) & (new_bal == 0)).astype(int)
    out["device_mismatch"]    = 0
    out["order_velocity_24h"] = 1
    out["prior_complaints"]   = 0
    out["new_account"]        = 0
    out["is_fraud"]           = pd.to_numeric(df.get("isFraud", 0), errors="coerce").fillna(0).astype(int)

    out["_source"] = "paysim"
    print(f"    -> {len(out):,} rows | fraud rate: {out['is_fraud'].mean():.2%}")
    return out


# ═════════════════════════════════════════════════════════════════════════════
# MERGE
# ═════════════════════════════════════════════════════════════════════════════

def merge_datasets() -> pd.DataFrame:
    frames = []

    p = os.path.join(RAW_DIR, "ecommerce_fraud.csv")
    if os.path.exists(p):
        frames.append(load_ecommerce(p))
    else:
        print(f"  [SKIP] ecommerce_fraud.csv not found in {RAW_DIR}")

    p_txn = os.path.join(RAW_DIR, "ieee_train_transaction.csv")
    p_id  = os.path.join(RAW_DIR, "ieee_train_identity.csv")
    if os.path.exists(p_txn):
        frames.append(load_ieee(p_txn, p_id if os.path.exists(p_id) else None))
    else:
        print(f"  [SKIP] ieee_train_transaction.csv not found in {RAW_DIR}")

    p = os.path.join(RAW_DIR, "creditcard.csv")
    if os.path.exists(p):
        frames.append(load_creditcard(p))
    else:
        print(f"  [SKIP] creditcard.csv not found in {RAW_DIR}")

    p = os.path.join(RAW_DIR, "paysim.csv")
    if os.path.exists(p):
        frames.append(load_paysim(p))
    else:
        print(f"  [SKIP] paysim.csv not found in {RAW_DIR}")

    if not frames:
        raise FileNotFoundError(
            f"No datasets found in {RAW_DIR}. "
            "Download at least one dataset from Kaggle and rename it as shown in the header."
        )

    merged = pd.concat(frames, ignore_index=True)
    print(f"\n  Total merged rows : {len(merged):,}")
    print(f"  Overall fraud rate: {merged['is_fraud'].mean():.2%}")
    return merged


# ═════════════════════════════════════════════════════════════════════════════
# TRAIN
# ═════════════════════════════════════════════════════════════════════════════

def train(df: pd.DataFrame):
    X = df[FEATURE_COLS].copy()
    y = df[LABEL_COL].copy()

    X["amount"]             = X["amount"].clip(upper=X["amount"].quantile(0.999))
    X["account_age_days"]   = X["account_age_days"].clip(upper=3650)
    X["order_velocity_24h"] = X["order_velocity_24h"].clip(upper=50)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    neg  = (y_train == 0).sum()
    pos  = (y_train == 1).sum()
    ratio = neg / pos if pos > 0 else 1
    
    # Cap scale_pos_weight at 12 to prevent over-flagging / dominating precision
    capped_ratio = min(ratio, 12.0)
    print(f"\n  Class imbalance ratio (neg/pos): {ratio:.1f}x")
    print(f"  Capping scale_pos_weight at {capped_ratio:.1f} to stabilize precision.")

    # Get device configuration dynamically based on CUDA availability
    device_params = get_xgb_device_params()

    model = XGBClassifier(
        n_estimators      = 300,
        max_depth         = 6,
        learning_rate     = 0.05,
        subsample         = 0.8,
        colsample_bytree  = 0.8,
        scale_pos_weight  = capped_ratio,
        eval_metric       = "aucpr",
        random_state      = 42,
        n_jobs            = -1,
        **device_params
    )

    print("\n  Training XGBoost...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    # Evaluation
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\n" + "="*50)
    print("EVALUATION RESULTS")
    print("="*50)
    print(classification_report(y_test, y_pred, target_names=["Legit", "Fraud"]))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, y_proba):.4f}")

    # Feature importance
    print("\nFeature Importances:")
    for feat, imp in sorted(zip(FEATURE_COLS, model.feature_importances_), key=lambda x: -x[1]):
        bar = "#" * int(imp * 40)
        print(f"  {feat:<22} {bar} {imp:.4f}")

    return model


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  Fraudchills — Dataset Merger & Model Retrainer")
    print("=" * 60)
    
    # Check CUDA gracefully on startup
    print("\n[0/3] Checking environment...")
    get_xgb_device_params()

    print("\n[1/3] Scanning for datasets...")
    merged_df = merge_datasets()

    print("\n[2/3] Saving merged dataset...")
    merged_df.to_csv(OUTPUT_CSV, index=False)
    print(f"  Saved -> {OUTPUT_CSV}")

    print("\n[3/3] Training XGBoost model...")
    model = train(merged_df)

    with open(OUTPUT_PKL, "wb") as f:
        pickle.dump(model, f)
    print(f"\n  Model saved -> {OUTPUT_PKL}")
    print("\n  Done! Your fraud_xgb.pkl has been updated.")
    print("  Restart your FastAPI server to load the new model.")
