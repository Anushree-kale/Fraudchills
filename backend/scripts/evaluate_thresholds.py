import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score, confusion_matrix


CSV_PATH = "C:/Users/kalea/OneDrive/Desktop/Fraudchills/merged_training_data.csv"
MODEL_PATH = "C:/Users/kalea/OneDrive/Desktop/Fraudchills/backend/ml/fraud_xgb.pkl"
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


print("Loading dataset...")
df = pd.read_csv(CSV_PATH)

print(f"Original rows: {len(df):,}")

# Same duplicate removal used during training
df = df.drop_duplicates().reset_index(drop=True)

# Keep required columns
df = df[FEATURES + [TARGET]]

# Ensure numeric
for col in FEATURES + [TARGET]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna().reset_index(drop=True)

X = df[FEATURES]
y = df[TARGET].astype(int)

# Reproduce the same test split used during training
_, X_test, _, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    stratify=y,
    random_state=42,
)

print(f"Test rows: {len(X_test):,}")
print(f"Fraud cases in test: {y_test.sum():,}")

# Load trained model
print("\nLoading model...")
model = joblib.load(MODEL_PATH)

# Fraud probability
probabilities = model.predict_proba(X_test)[:, 1]

print("\n" + "=" * 80)
print("THRESHOLD ANALYSIS")
print("=" * 80)

results = []

thresholds = np.arange(0.05, 0.81, 0.05)

for threshold in thresholds:

    predictions = (probabilities >= threshold).astype(int)

    precision = precision_score(
        y_test,
        predictions,
        zero_division=0
    )

    recall = recall_score(
        y_test,
        predictions,
        zero_division=0
    )

    f1 = f1_score(
        y_test,
        predictions,
        zero_division=0
    )

    tn, fp, fn, tp = confusion_matrix(
        y_test,
        predictions
    ).ravel()

    results.append({
        "threshold": round(threshold, 2),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "true_positives": tp,
        "false_positives": fp,
        "false_negatives": fn,
    })


results_df = pd.DataFrame(results)

print(
    results_df.to_string(index=False)
)

# Best F1
best_f1 = results_df.loc[
    results_df["f1"].idxmax()
]

print("\n" + "=" * 80)
print("BEST F1 THRESHOLD")
print("=" * 80)

print(best_f1.to_string())

# Best recall while maintaining >= 20% precision
acceptable = results_df[
    results_df["precision"] >= 0.20
]

if not acceptable.empty:

    best_recall = acceptable.loc[
        acceptable["recall"].idxmax()
    ]

    print("\n" + "=" * 80)
    print("BEST RECALL WITH PRECISION >= 50%")
    print("=" * 80)

    print(best_recall.to_string())

# Save results
results_df.to_csv(
    "threshold_results.csv",
    index=False
)

print("\nSaved: threshold_results.csv")