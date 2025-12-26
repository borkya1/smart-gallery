import os
import uvicorn
import uuid
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from google.cloud import firestore
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="SmartGallery API")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")

# Clients
storage_client = storage.Client()
firestore_client = firestore.Client(project=PROJECT_ID)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Collections
IMAGES_COLLECTION = os.getenv("FIRESTORE_COLLECTION", "images")

# Firebase Admin Setup
import firebase_admin
from firebase_admin import credentials, auth
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

# Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS automatically)
if not firebase_admin._apps:
    firebase_admin.initialize_app()

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "SmartGallery Backend is running"}

@app.post("/upload")
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
        
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)
        
        # Read file content
        content = await file.read()
        blob.upload_from_string(content, content_type=file.content_type)
        
        # Make public for MVP (In prod, use signed URLs)
        # Note: Bucket must be configured to allow public access or use signed URLs
        # For this MVP, we will try to use the public media link or a signed URL
        # blob.make_public() # Be careful with this permission
        # public_url = blob.public_url
        
        # Using a signed URL for display might be safer, but for "public" gallery MVP:
        public_url = f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{blob_name}"

        # 2. Analyze with OpenAI Vision
        # We need to pass the image URL or base64. 
        # Since the image is now on GCS, we can pass the URL if it's accessible.
        # Alternatively, we can send base64 of the content we just read.
        
        # For simplicity/robustness, let's use base64 to avoid public access requirement for analysis
        import base64
        base64_image = base64.b64encode(content).decode('utf-8')
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this image and return a JSON object with a list of 'tags' (strings) describing objects, mood, colors, and location."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/{extension};base64,{base64_image}"
                            },
                        },
                    ],
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=300,
        )
        
        analysis_content = response.choices[0].message.content
        analysis_json = json.loads(analysis_content)
        tags = analysis_json.get("tags", [])

        # 3. Save to Firestore
        # 3. Save to Firestore
        doc_ref = firestore_client.collection(IMAGES_COLLECTION).document(file_id)
        # Store blob_name for proxying
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
        # We can't easily get the absolute URL here without Request context, 
        # but the frontend can handle relative URLs if we return them? 
        # Actually returning a relative URL is safer.
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

@app.get("/search")
async def search_images(tag: str = Query(..., min_length=1)):
    """
    Search images using in-memory fuzzy matching (MVP)
    """
    try:
        images_ref = firestore_client.collection(IMAGES_COLLECTION)
        # For MVP fuzzy search, we fetch all and filter in Python.
        # In production, use Algolia/Elasticsearch or strict normalization.
        results = images_ref.stream()

        image_list = []
        search_term = tag.lower()

        for doc in results:
            data = doc.to_dict()
            tags = [t.lower() for t in data.get("tags", [])]
            
            # Fuzzy match: exact word or partial substring match in any tag
            if any(search_term in t for t in tags):
                # Reconstruct Proxy URL
                if "blob_name" in data:
                    filename = data["blob_name"].split("/")[-1]
                    data["url"] = f"/images/{filename}"
                elif "url" in data and "storage.googleapis.com" in data["url"]:
                     # Legacy Data Fix: Extract filename from GCS URL
                     # URL format: .../images/uuid.ext
                     try:
                        filename = data["url"].split("/")[-1]
                        data["url"] = f"/images/{filename}"
                     except:
                        pass
                image_list.append(data)

        return {"results": image_list}

    except Exception as e:
        print(f"Error searching images: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images")
async def get_recent_images(limit: int = 20):
    """
    Get most recently uploaded images
    """
    try:
        images_ref = firestore_client.collection(IMAGES_COLLECTION)
        query = images_ref.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
        results = query.stream()

        image_list = []
        for doc in results:
            data = doc.to_dict()
            # Reconstruct Proxy URL from blob_name
            if "blob_name" in data:
                filename = data["blob_name"].split("/")[-1]
                data["url"] = f"/images/{filename}"
            # Fallback for old data
            elif "url" in data and "storage.googleapis.com" in data["url"]:
                 # Legacy Data Fix: Extract filename from GCS URL
                 try:
                    filename = data["url"].split("/")[-1]
                    data["url"] = f"/images/{filename}"
                 except:
                    pass
            
            image_list.append(data)

        return {"results": image_list}

    except Exception as e:
        print(f"Error fetching images: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images/{filename}")
async def get_image(filename: str):
    """
    Proxy image from GCS
    """
    if not GCS_BUCKET_NAME:
         raise HTTPException(status_code=500, detail="GCS_BUCKET_NAME not configured")
    
    try:
        blob_name = f"images/{filename}"
        bucket = storage_client.bucket(GCS_BUCKET_NAME)
        blob = bucket.blob(blob_name)
        
        if not blob.exists():
             raise HTTPException(status_code=404, detail="Image not found")
             
        content = blob.download_as_bytes()
        
        # Determine content type
        content_type = "image/jpeg"
        if filename.lower().endswith(".png"):
            content_type = "image/png"
        elif filename.lower().endswith(".gif"):
             content_type = "image/gif"
             
        return Response(content=content, media_type=content_type)
        
    except Exception as e:
        print(f"Error serving image: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving image")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
