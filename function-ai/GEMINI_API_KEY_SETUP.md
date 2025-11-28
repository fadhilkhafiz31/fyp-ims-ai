# How to Set Gemini API Key for Firebase Functions

This guide explains how to set the `GEMINI_API_KEY` environment variable for your Firebase Functions.

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Select your Google Cloud project (or create a new one)
5. Copy the generated API key (starts with `AIza...`)
6. **Important:** Keep this key secure and never commit it to version control!

## Step 2: Set Environment Variable

### Option A: Using Firebase CLI (Recommended for Production)

For Firebase Functions v2, use the `firebase functions:secrets:set` command:

```bash
# Navigate to your project root (not function-ai directory)
cd /path/to/your/project

# Set the secret
firebase functions:secrets:set GEMINI_API_KEY

# When prompted, paste your API key and press Enter
```

Then update your `function-ai/index.js` to use the secret:

```javascript
// At the top of the file, add secret import
const { defineSecret } = require("firebase-functions/params");

// Define the secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// In your geminiHandler function, use:
const GEMINI_API_KEY = geminiApiKey.value();
```

**OR** use environment variables directly (simpler approach):

```bash
# Set environment variable for your function
firebase functions:config:set gemini.api_key="YOUR_ACTUAL_API_KEY_HERE"

# For Firebase Functions v2, you need to set runtime config
# First, deploy a function that defines the secret, then use it
```

### Option B: Using Firebase Console (Easier Visual Method)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions** → **Configuration** (or **Settings** → **Functions**)
4. Look for **"Secrets"** or **"Environment variables"** section
5. Click **"Add secret"** or **"Add environment variable"**
6. Enter:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your API key (paste it here)
7. Click **Save**
8. Redeploy your functions for the change to take effect

### Option C: For Local Development (Testing)

Create a `.env.local` file in the `function-ai/` directory:

```bash
# function-ai/.env.local
GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

**Note:** Make sure `.env.local` is in `.gitignore` (it should already be there).

For local testing with Firebase Emulators, you can also export it:

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
npm run serve
```

**Windows (CMD):**
```cmd
set GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
npm run serve
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
npm run serve
```

## Step 3: Update Code to Use Secret (Firebase Functions v2)

Since you're using Firebase Functions v2, you have two options:

### Option 1: Use Secret Manager (Most Secure - Recommended)

Update `function-ai/index.js`:

```javascript
const { defineSecret } = require("firebase-functions/params");

// Define the secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// Update your geminiHandler to use it
async function geminiHandler(req, res) {
  const GEMINI_API_KEY = geminiApiKey.value();
  // ... rest of your code
}
```

Then when exporting your function, bind the secret:

```javascript
exports.webhook = onRequest(
  {
    secrets: [geminiApiKey],
    region: "asia-southeast1",
  },
  app
);
```

### Option 2: Use Environment Variable (Simpler)

Update `function-ai/index.js` to read from process.env (current code should work):

```javascript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_GEMINI_API_KEY_HERE";
```

Set it using:
```bash
firebase functions:config:set gemini.api_key="YOUR_KEY"
```

**Note:** For Functions v2, you may need to use the Firebase Console method or update the function definition.

## Step 4: Deploy Functions

After setting the API key:

```bash
cd function-ai
firebase deploy --only functions
```

## Step 5: Verify It's Working

1. Test the endpoint directly:
   ```bash
   curl -X POST https://asia-southeast1-YOUR_PROJECT.cloudfunctions.net/webhook/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello"}'
   ```

2. Or test from your frontend by navigating to `/gemini-chat-test`

3. Check Firebase Function logs:
   ```bash
   firebase functions:log
   ```

## Troubleshooting

### Error: "API key not configured"
- Make sure you set the environment variable correctly
- Redeploy functions after setting the variable
- Check function logs for more details

### Error: "Invalid API key"
- Verify your API key is correct
- Make sure there are no extra spaces when copying
- Check that the API key is from Google AI Studio, not Google Cloud Console

### Environment variable not found
- For Functions v2, you may need to use Secrets Manager
- Check that you're using the correct variable name (GEMINI_API_KEY)
- Make sure you redeployed after setting the variable

## Security Notes

⚠️ **Important Security Reminders:**
- Never commit API keys to Git
- Use Firebase Secrets Manager for production (most secure)
- Rotate API keys if they're accidentally exposed
- Set API key restrictions in Google Cloud Console if possible

