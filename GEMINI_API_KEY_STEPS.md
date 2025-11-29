# 🎯 Step-by-Step: Setting Gemini API Key

## Method 1: Firebase Console (EASIEST - Recommended)

### Step 1: Get API Key from Google
1. Open: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"** or **"Get API Key"**
3. Select your project (or create new one)
4. **Copy the API key** (starts with `AIza...`)

### Step 2: Add to Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select project: **ims-ai-821f0**
3. In left sidebar, click **⚙️ Functions**
4. Click **"Configuration"** tab (at the top)
5. Scroll down to **"Secrets"** section
6. Click **"Add secret"** button
7. Fill in:
   - **Secret name:** `GEMINI_API_KEY`
   - **Value:** (paste your API key)
8. Click **"Add secret"**
9. ✅ Done!

### Step 3: Update Code to Use Secret

For Firebase Functions v2, you need to update your code to use the secret. Here's the simple change:

**Update `function-ai/index.js`:**

1. **At the top** (after other imports, around line 12), add:
```javascript
const { defineSecret } = require("firebase-functions/params");
```

2. **Replace line 38-39:**
```javascript
// OLD:
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";

// NEW:
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
```

3. **Update geminiHandler function** (around line 754):
   Find this line:
   ```javascript
   if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
   ```
   
   Replace with:
   ```javascript
   const GEMINI_API_KEY = geminiApiKeySecret.value();
   if (!GEMINI_API_KEY) {
   ```

4. **Update the export** at the bottom (line 1599):
   Find:
   ```javascript
   exports.webhook = onRequest(app);
   ```
   
   Replace with:
   ```javascript
   exports.webhook = onRequest(
     {
       secrets: [geminiApiKeySecret],
       region: "asia-southeast1",
     },
     app
   );
   ```

### Step 4: Deploy
```bash
cd function-ai
firebase deploy --only functions
```

### Step 5: Test
- Visit: `/gemini-chat-test` in your app
- Or use curl command (see testing section below)

---

## Method 2: Quick Test (Local Development Only)

For testing locally without deploying:

1. Create file: `function-ai/.env.local`
2. Add:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. Run locally:
   ```bash
   cd function-ai
   npm run serve
   ```

**Note:** This only works for local testing. For production, use Method 1.

---

## 🧪 Testing After Setup

### Test with Browser
1. Navigate to: `http://localhost:5173/gemini-chat-test` (dev)
2. Or: `https://ims-ai-821f0.web.app/gemini-chat-test` (production)
3. Type a message like: "What products are in stock?"

### Test with curl
```bash
curl -X POST https://asia-southeast1-ims-ai-821f0.cloudfunctions.net/webhook/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello, what can you do?\"}"
```

### Check Logs
```bash
firebase functions:log
```

Look for any errors. If working correctly, you'll see successful requests.

---

## ✅ Verification Checklist

- [ ] Got API key from Google AI Studio
- [ ] Added secret `GEMINI_API_KEY` in Firebase Console
- [ ] Updated code to use `defineSecret()`
- [ ] Updated `geminiHandler` to use `geminiApiKeySecret.value()`
- [ ] Updated `exports.webhook` to include secrets binding
- [ ] Deployed functions: `firebase deploy --only functions`
- [ ] Tested endpoint successfully

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "API key not configured" | 1. Check secret name is exactly `GEMINI_API_KEY`<br>2. Redeploy functions<br>3. Check code uses `defineSecret()` |
| "Invalid API key" | 1. Verify key is correct (no extra spaces)<br>2. Make sure key is from Google AI Studio |
| Secret not found | 1. Make sure you added it in Firebase Console<br>2. Wait a few minutes and redeploy |
| Function deployment fails | 1. Check syntax errors in index.js<br>2. Make sure secret is defined before using it |

---

## 📝 Quick Code Changes Summary

**File: `function-ai/index.js`**

1. **Line ~12** - Add import:
```javascript
const { defineSecret } = require("firebase-functions/params");
```

2. **Line ~38** - Replace:
```javascript
// OLD:
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";

// NEW:
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
```

3. **Inside geminiHandler()** - Replace:
```javascript
// OLD:
if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {

// NEW:
const GEMINI_API_KEY = geminiApiKeySecret.value();
if (!GEMINI_API_KEY) {
```

4. **Line ~1599** - Replace:
```javascript
// OLD:
exports.webhook = onRequest(app);

// NEW:
exports.webhook = onRequest(
  {
    secrets: [geminiApiKeySecret],
    region: "asia-southeast1",
  },
  app
);
```

That's it! 🎉

