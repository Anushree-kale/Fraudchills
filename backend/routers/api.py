from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import schemas
import models

from auth import get_api_key
from ml.predict_fraud import score_request
from services.tracing import record_event

router = APIRouter()


@router.post("/predict-fraud", response_model=schemas.PredictionResponse)
def predict_fraud(
    payload: schemas.PredictionRequest,
    api_key: models.APIKey = Depends(get_api_key),
    db: Session = Depends(get_db),
):
    """
    B2B real-time fraud prediction endpoint.

    Flow:
    1. Authenticate API key
    2. Resolve API-key owner
    3. Build historical fraud features
    4. Run fraud scoring model
    5. Store the event for future velocity/tracing
    6. Return risk score and recommendation
    """

    # ------------------------------------------------------------------
    # 1. Resolve the user that owns this API key
    # ------------------------------------------------------------------

    user = (
        db.query(models.User)
        .filter(models.User.id == api_key.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="API key owner not found.",
        )

    try:
        # --------------------------------------------------------------
        # 2. Run real fraud scoring pipeline
        #
        # score_request() internally calls live_features(), which gets:
        #
        # amount
        # account_age_days
        # transaction_hour
        # ip_mismatch
        # device_mismatch
        # order_velocity_24h
        # prior_complaints
        #
        # from the database/history.
        # --------------------------------------------------------------

        risk_score, flagged, reason = score_request(
              payload,
              db=db,
              user=user,
        )

        # --------------------------------------------------------------
        # 3. Convert 0-1 ML score into API's existing 0-100 format
        # --------------------------------------------------------------

        risk_score_percent = round(risk_score * 100, 2)

        if risk_score_percent >= 70:
            risk_label = "HIGH"
            recommendation = "BLOCK"

        elif risk_score_percent >= 40:
            risk_label = "MEDIUM"
            recommendation = "REVIEW"

        else:
            risk_label = "LOW"
            recommendation = "ALLOW"

        # --------------------------------------------------------------
        # 4. Record event AFTER prediction
        #
        # Important:
        # Prediction happens first so the current transaction does not
        # count itself in order_velocity_24h.
        # --------------------------------------------------------------

        record_event(
            db=db,
            user_id=user.id,
            amount=payload.amount,
            risk_score=risk_score,
            ip=payload.ip_address,
            device_fp=payload.device_fingerprint,

            # We can safely use the authenticated user's email.
            email=user.email,

            # DO NOT hash card_last4 as though it were a complete card.
            # Keep this NULL until proper tokenized/card fingerprint data
            # is available.
            card=None,

            # Phone is not currently part of PredictionRequest.
            phone=None,

            event_type="TRANSACTION",
        )

        # record_event() adds the event but intentionally leaves the
        # transaction commit to the caller.
        db.commit()

        # --------------------------------------------------------------
        # 5. Return API response
        # --------------------------------------------------------------

        return schemas.PredictionResponse(
            risk_score=risk_score_percent,
            risk_label=risk_label,
            recommendation=recommendation,
        )

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        print("PREDICT-FRAUD ERROR:", repr(exc))

        raise HTTPException(
            status_code=500,
            detail=f"Fraud prediction failed: {exc}",
        ) from exc