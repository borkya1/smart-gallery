
import uuid
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query, Request
from fastapi.responses import Response
from google.cloud import firestore
from services.auth import verify_token, get_current_user_optional
from services.limits import check_guest_limit, check_user_limit
from services.gcs import get_bucket, get_firestore_collection, GCS_BUCKET_NAME
from services.analyze import analyze_image_with_vision

router = APIRouter()

@router.post("/upload")
async def upload_image(
    request: Request,
    file: UploadFile = File(...), 
    user_token: dict = Depends(get_current_user_optional)
):
    """
    1. Check Usage Limits (User vs Guest)
    2. Upload image to GCS
    3. Analyze with OpenAI Vision
    4. Save metadata to Firestore
    """
    
    # Determine Identity & Check Limits
    user_id = None
    user_email = "guest"
    
    if user_token:
        # Logged-in User
        user_id = user_token['uid']
        user_email = user_token.get('email', 'unknown')
        check_user_limit(user_id)
    else:
        # Guest
        # In Cloud Run (behind proxy), use X-Forwarded-For
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0]
        else:
            ip = request.client.host
        check_guest_limit(ip)
    
    if not GCS_BUCKET_NAME:
        raise HTTPException(status_code=500, detail="GCS_BUCKET_NAME not configured")

    try:
        # 1. Upload to GCS
        file_id = str(uuid.uuid4())
        extension = file.filename.split(".")[-1]
        blob_name = f"images/{file_id}.{extension}"
        
        bucket = get_bucket()
        blob = bucket.blob(blob_name)
        
        # Read file content
        content = await file.read()
        blob.upload_from_string(content, content_type=file.content_type)
        
        # 2. Analyze with OpenAI Vision
        base64_image = base64.b64encode(content).decode('utf-8')
        tags = analyze_image_with_vision(base64_image, extension)

        # 3. Save to Firestore
        doc_ref = get_firestore_collection().document(file_id)
        
        doc_data = {
            "id": file_id,
            "filename": file.filename,
            "blob_name": blob_name, 
            "tags": tags,
            "created_at": firestore.SERVER_TIMESTAMP,
            "uploaded_by": user_email, 
            "user_id": user_id # None for guests
        }
        doc_ref.set(doc_data)

        # Return Proxy URL
        proxy_url = f"/images/{file_id}.{extension}"

        return {
            "success": True, 
            "image_url": proxy_url, 
            "tags": tags,
            "id": file_id
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from services.gallery import get_recent_images_for_user, search_images_for_user

@router.get("/search")
def search_images(
    tag: str = Query(..., min_length=1),
    user_token: dict = Depends(verify_token)
):
    """
    Search images using in-memory fuzzy matching (MVP)
    """
    user_id = user_token['uid']
    return {"results": search_images_for_user(user_id, tag)}

@router.get("/images")
def get_recent_images(
    limit: int = 20,
    user_token: dict = Depends(verify_token)
):
    """
    Get most recently uploaded images for the user
    """
    user_id = user_token['uid']

    try:
        results = get_recent_images_for_user(user_id, limit)
        return {"results": results}
    except Exception as e:
        print(f"Firestore Query Error: {e}")
        # Identify if it's an index error
        if "bit.ly" in str(e) or "FAILED_PRECONDITION" in str(e):
             raise HTTPException(status_code=500, detail="Firestore Index Required. Check backend logs for creation link.")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/images/{filename}")
async def get_image(filename: str):
    """
    Proxy image from GCS
    """
    try:
        blob_name = f"images/{filename}"
        bucket = get_bucket()
        blob = bucket.blob(blob_name)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="Image not found")
            
        content = blob.download_as_bytes()
        content_type = blob.content_type or "image/jpeg"
        
        return Response(content=content, media_type=content_type)
    except Exception as e:
        # print(f"Proxy Error: {e}")
        raise HTTPException(status_code=404, detail="Image not found")
