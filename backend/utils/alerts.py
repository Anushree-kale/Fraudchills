import os
import requests
import json

def send_fraud_alert(complaint_id: str, risk_score: float, reason: str, payload_str: str):
    """
    Sends a real-time alert when a high-risk fraud prediction is made.
    Checks for a SLACK_WEBHOOK_URL env variable to send the webhook.
    Fallback to console logging if not configured.
    """
    slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    # Fallback to simple console log if no webhook is configured
    if not slack_webhook_url:
        print("\n" + "="*50)
        print("🚨 [FRAUD ALERT TRIGGERED] 🚨")
        print(f"Complaint ID: {complaint_id}")
        print(f"Risk Score:   {risk_score}")
        print(f"Reason:       {reason}")
        print("="*50 + "\n")
        return
    
    message = {
        "text": f"🚨 *High Fraud Risk Detected* 🚨\n*Score:* {risk_score}\n*Reason:* {reason}\n*Complaint ID:* {complaint_id}\n*Details:* ```{payload_str}```"
    }
    
    try:
        requests.post(slack_webhook_url, json=message, timeout=5)
        print(f"Sent fraud alert to Slack for complaint {complaint_id}.")
    except Exception as e:
        print(f"Failed to send Slack alert: {e}")
