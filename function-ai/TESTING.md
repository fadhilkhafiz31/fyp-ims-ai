# Testing the Webhook

This guide helps you test the Dialogflow webhook locally before deploying to Firebase.

## Prerequisites

1. Make sure you have some test data in your Firestore `inventory` collection
2. Ensure your inventory items have:
   - `name` field (product name)
   - `storeName` or `storeId` field (location identifier)
   - `qty` field (stock quantity)

## Method 1: Using the Test Script (Recommended)

### Step 1: Start the Firebase Emulator

```bash
cd function-ai
npm run serve
```

The emulator will start and show you a URL like:
```
http://localhost:5001/ims-ai-821f0/asia-southeast1/webhook
```

### Step 2: Run the Test Script

In a **new terminal window**:

```bash
cd function-ai
node test-webhook.js
```

This will run 5 test cases covering:
- Location-specific product queries
- Product-only queries
- Location-only queries
- Generic stock checks

## Method 2: Using cURL (Manual Testing)

### Test 1: Product and Location Query

```bash
curl -X POST http://localhost:5001/ims-ai-821f0/asia-southeast1/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "queryResult": {
      "intent": {
        "displayName": "CheckStockAtLocation"
      },
      "parameters": {
        "product": "Oil Packet 1KG",
        "location": "99 Speedmart Acacia"
      },
      "queryText": "Is Oil Packet 1KG available at 99 Speedmart Acacia?"
    }
  }'
```

### Test 2: Product Only

```bash
curl -X POST http://localhost:5001/ims-ai-821f0/asia-southeast1/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "queryResult": {
      "intent": {
        "displayName": "CheckStockAtLocation"
      },
      "parameters": {
        "product": "Oil Packet 1KG",
        "location": ""
      },
      "queryText": "Do you have Oil Packet 1KG?"
    }
  }'
```

### Test 3: Generic CheckStock (No Location)

```bash
curl -X POST http://localhost:5001/ims-ai-821f0/asia-southeast1/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "queryResult": {
      "intent": {
        "displayName": "CheckStock"
      },
      "parameters": {
        "product": "Oil Packet 1KG"
      },
      "queryText": "Do you have Oil Packet 1KG?"
    }
  }'
```

## Method 3: Using Postman

1. Open Postman
2. Create a new POST request
3. URL: `http://localhost:5001/ims-ai-821f0/asia-southeast1/webhook`
4. Headers: `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "queryResult": {
    "intent": {
      "displayName": "CheckStockAtLocation"
    },
    "parameters": {
      "product": "Oil Packet 1KG",
      "location": "99 Speedmart Acacia"
    },
    "queryText": "Is Oil Packet 1KG available at 99 Speedmart Acacia?"
  }
}
```

## Expected Responses

### Success (Product Found at Location)
```json
{
  "fulfillmentText": "Yes, Oil Packet 1KG is available at 99 Speedmart Acacia. There are 13 units in stock (SKU: OIL-001)."
}
```

### Out of Stock
```json
{
  "fulfillmentText": "Sorry, Oil Packet 1KG is currently out of stock at 99 Speedmart Acacia."
}
```

### Location Not Found
```json
{
  "fulfillmentText": "I couldn't find the location \"99 Speedmart XYZ\". Please check the store name and try again."
}
```

### Product Not Found at Location
```json
{
  "fulfillmentText": "I couldn't find \"Oil Packet 1KG\" at 99 Speedmart Acacia. It might be out of stock or not available at that location."
}
```

## Troubleshooting

1. **Emulator not starting?**
   - Check if port 5001 is available
   - Make sure you're in the `function-ai` directory

2. **"Connection refused" error?**
   - Ensure the emulator is running
   - Check the correct URL format in the test script

3. **"Product not found" errors?**
   - Verify your Firestore has test data
   - Check that `storeName` matches the location in your query
   - Ensure product names match (case-insensitive)

4. **Firestore connection issues?**
   - The emulator should use the Firestore emulator or your real Firestore
   - Check your service account credentials if using real Firestore

## Next Steps

Once local testing passes:
1. Deploy to Firebase: `firebase deploy --only functions:function-ai:webhook`
2. Update Dialogflow webhook URL in your Dialogflow agent
3. Test with actual Dialogflow agent

