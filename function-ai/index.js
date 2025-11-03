// --- SmartStockAI Dialogflow webhook (Firebase Functions v2) ---
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Dialogflow detectIntent client (uses default creds in Functions)
const dialogflow = require('@google-cloud/dialogflow');
const sessionClient = new dialogflow.SessionsClient();

// Global defaults (optional but recommended)
setGlobalOptions({ region: "asia-southeast1", timeoutSeconds: 10, memory: "256MiB" });

// Init Admin SDK once
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ---------- helpers ----------
const norm = (s) => (s || "").toString().trim().toLowerCase();
const tokens = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// Calculate location match score for ranking matches
// Returns score: 100 (exact) > 50 (starts-with) > 30 (token match) > 10 (contains/substring)
function calculateLocationScore(item, locationName, locationTokens) {
  const storeNameNorm = norm(item.storeName || "");
  const storeIdNorm = norm(item.storeId || "");
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

  // First try strict match within selected store
  if (storeId) {
    const snap = await db.collection("inventory")
      .where("storeId", "==", storeId)
      .get();
    
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items = items.filter(x => {
      const fields = [x.name, x.sku, x.category].map(norm);
      const sym = fields.some(f => f.includes(qNorm) || qNorm.includes(f));
      const tok = qTokens.length ? fields.some(f => qTokens.every(tk => f.includes(tk))) : false;
      return sym || tok;
    });
    
    if (items.length) return { items, scope: "selected" };
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

  return { items: all, scope: "any" };
}

// Query inventory by product and location names
async function queryInventoryByProductAndLocation({ productName, locationName }) {
  const productNorm = norm(productName);
  const productTokens = tokens(productName);
  const locationTokens = tokens(locationName);
  const locationNorm = norm(locationName);
  
  // Get all inventory items
  const snap = await db.collection("inventory").get();
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Filter by product FIRST (more selective, reduces dataset)
  items = items.filter(item => {
    const fields = [item.name, item.sku, item.category].map(norm);
    // Check for substring match or token match
    const sym = fields.some(f => f.includes(productNorm) || productNorm.includes(f));
    const tok = productTokens.length ? fields.some(f => productTokens.every(tk => f.includes(tk))) : false;
    return sym || tok;
  });
  
  if (items.length === 0) {
    return { items: [], scope: "product_not_found" };
  }
  
  // Score all items by location match quality (replaces includes() filtering with scoring)
  // Priority: exact match > starts-with > token match > contains/substring
  const scoredMatches = items.map(item => ({
    item,
    score: calculateLocationScore(item, locationName, locationTokens)
  }));
  
  // Filter out items with score 0 (no match)
  const matchedItems = scoredMatches.filter(sm => sm.score > 0);
  
  if (matchedItems.length === 0) {
    return { items: [], scope: "location_not_found" };
  }
  
  // Sort by score (highest first), then by storeName for consistency
  matchedItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const nameA = norm(a.item.storeName || "");
    const nameB = norm(b.item.storeName || "");
    return nameA.localeCompare(nameB);
  });
  
  // Return items in best-match order (highest-scoring match first)
  return { 
    items: matchedItems.map(sm => sm.item), 
    scope: "found" 
  };
}

// Legacy function for backward compatibility
async function searchInventory({ term, storeId }) {
  const { items } = await queryInventoryByStoreAndTerm({ term, storeId });
  return items;
}

const reply = (text) => ({ fulfillmentText: text });

