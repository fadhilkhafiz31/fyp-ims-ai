# 🔑 Quick Guide: Set Gemini API Key via CLI

## Option 1: Using Firebase Secrets (Recommended - More Secure)

```bash
# Run this command in your terminal
firebase functions:secrets:set GEMINI_API_KEY

# When prompted, paste your actual Gemini API key from:
# https://aistudio.google.com/app/apikey
# Then press Enter

# After setting the secret, you'll need to update the code to use it
# and redeploy (I can help with that)
```

## Option 2: Using Environment Variables (Simpler for Testing)

Since the code currently reads from `process.env.GEMINI_API_KEY`, we can set it via Google Cloud Console:

### Via Google Cloud Console:

1. Go to: **https://console.cloud.google.com/functions/list?project=ims-ai-821f0**
2. Click on your `webhook` function
3. Click **"Edit"** or **"Configuration"**
4. Scroll to **"Runtime environment variables"** or **"Environment variables"**
5. Click **"Add variable"**
6. Enter:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your actual API key
7. Click **"Deploy"** or **"Save"**

### Via Firebase CLI (Alternative):

Actually, for Firebase Functions v2, environment variables need to be set differently. Let me update the code to use a simpler approach.

