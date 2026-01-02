
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
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        # print(f"Auth Error: {e}") # Debug log
        raise HTTPException(status_code=401, detail="Invalid authentication token")