// ---------- one handler for Dialogflow ----------
async function dfHandler(req, res) {
  try {
    const qr = req.body?.queryResult || {};
    console.log("DF payload:", JSON.stringify(qr, null, 2));

    const intent = qr.intent?.displayName || "";
    const p = qr.parameters || {};

    // Handle check_stock_at_location intent (primary handler for all stock queries)
    if (intent === "CheckStockAtLocation" || (p.product && p.location)) {
      // Extract parameters from Dialogflow queryResult.parameters
      // Dialogflow may pass parameters as arrays, so handle both string and array formats
      // Use queryText as fallback for product if parameter is not provided
      const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
      const productName = productParam || qr.queryText || "";
      const locationName = (Array.isArray(p.location) ? p.location[0] : p.location) || "";
      
      // Log parameters for debugging
      console.log("Product parameter (raw):", p.product);
      console.log("Location parameter (raw):", p.location);
      console.log("Query text:", qr.queryText);
      console.log("Detected product:", productName);
      console.log("Detected location:", locationName);
      
      // Validate if both product and location are provided
      if (!productName || !locationName) {
        return res.json(reply("Please specify both product and location."));
      }
      
      // Query Firestore for the correct stock info
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
          `Yes, ${it.name} is available at ${locationName}. There are ${qty} units in stock${it.sku ? ` (SKU: ${it.sku})` : ""}.`
        ));
      } else {
        return res.json(reply(
          `Sorry, ${it.name} is currently out of stock at ${locationName}.`
        ));
      }
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

    // If we reach here, the intent was not check_stock_at_location or LowStockList
    // Guide user to specify both product and location
    return res.json(reply("Sorry, I didn't get that. Please specify both the product and location you're looking for. For example: 'Do you have seaweed at 99 Speedmart Acacia?'"));
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

// ---------- Dialogflow detectIntent passthrough ----------
app.post("/detect-intent", async (req, res) => {
  try {
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || admin.app().options.projectId;
    const sessionId = `${Date.now()}`;
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const text = (req.body?.text || req.body?.message || req.body?.query || "").toString();
    const languageCode = req.body?.languageCode || "en";
    const storeId = req.body?.storeId || "";
    if (!text.trim()) return res.status(400).json({ fulfillmentText: "What should I check?" });

    const request = {
      session: sessionPath,
      queryInput: {
        text: { text, languageCode },
      },
      // Pass storeId as query parameter so it flows through to fulfillment
      queryParams: {
        parameters: storeId ? { store: storeId } : {},
      },
    };

    const [response] = await sessionClient.detectIntent(request);
    const intentName = response.queryResult?.intent?.displayName || "";
    const p = response.queryResult?.parameters || {};
    
    // Handle check_stock_at_location intent (primary handler for all stock queries)
    if (intentName === "CheckStockAtLocation" || (p.product && p.location)) {
      // Extract parameters from Dialogflow queryResult.parameters
      // Dialogflow may pass parameters as arrays, so handle both string and array formats
      // Use queryText as fallback for product if parameter is not provided
      const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
      const productName = productParam || response.queryResult?.queryText || "";
      const locationName = (Array.isArray(p.location) ? p.location[0] : p.location) || "";
      
      // Log parameters for debugging
      console.log("detect-intent - Product parameter (raw):", p.product);
      console.log("detect-intent - Location parameter (raw):", p.location);
      console.log("detect-intent - Query text:", response.queryResult?.queryText);
      console.log("detect-intent - Detected product:", productName);
      console.log("detect-intent - Detected location:", locationName);
      
      // Validate if both product and location are provided
      if (!productName || !locationName) {
        return res.json({ 
          fulfillmentText: "Please specify both product and location.",
          raw: response.queryResult 
        });
      }
      
      // Query Firestore for the correct stock info
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
          fulfillmentText: `Yes, ${it.name} is available at ${locationName}. There are ${qty} units in stock${it.sku ? ` (SKU: ${it.sku})` : ""}.`,
          raw: response.queryResult 
        });
      } else {
        return res.json({ 
          fulfillmentText: `Sorry, ${it.name} is currently out of stock at ${locationName}.`,
          raw: response.queryResult 
        });
      }
    }
    
    // If we reach here, the intent was not check_stock_at_location
    // Guide user to specify both product and location
    const fulfillmentText = response.queryResult?.fulfillmentText || "Sorry, I didn't get that. Please specify both the product and location you're looking for. For example: 'Do you have seaweed at 99 Speedmart Acacia?'";
    return res.json({ fulfillmentText, raw: response.queryResult });
  } catch (e) {
    console.error("detect-intent error", e);
    return res.status(500).json({ fulfillmentText: "Error calling Dialogflow." });
  }
});

// ---------- export ----------
exports.webhook = onRequest(app);
