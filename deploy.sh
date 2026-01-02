#!/bin/bash

# Exit on error
set -e
set -x

# Load .env.prod if exists (Prioritize Production Config)
if [ -f .env.prod ]; then
    echo "📜 Loading Production Config from .env.prod..."
    export $(grep -v '^#' .env.prod | xargs)
elif [ -f .env ]; then
    echo "⚠️  Warning: Loading config from .env (Make sure this is PROD config)..."
    export $(grep -v '^#' .env | xargs)
fi

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REPO_NAME="smart-gallery-repo"
BACKEND_SERVICE="smart-gallery-backend"
FRONTEND_SERVICE="smart-gallery-frontend"

if [ -z "$PROJECT_ID" ]; then
    echo "Error: No Google Cloud Project ID found. Please run 'gcloud config set project <YOUR_PROJECT_ID>'."
    exit 1
fi

echo "🚀 Deploying to Project: $PROJECT_ID in $REGION"

# 1. Enable APIs (idempotent)
echo "🔌 Enabling necessary APIs..."
gcloud services enable artifactregistry.googleapis.com run.googleapis.com --quiet

# 2. Create Artifact Registry Repo (if not exists)
if ! gcloud artifacts repositories describe $REPO_NAME --location=$REGION --quiet > /dev/null 2>&1; then
    echo "📦 Creating Artifact Registry Repository..."
    gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION --description="SmartGallery Docker Repo" --quiet
else
    echo "📦 Artifact Registry Repository exists."
fi

# 3. Build & Push Backend
echo "🏗️  Building Backend..."
SERVER_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$BACKEND_SERVICE:latest"
# Using --quiet to respect Rule 9
gcloud builds submit backend --tag "$SERVER_IMAGE" --quiet

# 4. Deploy Backend
echo "🚀 Deploying Backend to Cloud Run..."
gcloud run deploy $BACKEND_SERVICE \
    --image "$SERVER_IMAGE" \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="GCS_BUCKET_NAME=$GCS_BUCKET_NAME,OPENAI_API_KEY=$OPENAI_API_KEY,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,SENDGRID_API_KEY=$SENDGRID_API_KEY,SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL" \
    --quiet

# Get Backend URL
BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')
echo "✅ Backend deployed at: $BACKEND_URL"

# 5. Build & Push Frontend
echo "🏗️  Building Frontend..."
# We need to build the React app with the BACKEND_URL baked in (or use a proxy, but baking is easier for MVP)
# For MVP, we will rebuild the frontend image. 
# Note: In a real app, strict separation of build/runtime config is better.
# Here we will pass VITE_API_URL as a build arg if we modified Dockerfile, 
# but simply we can rely on the fact that for now we might be hardcoding localhost in dev,
# but for prod we need to point to the real backend.
# Let's create a temporary .env.production for the build
echo "VITE_API_URL=$BACKEND_URL" > frontend/.env.production

# Restore CLIENT_IMAGE definition
CLIENT_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$FRONTEND_SERVICE:latest"

# Generate cloudbuild.yaml dynamically to avoid substitution headaches
cat > frontend/cloudbuild.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '--no-cache',
      '-t', '$CLIENT_IMAGE',
      '--build-arg', 'VITE_API_URL=$BACKEND_URL',
      '--build-arg', 'VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY',
      '--build-arg', 'VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN',
      '--build-arg', 'VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID',
      '--build-arg', 'VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET',
      '--build-arg', 'VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID',
      '--build-arg', 'VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID',
      '.'
    ]
images:
  - '$CLIENT_IMAGE'
EOF

gcloud builds submit frontend --config frontend/cloudbuild.yaml --quiet

# Rm temp file
rm frontend/.env.production

# 6. Deploy Frontend
echo "🚀 Deploying Frontend to Cloud Run..."
gcloud run deploy $FRONTEND_SERVICE \
    --image "$CLIENT_IMAGE" \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --quiet

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region $REGION --format 'value(status.url)')
echo "🎉 Deployment Complete!"
echo "➡️  Frontend: $FRONTEND_URL"
echo "➡️  Backend:  $BACKEND_URL"
