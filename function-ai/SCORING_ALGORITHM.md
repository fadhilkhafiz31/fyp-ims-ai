# Intelligent Inventory Matching Algorithm

## Overview

This document describes the **scoring-based matching algorithm** implemented in the chatbot webhook for accurate product and location-based inventory queries. The algorithm addresses the challenge of finding the most relevant inventory item when users query using natural language, which may contain variations in product names, store names, or incomplete information.

## Problem Statement

Traditional substring matching approaches (`includes()`) can lead to false positives when:
- Multiple products share common words (e.g., "Rice" appears in multiple product names)
- Store names share prefixes (e.g., "99 Speedmart Acacia" vs "99 Speedmart Desa Jati")
- User queries use abbreviations or variations of product/location names

**Example Problem:**
- User asks: "Do you have Faiza Rice 5KG at 99 Speedmart Acacia?"
- Previous approach might return: "Oil Packet 1KG" (incorrect match)
- The algorithm needed to distinguish between similar products at different locations

## Solution: Multi-Dimensional Scoring Algorithm

The solution implements a **hierarchical scoring system** that evaluates matches across multiple dimensions (product name, SKU, category, location) and ranks results by match quality rather than simply finding the first substring match.

---

## Algorithm Components

### 1. Product Scoring Algorithm

The `calculateProductScore()` function evaluates how well an inventory item matches a user's product query. It uses a **descending priority hierarchy** to assign scores:

#### Scoring Hierarchy:

| Score | Match Type | Description | Example |
|-------|-----------|-------------|---------|
| **100** | Exact Match | Product name or SKU exactly matches query (case-insensitive) | Query: "Oil Packet 1KG" → Item: "oil packet 1kg" |
| **50** | Token Match | All tokens from query appear in product name | Query: "Faiza Rice 5KG" → Item: "Faiza Rice 5KG Premium" |
| **30** | Partial Name Match | Query is substring of name or vice versa | Query: "Seaweed" → Item: "Seaweed Snack Original" |
| **20** | SKU Match | Query matches or is contained in SKU field | Query: "SKU-04" → Item with SKU: "SKU-04" |
| **10** | Category Match | Query matches product category | Query: "Rice" → Item category: "Rice Products" |
| **0** | No Match | No relevant match found | - |

#### Implementation Details:

```javascript
function calculateProductScore(item, productName, productTokens) {
  const nameNorm = norm(item.name || "");
  const skuNorm = norm(item.sku || "");
  const categoryNorm = norm(item.category || "");
  const productNorm = norm(productName);
  
  // Exact match: 100 points
  if (nameNorm === productNorm || skuNorm === productNorm) {
    return 100;
  }
  
  // All tokens match in name: 50 points
  if (productTokens.length > 0 && 
      productTokens.every(tk => nameNorm.includes(tk))) {
    return 50;
  }
  
  // Partial match in name: 30 points
  if (nameNorm.includes(productNorm) || productNorm.includes(nameNorm)) {
    return 30;
  }
  
  // Match in SKU: 20 points
  if (skuNorm.includes(productNorm) || productNorm.includes(skuNorm)) {
    return 20;
  }
  
  // Match in category: 10 points
  if (categoryNorm.includes(productNorm) || 
      productNorm.includes(categoryNorm)) {
    return 10;
  }
  
  return 0; // No match
}
```

#### Normalization:
- All strings are converted to lowercase
- Whitespace is trimmed
- Special characters are handled consistently
- Tokenization splits strings by non-alphanumeric characters

---

### 2. Location Scoring Algorithm

The `calculateLocationScore()` function evaluates how well a store location matches the user's location query. It prevents ambiguous matches when store names share common prefixes.

#### Scoring Hierarchy:

| Score | Match Type | Description | Example |
|-------|-----------|-------------|---------|
| **100** | Exact Match | Store name or storeId exactly matches query | Query: "99 Speedmart Acacia" → Store: "99 Speedmart Acacia" |
| **50** | Starts-With Match | Store name starts with query | Query: "99 Speedmart" → Store: "99 Speedmart Acacia, Nilai" |
| **30** | Token Match | All tokens from query appear in store name/ID | Query: "99 Speedmart Acacia" → Store: "99 Speedmart Acacia, Nilai" |
| **10** | Substring Match | Query contains store name or vice versa | Query: "Acacia" → Store: "99 Speedmart Acacia" |
| **0** | No Match | No relevant match found | - |

#### Implementation Details:

```javascript
function calculateLocationScore(item, locationName, locationTokens) {
  const storeNameNorm = norm(item.storeName || "");
  const storeIdNorm = norm(item.storeId || "");
  const locationNorm = norm(locationName);
  
  // Exact match: 100 points
  if (storeNameNorm === locationNorm || storeIdNorm === locationNorm) {
    return 100;
  }
  
  // Starts with: 50 points
  if (storeNameNorm.startsWith(locationNorm) || 
      storeIdNorm.startsWith(locationNorm)) {
    return 50;
  }
  
  // All tokens present: 30 points
  if (locationTokens.length > 0 && 
      locationTokens.every(tk => 
        storeNameNorm.includes(tk) || storeIdNorm.includes(tk))) {
    return 30;
  }
  
  // Substring match: 10 points
  if (storeNameNorm.includes(locationNorm) || 
      locationNorm.includes(storeNameNorm) ||
      storeIdNorm.includes(locationNorm) ||
      locationNorm.includes(storeIdNorm)) {
    return 10;
  }
  
  return 0; // No match
}
```

---

### 3. Combined Scoring Methodology

For location-specific queries, the algorithm combines both product and location scores using a **weighted approach** that prioritizes product accuracy over location accuracy.

