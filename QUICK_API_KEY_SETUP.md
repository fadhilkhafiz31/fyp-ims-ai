# ⚡ Quick API Key Setup - Easiest Method

## Method: Set via Google Cloud Console (Easiest!)

### Step 1: Go to Your Function
1. Open this link directly: https://console.cloud.google.com/functions/details/asia-southeast1/webhook?project=ims-ai-821f0
2. Or manually:
   - Go to: https://console.cloud.google.com/functions/list?project=ims-ai-821f0
   - Click on `webhook` function

### Step 2: Edit the Function
1. Click **"EDIT"** button (top right)
2. Expand **"Runtime, build, connections and security settings"** section
3. Scroll to **"Runtime environment variables"**
4. Click **"+ ADD VARIABLE"**
5. Enter:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your actual API key from https://aistudio.google.com/app/apikey
6. Click **"DEPLOY"** at the bottom
7. Wait for deployment to complete (~1-2 minutes)

### Step 3: Test!
Go back to `/gemini-chat-test` and try chatting - it should work now! ✅

---

## Alternative: Using Firebase Secrets (More Secure, But More Steps)

```bash
# 1. Set the secret
firebase functions:secrets:set GEMINI_API_KEY
# Paste your API key when prompted

# 2. Update code to use the secret (I'll help with this)

# 3. Redeploy
firebase deploy --only functions
```

---

**Recommendation:** Use Google Cloud Console method - it's the easiest! 🎯

