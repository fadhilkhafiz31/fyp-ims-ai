# ⚠️ SECURITY WARNING: API Key in Code

## 🚨 Important Security Notice

**DO NOT PUT API KEYS DIRECTLY IN SOURCE CODE!**

If you've accidentally put your API key in the code:
1. **Remove it immediately** from the code file
2. **Rotate/regenerate the API key** in Google AI Studio (create a new one and disable the old one)
3. **Store it properly** in Firebase Secrets Manager

## ✅ Correct Way to Set API Key

### Step 1: Fix the Code
The `defineSecret()` function expects the **NAME** of the secret, not the actual key value:

```javascript
// ❌ WRONG - Never do this!
const geminiApiKeySecret = defineSecret("AIzaSyDnc0D9hBX9En6fLMpR2gPdV-HB8iez_HM");

// ✅ CORRECT - Use the secret name
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
```

### Step 2: Store the Actual Key in Firebase Console
1. Go to Firebase Console → Functions → Configuration → Secrets
2. Add secret named: `GEMINI_API_KEY`
3. Paste your **actual API key** there (not in code!)

### Step 3: Rotate Your API Key
Since it was exposed in code:
1. Go to https://aistudio.google.com/app/apikey
2. Delete or restrict the exposed key
3. Create a new API key
4. Add the new key to Firebase Secrets

## 🔒 Security Best Practices

- ✅ Store secrets in Firebase Secrets Manager
- ✅ Use environment variables for local development (.env.local - already in .gitignore)
- ✅ Never commit API keys to Git
- ✅ Rotate keys if accidentally exposed
- ❌ Never hardcode API keys in source files