#### Combined Score Formula:

```
Total Score = (Product Score × 1000) + Location Score
```

#### Rationale for Weighting:

1. **Product accuracy is critical**: Returning the wrong product (e.g., "Oil Packet" instead of "Faiza Rice") is more problematic than being slightly off on location.
2. **Location can be more flexible**: Users may use partial store names, and the system can suggest nearby locations.
3. **Mathematical separation**: Multiplying product score by 1000 ensures that product matches always dominate location matches in ranking.

#### Example Scoring:

| Scenario | Product Score | Location Score | Total Score | Result |
|----------|--------------|----------------|-------------|---------|
| **Correct Product + Exact Location** | 100 | 100 | **101,100** | ✅ Best match |
| Correct Product + Partial Location | 100 | 30 | **100,030** | ✅ Good match |
| Wrong Product + Exact Location | 30 | 100 | **31,000** | ❌ Rejected (product mismatch) |
| Partial Product + Exact Location | 50 | 100 | **50,100** | ⚠️ Acceptable if no better match |

---

## Algorithm Workflow

### Step 1: Scoring Phase
For each inventory item, calculate:
- `productScore` = `calculateProductScore(item, productName, productTokens)`
- `locationScore` = `calculateLocationScore(item, locationName, locationTokens)`
- `totalScore` = `productScore × 1000 + locationScore`

### Step 2: Filtering Phase
1. **Product Filter**: Remove items with `productScore = 0` (no product match)
2. **Location Filter**: Remove items with `locationScore = 0` (no location match)

### Step 3: Sorting Phase
Sort remaining items by:
1. **Primary**: `totalScore` (descending)
2. **Secondary**: `productScore` (descending)
3. **Tertiary**: `storeName` (alphabetical, for consistency)

### Step 4: Selection Phase
Return the highest-scoring item as the best match.

---

## Benefits of This Approach

### 1. **Accuracy**
- Prevents false positives by requiring meaningful match scores
- Distinguishes between similar products (e.g., "Rice 5KG" vs "Rice 10KG")

### 2. **Flexibility**
- Handles variations in user input (abbreviations, partial names)
- Token-based matching accommodates word order variations

### 3. **Precision for Location Matching**
- Prevents ambiguous matches when stores share prefixes
- Example: "99 Speedmart Acacia" won't match "99 Speedmart Desa Jati" unless tokens align

### 4. **Extensibility**
- Easy to adjust scoring weights for different use cases
- Can add new match criteria (e.g., brand name, price range) as additional scoring dimensions

### 5. **Performance**
- Single pass through inventory items
- O(n log n) sorting complexity, acceptable for typical inventory sizes (< 10,000 items)

---

## Example Use Cases

### Use Case 1: Exact Product and Location
**Query:** "Do you have Faiza Rice 5KG at 99 Speedmart Acacia?"

**Inventory:**
- Item A: "Faiza Rice 5KG" at "99 Speedmart Acacia" → Product: 100, Location: 100 → **Total: 101,100** ✅
- Item B: "Oil Packet 1KG" at "99 Speedmart Acacia" → Product: 0, Location: 100 → **Total: 0** ❌ (filtered out)

**Result:** Returns Item A correctly.

---

### Use Case 2: Token-Based Product Match
**Query:** "Do you have seaweed snack?"

**Inventory:**
- Item A: "Seaweed Snack Original" → Product: 50 (token match), Location: N/A → **Total: 50,000** ✅
- Item B: "Seaweed Flavor Chips" → Product: 30 (partial), Location: N/A → **Total: 30,000** ⚠️
- Item C: "Rice Cracker" → Product: 0 → **Total: 0** ❌

**Result:** Returns Item A (better token match).

---

### Use Case 3: Ambiguous Location with Product Priority
**Query:** "Do you have Faiza Rice 5KG at 99 Speedmart?"

**Inventory:**
- Item A: "Faiza Rice 5KG" at "99 Speedmart Acacia" → Product: 100, Location: 50 → **Total: 100,050** ✅
- Item B: "Oil Packet 1KG" at "99 Speedmart Acacia" → Product: 0 → **Total: 0** ❌

**Result:** Returns Item A (product match prioritizes over location ambiguity).

---

## Performance Considerations

- **Time Complexity**: O(n) for scoring + O(n log n) for sorting = **O(n log n)**
- **Space Complexity**: O(n) for storing scored matches
- **Scalability**: Suitable for inventories up to 10,000 items. For larger datasets, consider indexing or database-level filtering.

---

## Future Enhancements

1. **Machine Learning Integration**: Train a model to learn optimal scoring weights from user feedback
2. **Fuzzy Matching**: Integrate Levenshtein distance for typo tolerance
3. **Synonym Support**: Expand product matching using synonym dictionaries
4. **Contextual Scoring**: Consider user history, location proximity, or inventory age
5. **Caching**: Cache common queries to reduce computation for frequent searches

---

## References

- **Implementation**: `function-ai/index.js` - `calculateProductScore()`, `calculateLocationScore()`, `queryInventoryByProductAndLocation()`
- **Related Documentation**: `DIALOGFLOW_SETUP.md`, `TESTING.md`
- **Testing**: `test-webhook.js` - Contains test cases for various matching scenarios

---

## Conclusion

The multi-dimensional scoring algorithm provides a robust solution for natural language inventory queries by:
- Prioritizing exact and high-quality matches
- Handling user input variations gracefully
- Preventing false positives through hierarchical scoring
- Maintaining performance through efficient sorting and filtering

This approach significantly improves chatbot accuracy and user experience compared to simple substring matching methods.

---

*Document Version: 1.0*  
*Last Updated: November 2024*

