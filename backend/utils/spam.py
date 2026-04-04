from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
import models
from datetime import datetime, timedelta
import pytesseract
from PIL import Image
import requests
from io import BytesIO

def check_duplicate_complaint(db: Session, user_id, brand_name, new_details: str) -> bool:
    """
    Checks if the user has filed a similar complaint against the same brand 
    within the last 30 days.
    """
    thirty_days_ago = datetime.now() - timedelta(days=30)
    existing_complaints = db.query(models.Complaint).filter(
        models.Complaint.user_id == user_id,
        models.Complaint.brand_name.ilike(brand_name),
        models.Complaint.created_at >= thirty_days_ago
    ).all()
    
    if not existing_complaints:
        return False
        
    texts = [c.details for c in existing_complaints] + [new_details]
    
    try:
        vectorizer = TfidfVectorizer().fit_transform(texts)
        vectors = vectorizer.toarray()
        
        # New complaint is the last vector
        new_vec = vectors[-1].reshape(1, -1)
        # Compare with all previous
        similarities = cosine_similarity(new_vec, vectors[:-1])
        
        return any(sim > 0.85 for sim in similarities[0])
    except:
        return False # Fallback if vectorization fails

def verify_image_evidence(image_url: str) -> bool:
    """
    Basic OCR check: does the image contain readable text?
    (Simulated for proof logic)
    """
    if not image_url:
        return False
        
    try:
        response = requests.get(image_url)
        img = Image.open(BytesIO(response.content))
        text = pytesseract.image_to_string(img)
        # If we find more than a few words, consider it 'readable evidence'
        return len(text.strip().split()) > 5
    except Exception as e:
        print(f"OCR Error: {e}")
        return False
