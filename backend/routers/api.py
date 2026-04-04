from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import schemas
import models
from auth import get_api_key
from ml.scorer import score_complaint, risk_label

router = APIRouter()

@router.post("/predict-fraud", response_model=schemas.PredictionResponse)
def predict_fraud(
    payload: schemas.PredictionRequest,
    api_key: models.APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
):
    """
    B2B fraud prediction endpoint.
    Uses transaction data to return a risk score and recommendation.
    """
    # ── Business Logic ─────────────────────────────────────────────────────────
    # Since we don't have a separate transaction-only model trained yet,
    # we'll map the transaction fields to a mock ComplaintCreate object
    # for the current scorer to process.
    # In a real app, you'd use a different _onnx_score(transaction_features).
    
    # Simple risk logic for demo purposes:
    # 1. high amount (> 5000) increases risk
    # 2. velocity (> 3 orders/24h) increases risk
    
    base_score = 10.0
    if payload.amount > 5000:
        base_score += 30.0
    if payload.num_orders_last_24h > 3:
        base_score += 40.0
    
    # Mocking a "details" text for the scorer
    mock_details = f"Transaction of {payload.amount} from {payload.ip_address}. Orders: {payload.num_orders_last_24h}."
    
    # We call the already-implemented scorer
    mock_payload = schemas.ComplaintCreate(
        type="BUYER_FRAUD",
        details=mock_details,
        brand_name="ExternalAPI", # Placeholder
        proof_urls=[],
        external_links=[],
        image_url=None
    )
    
    score = score_complaint(mock_payload)
    # Average the base transaction risk and the scorer output
    final_score = round((base_score + score) / 2, 2)
    label = risk_label(final_score)
    
    # Recommendation logic
    recommendation = "ALLOW"
    if final_score >= 70:
        recommendation = "BLOCK"
    elif final_score >= 40:
        recommendation = "REVIEW"
        
    return schemas.PredictionResponse(
        risk_score=final_score,
        risk_label=label,
        recommendation=recommendation
    )
