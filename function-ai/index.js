// --- SmartStockAI Dialogflow webhook (Firebase Functions v2) ---
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { generateReceiptPdf } = require("./pdfGenerator");

// Dialogflow detectIntent client (uses default creds in Functions)
const dialogflow = require('@google-cloud/dialogflow');

// Gemini AI client
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Define secret for Gemini API key
const { defineSecret } = require("firebase-functions/params");
const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

// ============================================
// API Key is stored securely in Firebase Secrets
// Set it using: firebase functions:secrets:set GEMINI_API_KEY
// ============================================

// Initialize Dialogflow client with explicit project configuration
// This ensures it uses Application Default Credentials from Firebase Functions
let sessionClient;
try {
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  if (projectId) {
    sessionClient = new dialogflow.SessionsClient({ projectId });
  } else {
    sessionClient = new dialogflow.SessionsClient();
  }
  console.log("Dialogflow SessionsClient initialized successfully");
} catch (err) {
  console.error("Failed to initialize Dialogflow client:", err);
  // Will be re-initialized when needed
  sessionClient = null;
}

// Global defaults (optional but recommended)
setGlobalOptions({ region: "asia-southeast1", timeoutSeconds: 60, memory: "256MiB" });

// Init Admin SDK once
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// Gemini API configuration - using environment variable for now
// TODO: After adding GEMINI_API_KEY secret in Firebase Console, uncomment below and use:
// const { defineSecret } = require("firebase-functions/params");
// const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");
// Then update exports.webhook to include: secrets: [geminiApiKeySecret]

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ---------- helpers ----------
const norm = (s) => (s || "").toString().trim().toLowerCase();
const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// Format date as "Today is Monday, 6 November 2025"
function formatTodayDate() {
  const today = new Date();
  const dayOfWeek = today.toLocaleString('en-US', { weekday: 'long' });
  const day = today.getDate();
  const month = today.toLocaleString('en-US', { month: 'long' });
  const year = today.getFullYear();
  return `Today is ${dayOfWeek}, ${day} ${month} ${year}`;
}

// Calculate product match score for ranking matches
// Returns score: 100 (exact) > 50 (token match) > 30 (partial name) > 20 (SKU) > 10 (category)
// Calculate product match score for ranking matches
// Returns score: 100 (exact) > 50 (token match) > 30 (partial name) > 20 (SKU) > 10 (category)
function calculateProductScore(item, productName, productTokens) {
  const nameNorm = norm(item.name || "");
  const skuNorm = norm(item.sku || "");
  const categoryNorm = norm(item.category || "");
  const productNorm = norm(productName);

  // Exact match gets highest score
  if (nameNorm === productNorm || skuNorm === productNorm) {
    return 100;
  }

  // All tokens match in name (very good match)
  if (productTokens.length > 0 && productTokens.every(tk => nameNorm.includes(tk))) {
    return 50;
  }

  // Partial match in name (good match)
  if (nameNorm.includes(productNorm) || productNorm.includes(nameNorm)) {
    return 30;
  }

  // Match in SKU (decent match)
  if (skuNorm.includes(productNorm) || productNorm.includes(skuNorm)) {
    return 20;
  }

  // Match in category (weak match)
  if (categoryNorm.includes(productNorm) || productNorm.includes(categoryNorm)) {
    return 10;
  }

  // No match
  return 0;
}

// Calculate location match score for ranking matches
// Returns score: 100 (exact) > 50 (starts-with) > 30 (token match) > 10 (contains/substring)
function calculateLocationScore(item, locationName, locationTokens) {
  const storeNameNorm = norm(item.storeName || "");
  const storeIdNorm = norm(item.storeId || ""); // Use item.storeId field from Firestore
  const locationNorm = norm(locationName);

  // Exact match gets highest score
  if (storeNameNorm === locationNorm || storeIdNorm === locationNorm) {
    return 100;
  }

  // Starts with gets medium score
  if (storeNameNorm.startsWith(locationNorm) || storeIdNorm.startsWith(locationNorm)) {
    return 50;
  }

  // Token match (all tokens present) gets good score
  if (locationTokens.length > 0 && locationTokens.every(tk =>
    storeNameNorm.includes(tk) || storeIdNorm.includes(tk)
  )) {
    return 30;
  }

  // Fallback substring match gets lower score
  if (storeNameNorm.includes(locationNorm) ||
    locationNorm.includes(storeNameNorm) ||
    storeIdNorm.includes(locationNorm) ||
    locationNorm.includes(storeIdNorm)) {
    return 10;
  }

  // No match
  return 0;
}
async function queryInventoryByStoreAndTerm({ term, storeId }) {
  const qNorm = norm(term);
  const qTokens = tokens(term);

  let prioritizedItems = [];
  let prioritizedIds = new Set();

  // First try strict match within selected store and keep those matches,
  // but continue searching globally so we can list every location.
  if (storeId) {
    const snap = await db.collection("inventory")
      .where("storeId", "==", storeId)
      .get();

    prioritizedItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    prioritizedItems = prioritizedItems.filter(x => {
      const fields = [x.name, x.sku, x.category].map(norm);
      const sym = fields.some(f => f.includes(qNorm) || qNorm.includes(f));
      const tok = qTokens.length ? fields.some(f => qTokens.every(tk => f.includes(tk))) : false;
      return sym || tok;
    });
    prioritizedIds = new Set(prioritizedItems.map(item => item.id));

    if (!prioritizedItems.length) {
      prioritizedItems = [];
      prioritizedIds = new Set();
    }
  }

  // Fallback: search all stores
  const snap = await db.collection("inventory").get();
  let all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  all = all.filter(x => {
    const fields = [x.name, x.sku, x.category].map(norm);
    const sym = fields.some(f => f.includes(qNorm) || qNorm.includes(f));
    const tok = qTokens.length ? fields.some(f => qTokens.every(tk => f.includes(tk))) : false;
    return sym || tok;
  });

  // If we have prioritized matches, prepend them and mark scope
  if (prioritizedItems.length) {
    const remaining = all.filter(item => !prioritizedIds.has(item.id));
    return { items: [...prioritizedItems, ...remaining], scope: "selected+any" };
  }

  return { items: all, scope: storeId ? "selected_empty" : "any" };
}

// Query inventory by product and location names
// BLOCKED: Intelligent matching disabled - ChatbotPanel now depends only on Dialogflow webhook
// Query inventory by product and location names
async function queryInventoryByProductAndLocation({ productName, locationName }) {
  const productNorm = norm(productName);
  const productTokens = tokens(productName);
  const locationTokens = tokens(locationName);
  const locationNorm = norm(locationName);

  // Get all inventory items
  const snap = await db.collection("inventory").get();
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Score items by BOTH product and location match quality
  // Priority: Product match first (more important), then location match
  const scoredMatches = items.map(item => {
    const productScore = calculateProductScore(item, productName, productTokens);
    const locationScore = calculateLocationScore(item, locationName, locationTokens);

    // Only consider items that have some product match (score > 0)
    if (productScore === 0) {
      return { item, productScore: 0, locationScore: 0, totalScore: 0 };
    }

    // If location doesn't match, still include but with lower priority
    // Combined score: product score (weighted higher) + location score
    // Use productScore * 1000 + locationScore to prioritize product matching
    const totalScore = productScore * 1000 + locationScore;

    return { item, productScore, locationScore, totalScore };
  });

  // Filter out items with no product match
  const productMatched = scoredMatches.filter(sm => sm.productScore > 0);

  if (productMatched.length === 0) {
    return { items: [], scope: "product_not_found" };
  }

  // Filter out items with no location match
  const locationMatched = productMatched.filter(sm => sm.locationScore > 0);

  if (locationMatched.length === 0) {
    return { items: [], scope: "location_not_found" };
  }

  // Sort by total score (highest first), then by product score, then by storeName
  locationMatched.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.productScore !== a.productScore) return b.productScore - a.productScore;
    const nameA = norm(a.item.storeName || "");
    const nameB = norm(b.item.storeName || "");
    return nameA.localeCompare(nameB);
  });

  // Log for debugging
  console.log("Product search:", productName);
  console.log("Location search:", locationName);
  console.log("Top matches:", locationMatched.slice(0, 3).map(sm => ({
    name: sm.item.name,
    store: sm.item.storeName,
    productScore: sm.productScore,
    locationScore: sm.locationScore,
    totalScore: sm.totalScore
  })));

  // Return items in best-match order (highest-scoring match first)
  return {
    items: locationMatched.map(sm => sm.item),
    scope: "found"
  };
}

// Legacy function for backward compatibility
async function searchInventory({ term, storeId }) {
  const { items } = await queryInventoryByStoreAndTerm({ term, storeId });
  return items;
}

