from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import datetime, timezone
from utils.notifications import create_notification

def escalate_overdue_complaints():
    """
    Background job to find PENDING or INVESTIGATING complaints past their deadline
    and auto-escalate them.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        overdue = (
            db.query(models.Complaint)
            .filter(
                models.Complaint.status.in_(["PENDING", "INVESTIGATING"]),
                models.Complaint.deadline.isnot(None),
                models.Complaint.deadline < now,
            )
            .all()
        )

        for complaint in overdue:
            old_status = complaint.status
            complaint.status = "ESCALATED"
            
            # Log event
            event = models.ComplaintEvent(
                complaint_id=complaint.id,
                event_type="ESCALATED",
                note=f"Auto-escalated by system. Deadline {complaint.deadline} was missed.",
            )
            db.add(event)
            
            # Notify user of escalation
            create_notification(
                db, 
                complaint.user_id, 
                "ESCALATION", 
                f"Your complaint against {complaint.brand_name} has been auto-escalated due to inactivity."
            )
            
            print(f"Complaint {complaint.id} auto-escalated.")

        db.commit()
    except Exception as e:
        print(f"Error in background job: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run every day at midnight, or for demo purposes, every hour
    scheduler.add_job(escalate_overdue_complaints, 'interval', hours=1)
    scheduler.start()
    print("Background scheduler started.")
