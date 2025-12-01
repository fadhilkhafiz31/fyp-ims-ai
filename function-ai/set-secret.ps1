# PowerShell script to set Firebase Functions secret
# Usage: .\set-secret.ps1

Write-Host "Setting GEMINI_API_KEY secret..." -ForegroundColor Cyan
Write-Host ""

# Prompt for API key
$apiKey = Read-Host "Enter your Gemini API key (starts with AIza...)" -AsSecureString

# Convert secure string to plain text
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey)
$plainApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

# Create temporary file with the API key
$tempFile = New-TemporaryFile
$plainApiKey | Out-File -FilePath $tempFile.FullName -NoNewline -Encoding utf8

try {
    # Use gcloud CLI to create the secret (if available)
    # Or use firebase CLI with file input
    Write-Host "Creating secret via Google Cloud Secret Manager..." -ForegroundColor Yellow
    
    # Try using gcloud if available
    $gcloudAvailable = Get-Command gcloud -ErrorAction SilentlyContinue
    if ($gcloudAvailable) {
        gcloud secrets create GEMINI_API_KEY --data-file=$tempFile.FullName --project=ims-ai-821f0
        Write-Host "Secret created successfully!" -ForegroundColor Green
    } else {
        Write-Host "gcloud CLI not found. Please use one of these methods:" -ForegroundColor Yellow
        Write-Host "1. Use Google Cloud Console: https://console.cloud.google.com/security/secret-manager" -ForegroundColor Cyan
        Write-Host "2. Install gcloud CLI: https://cloud.google.com/sdk/docs/install" -ForegroundColor Cyan
        Write-Host "3. Use Firebase Console → Functions → Configuration → Environment variables" -ForegroundColor Cyan
    }
} finally {
    # Clean up temporary file
    Remove-Item $tempFile.FullName -Force
}

Write-Host ""
Write-Host "After setting the secret, redeploy your function:" -ForegroundColor Yellow
Write-Host "  firebase deploy --only functions" -ForegroundColor Cyan