// Helper function to fetch all inventory items and format them into a context string
async function getInventoryContext() {
  try {
    const snap = await db.collection("inventory").get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (items.length === 0) {
      return "No inventory items found.";
    }

    // Group items by product (name + SKU combination)
    const productMap = new Map();
    
    items.forEach(item => {
      const name = item.name || "Unknown";
      const sku = item.sku || "N/A";
      const productKey = `${name}|${sku}`;
      const qty = Number(item.qty ?? 0);
      const storeName = item.storeName || "Unknown Store";
      const storeId = item.storeId || "N/A";
      const category = item.category || "Uncategorized";
      const reorderPoint = Number(item.reorderPoint ?? 5);
      const price = item.price !== undefined && item.price !== null
        ? Number(item.price)
        : null;

      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          name,
          sku,
          category,
          locations: []
        });
      }

      // Add location info for this product
      productMap.get(productKey).locations.push({
        storeName: storeName.trim(),
        storeId: storeId.trim(),
        qty,
        reorderPoint,
        price: price !== null && !Number.isNaN(price) ? price : null
      });
    });

    // Deduplicate locations and aggregate quantities for each product
    productMap.forEach((product, productKey) => {
      const locationMap = new Map();
      
      product.locations.forEach(loc => {
        // Normalize store name and ID for comparison
        const normalizedStoreName = (loc.storeName || "").trim().toLowerCase().replace(/\s+/g, " ");
        const normalizedStoreId = (loc.storeId || "").trim().toLowerCase();
        
        // Try to find existing location by storeId first (most unique identifier)
        let foundKey = null;
        if (normalizedStoreId && normalizedStoreId !== "n/a") {
          // Look for existing entry with same storeId
          for (const [key, existing] of locationMap.entries()) {
            const existingStoreId = (existing.storeId || "").trim().toLowerCase();
            if (existingStoreId === normalizedStoreId && existingStoreId !== "n/a") {
              foundKey = key;
              break;
            }
          }
        }
        
        // If no storeId match, try matching by normalized storeName
        if (!foundKey && normalizedStoreName && normalizedStoreName !== "unknown store") {
          for (const [key, existing] of locationMap.entries()) {
            const existingStoreName = (existing.storeName || "").trim().toLowerCase().replace(/\s+/g, " ");
            if (existingStoreName === normalizedStoreName) {
              foundKey = key;
              break;
            }
          }
        }
        
        if (foundKey) {
          // Sum quantities for duplicate locations
          const existing = locationMap.get(foundKey);
          existing.qty += loc.qty;
          // Update storeName if current one is better (longer/more complete)
          if (loc.storeName && loc.storeName.trim() && 
              (!existing.storeName || loc.storeName.trim().length > existing.storeName.length)) {
            existing.storeName = loc.storeName.trim();
          }
          // Preserve price if we don't have one yet (or if the new one is a valid number)
          if (existing.price === null && loc.price !== null && !Number.isNaN(loc.price)) {
            existing.price = loc.price;
          }
        } else {
          // Store name validation: prefer storeName, but don't use storeId if it looks like an ID
          let displayStoreName = null;
          if (loc.storeName && loc.storeName.trim()) {
            displayStoreName = loc.storeName.trim();
          } else if (loc.storeId && loc.storeId.trim()) {
            // Only use storeId as display name if it doesn't look like an ID
            const storeIdTrimmed = loc.storeId.trim();
            const looksLikeId = storeIdTrimmed.includes("-") || 
                                storeIdTrimmed.includes("_") || 
                                (storeIdTrimmed.length < 15 && !storeIdTrimmed.includes(" "));
            // If it doesn't look like an ID (has spaces, is long enough, etc.), use it
            if (!looksLikeId && storeIdTrimmed.length > 5) {
              displayStoreName = storeIdTrimmed;
            }
          }
          
          // If we still don't have a display name, skip this entry (invalid data)
          if (!displayStoreName) {
            return;
          }
          
          // Use normalized storeName as key for deduplication
          const normalizedDisplayName = displayStoreName.toLowerCase().replace(/\s+/g, " ");
          const locationKey = normalizedDisplayName || normalizedStoreId || `location_${locationMap.size}`;
          
          locationMap.set(locationKey, {
            storeName: displayStoreName,
            storeId: loc.storeId.trim() || "N/A",
            qty: loc.qty,
            reorderPoint: loc.reorderPoint,
            price: loc.price !== null && !Number.isNaN(loc.price) ? loc.price : null
          });
        }
      });
      
      // Replace product.locations with deduplicated locations
      product.locations = Array.from(locationMap.values());
    });

    // Format grouped products
      const formattedProducts = Array.from(productMap.values()).map(product => {
      // Sort locations by quantity (highest first)
      const sortedLocations = product.locations.sort((a, b) => b.qty - a.qty);
      
      // Calculate total quantity
      const totalQty = sortedLocations.reduce((sum, loc) => sum + loc.qty, 0);
      
      // Format locations list (using validated store names from deduplication)
        const locationsList = sortedLocations.map(loc => {
        // Use the validated storeName (already validated during deduplication)
        const displayStoreName = loc.storeName || "Unknown Store";
        // Only show store ID if it's different from store name and not "N/A"
        const storeIdDisplay = (loc.storeId && loc.storeId !== "N/A" && loc.storeId.toLowerCase() !== displayStoreName.toLowerCase()) 
          ? ` (ID: ${loc.storeId})` 
          : "";
          const priceDisplay = loc.price !== null && !Number.isNaN(loc.price)
            ? ` | Price: RM ${loc.price.toFixed(2)}`
            : "";
          return `  - ${displayStoreName}${storeIdDisplay}: ${loc.qty} units${priceDisplay}`;
      }).join("\n");

      return `Product: ${product.name} (SKU: ${product.sku}, Category: ${product.category})
Total Quantity: ${totalQty} units across ${sortedLocations.length} location(s)
Locations:
${locationsList}`;
    }).join("\n\n");

    return `Inventory Items (${productMap.size} unique products, ${items.length} total entries):\n\n${formattedProducts}`;
  } catch (error) {
    console.error("Error fetching inventory context:", error);
    return "Error fetching inventory data.";
  }
}

const reply = (text) => ({ fulfillmentText: text });

// ---------- Rate Limiting Configuration ----------
// Free tier limits (adjust based on your plan)
const RATE_LIMITS = {
  DAILY_LIMIT: 50,        // Max requests per day
  MONTHLY_LIMIT: 1000,    // Max requests per month
  PER_MINUTE_LIMIT: 5,    // Max requests per minute (per user)
  PER_HOUR_LIMIT: 20,     // Max requests per hour (per user)
};

// Track usage in Firestore
async function checkAndUpdateUsage() {
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
  
  const usageRef = db.collection('gemini_usage').doc('global');
  
  try {
    return await db.runTransaction(async (tx) => {
      const usageDoc = await tx.get(usageRef);
      const usageData = usageDoc.exists ? usageDoc.data() : {};
      
      // Initialize counters if they don't exist
      const dailyCount = usageData[dateKey] || 0;
      const monthlyCount = usageData[monthKey] || 0;
      
      // Check limits
      if (dailyCount >= RATE_LIMITS.DAILY_LIMIT) {
        throw new Error(`Daily limit reached (${RATE_LIMITS.DAILY_LIMIT} requests/day). Please try again tomorrow.`);
      }
      
      if (monthlyCount >= RATE_LIMITS.MONTHLY_LIMIT) {
        throw new Error(`Monthly limit reached (${RATE_LIMITS.MONTHLY_LIMIT} requests/month). Please contact administrator.`);
      }
      
      // Update counters
      const updates = {};
      updates[dateKey] = (dailyCount || 0) + 1;
      updates[monthKey] = (monthlyCount || 0) + 1;
      updates.lastRequest = admin.firestore.FieldValue.serverTimestamp();
      updates.totalRequests = (usageData.totalRequests || 0) + 1;
      
      tx.set(usageRef, updates, { merge: true });
      
      return {
        dailyCount: updates[dateKey],
        monthlyCount: updates[monthKey],
        dailyLimit: RATE_LIMITS.DAILY_LIMIT,
        monthlyLimit: RATE_LIMITS.MONTHLY_LIMIT,
        remainingDaily: RATE_LIMITS.DAILY_LIMIT - updates[dateKey],
        remainingMonthly: RATE_LIMITS.MONTHLY_LIMIT - updates[monthKey],
      };
    });
  } catch (error) {
    // If it's a limit error, throw it
    if (error.message.includes('limit reached')) {
      throw error;
    }
    // For other errors, log and allow (fail open to avoid blocking service)
    console.error("Error checking usage:", error);
    return {
      dailyCount: 0,
      monthlyCount: 0,
      dailyLimit: RATE_LIMITS.DAILY_LIMIT,
      monthlyLimit: RATE_LIMITS.MONTHLY_LIMIT,
      remainingDaily: RATE_LIMITS.DAILY_LIMIT,
      remainingMonthly: RATE_LIMITS.MONTHLY_LIMIT,
    };
  }
}

// Per-user rate limiting (simple in-memory cache, resets on function restart)
const userRequestCache = new Map();

function checkUserRateLimit(userId) {
  const now = Date.now();
  const userKey = userId || 'anonymous';
  
  if (!userRequestCache.has(userKey)) {
    userRequestCache.set(userKey, {
      requests: [],
      lastCleanup: now,
    });
  }
  
  const userData = userRequestCache.get(userKey);
  
  // Cleanup old requests (older than 1 hour)
  if (now - userData.lastCleanup > 3600000) {
    userData.requests = userData.requests.filter(timestamp => now - timestamp < 3600000);
    userData.lastCleanup = now;
  }
  
  // Check per-minute limit
  const recentRequests = userData.requests.filter(timestamp => now - timestamp < 60000);
  if (recentRequests.length >= RATE_LIMITS.PER_MINUTE_LIMIT) {
    throw new Error(`Rate limit exceeded. Maximum ${RATE_LIMITS.PER_MINUTE_LIMIT} requests per minute. Please wait a moment.`);
  }
  
  // Check per-hour limit
  const hourlyRequests = userData.requests.filter(timestamp => now - timestamp < 3600000);
  if (hourlyRequests.length >= RATE_LIMITS.PER_HOUR_LIMIT) {
    throw new Error(`Rate limit exceeded. Maximum ${RATE_LIMITS.PER_HOUR_LIMIT} requests per hour. Please wait before trying again.`);
  }
  
  // Add current request
  userData.requests.push(now);
}

