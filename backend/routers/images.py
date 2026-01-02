
import uuid
import base64
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import Response
from google.cloud import firestore
from services.auth import verify_token
from services.gcs import get_bucket, get_firestore_collection, GCS_BUCKET_NAME
from services.analyze import analyze_image_with_vision

router = APIRouter()

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...), 
    user_token: dict = Depends(verify_token)
):
    """
    1. Upload image to GCS
    2. Analyze with OpenAI Vision
    3. Save metadata to Firestore
    """
    # User ID from token
    user_id = user_token['uid']
    user_email = user_token.get('email', 'unknown')
    
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
            "uploaded_by": user_email, # Track user
            "user_id": user_id
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

    except Exception as e:
        print(f"Error processing upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
def search_images(tag: str = Query(..., min_length=1)):
    """
    Search images using in-memory fuzzy matching (MVP)
    """
    docs = get_firestore_collection().stream()
    search_term = tag.lower()
    
    image_list = []
    for doc in docs:
        data = doc.to_dict()
        tags = [t.lower() for t in data.get("tags", [])]
        
        if any(search_term in t for t in tags):
            # Reconstruct Proxy URL
            if "blob_name" in data:
                filename = data["blob_name"].split("/")[-1]
                data["url"] = f"/images/{filename}"
            elif "url" in data and "storage.googleapis.com" in data["url"]:
                 try:
                    filename = data["url"].split("/")[-1]
                    data["url"] = f"/images/{filename}"
                 except:
                    pass
            image_list.append(data)
            
    return {"results": image_list}

@router.get("/images")
def get_recent_images(limit: int = 20):
    """
    Get most recently uploaded images
    """
    query = get_firestore_collection().order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
    results = query.stream()
    
    image_list = []
    for doc in results:
        data = doc.to_dict()
        # Reconstruct Proxy URL
        if "blob_name" in data:
            filename = data["blob_name"].split("/")[-1]
            data["url"] = f"/images/{filename}"
        elif "url" in data and "storage.googleapis.com" in data["url"]:
             try:
                filename = data["url"].split("/")[-1]
                data["url"] = f"/images/{filename}"
             except:
                pass
        image_list.append(data)

    return {"results": image_list}

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
