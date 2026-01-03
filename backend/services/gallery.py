from google.cloud import firestore
from services.gcs import get_firestore_collection

def construct_proxy_url(data: dict) -> dict:
    """Helper to reconstruct the proxy URL from blob_name or existing url"""
    if "blob_name" in data:
        filename = data["blob_name"].split("/")[-1]
        data["url"] = f"/images/{filename}"
    elif "url" in data and "storage.googleapis.com" in data["url"]:
            try:
                filename = data["url"].split("/")[-1]
                data["url"] = f"/images/{filename}"
            except:
                pass
    return data

def get_recent_images_for_user(user_id: str, limit: int = 20) -> list:
    """
    Fetch recent images for a specific user from Firestore.
    """
    # Firestore requires a composite index for equality filter + inequality sort (where user_id == X AND order_by created_at)
    query = get_firestore_collection().where("user_id", "==", user_id).order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
    
    results = query.stream()
    
    image_list = []
    for doc in results:
        data = doc.to_dict()
        data = construct_proxy_url(data)
        image_list.append(data)

    return image_list

def search_images_for_user(user_id: str, tag: str) -> list:
    """
    Search images for a specific user by tag (In-memory filtering).
    """
    # Filter by user_id
    docs = get_firestore_collection().where("user_id", "==", user_id).stream()
    search_term = tag.lower()
    
    image_list = []
    for doc in docs:
        data = doc.to_dict()
        tags = [t.lower() for t in data.get("tags", [])]
        
        if any(search_term in t for t in tags):
            data = construct_proxy_url(data)
            image_list.append(data)
            
    return image_list