// ---------- Gemini AI Handler ----------
async function geminiHandler(req, res) {
  try {
    const message = req.body?.message || req.body?.text || "";

    if (!message.trim()) {
      return res.status(400).json({
        error: "Message is required",
        response: "Please provide a message to chat with the AI."
      });
    }

    // Get user ID from request (if available)
    const userId = req.body?.userId || req.headers['x-user-id'] || 'anonymous';
    
    // Check per-user rate limits
    try {
      checkUserRateLimit(userId);
    } catch (rateLimitError) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        response: rateLimitError.message
      });
    }

    // Check and update global usage limits
    let usageInfo;
    try {
      usageInfo = await checkAndUpdateUsage();
    } catch (limitError) {
      return res.status(429).json({
        error: "Usage limit exceeded",
        response: limitError.message
      });
    }

    // Log usage info (for monitoring)
    console.log(`Gemini API usage - Daily: ${usageInfo.dailyCount}/${usageInfo.dailyLimit}, Monthly: ${usageInfo.monthlyCount}/${usageInfo.monthlyLimit}`);

    // Get API key from Firebase secret
    const GEMINI_API_KEY = geminiApiKeySecret.value();

    // Validate API key
    if (!GEMINI_API_KEY) {
      console.error("Gemini API key not configured");
      return res.status(500).json({
        error: "API key not configured",
        response: "Gemini AI is not configured. Please set the GEMINI_API_KEY secret using: firebase functions:secrets:set GEMINI_API_KEY"
      });
    }

    // Log API key for debugging (first 10 chars only for security)
    const apiKeyPreview = GEMINI_API_KEY.substring(0, 10) + "...";
    console.log(`Using Gemini API key: ${apiKeyPreview} (length: ${GEMINI_API_KEY.length})`);
    console.log(`API key source: SECRET`);

    // Fetch inventory context
    console.log("Fetching inventory context for Gemini...");
    const inventoryContext = await getInventoryContext();

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Create system prompt with inventory context
    const systemPrompt = `You are SmartStockAI, an intelligent inventory management assistant. You help users check stock levels, find products, and manage inventory.

Current Inventory Information:
${inventoryContext}

Today's Date: ${formatTodayDate()}

Instructions:
- Answer questions about inventory, stock levels, product availability, and store locations
- Use the inventory information provided above to give accurate, specific answers
- When listing locations for a product, ensure the store name matches the store ID correctly
- Do not show the Store ID in the response
- Group all locations for the same product together
- Calculate and show total quantities when relevant
- Include price (RM) when available and clearly state it when the user asks about price
- If a product is not found or near to out of stock, suggest similar items if available
- Be helpful, concise, and professional
- If asked about something not related to inventory, politely redirect to inventory-related topics
- Always verify that store names and store IDs match correctly before reporting them
- Format your responses in plain text without markdown formatting (no asterisks, no bold, no special formatting)
- Use simple, clean text with clear line breaks and bullet points using dashes (-) instead of markdown
- Keep the response natural and readable

User Question: ${message}`;

    console.log("Sending request to Gemini...");

    // Try models in order of preference with fallback
    // Prioritize Gemini 2.5 Flash as requested
    const modelsToTry = [
      "gemini-2.5-flash",      // Primary: Gemini 2.5 Flash (stable)
      "gemini-2.5-flash-exp",  // Fallback: 2.5 experimental if stable not available
      "gemini-2.0-flash-exp",  // Fallback: 2.0 experimental
      "gemini-2.0-flash",      // Fallback: 2.0 stable
      "gemini-1.5-flash-latest", // Last resort: 1.5 latest
      "gemini-1.5-flash"        // Final fallback: 1.5 stable
    ];

    let lastError = null;
    let successfulModel = null;
    let text = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        text = response.text();
        successfulModel = modelName;
        console.log(`Successfully used model: ${modelName}`);
        break;
      } catch (modelError) {
        console.error(`Model ${modelName} failed:`, modelError.message);
        console.error(`Full error:`, JSON.stringify(modelError, null, 2));
        lastError = modelError;
        // Continue to next model
      }
    }

    if (!text) {
      const errorDetails = lastError?.message || "Unknown error";
      const errorCode = lastError?.code || "NO_ERROR_CODE";
      console.error(`All models failed. Last error: ${errorDetails} (Code: ${errorCode})`);
      throw new Error(`All models (${modelsToTry.join(", ")}) failed. Last error: ${errorDetails}. Error code: ${errorCode}`);
    }

    console.log("Gemini response received");

    return res.json({
      response: text,
      model: successfulModel,
      timestamp: new Date().toISOString(),
      usage: {
        dailyRemaining: usageInfo.remainingDaily,
        monthlyRemaining: usageInfo.remainingMonthly,
        dailyUsed: usageInfo.dailyCount,
        monthlyUsed: usageInfo.monthlyCount,
      }
    });

  } catch (error) {
    console.error("Gemini handler error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // Provide more detailed error message
    const errorMessage = error.message || "Unknown error";
    const errorCode = error.code || "UNKNOWN";
    
    return res.status(500).json({
      error: "Internal server error",
      errorCode: errorCode,
      errorDetails: errorMessage,
      response: `Sorry, I encountered an error while processing your request: ${errorMessage}. Please try again later. If the issue persists, the model may not be available in your region or account.`
    });
  }
}

