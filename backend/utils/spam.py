from datetime import datetime, timedelta, timezone
from io import BytesIO

import requests
from sqlalchemy.orm import Session

import models

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    _ML_AVAILABLE = True
except ImportError:
    _ML_AVAILABLE = False
    print("Warning: scikit-learn not installed. Duplicate detection disabled.")


def check_duplicate_complaint(db: Session, user_id, brand_name: str, new_details: str) -> bool:
    """
    Checks if the user has filed a similar complaint against the same brand
    within the last 30 days.
    """
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    existing_complaints = (
        db.query(models.Complaint)
        .filter(
            models.Complaint.user_id == user_id,
            models.Complaint.brand_name.ilike(brand_name),
            models.Complaint.created_at >= thirty_days_ago,
        )
        .order_by(models.Complaint.created_at.desc())
        .limit(40)
        .all()
    )

    if not existing_complaints:
        return False

    texts = [c.details for c in existing_complaints] + [new_details]

    if not _ML_AVAILABLE:
        return False

    try:
        vectorizer = TfidfVectorizer().fit_transform(texts)
        vectors = vectorizer.toarray()

        new_vec = vectors[-1].reshape(1, -1)
        similarities = cosine_similarity(new_vec, vectors[:-1])

        return any(sim > 0.85 for sim in similarities[0])
    except Exception as e:
        print(f"Spam Check Error: {e}")
        return False


def verify_image_evidence(image_url: str) -> bool:
    """
    Basic OCR check: does the image contain readable text?
    Optional — tesseract binary must be installed on the server.
    """
    if not image_url:
        return False

    try:
        from PIL import Image
        import pytesseract

        response = requests.get(image_url, timeout=15)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        text = pytesseract.image_to_string(img)
        return len(text.strip().split()) > 5
    except Exception as e:
        print(f"OCR Error: {e}")
        return False
