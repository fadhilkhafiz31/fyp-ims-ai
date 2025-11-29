# Quick Guide: Setting Gemini API Key

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Your API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Copy the key (looks like: `AIzaSyC...`)

### Step 2: Set in Firebase Console (Easiest Method)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **ims-ai-821f0**
3. Click **Functions** in the left menu
4. Click **"Configuration"** tab
5. Scroll to **"Secrets"** section
6. Click **"Add secret"**
7. Enter:
   - **Secret name:** `GEMINI_API_KEY`
   - **Value:** Paste your API key
8. Click **Save**

### Step 3: Update Code to Use Secret

Since you're using Firebase Functions v2, you need to update `function-ai/index.js` to use the secret properly.

The current code at line 39 reads:
```javascript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
```

**Option A: Keep it simple (works with environment variables)**
- The current code will work if you set it via Firebase Console as environment variable

**Option B: Use Secrets Manager (more secure - recommended)**
- Update the code to use Firebase Secrets (see instructions below)

### Step 4: Deploy

```bash
cd function-ai
firebase deploy --only functions
```

### Step 5: Test

Visit your app at: `/gemini-chat-test` or test with curl:

```bash
curl -X POST https://asia-southeast1-ims-ai-821f0.cloudfunctions.net/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What products are in stock?"}'
```

---

## 🔒 Using Secrets Manager (Recommended for Production)

For better security, update your code to use Firebase Secrets:

1. **Update `function-ai/index.js`:**

Replace lines 38-39:
```javascript
// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
```

With:
```javascript
// Gemini API configuration - using Firebase Secrets
const { defineSecret } = require("firebase-functions/params");

const geminiApiKey = defineSecret("GEMINI_API_KEY");
```

2. **Update the geminiHandler function** to use the secret:
   - Inside `geminiHandler`, use `geminiApiKey.value()` instead of `GEMINI_API_KEY`

3. **Update the export at the bottom** to bind the secret:
   - When exporting `webhook`, add secrets binding

**OR** keep it simple and use environment variables (current setup will work).

---

## ✅ Verify Setup

After deploying, check logs:
```bash
firebase functions:log --only webhook
```

Look for any errors about the API key. If you see "API key not configured", the environment variable wasn't set correctly.

---

## 🆘 Troubleshooting

**"API key not configured" error?**
- Make sure you added the secret in Firebase Console
- Redeploy functions: `firebase deploy --only functions`
- Check the secret name matches exactly: `GEMINI_API_KEY`

**"Invalid API key" error?**
- Double-check you copied the full API key
- No extra spaces or quotes
- Make sure the API key is from Google AI Studio (not Google Cloud)

**Want to test locally?**
Create `function-ai/.env.local`:
```
GEMINI_API_KEY=your_key_here
```

Then run: `npm run serve` (for local emulator)

