# Firebase Storage CORS Configuration

## Problem
You're getting CORS errors when uploading images to Firebase Storage from `http://localhost:5173`.

## Solution: Configure CORS for Firebase Storage

### Step 1: Install Google Cloud SDK (if not already installed)
Download and install from: https://cloud.google.com/sdk/docs/install

### Step 2: Authenticate with Google Cloud
```bash
gcloud auth login
```

### Step 3: Set your Firebase project
```bash
gcloud config set project ims-ai-821f0
```

### Step 4: Apply CORS configuration

**For Windows PowerShell:**
```powershell
& "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd" cors set cors.json gs://ims-ai-821f0.firebasestorage.app
```

**For Command Prompt or if gsutil is in PATH:**
```bash
gsutil cors set cors.json gs://ims-ai-821f0.firebasestorage.app
```

**Note:** The bucket name is `ims-ai-821f0.firebasestorage.app` (not `.appspot.com`). Verify your bucket name by running:
```bash
gsutil ls
```

### Step 5: Verify CORS configuration

**Windows PowerShell:**
```powershell
& "$env:USERPROFILE\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd" cors get gs://ims-ai-821f0.firebasestorage.app
```

**Command Prompt:**
```bash
gsutil cors get gs://ims-ai-821f0.firebasestorage.app
```

## Alternative: Use Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `ims-ai-821f0`
3. Go to **Storage** → **Rules** tab
4. The CORS should be automatically handled, but you may need to:
   - Check that Storage Rules allow authenticated uploads
   - Ensure your user has proper authentication

## Note
The `cors.json` file includes configurations for common development ports. For production, update the origins array with your actual domain.

