# 🔑 How to Set Gemini API Key

## Quick Steps (3 Steps!)

### ✅ Step 1: Get Your API Key

1. Go to: **https://aistudio.google.com/app/apikey**
2. Click **"Create API Key"**
3. Copy the key (looks like: `AIzaSyC...`)
4. Keep it safe! ⚠️

---

### ✅ Step 2: Add Secret in Firebase Console

1. Go to: **https://console.firebase.google.com/**
2. Select your project: **ims-ai-821f0**
3. Click **Functions** (⚙️ in left menu)
4. Click **"Configuration"** tab
5. Scroll to **"Secrets"** section
6. Click **"Add secret"**
7. Enter:
   - **Secret name:** `GEMINI_API_KEY`
   - **Value:** (paste your API key)
8. Click **"Add secret"**

✅ **Done!** The code is already updated to use this secret.

---

### ✅ Step 3: Deploy

```bash
cd function-ai
firebase deploy --only functions
```

Wait for deployment to complete (takes 1-2 minutes).

---

### ✅ Step 4: Test!

Visit: **`/gemini-chat-test`** in your app and try asking:
- "What products are in stock?"
- "How many units of rice do we have?"

---

## 🆘 Troubleshooting

### Error: "Secret not found"
**Solution:** Make sure you:
1. Added the secret in Firebase Console (Step 2)
2. Named it exactly: `GEMINI_API_KEY` (case-sensitive)
3. Wait 1-2 minutes after adding, then redeploy

### Error: "API key not configured"
**Solution:**
1. Check the secret exists in Firebase Console
2. Redeploy: `firebase deploy --only functions`
3. Check logs: `firebase functions:log`

### Error: "Invalid API key"
**Solution:**
- Double-check you copied the full key
- No extra spaces before/after
- Make sure it's from Google AI Studio (not Google Cloud Console)

---

## 🔍 Verify Setup

After deploying, check logs:
```bash
firebase functions:log
```

Look for any errors. If you see successful requests, it's working! ✅

---

## 📝 Summary

1. ✅ Get API key from Google AI Studio
2. ✅ Add secret `GEMINI_API_KEY` in Firebase Console
3. ✅ Deploy: `firebase deploy --only functions`
4. ✅ Test at `/gemini-chat-test`

**That's it!** The code is already configured to use the secret. You just need to add it in Firebase Console and deploy.

