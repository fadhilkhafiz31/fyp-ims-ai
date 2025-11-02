# Production Build and Deploy Script
# This script builds the production bundle with the correct AI webhook URL and deploys to Firebase

Write-Host "Building production bundle with AI webhook..." -ForegroundColor Cyan
$env:VITE_AI_WEBHOOK_URL = "https://asia-southeast1-ims-ai-821f0.cloudfunctions.net/webhook"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Deploying to Firebase Hosting..." -ForegroundColor Cyan
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deploy failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nDeploy complete! Visit https://ims-ai-821f0.web.app" -ForegroundColor Green
Remove-Item Env:VITE_AI_WEBHOOK_URL

