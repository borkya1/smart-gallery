
import os
import random
import string
import datetime
import ssl
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from services.gcs import get_firestore_client

# Bypass SSL verify (for Dev/Proxy environments)
ssl._create_default_https_context = ssl._create_unverified_context

# Config
OTP_EXPIRY_MINUTES = 10
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "test@example.com") 

def generate_otp() -> str:
    """Generates a 6-digit random number string."""
    return ''.join(random.choices(string.digits, k=6))

def store_otp(email: str, otp: str):
    """Stores OTP in Firestore with expiration time."""
    db = get_firestore_client()
    # Use email as document ID (sanitized) or just query by email?
    # Using email as ID is easier for overwrites.
    # Firestore doc IDs can't contain /, so we might need to hash or just rely on a query.
    # For now, let's assume valid emails don't have crazy chars or we just use it directly.
    
    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=OTP_EXPIRY_MINUTES)
    
    data = {
        "email": email,
        "otp": otp,
        "expires_at": expires_at,
        "created_at": datetime.datetime.now(datetime.timezone.utc)
    }
    
    # Store in 'otp_codes' collection
    db.collection("otp_codes").document(email).set(data)

def verify_otp_logic(email: str, otp: str) -> bool:
    """Checks if OTP is valid and not expired."""
    db = get_firestore_client()
    doc_ref = db.collection("otp_codes").document(email)
    doc = doc_ref.get()
    
    if not doc.exists:
        return False
        
    data = doc.to_dict()
    stored_otp = data.get("otp")
    expires_at = data.get("expires_at")
    
    # Check match
    if stored_otp != otp:
        return False
        
    # Check expiry (Firestore returns datetime with timezone)
    now = datetime.datetime.now(datetime.timezone.utc)
    if now > expires_at:
        return False
        
    # Optional: Delete after successful verify to prevent replay?
    # db.collection("otp_codes").document(email).delete()
    return True

def send_otp_email(email: str, otp: str):
    """Sends the OTP via SendGrid."""
    if not SENDGRID_API_KEY:
        print("Warning: SENDGRID_API_KEY not found. Printing OTP to console.")
        print(f"--- OTP for {email}: {otp} ---")
        return

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=email,
        subject='Your SmartGallery Verification Code',
        html_content=f'<strong>Your verification code is: {otp}</strong><br>It expires in {OTP_EXPIRY_MINUTES} minutes.'
    )
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        # print(f"Email sent. Status: {response.status_code}")
    except Exception as e:
        print(f"SendGrid Error: {e}")
        raise e
