# Redeem Points Setup Guide

## Overview
The Redeem Points system allows customers to earn loyalty points by redeeming receipt codes from their purchases. Points are calculated as **1 point per RM spent** (floored).

## How It Works

### 1. **Receipt Code Format**
- Receipt codes are **Transaction IDs** from the transactions collection
- Format: The transaction document ID (e.g., auto-generated ID from Firestore)
- When a transaction is created, its document ID becomes the redeemable code

### 2. **Points Calculation**
- **1 Point = 1 RM spent**
- Points are calculated by: `Math.floor(transaction.totalAmount)`
- Minimum points: 1 (if transaction amount ≥ 1 RM)

### 3. **Database Structure**

#### User Document (`users/{userId}`)
```javascript
{
  name: "Customer Name",
  email: "customer@example.com",
  role: "customer",
  loyaltyPoints: 0,  // Total points balance
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Transaction Document (`transactions/{transactionId}`)
- The `transactionId` (document ID) is the redeemable code
- Must have a `totalAmount` field for points calculation:
```javascript
{
  type: "IN" | "OUT",
  itemId: "item-id",
  itemName: "Item Name",
  qty: 10,
  totalAmount: 25.50,  // Required: Used to calculate points
  storeId: "store-id",
  createdAt: Timestamp,
  // ... other fields
}
```

#### Redeemed Codes Collection (`redeemedCodes/{code}`)
- Tracks which codes have been redeemed to prevent double-redemption
```javascript
{
  userId: "user-id",
  code: "TRANSACTION-ID",
  pointsAwarded: 25,
  transactionId: "TRANSACTION-ID",
  transactionAmount: 25.50,
  redeemedAt: Timestamp
}
```

## Setup Steps

### Step 1: Deploy Firebase Function
The `redeemLoyaltyCode` function is already defined. Deploy it:

```bash
cd function-ai
firebase deploy --only functions:function-ai:redeemLoyaltyCode
```

Or deploy all functions:
```bash
firebase deploy --only functions
```

### Step 2: Ensure Transaction Documents Have `totalAmount`
For the redeem system to work, transactions need a `totalAmount` field. You have two options:

#### Option A: Update Existing Transactions
Add `totalAmount` field to transaction documents when creating them.

#### Option B: Modify Transaction Creation
Update your transaction creation code to include `totalAmount`:

```javascript
// In Transactions.jsx or wherever you create transactions
tx.set(txDocRef, {
  type,
  itemId: form.itemId,
  itemName: inv.name ?? null,
  storeId: inv.storeId || null,
  qty: delta,
  note: (form.note || "").trim() || null,
  receiptImageUrl: receiptImageUrl || null,
  totalAmount: calculateTotalAmount(delta, inv.price), // Add this
  createdAt: serverTimestamp(),
  balanceBefore: currentQty,
  balanceAfter: nextQty,
});
```

### Step 3: Initialize User Points Field
Ensure user documents have the `loyaltyPoints` field initialized to 0:

```javascript
// When creating a new user (in Register.jsx or similar)
await setDoc(doc(db, "users", user.uid), {
  name,
  email,
  role: "customer",
  loyaltyPoints: 0,  // Initialize points
  createdAt: serverTimestamp()
});
```

### Step 4: Fix Field Name Consistency (IMPORTANT)
There's a mismatch between the function and frontend:
- **Function uses**: `loyaltyPoints`
- **Frontend reads**: `points`

**Fix the frontend** to use `loyaltyPoints`:
```javascript
// In RedeemPoints.jsx, line ~183
setPointsBalance(userData.loyaltyPoints || 0);  // Change from 'points' to 'loyaltyPoints'
```

### Step 5: Ensure Firestore Rules Allow Operations

#### Users Collection
```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow update: if request.auth != null && request.auth.uid == userId;
  // Function needs to update user points
}
```

#### Transactions Collection
```javascript
match /transactions/{transactionId} {
  allow read: if request.auth != null;  // Customers need to read transactions
}
```

#### RedeemedCodes Collection
Add to `firestore.rules`:
```javascript
match /redeemedCodes/{codeId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow create: if false;  // Only function can create
}
```

## Testing the System

### 1. Create a Test Transaction
- Go to Transactions page
- Add a transaction with a receipt
- Note the transaction ID (this is the redeemable code)

### 2. Test Redeeming
- Go to Redeem Points page
- Enter the transaction ID as the code
- Click "Claim Points"
- Points should be added to user's balance

### 3. Verify Points
- Check user document in Firestore: `users/{userId}` → `loyaltyPoints` field
- Check redeemed codes: `redeemedCodes/{code}` should exist
- Try redeeming the same code again - should fail with "already redeemed" error

## Troubleshooting

### Points Not Showing
- Check if user document has `loyaltyPoints` field
- Verify the frontend is reading `loyaltyPoints` (not `points`)

### "Invalid receipt code" Error
- Verify the transaction document exists
- Check that the code matches the transaction document ID exactly

### "Transaction does not qualify" Error
- Transaction must have `totalAmount` ≥ 1
- Check that `totalAmount` field exists and is a number

### Points Not Updating After Redemption
- Check browser console for errors
- Verify Firebase Function is deployed
- Check Firestore rules allow function to update user documents

## Example Workflow

1. **Customer makes purchase**
   - Staff creates transaction in Transactions page
   - Transaction ID: `abc123xyz`
   - Transaction totalAmount: `RM 45.80`

2. **Customer receives receipt**
   - Receipt shows code: `abc123xyz`

3. **Customer redeems code**
   - Goes to Redeem Points page
   - Enters: `abc123xyz`
   - System calculates: `Math.floor(45.80) = 45 points`
   - Points added to customer's account

4. **Customer checks balance**
   - Points balance displays: "45 Points 🎉"
   - Can redeem more codes to accumulate points

## Next Steps (Optional Enhancements)

1. **Display Points in Profile**
   - Show total points on user profile page

2. **Points History**
   - Create a `pointsHistory` collection to track all point transactions

3. **Points Redemption (Using Points)**
   - Allow customers to use points for discounts or rewards

4. **Receipt QR Code Generation**
   - Generate QR codes on receipts with transaction ID embedded

5. **Minimum Purchase Requirements**
   - Set minimum transaction amount to earn points (e.g., RM 10)

