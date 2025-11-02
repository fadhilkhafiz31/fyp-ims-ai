#!/bin/bash
# Production Build and Deploy Script
# This script builds the production bundle with the correct AI webhook URL and deploys to Firebase

echo "Building production bundle with AI webhook..."
export VITE_AI_WEBHOOK_URL="https://asia-southeast1-ims-ai-821f0.cloudfunctions.net/webhook"
npm run build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "Deploy failed!"
    exit 1
fi

echo ""
echo "Deploy complete! Visit https://ims-ai-821f0.web.app"
unset VITE_AI_WEBHOOK_URL

