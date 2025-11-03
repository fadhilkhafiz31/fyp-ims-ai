# Dialogflow Webhook Configuration Guide

This guide walks you through configuring Dialogflow to invoke the webhook for location-specific product queries.

## Prerequisites

- Dialogflow ES agent created and configured
- Firebase Functions deployed with webhook endpoint
- `@product` and `@location` entities created in Dialogflow
- `check_stock_at_location` intent created

## Step 1: Enable Webhook for Your Intent

1. Open your [Dialogflow Console](https://dialogflow.cloud.google.com/)
2. Navigate to your agent
3. Go to **Intents** → Find and click on `check_stock_at_location` intent
4. Scroll down to the **Fulfillment** section
5. Enable the webhook:
   - Check the box for **"Enable webhook call for this intent"** or **"Use webhook"**
   - This ensures Dialogflow calls your webhook instead of using static responses
6. **Remove or comment out** any static default responses in the intent
   - Static responses will be used if webhook is not enabled
7. Verify the **Action** field shows webhook configuration (not "Not available")

## Step 2: Configure Webhook URL

1. In Dialogflow Console, go to **Settings** (gear icon) → **Fulfillment**
2. Under **Webhook**, add your Firebase Functions URL:
   ```
   https://asia-southeast1-ims-ai-821f0.cloudfunctions.net/webhook
   ```
   - Replace `ims-ai-821f0` with your project ID if different
   - The region (`asia-southeast1`) should match your function deployment
3. Click **Save**
4. Wait for the configuration to deploy (usually a few seconds)

## Step 3: Verify Intent Configuration

### Check Intent Parameters

1. In your `check_stock_at_location` intent, verify:
   - `@product` entity is mapped correctly
   - `@location` entity is mapped correctly
   - Required parameters are marked if needed

### Configure Entity Synonyms

**Important:** To improve entity recognition, add synonyms for your products:

1. Go to **Entities** in Dialogflow console
2. Select your `@product` entity
3. Add synonyms for each product:
   - **Product:** "Seaweed Snack Original"
     - **Synonyms:** "seaweed snack", "seaweed", "seaweed original", "snack seaweed"
   - **Product:** "Oil Packet 1KG"
     - **Synonyms:** "oil packet", "oil 1kg", "cooking oil 1kg"
   
This helps Dialogflow recognize products even when users use different phrases.

### Verify Training Phrases

Example training phrases should include:
- "Is {product=Oil Packet 1KG} available at {location=99 Speedmart Acacia}?"
- "Do you have {product=Oil Packet 1KG} at {location=99 Speedmart Acacia}?"
- "Check stock for {product=Seaweed Snack Original} at {location=99 Speedmart Desa Jati}?"

Make sure entities are properly annotated in training phrases.

**Note:** Dialogflow may pass entity values as arrays (e.g., `product: ["Seaweed Snack Original"]`). The webhook handles both string and array formats automatically.

## Step 4: Test the Configuration

### Test in Dialogflow Console

1. Open the **Test Console** in Dialogflow (right panel or "Try it now")
2. Type a test query:
   ```
   Is Oil Packet 1KG available at 99 Speedmart Acacia?
   ```
3. Verify:
   - Intent is detected as `check_stock_at_location`
   - Parameters show:
     - `product: "Oil Packet 1KG"`
     - `location: "99 Speedmart Acacia"`
   - Response comes from webhook (check the response source)

### Expected Response from Webhook

If product found at location:
```json
{
  "fulfillmentText": "Yes, Oil Packet 1KG is available at 99 Speedmart Acacia. There are 13 units in stock (SKU: OIL-001)."
}
```

If out of stock:
```json
{
  "fulfillmentText": "Sorry, Oil Packet 1KG is currently out of stock at 99 Speedmart Acacia."
}
```

## Troubleshooting

### Problem: Seeing Default Responses Instead of Webhook

**Symptoms:**
- Dialogflow returns static text from intent responses
- Action shows "Not available" in intent configuration
- Response doesn't match webhook format

**Solutions:**
1. Verify webhook is enabled in intent (Step 1)
2. Check webhook URL is correct in Settings → Fulfillment
3. Verify webhook URL is accessible (try accessing it in browser)
4. Check Firebase Functions logs for errors
5. Ensure webhook function is deployed: `firebase deploy --only functions:function-ai:webhook`

### Problem: Parameters Are Empty or in Wrong Format

**Symptoms:**
- `p.product` or `p.location` are empty/undefined in webhook
- Parameters may be arrays instead of strings: `product: ["Seaweed Snack Original"]`
- Response indicates missing parameters

**Solutions:**
1. Verify entities (`@product`, `@location`) are created in Dialogflow
2. Check training phrases have entities properly annotated
3. Test entity extraction separately in Dialogflow console
4. Ensure entity synonyms/entries are configured correctly
5. **Check webhook logs:** The webhook logs all parameter formats for debugging:
   ```javascript
   console.log("Product parameter (raw):", p.product);
   console.log("Detected product:", productName);
   ```
6. **Array handling:** The webhook automatically handles both formats:
   - String: `product: "Seaweed Snack Original"`
   - Array: `product: ["Seaweed Snack Original"]` → extracts first element

### Problem: Wrong Location Matched

**Symptoms:**
- Webhook matches wrong store (e.g., "99 Speedmart Acacia" matches "99 Speedmart Desa Jati")

**Solutions:**
- This should be fixed with the token-based matching in the updated webhook
- Verify your Firestore inventory has correct `storeName` or `storeId` values
- Check location tokens are matching correctly (all tokens must be present)
- Review webhook logs for matching logic

### Problem: Webhook Timeout or Errors

**Symptoms:**
- Dialogflow shows webhook error
- Functions logs show timeout

**Solutions:**
1. Check Firebase Functions logs: `firebase functions:log --only function-ai:webhook`
2. Verify function timeout settings (should be <= 10 seconds for Dialogflow)
3. Check Firestore query performance
4. Ensure service account has proper permissions

## Verifying Webhook is Being Called

### Check Dialogflow Response Metadata

1. In Dialogflow test console, after sending a query:
2. Look at the response details/metadata
3. Check for "Fulfillment" section showing webhook call

### Check Firebase Functions Logs

```bash
firebase functions:log --only function-ai:webhook
```

Look for:
- Incoming requests from Dialogflow
- Parameters received
- Responses sent

### Check Network Requests

In browser DevTools (if testing via frontend):
- Network tab should show POST to `/webhook` or `/detect-intent`
- Request body should contain `queryResult` with parameters
- Response should contain `fulfillmentText`

## Additional Configuration

### Using storeId Instead of storeName (Optional)

For more precise matching, you can configure Dialogflow to capture store IDs:
1. Create `@storeId` entity with store IDs like "99sm-acacia-nilai"
2. Update training phrases to use store IDs
3. Webhook will match against `storeId` field instead of `storeName`

### Environment-Specific URLs

- **Development/Testing**: Use Firebase emulator URL for local testing
- **Production**: Use deployed Firebase Functions URL
- Update webhook URL in Dialogflow when switching environments

## Next Steps

After configuring:
1. Test with various product/location combinations
2. Verify token-based matching prevents false matches
3. Monitor Firebase Functions logs for any issues
4. Update training phrases based on common user queries

