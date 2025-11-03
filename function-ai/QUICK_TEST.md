# Quick Test Guide

## 🚀 Quick Start

### Step 1: Start the Emulator

Open a terminal and run:

```bash
cd function-ai
npm run serve
```

Wait for the emulator to start. You should see:
```
✔  functions[webhook]: http function initialized (http://localhost:5001/...)
```

### Step 2: Run Tests (In Another Terminal)

Open a **new terminal window** and run:

```bash
cd function-ai
npm test
```

Or directly:
```bash
node function-ai/test-webhook.js
```

## 📝 What to Check

1. ✅ All tests should return HTTP 200 status
2. ✅ Each test should have a `fulfillmentText` in the response
3. ✅ Check that the responses make sense based on your Firestore data

## 🔍 Verifying Your Data

Make sure you have test inventory data in Firestore. Example structure:

```javascript
{
  name: "Oil Packet 1KG",
  storeName: "99 Speedmart Acacia",  // or storeId
  qty: 13,
  sku: "OIL-001"
}
```

## 💡 Tips

- If you get connection errors, make sure the emulator is still running
- If products aren't found, check that `storeName` matches exactly (case-insensitive matching is supported)
- You can modify `test-webhook.js` to test with your actual product/location names

