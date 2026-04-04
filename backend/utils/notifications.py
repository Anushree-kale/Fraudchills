from sqlalchemy.orm import Session
import models

def create_notification(db: Session, user_id, type: str, message: str):
    """
    Utility to record a notification for a user.
    Types: STATUS_UPDATE, RESPONSE, ESCALATION, CREDIBILITY_CHANGE
    """
    notification = models.Notification(
        user_id=user_id,
        type=type,
        message=message,
        is_read=False
    )
    db.add(notification)
    db.commit()
    return notification
