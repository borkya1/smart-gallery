
import os
from google.cloud import storage
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

# Configuration
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
# Handle Dev/Prod isolation for Firestore
FIRESTORE_COLLECTION = os.getenv("FIRESTORE_COLLECTION", "images")

# Initialize Clients
# Cloud Run injects credentials automatically
try:
    storage_client = storage.Client()
    firestore_client = firestore.Client()
except Exception as e:
    print(f"Warning: Could not init GCP clients (Local dev without creds?): {e}")
    storage_client = None
    firestore_client = None

def get_bucket():
    if not storage_client or not GCS_BUCKET_NAME:
        raise Exception("GCS Client or Bucket Name not configured")
    return storage_client.bucket(GCS_BUCKET_NAME)

def get_firestore_collection():
    if not firestore_client:
         raise Exception("Firestore Client not configured")
    return firestore_client.collection(FIRESTORE_COLLECTION)
