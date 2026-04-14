import os
import json
import pandas as pd

def generate_stats():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    raw_path = os.path.join(base_dir, "raw_data", "ecommerce_fraud.csv")
    output_path = os.path.join(base_dir, "baseline_stats.json")

    print(f"ML: Reading {raw_path}...")
    if not os.path.exists(raw_path):
        print(f"ERROR: {raw_path} not found.")
        return

    try:
        # We can read the whole thing for a one-time script
        df = pd.read_csv(raw_path)
        
        stats = {
            "avg_amount": float(df["Transaction Amount"].mean()),
            "fraud_rate": float(df["Is Fraudulent"].mean()),
            "total_rows": int(len(df)),
            "feature_columns": df.columns.tolist(),
            "last_updated": pd.Timestamp.now().isoformat()
        }

        with open(output_path, "w") as f:
            json.dump(stats, f, indent=4)
            
        print(f"SUCCESS: Generated {output_path}")
        print(f"Stats: {json.dumps(stats, indent=2)}")

    except Exception as e:
        print(f"ERROR: Failed to generate stats: {e}")

if __name__ == "__main__":
    generate_stats()