// ---------- one handler for Dialogflow ----------
async function dfHandler(req, res) {
  try {
    const qr = req.body?.queryResult || {};
    const intent = qr.intent?.displayName || "";
    const p = qr.parameters || {};
    const queryText = qr.queryText || "";
    const fulfillmentText = qr.fulfillmentText || "";

    // Log webhook call for debugging
    console.log("=== dfHandler (Webhook) Called ===");
    console.log("Query text:", queryText);
    console.log("Intent:", intent);
    console.log("Parameters:", JSON.stringify(p, null, 2));
    console.log("Fulfillment text (from Dialogflow):", fulfillmentText);
    console.log("=== End Webhook Call ===");

    // Handle CheckStockAtLocation intent (primary handler - more accurate with @product parameter)
    if (intent === "CheckStockAtLocation" || (p.product && p.location)) {
      // Extract parameters from Dialogflow queryResult.parameters
      // Dialogflow may pass parameters as arrays, so handle both string and array formats
      const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
      const productName = productParam || qr.queryText || "";
      const locationParam = Array.isArray(p.location) ? p.location[0] : p.location;
      // Dialogflow sends "?" as placeholder for missing required parameters - treat as empty
      const locationName = (locationParam && locationParam !== "?" && locationParam.trim() !== "?") ? locationParam : "";

      // Log parameters for debugging
      console.log("CheckStockAtLocation - Product parameter (raw):", p.product);
      console.log("CheckStockAtLocation - Location parameter (raw):", p.location);
      console.log("CheckStockAtLocation - Query text:", qr.queryText);
      console.log("CheckStockAtLocation - Detected product:", productName);
      console.log("CheckStockAtLocation - Detected location:", locationName);

      // Must have product name
      if (!productName) {
        return res.json(reply("What product are you looking for?"));
      }

      // If location is provided, use intelligent matching
      if (locationName) {
        const { items, scope } = await queryInventoryByProductAndLocation({
          productName,
          locationName
        });

        // Handle the response depending on what is found
        if (scope === "location_not_found") {
          return res.json(reply(`Sorry, I couldn't find the location "${locationName}". Please check the store name and try again.`));
        }

        if (scope === "product_not_found" || items.length === 0) {
          return res.json(reply(`I couldn't find "${productName}" at ${locationName}. It might be out of stock or not available at that location.`));
        }

        // If product found, return the stock info
        const it = items[0]; // Highest-scoring match (first item after sorting)
        const qty = Number(it.qty ?? 0);

        if (qty > 0) {
          return res.json(reply(
            `Yes, ${it.name} is available at ${locationName}. There are ${qty} units in stock.`
          ));
        }

        // Gather alternative locations
        const { items: alternativeItems } = await queryInventoryByStoreAndTerm({ term: productName, storeId: "" });
        const alternativeGroups = new Map();
        alternativeItems.forEach((item) => {
          const storeKey = item.storeName || item.storeId || "Unknown Store";
          if (!alternativeGroups.has(storeKey)) {
            alternativeGroups.set(storeKey, { storeName: storeKey, items: [] });
          }
          alternativeGroups.get(storeKey).items.push(item);
        });

        // Remove the original location from alternatives
        alternativeGroups.delete(locationName);

        if (alternativeGroups.size) {
          const locationList = Array.from(alternativeGroups.values())
            .map(({ storeName, items }) => {
              const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
              return `• ${storeName}: ${totalQty} units`;
            })
            .join("\n\n");

          return res.json(reply(
            `${it.name} is not available at ${locationName} but available at ${alternativeGroups.size} other location(s):\n\n${locationList}`
          ));
        }

        return res.json(reply(
          `Sorry, ${it.name} is currently out of stock at ${locationName}.`
        ));
      }

      // If location is missing but product is detected, search all locations
      // This is why CheckStockAtLocation is better - it always extracts @product parameter
      console.log("CheckStockAtLocation - No location provided, searching all locations for product");
      const storeId = p.store || "";
      const { items, scope } = await queryInventoryByStoreAndTerm({ term: productName, storeId });

      if (!items.length) {
        return res.json(reply(`I couldn't find "${productName}". Want me to check similar items?`));
      }

      // Score and rank matches to find the BEST match
      const termNorm = norm(productName);
      const termTokens = tokens(productName);

      const scored = items.map(item => {
        const nameNorm = norm(item.name || "");
        const skuNorm = norm(item.sku || "");
        const categoryNorm = norm(item.category || "");
        let score = 0;

        if (nameNorm === termNorm || skuNorm === termNorm) {
          score = 100;
        } else if (termTokens.length > 0 && termTokens.every(tk => nameNorm.includes(tk))) {
          score = 50;
        } else if (nameNorm.includes(termNorm) || termNorm.includes(nameNorm)) {
          score = 30;
        } else if (skuNorm.includes(termNorm) || termNorm.includes(skuNorm)) {
          score = 20;
        } else if (categoryNorm.includes(termNorm) || termNorm.includes(categoryNorm)) {
          score = 10;
        }

        return { item, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const bestMatches = scored.filter(s => s.score >= 10);

      if (bestMatches.length === 0) {
        return res.json(reply(`I couldn't find "${productName}". Want me to check similar items?`));
      }

      // Group matches by store location
      const groupedByStore = new Map();
      bestMatches.forEach(({ item }) => {
        const storeKey = item.storeName || item.storeId || "Unknown Store";
        if (!groupedByStore.has(storeKey)) {
          groupedByStore.set(storeKey, { storeName: storeKey, items: [] });
        }
        groupedByStore.get(storeKey).items.push(item);
      });

      // If multiple locations, list them all
      if (groupedByStore.size > 1) {
        const matchedProductName = bestMatches[0].item.name;
        const locationList = Array.from(groupedByStore.values())
          .map(({ storeName, items }) => {
            const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
            return `• ${storeName}: ${totalQty} units`;
          })
          .join("\n\n");

        return res.json(reply(
          `Yes, ${matchedProductName} is available at ${groupedByStore.size} location(s):\n\n${locationList}`
        ));
      }

      // Single location
      const it = bestMatches[0].item;
      const qty = Number(it.qty ?? 0);
      const where = it.storeName ? ` at ${it.storeName}` : "";

      if (qty > 0) {
        return res.json(reply(`Yes, ${it.name} — ${qty} in stock${where}.`));
      }

      return res.json(reply(`Currently out of stock for ${it.name}${where}. I can notify the supplier for restock.`));
    }

    // Handle CheckStock intent (general stock queries without location)
    if (intent === "CheckStock") {
      // Handle product parameter which may be an array from Dialogflow
      const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
      // If product param is not extracted, try to extract from queryText
      // Remove common phrases like "do you have", "is there", "check", etc.
      let term = productParam || p.any || "";
      if (!term && qr.queryText) {
        const queryText = qr.queryText.toLowerCase();
        // Remove common question phrases to extract product name
        term = queryText
          .replace(/^(do you have|do we have|is there|are there|check|show me|find|search for|i need|i want)\s+/i, "")
          .replace(/\?$/, "")
          .trim();
      }
      // Fallback to raw queryText if still empty
      term = term || qr.queryText || "";
      const storeId = p.store || ""; // Passed from /detect-intent

      // Log for debugging
      console.log("CheckStock - Product parameter (raw):", p.product);
      console.log("CheckStock - Store parameter (raw):", p.store);
      console.log("CheckStock - Query text:", qr.queryText);
      console.log("CheckStock - Detected product/term:", term);

      if (!term) return res.json(reply("What item are you looking for?"));

      // Use function to search for the item
      const { items, scope } = await queryInventoryByStoreAndTerm({ term, storeId });

      if (!items.length) {
        return res.json(reply(`I couldn't find "${term}". Want me to check similar items?`));
      }

      // Score and rank matches to find the BEST match (prevent false positives)
      const termNorm = norm(term);
      const termTokens = tokens(term);

      // Score each item by how well it matches the search term
      const scored = items.map(item => {
        const nameNorm = norm(item.name || "");
        const skuNorm = norm(item.sku || "");
        const categoryNorm = norm(item.category || "");
        let score = 0;

        // Exact match gets highest score
        if (nameNorm === termNorm || skuNorm === termNorm) {
          score = 100;
        }
        // All tokens match in name (very good match)
        else if (termTokens.length > 0 && termTokens.every(tk => nameNorm.includes(tk))) {
          score = 50;
        }
        // Partial match in name (good match)
        else if (nameNorm.includes(termNorm) || termNorm.includes(nameNorm)) {
          score = 30;
        }
        // Match in SKU (decent match)
        else if (skuNorm.includes(termNorm) || termNorm.includes(skuNorm)) {
          score = 20;
        }
        // Match in category (weak match)
        else if (categoryNorm.includes(termNorm) || termNorm.includes(categoryNorm)) {
          score = 10;
        }

        return { item, score };
      });

      // Sort by score (highest first), filter out very weak matches (score < 10)
      scored.sort((a, b) => b.score - a.score);
      const bestMatches = scored.filter(s => s.score >= 10);

      console.log("CheckStock - Match scores:", scored.map(s => ({ name: s.item.name, score: s.score })));
      console.log("CheckStock - Best matches:", bestMatches.map(s => s.item.name));

      if (bestMatches.length === 0) {
        return res.json(reply(`I couldn't find "${term}". Want me to check similar items?`));
      }

      // Group matches by store location
      const groupedByStore = new Map();
      bestMatches.forEach(({ item }) => {
        const storeKey = item.storeName || item.storeId || "Unknown Store";
        if (!groupedByStore.has(storeKey)) {
          groupedByStore.set(storeKey, { storeName: storeKey, items: [] });
        }
        groupedByStore.get(storeKey).items.push(item);
      });

      let selectedStoreGroup = null;
      if (storeId) {
        selectedStoreGroup = Array.from(groupedByStore.values()).find(({ items }) =>
          items.some((item) => item.storeId === storeId)
        );
      }

      if (selectedStoreGroup) {
        const selectedQty = selectedStoreGroup.items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
        const selectedName = selectedStoreGroup.items[0]?.storeName || selectedStoreGroup.items[0]?.storeId || "selected store";

        if (selectedQty > 0) {
          return res.json(reply(
            `Yes, ${bestMatches[0].item.name} is available — ${selectedQty} in stock at ${selectedName}.`
          ));
        }

        const alternativeGroups = Array.from(groupedByStore.values()).filter((g) => g !== selectedStoreGroup);
        if (alternativeGroups.length) {
          const locationList = alternativeGroups
            .map(({ storeName, items }) => {
              const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
              return `• ${storeName}: ${totalQty} units`;
            })
            .join("\n\n");

          return res.json(reply(
            `${bestMatches[0].item.name} is not available at ${selectedName} but available at ${alternativeGroups.length} other location(s):\n\n${locationList}`
          ));
        }

        return res.json(reply(
          `Sorry, ${bestMatches[0].item.name} is currently out of stock at ${selectedName}.`
        ));
      }

      // If multiple locations have the product, list them all
      if (groupedByStore.size > 1) {
        const productName = bestMatches[0].item.name;
        const locationList = Array.from(groupedByStore.values())
          .map(({ storeName, items }) => {
            const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
            return `• ${storeName}: ${totalQty} units`;
          })
          .join("\n\n");

        return res.json(reply(
          `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n\n${locationList}`
        ));
      }

      // Single location - use existing logic
      const it = bestMatches[0].item;
      const qty = Number(it.qty ?? 0);
      const where = it.storeName ? ` at ${it.storeName}` : "";

      if (qty > 0) {
        return res.json(reply(`Yes, ${it.name} — ${qty} in stock${where}.`));
      }

      return res.json(reply(`Currently out of stock for ${it.name}${where}. I can notify the supplier for restock.`));
    }

    if (intent === "LowStockList") {
      const snap = await db.collection("inventory").get();
      const low = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(x => Number(x.qty ?? 0) <= Number(x.reorderPoint ?? 5))
        .slice(0, 10);
      if (!low.length) return res.json(reply("All items are healthy."));
      const lines = low.map(x => `• ${x.name} (qty ${Number(x.qty ?? 0)})`);
      return res.json(reply(`Low stock items:\n${lines.join("\n")}`));
    }

    // Handle date-related intents (GetDate, CurrentDate, WhatDate, whatDay, etc.)
    if (intent === "GetDate" || intent === "CurrentDate" || intent === "WhatDate" || intent === "whatDay" ||
      (qr.queryText && /(what|what's|tell me|show me|current|today).*(date|day|today)|(what day|what date|what's the date|what's today)/i.test(qr.queryText))) {
      return res.json(reply(formatTodayDate()));
    }

    // Fallback: If no recognized intent, try to extract product from query text
    // This handles cases where Dialogflow doesn't recognize the intent but user is asking about a product
    if (queryText) {
      // Try to extract product name from query text
      const queryLower = queryText.toLowerCase();
      // Remove common question phrases (including variations like "do you beras")
      let term = queryLower
        .replace(/^(do you have|do we have|do you|is there|are there|check|show me|find|search for|i need|i want|where can i|where is|where are|have you|got|stock|available)\s+/i, "")
        .replace(/\s+(available|in stock|at|from|near|nearby|here|there).*$/i, "")
        .replace(/\?$/, "")
        .replace(/^you\s+/i, "") // Remove "you" if it appears at start
        .trim();

      // If we have a reasonable term (at least 2 characters), try searching
      if (term && term.length >= 2 && !term.includes("location") && !term.includes("store")) {
        console.log("Fallback: Attempting product search for term:", term);
        const storeId = p.store || "";
        const { items, scope } = await queryInventoryByStoreAndTerm({ term, storeId });

        if (items.length > 0) {
          // Score and rank matches
          const termNorm = norm(term);
          const termTokens = tokens(term);

          const scored = items.map(item => {
            const nameNorm = norm(item.name || "");
            const skuNorm = norm(item.sku || "");
            const categoryNorm = norm(item.category || "");
            let score = 0;

            if (nameNorm === termNorm || skuNorm === termNorm) {
              score = 100;
            } else if (termTokens.length > 0 && termTokens.every(tk => nameNorm.includes(tk))) {
              score = 50;
            } else if (nameNorm.includes(termNorm) || termNorm.includes(nameNorm)) {
              score = 30;
            } else if (skuNorm.includes(termNorm) || termNorm.includes(skuNorm)) {
              score = 20;
            } else if (categoryNorm.includes(termNorm) || termNorm.includes(categoryNorm)) {
              score = 10;
            }

            return { item, score };
          });

          scored.sort((a, b) => b.score - a.score);
          const bestMatches = scored.filter(s => s.score >= 10);

          if (bestMatches.length > 0) {
            // Group matches by store location
            const groupedByStore = new Map();
            bestMatches.forEach(({ item }) => {
              const storeKey = item.storeName || item.storeId || "Unknown Store";
              if (!groupedByStore.has(storeKey)) {
                groupedByStore.set(storeKey, { storeName: storeKey, items: [] });
              }
              groupedByStore.get(storeKey).items.push(item);
            });

            // If multiple locations, list them all
            if (groupedByStore.size > 1) {
              const productName = bestMatches[0].item.name;
              const locationList = Array.from(groupedByStore.values())
                .map(({ storeName, items }) => {
                  const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
                  return `• ${storeName}: ${totalQty} units`;
                })
                .join("\n\n");

              return res.json(reply(
                `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n\n${locationList}`
              ));
            }

            // Single location
            const it = bestMatches[0].item;
            const qty = Number(it.qty ?? 0);
            const where = it.storeName ? ` at ${it.storeName}` : "";

            if (qty > 0) {
              return res.json(reply(`Yes, ${it.name} — ${qty} in stock${where}.`));
            }

            return res.json(reply(`Currently out of stock for ${it.name}${where}. I can notify the supplier for restock.`));
          }
        }
      }
    }

    // If we reach here, the intent was not recognized and we couldn't extract a product
    return res.json(reply("Sorry, I didn't get that. Please specify the product you're looking for, or include a location for location-specific queries."));
  } catch (e) {
    console.error(e);
    return res.json(reply("Something went wrong while checking stock."));
  }
}

// ---------- routes ----------
app.get("/", (_req, res) => res.status(200).send("SmartStockAI webhook is running."));
app.post("/", dfHandler);
app.post("/webhook", dfHandler);
app.post("/df", dfHandler);
app.post("/chat", geminiHandler);

// Temporary test endpoint to verify secret (REMOVE AFTER VERIFICATION)
app.get("/test-secret", (req, res) => {
  try {
    const apiKey = geminiApiKeySecret.value();
    if (!apiKey) {
      return res.json({ 
        error: "Secret is empty or not set",
        length: 0 
      });
    }
    // Show partial info for verification (first 4, last 4, length)
    const first4 = apiKey.substring(0, 4);
    const last4 = apiKey.substring(apiKey.length - 4);
    const length = apiKey.length;
    
    return res.json({
      success: true,
      message: "Secret is set",
      verification: {
        startsWith: first4,
        endsWith: last4,
        length: length,
        expectedStart: "AIza", // Gemini API keys usually start with AIza
        isValidFormat: first4 === "AIza" && length > 30
      }
    });
  } catch (error) {
    return res.json({
      error: "Failed to read secret",
      message: error.message
    });
  }
});

// ---------- Dialogflow detectIntent passthrough ----------
app.post("/detect-intent", async (req, res) => {
  try {
    // Check if Dialogflow client is available
    if (!sessionClient) {
      // Try to re-initialize
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId;
      if (projectId) {
        sessionClient = new dialogflow.SessionsClient({ projectId });
      } else {
        sessionClient = new dialogflow.SessionsClient();
      }
    }

    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId;

    if (!projectId) {
      console.error("Dialogflow error: No project ID found");
      return res.status(500).json({
        fulfillmentText: "Dialogflow configuration error. Please check your Google Cloud project settings."
      });
    }

    const sessionId = `${Date.now()}`;
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const text = (req.body?.text || req.body?.message || req.body?.query || "").toString();
    const languageCode = req.body?.languageCode || "en";
    const storeId = req.body?.storeId || "";
    if (!text.trim()) return res.status(400).json({ fulfillmentText: "What should I check?" });

    // Log request details for debugging
    console.log("=== /detect-intent Request ===");
    console.log("Text:", text);
    console.log("Language code:", languageCode);
    console.log("Store ID:", storeId || "(not provided)");
    console.log("Session ID:", sessionId);
    console.log("=== End Request ===");

    const request = {
      session: sessionPath,
      queryInput: {
        text: { text, languageCode },
      },
      // Pass storeId as query parameter so it flows through to fulfillment
      // Only include parameters if storeId is provided to avoid interfering with Dialogflow's intent detection
      ...(storeId && {
        queryParams: {
          parameters: { store: storeId },
        },
      }),
    };

    let response;
    try {
      [response] = await sessionClient.detectIntent(request);
    } catch (dialogflowError) {
      console.error("Dialogflow API error:", dialogflowError);

      // Check if it's an authentication error
      if (dialogflowError.message?.includes("invalid authentication credentials") ||
        dialogflowError.code === 7 || // PERMISSION_DENIED
        dialogflowError.code === 16) { // UNAUTHENTICATED
        return res.status(500).json({
          fulfillmentText: "Authentication error with Dialogflow. Please ensure the Dialogflow API is enabled and the service account has proper permissions. See: https://developers.google.com/identity/sign-in/web/devconsole-project"
        });
      }

      // For other errors, fall through to fallback handler
      throw dialogflowError;
    }

    const intentName = response.queryResult?.intent?.displayName || "";
    const p = response.queryResult?.parameters || {};
    const queryText = response.queryResult?.queryText || "";
    const fulfillmentText = response.queryResult?.fulfillmentText || "";
    const webhookStatus = response.webhookStatus;

    // Log Dialogflow response for debugging
    console.log("=== /detect-intent Dialogflow Response ===");
    console.log("Query text:", queryText);
    console.log("Intent:", intentName);
    console.log("Parameters:", JSON.stringify(p, null, 2));
    console.log("Fulfillment text:", fulfillmentText);
    console.log("Webhook status:", webhookStatus ? JSON.stringify(webhookStatus, null, 2) : "No webhook called");
    console.log("=== End Dialogflow Response ===");

    // BYPASS ALL CUSTOM HANDLERS - Return Dialogflow's fulfillment text directly
    // This ensures ChatbotPanel shows the same responses as Dialogflow website
    // All custom intent handlers are disabled - we use Dialogflow's fulfillment text as-is
    // If fulfillmentText is empty, use fallback message
    const finalFulfillmentText = fulfillmentText || "Sorry, I didn't get that. Please specify the product you're looking for, or include a location for location-specific queries.";

    return res.json({
      fulfillmentText: finalFulfillmentText,
      raw: response.queryResult
    });

    // BLOCKED: All custom intent handlers disabled - code below is unreachable
    if (false) { // This block is intentionally unreachable to disable custom handlers
      // Handle CheckStockAtLocation intent (primary handler - more accurate with @product parameter)
      if (intentName === "CheckStockAtLocation" || (p.product && p.location)) {
        // Extract parameters from Dialogflow queryResult.parameters
        const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
        const productName = productParam || response.queryResult?.queryText || "";
        const locationParam = Array.isArray(p.location) ? p.location[0] : p.location;
        // Dialogflow sends "?" as placeholder for missing required parameters - treat as empty
        const locationName = (locationParam && locationParam !== "?" && locationParam.trim() !== "?") ? locationParam : "";

        // Log parameters for debugging
        console.log("detect-intent CheckStockAtLocation - Product parameter (raw):", p.product);
        console.log("detect-intent CheckStockAtLocation - Location parameter (raw):", p.location);
        console.log("detect-intent CheckStockAtLocation - Query text:", response.queryResult?.queryText);
        console.log("detect-intent CheckStockAtLocation - Detected product:", productName);
        console.log("detect-intent CheckStockAtLocation - Detected location:", locationName);

        // Must have product name
        if (!productName) {
          return res.json({
            fulfillmentText: "What product are you looking for?",
            raw: response.queryResult
          });
        }

        // BLOCKED: Intelligent matching disabled - returning Dialogflow's fulfillment text directly
        // If location is provided, return Dialogflow's response (no custom matching)
        if (locationName) {
          // Return Dialogflow's fulfillment text directly without custom matching
          return res.json({
            fulfillmentText: response.queryResult?.fulfillmentText || `I'm checking availability of ${productName} at ${locationName}. Please configure Dialogflow fulfillment for detailed responses.`,
            raw: response.queryResult
          });
        }
        /*
        if (locationName) {
          const { items, scope } = await queryInventoryByProductAndLocation({ 
            productName, 
            locationName 
          });
          
          // Handle the response depending on what is found
          if (scope === "location_not_found") {
            return res.json({ 
              fulfillmentText: `Sorry, I couldn't find the location "${locationName}". Please check the store name and try again.`,
              raw: response.queryResult 
            });
          }
          
          if (scope === "product_not_found" || items.length === 0) {
            return res.json({ 
              fulfillmentText: `I couldn't find "${productName}" at ${locationName}. It might be out of stock or not available at that location.`,
              raw: response.queryResult 
            });
          }
          
          // If product found, return the stock info
          const it = items[0]; // Highest-scoring match (first item after sorting)
          const qty = Number(it.qty ?? 0);
          
          if (qty > 0) {
            return res.json({ 
              fulfillmentText: `Yes, ${it.name} is available at ${locationName}. There are ${qty} units in stock.`,
              raw: response.queryResult 
            });
          }

          const { items: alternativeItems } = await queryInventoryByStoreAndTerm({ term: productName, storeId: "" });
          const alternativeGroups = new Map();
          alternativeItems.forEach((item) => {
            const storeKey = item.storeName || item.storeId || "Unknown Store";
            if (!alternativeGroups.has(storeKey)) {
              alternativeGroups.set(storeKey, { storeName: storeKey, items: [] });
            }
            alternativeGroups.get(storeKey).items.push(item);
          });

          alternativeGroups.delete(locationName);

          if (alternativeGroups.size) {
            const locationList = Array.from(alternativeGroups.values())
              .map(({ storeName, items }) => {
                const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
                return `• ${storeName}: ${totalQty} units`;
              })
              .join("\n\n");
            
            return res.json({ 
              fulfillmentText: `${it.name} is not available at ${locationName} but available at ${alternativeGroups.size} other location(s):\n\n${locationList}`,
              raw: response.queryResult 
            });
          }

          return res.json({ 
            fulfillmentText: `Sorry, ${it.name} is currently out of stock at ${locationName}.`,
            raw: response.queryResult 
          });
        }
        */

        // If location is missing but product is detected, search all locations
        // This is why CheckStockAtLocation is better - it always extracts @product parameter
        console.log("detect-intent CheckStockAtLocation - No location provided, searching all locations for product");
        const storeIdParam = p.store || storeId || "";
        const { items, scope } = await queryInventoryByStoreAndTerm({ term: productName, storeId: storeIdParam });

        if (!items.length) {
          return res.json({
            fulfillmentText: `I couldn't find "${productName}". Want me to check similar items?`,
            raw: response.queryResult
          });
        }

        // Score and rank matches to find the BEST match
        const termNorm = norm(productName);
        const termTokens = tokens(productName);

        const scored = items.map(item => {
          const nameNorm = norm(item.name || "");
          const skuNorm = norm(item.sku || "");
          const categoryNorm = norm(item.category || "");
          let score = 0;

          if (nameNorm === termNorm || skuNorm === termNorm) {
            score = 100;
          } else if (termTokens.length > 0 && termTokens.every(tk => nameNorm.includes(tk))) {
            score = 50;
          } else if (nameNorm.includes(termNorm) || termNorm.includes(nameNorm)) {
            score = 30;
          } else if (skuNorm.includes(termNorm) || termNorm.includes(skuNorm)) {
            score = 20;
          } else if (categoryNorm.includes(termNorm) || termNorm.includes(categoryNorm)) {
            score = 10;
          }

          return { item, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const bestMatches = scored.filter(s => s.score >= 10);

        if (bestMatches.length === 0) {
          return res.json({
            fulfillmentText: `I couldn't find "${productName}". Want me to check similar items?`,
            raw: response.queryResult
          });
        }

        // Group matches by store location
        const groupedByStore = new Map();
        bestMatches.forEach(({ item }) => {
          const storeKey = item.storeName || item.storeId || "Unknown Store";
          if (!groupedByStore.has(storeKey)) {
            groupedByStore.set(storeKey, { storeName: storeKey, items: [] });
          }
          groupedByStore.get(storeKey).items.push(item);
        });

        // If multiple locations, list them all
        if (groupedByStore.size > 1) {
          const matchedProductName = bestMatches[0].item.name;
          const locationList = Array.from(groupedByStore.values())
            .map(({ storeName, items }) => {
              const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
              return `• ${storeName}: ${totalQty} units`;
            })
            .join("\n\n");

          return res.json({
            fulfillmentText: `Yes, ${matchedProductName} is available at ${groupedByStore.size} location(s):\n\n${locationList}`,
            raw: response.queryResult
          });
        }

        // Single location
        const it = bestMatches[0].item;
        const qty = Number(it.qty ?? 0);
        const where = it.storeName ? ` at ${it.storeName}` : "";

        if (qty > 0) {
          return res.json({
            fulfillmentText: `Yes, ${it.name} — ${qty} in stock${where}.`,
            raw: response.queryResult
          });
        }

        return res.json({
          fulfillmentText: `Currently out of stock for ${it.name}${where}. I can notify the supplier for restock.`,
          raw: response.queryResult
        });
      }

      // Handle CheckStock intent (general stock queries without location)
      if (intentName === "CheckStock") {
        // Handle product parameter which may be an array from Dialogflow
        const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
        // If product param is not extracted, try to extract from queryText
        // Remove common phrases like "do you have", "is there", "check", etc.
        let term = productParam || p.any || "";
        if (!term && response.queryResult?.queryText) {
          const queryText = response.queryResult.queryText.toLowerCase();
          // Remove common question phrases to extract product name
          term = queryText
            .replace(/^(do you have|do we have|is there|are there|check|show me|find|search for|i need|i want)\s+/i, "")
            .replace(/\?$/, "")
            .trim();
        }
        // Fallback to raw text if still empty
        term = term || text || "";
        const storeIdParam = p.store || storeId || "";

        // Log for debugging
        console.log("detect-intent CheckStock - Product parameter (raw):", p.product);
        console.log("detect-intent CheckStock - Store parameter (raw):", p.store);
        console.log("detect-intent CheckStock - Query text:", response.queryResult?.queryText);
        console.log("detect-intent CheckStock - Detected product/term:", term);

        if (!term) {
          return res.json({
            fulfillmentText: "What item are you looking for?",
            raw: response.queryResult
          });
        }

        // Use function to search for the item
        const { items, scope } = await queryInventoryByStoreAndTerm({ term, storeId: storeIdParam });

        if (!items.length) {
          return res.json({
            fulfillmentText: `I couldn't find "${term}". Want me to check similar items?`,
            raw: response.queryResult
          });
        }

        // Score and rank matches to find the BEST match (prevent false positives)
        const termNorm = norm(term);
        const termTokens = tokens(term);

        // Score each item by how well it matches the search term
        const scored = items.map(item => {
          const nameNorm = norm(item.name || "");
          const skuNorm = norm(item.sku || "");
          const categoryNorm = norm(item.category || "");
          let score = 0;

          // Exact match gets highest score
          if (nameNorm === termNorm || skuNorm === termNorm) {
            score = 100;
          }
          // All tokens match in name (very good match)
          else if (termTokens.length > 0 && termTokens.every(tk => nameNorm.includes(tk))) {
            score = 50;
          }
          // Partial match in name (good match)
          else if (nameNorm.includes(termNorm) || termNorm.includes(nameNorm)) {
            score = 30;
          }
          // Match in SKU (decent match)
          else if (skuNorm.includes(termNorm) || termNorm.includes(skuNorm)) {
            score = 20;
          }
          // Match in category (weak match)
          else if (categoryNorm.includes(termNorm) || termNorm.includes(categoryNorm)) {
            score = 10;
          }

          return { item, score };
        });

        // Sort by score (highest first), filter out very weak matches (score < 10)
        scored.sort((a, b) => b.score - a.score);
        const bestMatches = scored.filter(s => s.score >= 10);

        console.log("detect-intent CheckStock - Match scores:", scored.map(s => ({ name: s.item.name, score: s.score })));
        console.log("detect-intent CheckStock - Best matches:", bestMatches.map(s => s.item.name));

        if (bestMatches.length === 0) {
          return res.json({
            fulfillmentText: `I couldn't find "${term}". Want me to check similar items?`,
            raw: response.queryResult
          });
        }

        // Group matches by store location
        const groupedByStore = new Map();
        bestMatches.forEach(({ item }) => {
          const storeKey = item.storeName || item.storeId || "Unknown Store";
          if (!groupedByStore.has(storeKey)) {
            groupedByStore.set(storeKey, { storeName: storeKey, items: [] });
          }
          groupedByStore.get(storeKey).items.push(item);
        });

        // If we found items but they were outside the user's selected store
        let selectedStoreGroup = null;
        if (storeIdParam) {
          selectedStoreGroup = Array.from(groupedByStore.values()).find(({ items }) =>
            items.some((item) => item.storeId === storeIdParam)
          );
        }

        if (selectedStoreGroup) {
          const selectedQty = selectedStoreGroup.items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
          const selectedName = selectedStoreGroup.items[0]?.storeName || selectedStoreGroup.items[0]?.storeId || "selected store";

          if (selectedQty > 0) {
            return res.json({
              fulfillmentText: `Yes, ${bestMatches[0].item.name} is available — ${selectedQty} in stock at ${selectedName}.`,
              raw: response.queryResult
            });
          }

          const alternativeGroups = Array.from(groupedByStore.values()).filter((g) => g !== selectedStoreGroup);
          if (alternativeGroups.length) {
            const locationList = alternativeGroups
              .map(({ storeName, items }) => {
                const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
                return `• ${storeName}: ${totalQty} units`;
              })
              .join("\n\n");

            return res.json({
              fulfillmentText: `${bestMatches[0].item.name} is not available at ${selectedName} but available at ${alternativeGroups.length} other location(s):\n\n${locationList}`,
              raw: response.queryResult
            });
          }

          return res.json({
            fulfillmentText: `Sorry, ${bestMatches[0].item.name} is currently out of stock at ${selectedName}.`,
            raw: response.queryResult
          });
        }

        // If multiple locations have the product, list them all
        if (groupedByStore.size > 1) {
          const productName = bestMatches[0].item.name;
          const locationList = Array.from(groupedByStore.values())
            .map(({ storeName, items }) => {
              const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
              return `• ${storeName}: ${totalQty} units`;
            })
            .join("\n\n");

          return res.json({
            fulfillmentText: `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n\n${locationList}`,
            raw: response.queryResult
          });
        }

        // Single location - use existing logic
        const it = bestMatches[0].item;
        const qty = Number(it.qty ?? 0);
        const where = it.storeName ? ` at ${it.storeName}` : "";

        if (qty > 0) {
          return res.json({
            fulfillmentText: `Yes, ${it.name} — ${qty} in stock${where}.`,
            raw: response.queryResult
          });
        }

        return res.json({
          fulfillmentText: `Currently out of stock for ${it.name}${where}. I can notify the supplier for restock.`,
          raw: response.queryResult
        });
      }

      // Handle date-related intents (GetDate, CurrentDate, WhatDate, whatDay, etc.)
      if (intentName === "GetDate" || intentName === "CurrentDate" || intentName === "WhatDate" || intentName === "whatDay" ||
        (response.queryResult?.queryText && /(what|what's|tell me|show me|current|today).*(date|day|today)|(what day|what date|what's the date|what's today)/i.test(response.queryResult.queryText))) {
        return res.json({
          fulfillmentText: formatTodayDate(),
          raw: response.queryResult
        });
      }

      // Fallback: If no recognized intent, try to extract product from query text
      const queryText = response.queryResult?.queryText || text || "";
      if (queryText) {
        const queryLower = queryText.toLowerCase();
        // Remove common question phrases (including variations like "do you beras")
        let term = queryLower
          .replace(/^(do you have|do we have|do you|is there|are there|check|show me|find|search for|i need|i want|where can i|where is|where are|have you|got|stock|available)\s+/i, "")
          .replace(/\s+(available|in stock|at|from|near|nearby|here|there).*$/i, "")
          .replace(/\?$/, "")
          .replace(/^you\s+/i, "") // Remove "you" if it appears at start
          .trim();

        // If we have a reasonable term, try searching
        if (term && term.length >= 2 && !term.includes("location") && !term.includes("store")) {
          console.log("detect-intent Fallback: Attempting product search for term:", term);
          const storeIdParam = p.store || storeId || "";
          const { items, scope } = await queryInventoryByStoreAndTerm({ term, storeId: storeIdParam });

          if (items.length > 0) {
            // Score and rank matches
            const termNorm = norm(term);
            const termTokens = tokens(term);

            const scored = items.map(item => {
              const nameNorm = norm(item.name || "");
              const skuNorm = norm(item.sku || "");
              const categoryNorm = norm(item.category || "");
              let score = 0;

              if (nameNorm === termNorm || skuNorm === termNorm) {
                score = 100;
              } else if (termTokens.length > 0 && termTokens.every(tk => nameNorm.includes(tk))) {
                score = 50;
              } else if (nameNorm.includes(termNorm) || termNorm.includes(nameNorm)) {
                score = 30;
              } else if (skuNorm.includes(termNorm) || termNorm.includes(skuNorm)) {
                score = 20;
              } else if (categoryNorm.includes(termNorm) || termNorm.includes(categoryNorm)) {
                score = 10;
              }

              return { item, score };
            });

            scored.sort((a, b) => b.score - a.score);
            const bestMatches = scored.filter(s => s.score >= 10);

            if (bestMatches.length > 0) {
              // Group matches by store location
              const groupedByStore = new Map();
              bestMatches.forEach(({ item }) => {
                const storeKey = item.storeName || item.storeId || "Unknown Store";
                if (!groupedByStore.has(storeKey)) {
                  groupedByStore.set(storeKey, { storeName: storeKey, items: [] });
                }
                groupedByStore.get(storeKey).items.push(item);
              });

              // If multiple locations, list them all
              if (groupedByStore.size > 1) {
                const productName = bestMatches[0].item.name;
                const locationList = Array.from(groupedByStore.values())
                  .map(({ storeName, items }) => {
                    const totalQty = items.reduce((sum, item) => sum + Number(item.qty ?? 0), 0);
                    return `• ${storeName}: ${totalQty} units`;
                  })
                  .join("\n\n");

                return res.json({
                  fulfillmentText: `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n\n${locationList}`,
                  raw: response.queryResult
                });
              }

              // Single location
              const it = bestMatches[0].item;
              const qty = Number(it.qty ?? 0);
              const where = it.storeName ? ` at ${it.storeName}` : "";

              if (qty > 0) {
                return res.json({
                  fulfillmentText: `Yes, ${it.name} — ${qty} in stock${where}.`,
                  raw: response.queryResult
                });
              }

              return res.json({
                fulfillmentText: `Currently out of stock for ${it.name}${where}. I can notify the supplier for restock.`,
                raw: response.queryResult
              });
            }
          }
        }
      }
    } // End of unreachable block
  } catch (e) {
    console.error("detect-intent error", e);
    return res.status(500).json({ fulfillmentText: "Error calling Dialogflow." });
  }
});

// ---------- Copy Inventory Function ----------
/**
 * Copy inventory from one store to another
 * Only admin and staff can use this function
 */
exports.copyInventory = onCall(async (request) => {
  // Security: Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to copy inventory'
    );
  }

  const userId = request.auth.uid;

  // Check user role
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError(
      'permission-denied',
      'User profile not found'
    );
  }

  const role = userDoc.data()?.role;
  if (role !== 'admin' && role !== 'staff') {
    throw new HttpsError(
      'permission-denied',
      'Only admin and staff can copy inventory'
    );
  }

  // Validate input
  const { fromStore, toStore, overwrite = false } = request.data;

  if (!fromStore || !toStore) {
    throw new HttpsError(
      'invalid-argument',
      'fromStore and toStore are required'
    );
  }

  if (fromStore === toStore) {
    throw new HttpsError(
      'invalid-argument',
      'Source and destination stores must be different'
    );
  }

  try {
    // Fetch store names from storeId collection
    let destinationStoreName = toStore; // fallback
    let sourceStoreName = fromStore; // fallback
    try {
      const destStoreDoc = await db.collection("storeId").doc(toStore).get();
      if (destStoreDoc.exists) {
        const storeData = destStoreDoc.data();
        destinationStoreName = storeData.storeName || storeData.name || toStore;
      }
    } catch (err) {
      console.warn("Could not fetch destination store name:", err);
      // Use toStore as fallback
    }
    try {
      const sourceStoreDoc = await db.collection("storeId").doc(fromStore).get();
      if (sourceStoreDoc.exists) {
        const storeData = sourceStoreDoc.data();
        sourceStoreName = storeData.storeName || storeData.name || fromStore;
      }
    } catch (err) {
      console.warn("Could not fetch source store name:", err);
      // Use fromStore as fallback
    }

    // Fetch all items from source store
    const sourceSnapshot = await db.collection("inventory")
      .where("storeId", "==", fromStore)
      .get();

    if (sourceSnapshot.empty) {
      return {
        success: true,
        count: 0,
        message: `No items found in store "${fromStore}"`
      };
    }

    // If overwrite is false, check for existing items in destination store
    let existingItems = new Set();
    if (!overwrite) {
      const destSnapshot = await db.collection("inventory")
        .where("storeId", "==", toStore)
        .get();
      destSnapshot.forEach(doc => {
        const data = doc.data();
        // Use SKU as unique identifier
        if (data.sku) {
          existingItems.add(data.sku);
        }
      });
    }

    // Prepare items to copy
    const itemsToCopy = [];
    let skippedCount = 0;

    sourceSnapshot.forEach((doc) => {
      const data = doc.data();

      // Skip if item already exists in destination (unless overwrite is true)
      if (!overwrite && data.sku && existingItems.has(data.sku)) {
        skippedCount++;
        return;
      }

      // Create new item data
      // Spread all existing fields (including name, sku, qty, reorderPoint, category, price, Keywords, etc.)
      const newData = {
        ...data,
        storeId: toStore,
        // Use the actual store name from storeId collection
        storeName: destinationStoreName,
        // Update legacy fields for compatibility
        StoreId: toStore,
        StoreName: destinationStoreName,
        // Preserve price field if it exists (used for chatbot queries and redeem points calculation)
        price: data.price !== undefined ? data.price : null,
        // Set new timestamps
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      itemsToCopy.push(newData);
    });

    if (itemsToCopy.length === 0) {
      return {
        success: true,
        count: 0,
        skipped: skippedCount,
        message: `All items already exist in destination store. ${skippedCount} items skipped.`
      };
    }

    // Use batch writes (Firestore limit is 500 operations per batch)
    // Note: Each item copy requires 2 operations (inventory + transaction), so max 250 items per batch
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;
    const maxOperationsPerBatch = 500;
    const maxItemsPerBatch = Math.floor(maxOperationsPerBatch / 2); // 2 operations per item (inventory + transaction)

    for (const itemData of itemsToCopy) {
      // Create new inventory item
      const newInventoryRef = db.collection("inventory").doc();
      currentBatch.set(newInventoryRef, itemData);
      operationCount++;

      // Create "IN" transaction for this copied item
      const qty = Number(itemData.qty || 0);
      const transactionData = {
        type: "IN",
        itemId: newInventoryRef.id,
        itemName: itemData.name || null,
        storeId: toStore,
        qty: qty,
        note: "New Stock",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        balanceBefore: 0, // New item, so balance before is 0
        balanceAfter: qty, // Balance after is the copied quantity
      };
      const transactionRef = db.collection("transactions").doc();
      currentBatch.set(transactionRef, transactionData);
      operationCount++;

      // Firestore batch limit is 500 operations
      // Since we're doing 2 operations per item, we need to check if we've reached the limit
      if (operationCount >= maxOperationsPerBatch) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Execute all batches
    for (const batch of batches) {
      await batch.commit();
    }

    return {
      success: true,
      count: itemsToCopy.length,
      skipped: skippedCount,
      message: `Successfully copied ${itemsToCopy.length} item${itemsToCopy.length !== 1 ? 's' : ''} from "${fromStore}" to "${toStore}"${skippedCount > 0 ? `. ${skippedCount} item${skippedCount !== 1 ? 's' : ''} skipped (already exist).` : ''}`
    };
  } catch (error) {
    console.error("Error copying inventory:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      'internal',
      `Failed to copy inventory: ${error.message}`
    );
  }
});

// ---------- Checkout Function ----------
exports.checkout = onCall(async (request) => {
  console.log("=== CHECKOUT FUNCTION CALLED ===");
  console.log("Request data:", JSON.stringify(request.data, null, 2));
  
  // 1. Validate Data
  const { cart, storeId, storeName } = request.data;
  if (!cart || cart.length === 0) {
    console.error("Cart is empty or invalid");
    throw new HttpsError('invalid-argument', 'Cart is empty');
  }

  // 2. Calculate Total
  const totalAmount = cart.reduce(
    (sum, item) => sum + (Number(item.price) * Number(item.qty)),
    0
  );
  console.log("Total amount calculated:", totalAmount);

  try {
    // 3. Create Order Document (This ID will be the Redeem Code)
    const orderRef = db.collection('orders').doc(); // Auto-ID
    const orderId = orderRef.id;
    console.log("Generated order ID:", orderId);

    // 4. Update Inventory (Batch Write)
    const batch = db.batch();

    // Save Order Record
    const shortCode = orderId.substring(0, 8).toUpperCase();
    const orderData = {
      storeId,
      storeName: storeName || "Unknown Store",
      totalAmount,
      items: cart,
      userId: request.auth?.uid || null, // Add user ID for customer tracking
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      redeemStatus: "unused", // IMPORTANT for Redeem Page
      pointsAwarded: Math.floor(totalAmount), // 1 point per RM
      shortCode: shortCode // Store the short code for easy lookup
    };
    
    batch.set(orderRef, orderData);

    // Update user loyalty points if user is authenticated
    if (request.auth?.uid) {
      try {
        const userRef = db.collection('users').doc(request.auth.uid);
        const userDoc = await userRef.get();
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const pointsEarned = Math.floor(totalAmount); // RM1 = 1 Point
          
          // Update user profile in batch
          batch.update(userRef, {
            loyaltyPoints: admin.firestore.FieldValue.increment(pointsEarned),
            totalSpent: admin.firestore.FieldValue.increment(totalAmount)
          });
          
          // Add points history record
          const pointsHistoryRef = db.collection('pointsHistory').doc();
          batch.set(pointsHistoryRef, {
            userId: request.auth.uid,
            points: pointsEarned,
            description: `Purchase - Order #${orderId.slice(-8)}`,
            orderId: orderId,
            type: "earned",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Will add ${pointsEarned} loyalty points to user ${request.auth.uid}`);
        } else {
          // Initialize user profile if it doesn't exist
          batch.set(userRef, {
            loyaltyPoints: Math.floor(totalAmount),
            totalSpent: totalAmount,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            preferences: {
              notifications: {
                lowStock: true,
                promotions: true,
                orderUpdates: true
              },
              language: "en"
            }
          }, { merge: true });
          
          console.log(`Will initialize user profile for ${request.auth.uid}`);
        }
      } catch (loyaltyError) {
        console.error("Error preparing loyalty update:", loyaltyError);
        // Don't fail the entire checkout if loyalty preparation fails
      }
    }

    // Deduct Stock Logic
    cart.forEach(item => {
      const itemRef = db.collection('inventory').doc(item.id);
      const qtyToDeduct = Number(item.qty) || 0;
      batch.update(itemRef, {
        qty: admin.firestore.FieldValue.increment(-qtyToDeduct),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log("Committing batch write...");
    await batch.commit();
    console.log("Batch write completed");

    // 5. Generate & Upload PDF
    console.log("Generating PDF...");
    const pdfBuffer = await generateReceiptPdf({
      id: orderId, // This is the redemption code
      storeName,
      items: cart,
      totalAmount
    });
    console.log("PDF generated, buffer size:", pdfBuffer.length);

    const bucket = admin.storage().bucket();
    const file = bucket.file(`receipts/${orderId}.pdf`);
    console.log("Bucket name:", bucket.name);
    console.log("File path:", `receipts/${orderId}.pdf`);

    console.log("Uploading PDF to storage...");
    await file.save(pdfBuffer, {
      metadata: { 
        contentType: "application/pdf",
        cacheControl: 'public, max-age=31536000'
      }
    });
    console.log("PDF uploaded successfully");

    // Instead of makePublic(), let's try getting a signed URL with a very long expiration
    console.log("Generating signed URL...");
    try {
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2030' // 5 years from now
      });
      console.log("Signed URL generated:", signedUrl);
      
      // Save URL back to order for history
      console.log("Updating order with receipt URL...");
      await orderRef.update({ receiptUrl: signedUrl });
      console.log("Order updated with receipt URL");

      const result = {
        success: true,
        orderId: orderId, // Redeem Code
        receiptUrl: signedUrl
      };
      console.log("=== CHECKOUT COMPLETED SUCCESSFULLY ===");
      console.log("Result:", JSON.stringify(result, null, 2));
      return result;
      
    } catch (signedUrlError) {
      console.error("Signed URL failed, trying public URL approach:", signedUrlError);
      
      // Fallback: try making file public
      try {
        await file.makePublic();
        console.log("File made public");
        
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/receipts/${orderId}.pdf`;
        console.log("Generated public URL:", publicUrl);

        // Save URL back to order for history
        console.log("Updating order with receipt URL...");
        await orderRef.update({ receiptUrl: publicUrl });
        console.log("Order updated with receipt URL");

        const result = {
          success: true,
          orderId: orderId, // Redeem Code
          receiptUrl: publicUrl
        };
        console.log("=== CHECKOUT COMPLETED SUCCESSFULLY (PUBLIC URL) ===");
        console.log("Result:", JSON.stringify(result, null, 2));
        return result;
        
      } catch (publicError) {
        console.error("Public URL also failed:", publicError);
        throw publicError;
      }
    }

  } catch (error) {
    console.error("=== CHECKOUT FAILED ===");
    console.error("Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    throw new HttpsError('internal', error.message);
  }
});

// ---------- Redeem Loyalty Code Function ----------
exports.redeemLoyaltyCode = onCall(async (request) => {
  // Security: Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'User must be authenticated to redeem loyalty codes'
    );
  }

  const userId = request.auth.uid;

  // Check user role - only customers can redeem
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError(
      'permission-denied',
      'User profile not found'
    );
  }

  const role = userDoc.data()?.role;
  if (role !== 'customer') {
    throw new HttpsError(
      'permission-denied',
      'Only customers can redeem loyalty codes'
    );
  }

  // Validate input
  const { code } = request.data;

  if (!code || typeof code !== 'string' || !code.trim()) {
    throw new HttpsError(
      'invalid-argument',
      'Receipt code is required'
    );
  }

  const codeTrimmed = code.trim();

  try {
    // Use Firestore transaction for atomic operations
    return await db.runTransaction(async (transaction) => {
      let orderRef;
      let orderDoc;
      
      // 1. Look up order - try full code first, then short code
      if (codeTrimmed.length > 10) {
        // Likely a full order ID
        orderRef = db.collection('orders').doc(codeTrimmed);
        orderDoc = await transaction.get(orderRef);
      }
      
      if (!orderDoc || !orderDoc.exists) {
        // Try to find by short code
        const ordersQuery = await db.collection('orders')
          .where('shortCode', '==', codeTrimmed.toUpperCase())
          .limit(1)
          .get();
          
        if (ordersQuery.empty) {
          throw new HttpsError(
            'not-found',
            'Invalid receipt code. Please check your receipt and try again.'
          );
        }
        
        orderDoc = ordersQuery.docs[0];
        orderRef = orderDoc.ref;
      }

      const orderData = orderDoc.data();

      // 2. Check if code has already been redeemed
      if (orderData.redeemStatus === 'redeemed') {
        throw new HttpsError(
          'already-exists',
          'This code has already been redeemed. Each receipt code can only be used once.'
        );
      }

      // 3. Calculate points based on purchase amount (1 point per RM, floored)
      const totalAmount = Number(orderData.totalAmount) || 0;
      const pointsAwarded = Number(orderData.pointsAwarded ?? Math.floor(totalAmount));

      if (pointsAwarded <= 0) {
        throw new HttpsError(
          'invalid-argument',
          'This transaction does not qualify for loyalty points.'
        );
      }

      // 4. Get current user points
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);
      const currentPoints = Number(userDoc.data()?.loyaltyPoints || 0);
      const newPoints = currentPoints + pointsAwarded;

      // 5. Atomically update user points and mark code as redeemed
      transaction.update(userRef, {
        loyaltyPoints: newPoints,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.update(orderRef, {
        redeemStatus: 'redeemed',
        redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
        redeemedBy: userId
      });

      return {
        success: true,
        pointsAwarded: pointsAwarded,
        totalPoints: newPoints,
        message: `Successfully redeemed ${pointsAwarded} points!`
      };
    });
  } catch (error) {
    console.error("Error redeeming loyalty code:", error);
    
    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Wrap other errors
    throw new HttpsError(
      'internal',
      `Failed to redeem code: ${error.message}`
    );
  }
});

// ---------- export ----------
// Secret binding is optional - will fallback to environment variable if secret is not set
// Option 1 (Recommended): Set via Firebase CLI: firebase functions:secrets:set GEMINI_API_KEY
// Option 2: Set in Firebase Console → Functions → Configuration → Environment variables
exports.webhook = onRequest(
  {
    region: "asia-southeast1",
    // Include secret - if not set, code will fallback to environment variable
    secrets: [geminiApiKeySecret],
  },
  app
);
