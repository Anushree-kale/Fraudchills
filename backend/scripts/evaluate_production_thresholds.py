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

# Same preprocessing as training
df = df.drop_duplicates().reset_index(drop=True)
df = df[FEATURES + [TARGET]]

for col in FEATURES + [TARGET]:
    df[col] = pd.to_numeric(df[col], errors="coerce")

df = df.dropna().reset_index(drop=True)

X = df[FEATURES]
y = df[TARGET].astype(int)

# Same test split
_, X_test, _, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    stratify=y,
    random_state=42,
)

print(f"Test rows: {len(X_test):,}")
print(f"Fraud cases: {y_test.sum():,}")

# Load trained model
print("\nLoading model...")
model = joblib.load(MODEL_PATH)

# XGBoost probability
model_probability = model.predict_proba(X_test)[:, 1]


# ---------------------------------------------------------
# Recreate the heuristic portion of production scoring
# ---------------------------------------------------------

def calculate_heuristic(row):

    score = 0.08

    # Amount
    if row["amount"] > 25_000:
        score += 0.18
    elif row["amount"] > 8_000:
        score += 0.10

    # Order velocity
    if row["order_velocity_24h"] > 12:
        score += 0.28
    elif row["order_velocity_24h"] > 6:
        score += 0.14

    # IP mismatch
    if row["ip_mismatch"]:
        score += 0.22
    # Device mismatch
    if row["device_mismatch"]:
        score += 0.10

    # Irregular card pattern is NOT available in CSV,
    # so it is omitted from this offline evaluation.

    return min(score, 1.0)


print("\nCalculating production-style heuristic scores...")

heuristic_scores = X_test.apply(
    calculate_heuristic,
    axis=1
).to_numpy()


# ---------------------------------------------------------
# EXACT production blending
# ---------------------------------------------------------

final_scores = (
    0.35 * heuristic_scores
    + 0.65 * model_probability
)

final_scores = np.clip(final_scores, 0, 1)


# ---------------------------------------------------------
# Threshold analysis
# ---------------------------------------------------------

print("\n" + "=" * 90)
print("PRODUCTION SCORE THRESHOLD ANALYSIS")
print("=" * 90)

results = []

thresholds = np.arange(0.05, 0.81, 0.05)

for threshold in thresholds:

    predictions = (
        final_scores >= threshold
    ).astype(int)

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


# ---------------------------------------------------------
# Best F1
# ---------------------------------------------------------

best_f1 = results_df.loc[
    results_df["f1"].idxmax()
]

print("\n" + "=" * 90)
print("BEST F1 THRESHOLD")
print("=" * 90)

print(best_f1.to_string())


# ---------------------------------------------------------
# Best recall with >=20% precision
# ---------------------------------------------------------

acceptable = results_df[
    results_df["precision"] >= 0.20
]

if not acceptable.empty:

    best_recall = acceptable.loc[
        acceptable["recall"].idxmax()
    ]

    print("\n" + "=" * 90)
    print("BEST RECALL WITH PRECISION >= 20%")
    print("=" * 90)

    print(best_recall.to_string())


# ---------------------------------------------------------
# Current production threshold
# ---------------------------------------------------------

current = results_df[
    results_df["threshold"] == 0.65
]

print("\n" + "=" * 90)
print("CURRENT PRODUCTION THRESHOLD (0.65)")
print("=" * 90)

print(current.to_string(index=False))


results_df.to_csv(
    "production_threshold_results.csv",
    index=False
)

print("\nSaved: production_threshold_results.csv")