# LocationSelector Fix - "No locations available"

## Problem
The LocationSelector component was showing "No locations available" because it was trying to load stores from a `storeId` collection in Firestore that didn't exist or was empty.

## Root Cause
- The StoreContext was configured to load from `collection(db, "storeId")`
- This collection was empty or non-existent
- However, inventory items already contain `storeId` and `storeName` fields

## Solution
Modified the StoreContext to extract unique stores from the existing inventory collection instead of relying on a separate `storeId` collection.

### Changes Made

1. **Updated StoreContext.jsx**
   - Changed from loading `collection(db, "storeId")` to `collection(db, "inventory")`
   - Extract unique stores from inventory items using `storeId` and `storeName` fields
   - Added console logging for debugging

2. **Enhanced LocationSelector.jsx**
   - Better error message when no locations are available
   - Maintains the same styling and functionality

3. **Created utility files**
   - `src/utils/populateSampleStores.js` - Helper functions to populate sample data
   - `src/components/PopulateSampleData.jsx` - UI component to manage sample data

## How It Works Now

1. StoreContext listens to the inventory collection
2. Extracts unique `storeId` and `storeName` combinations
3. Creates a stores array with unique locations
4. LocationSelector displays these extracted stores

## If You Still See "No locations available"

This means your inventory collection is empty. You have two options:

### Option 1: Add Sample Data (Recommended for Testing)
1. Import the PopulateSampleData component in any page:
   ```jsx
   import PopulateSampleData from "../components/PopulateSampleData";
   
   // Add to your component JSX
   <PopulateSampleData />
   ```
2. Click "Add Sample Store Data" to populate sample inventory with stores

### Option 2: Add Real Inventory Data
Add inventory items to Firestore with `storeId` and `storeName` fields:
```javascript
{
  name: "Product Name",
  sku: "SKU-001", 
  category: "Category",
  price: 10.00,
  qty: 50,
  reorderPoint: 10,
  storeId: "store-001",           // Required for LocationSelector
  storeName: "Store Display Name" // Required for LocationSelector
}
```

## Verification
1. Check browser console for StoreContext logs
2. LocationSelector should now show available stores
3. Checkout page should work with location selection

## Benefits of This Approach
- No need for separate `storeId` collection
- Automatically syncs with inventory data
- Stores appear/disappear based on actual inventory
- Simpler data management
- Consistent with existing inventory structure