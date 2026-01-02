
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from services.otp import generate_otp, store_otp, send_otp_email, verify_otp_logic
from services.auth import check_user_exists

router = APIRouter(prefix="/auth", tags=["Auth"])

class EmailRequest(BaseModel):
    email: EmailStr

class VerifyRequest(BaseModel):
    email: EmailStr
    code: str

@router.post("/send-otp")
async def send_otp(request: EmailRequest):
    """
    Generates a 6-digit OTP and sends it via email.
    """
    email = request.email
    
    # 0. Check if user already exists
    if check_user_exists(email):
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # 1. Generate Code
    otp = generate_otp()
    
    # 2. Store in Firestore (10 min expiry)
    try:
        store_otp(email, otp)
    except Exception as e:
        print(f"Store OTP Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate OTP")
    
    # 3. Send Email
    try:
        send_otp_email(email, otp)
    except Exception as e:
        print(f"Send Email Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")
        
    return {"success": True, "message": "OTP sent successfully"}

@router.post("/verify-otp")
async def verify_otp(request: VerifyRequest):
    """
    Verifies the OTP code.
    """
    is_valid = verify_otp_logic(request.email, request.code)
    
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    return {"success": True, "message": "OTP verified"}
