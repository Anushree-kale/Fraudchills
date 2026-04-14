# Fraudchills

**Fraudchills** is a production-grade fraud detection and case management platform that identifies high-risk financial activity in real time. It combines interpretable heuristics with machine learning to deliver fast, accurate risk scoring — purpose-built for modern digital platforms.

---

## Features

- **Real-Time Fraud Scoring** — XGBoost-powered risk assessment on every transaction with near-instant response times.
- **Automated ML Pipeline** — End-to-end tooling for dataset merging, model retraining, and Hugging Face deployment.
- **Optimized Baselines** — Pre-calculated statistics derived from 1.4M+ records eliminate cold-start latency.
- **Interactive Dashboard** — A clean, responsive interface for managing fraud logs, active cases, and platform health metrics.
- **Secure Authentication** — Google OAuth via NextAuth for enterprise-grade user management.
- **Flexible Alerting** — Real-time Slack and webhook notifications for high-risk fraud events.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python, FastAPI, PostgreSQL, SQLAlchemy |
| **Machine Learning** | XGBoost, Scikit-learn, Pandas |
| **Model Hub** | Hugging Face |
| **Frontend** | React, Next.js (App Router), TailwindCSS |
| **Auth** | NextAuth, Google OAuth |

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Anushree-028/Fraudchills.git
cd Fraudchills
```

**2. Backend setup**

```bash
cd backend
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and configure the following variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fraudchills
HF_TOKEN=your_huggingface_token
```

**3. Frontend setup**

```bash
cd ../frontend
npm install
npm run dev
```

---

## ML Pipeline

Fraudchills maintains model accuracy through a three-stage pipeline:

1. **Merge & Retrain** — `merge_and_retrain.py` unifies multiple fraud datasets (E-Commerce, IEEE-CIS, and others) into a single normalized schema for training.
2. **Baseline Generation** — `generate_baseline_stats.py` pre-computes statistical metrics from raw data, enabling high-performance scoring at inference time.
3. **Model Sync** — The system automatically pulls the latest `fraud_xgb.pkl` from Hugging Face using secure token authentication, keeping the deployed model up to date.

---

## Security

- All secrets (API tokens, database credentials) are managed via environment variables and never committed to source control.
- `.gitignore` is configured to exclude model artifacts (`.pkl`) and raw datasets (`.csv`), protecting both intellectual property and repository size.

---

## Contributing

Contributions, issues, and feature requests are welcome. Please open an issue before submitting a pull request.

---

## Author

Built and maintained by [Anushree](https://github.com/Anushree-028).

---

## License

Licensed under the [MIT License](LICENSE).