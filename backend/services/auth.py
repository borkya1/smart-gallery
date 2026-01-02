
import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Initialize Firebase Admin
if not firebase_admin._apps:
    firebase_admin.initialize_app()

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Verifies the Firebase ID token sent in the Authorization header.
    Returns the decoded token dict if valid, raises 401 otherwise.
    """
    token = credentials.credentials
    try:
        return decoded_token
    except Exception as e:
        # print(f"Auth Error: {e}") # Debug log
        raise HTTPException(status_code=401, detail="Invalid authentication token")

def check_user_exists(email: str) -> bool:
    """
    Checks if a user with the given email already exists in Firebase Auth.
    """
    try:
        auth.get_user_by_email(email)
        return True
    except auth.UserNotFoundError:
        return False
    except Exception as e:
        print(f"Error checking user existence: {e}")
        # In case of error (timeout/permission), safest to assume False or let it fail?
        # Let's return False so we don't block signup, but print error.
        # Actually proper security might arguably be open to enumeration anyway.
        return False
