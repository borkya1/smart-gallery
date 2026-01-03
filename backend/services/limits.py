from datetime import datetime
from fastapi import HTTPException
from google.cloud import firestore
from services.gcs import get_firestore_client

# Constants
DAILY_LIMIT_USER = 25
LIFETIME_LIMIT_GUEST = 10

def get_current_date_str():
    return datetime.utcnow().strftime("%Y-%m-%d")

def check_guest_limit(ip_address: str):
    """
    Check if the guest (identified by IP) has exceeded lifetime limit.
    """
    db = get_firestore_client()
    # Normalize IP to avoid simple string mismatches? IPs are standard.
    # Collection: guest_usage, Doc: IP_Address
    # Store: { "count": int }
    
    doc_ref = db.collection("guest_usage").document(ip_address)
    doc = doc_ref.get()
    
    if doc.exists:
        data = doc.to_dict()
        count = data.get("count", 0)
        
        if count >= LIFETIME_LIMIT_GUEST:
            raise HTTPException(status_code=429, detail=f"Guest limit exceeded. You have used {count}/{LIFETIME_LIMIT_GUEST} free uploads. Please sign up to continue.")
        
        # Increment
        doc_ref.update({"count": firestore.Increment(1)})
    else:
        # Create
        doc_ref.set({"count": 1})

def check_user_limit(user_id: str):
    """
    Check if the authenticated user has exceeded daily limit.
    """
    db = get_firestore_client()
    date_str = get_current_date_str()
    
    # Collection: users, Doc: user_id, Subcollection: stats, Doc: usage
    # Actually simpler: users/{user_id}/usage
    # Store: { "date": "2025-01-02", "daily_count": int }
    
    doc_ref = db.collection("users").document(user_id)
    doc = doc_ref.get()
    
    # Defaults
    current_count = 0
    needs_reset = True
    
    if doc.exists:
        data = doc.to_dict()
        last_date = data.get("last_upload_date")
        current_count = data.get("daily_count", 0)
        
        if last_date == date_str:
            needs_reset = False
            
    if needs_reset:
        # Reset counter for today
        current_count = 0
        doc_ref.set({
            "last_upload_date": date_str,
            "daily_count": 1 # This is the first one
        }, merge=True)
    else:
        if current_count >= DAILY_LIMIT_USER:
            raise HTTPException(status_code=429, detail=f"Daily limit exceeded. You have used {current_count}/{DAILY_LIMIT_USER} uploads today.")
            
        doc_ref.update({
            "daily_count": firestore.Increment(1),
            "last_upload_date": date_str # Ensure date is kept
        })
