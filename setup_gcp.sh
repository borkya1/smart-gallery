#!/bin/bash
set -e

# Get Project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "Error: No project ID set. Run 'gcloud config set project <PROJECT_ID>' first."
    exit 1
fi

# Unique connection names
TIMESTAMP=$(date +%s)
BUCKET_NAME="smart-gallery-${PROJECT_ID}-${TIMESTAMP}"
SA_NAME="smart-gallery-sa"

echo "🚀 Setting up GCP for Project: $PROJECT_ID"

# 1. Create Bucket
echo "📦 Creating Bucket: gs://$BUCKET_NAME ..."
gcloud storage buckets create gs://$BUCKET_NAME --location=us-central1 --quiet

# 2. Create Service Account
echo "👤 Creating Service Account: $SA_NAME ..."
if ! gcloud iam service-accounts describe "${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" --quiet > /dev/null 2>&1; then
    gcloud iam service-accounts create $SA_NAME --display-name "SmartGallery Service Account" --quiet
else
    echo "Service account already exists."
fi

# 3. Grant Permissions
echo "🔑 Granting Permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/owner" \
    --quiet > /dev/null

# 4. Create Key
echo "⬇️  Downloading key.json..."
if [ -f key.json ]; then
    rm key.json
fi
gcloud iam service-accounts keys create key.json \
    --iam-account="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --quiet

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "Start of .env values:"
echo "------------------------------------------------"
echo "GCS_BUCKET_NAME=$BUCKET_NAME"
echo "GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/key.json"
echo "------------------------------------------------"
echo ""
echo "Please copy the values above into your .env file."
