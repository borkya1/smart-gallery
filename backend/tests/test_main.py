import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Add backend to path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

@pytest.fixture
def mock_gcs():
    with patch("main.storage.Client") as mock:
        yield mock

@pytest.fixture
def mock_firestore():
    with patch("main.firestore.Client") as mock:
        yield mock

@pytest.fixture
def mock_openai():
    with patch("main.OpenAI") as mock:
        yield mock

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "SmartGallery Backend is running"}

def test_upload_image(mock_gcs, mock_firestore, mock_openai):
    # Setup Mocks
    mock_bucket = MagicMock()
    mock_blob = MagicMock()
    mock_gcs.return_value.bucket.return_value = mock_bucket
    mock_bucket.blob.return_value = mock_blob
    
    # Mock OpenAI response
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = '{"tags": ["test", "image"]}'
    mock_openai.return_value.chat.completions.create.return_value = mock_completion

    # Mock Firestore
    mock_doc_ref = MagicMock()
    mock_firestore.return_value.collection.return_value.document.return_value = mock_doc_ref

    # Perform Request
    file_content = b"fake image content"
    response = client.post(
        "/upload",
        files={"file": ("test.jpg", file_content, "image/jpeg")}
    )

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "tags" in data
    assert "test" in data["tags"]
    
    # Verify interactions
    mock_blob.upload_from_string.assert_called_once()
    mock_openai.return_value.chat.completions.create.assert_called_once()
    mock_doc_ref.set.assert_called_once()

def test_search_images(mock_firestore):
    # Setup Mock
    mock_collection = MagicMock()
    mock_firestore.return_value.collection.return_value = mock_collection
    
    # Mock stream results
    mock_doc = MagicMock()
    mock_doc.to_dict.return_value = {
        "id": "123", 
        "url": "http://gcs/123.jpg", 
        "tags": ["cat"]
    }
    mock_collection.where.return_value.stream.return_value = [mock_doc]

    # Perform Request
    response = client.get("/search?tag=cat")

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["tags"] == ["cat"]
