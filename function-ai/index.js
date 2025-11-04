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

const reply = (text) => ({ fulfillmentText: text });

// ---------- one handler for Dialogflow ----------
async function dfHandler(req, res) {
  try {
    const qr = req.body?.queryResult || {};
    console.log("DF payload:", JSON.stringify(qr, null, 2));

    const intent = qr.intent?.displayName || "";
    const p = qr.parameters || {};

    // Handle check_stock_at_location intent (location-specific stock queries)
    if (intent === "CheckStockAtLocation" || (p.product && p.location)) {
      // Extract parameters from Dialogflow queryResult.parameters
      // Dialogflow may pass parameters as arrays, so handle both string and array formats
      // Use queryText as fallback for product if parameter is not provided
      const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
      const productName = productParam || qr.queryText || "";
      const locationParam = Array.isArray(p.location) ? p.location[0] : p.location;
      // Dialogflow sends "?" as placeholder for missing required parameters - treat as empty
      const locationName = (locationParam && locationParam !== "?" && locationParam.trim() !== "?") ? locationParam : "";
      
      // Log parameters for debugging
      console.log("Product parameter (raw):", p.product);
      console.log("Location parameter (raw):", p.location);
      console.log("Query text:", qr.queryText);
      console.log("Detected product:", productName);
      console.log("Detected location:", locationName);
      
      // If location is missing (including "?" placeholder), and we have product, route to CheckStock
      if (!locationName && productName && intent === "CheckStockAtLocation") {
        // Fall through to CheckStock handler below instead of returning error
      } else if (!productName || !locationName) {
        return res.json(reply("Please specify both product and location."));
      } else {
          // Both product and location are valid - process CheckStockAtLocation
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
            `Yes, ${it.name} is available at ${locationName}. There are ${qty} units in stock.`
          ));
        } else {
          return res.json(reply(
            `Sorry, ${it.name} is currently out of stock at ${locationName}.`
          ));
        }
      }
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

      // Use the best match
      const it = bestMatches[0].item;
      const qty = Number(it.qty ?? 0);
      const where = it.storeName ? ` at ${it.storeName}` : "";

      // If we found items but they were outside the user's selected store
      if (scope === "any" && items.length > 0 && storeId) {
        return res.json(reply(
          `I couldn't find "${term}" at your selected store, but it is in stock at ${it.storeName || 'another store'}. We have ${qty} units there.`
        ));
      }
      
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
    
    // Handle check_stock_at_location intent (location-specific stock queries)
    if (intentName === "CheckStockAtLocation" || (p.product && p.location)) {
      // Extract parameters from Dialogflow queryResult.parameters
      // Dialogflow may pass parameters as arrays, so handle both string and array formats
      // Use queryText as fallback for product if parameter is not provided
      const productParam = Array.isArray(p.product) ? p.product[0] : p.product;
      const productName = productParam || response.queryResult?.queryText || "";
      const locationParam = Array.isArray(p.location) ? p.location[0] : p.location;
      // Dialogflow sends "?" as placeholder for missing required parameters - treat as empty
      const locationName = (locationParam && locationParam !== "?" && locationParam.trim() !== "?") ? locationParam : "";
      
      // Log parameters for debugging
      console.log("detect-intent - Product parameter (raw):", p.product);
      console.log("detect-intent - Location parameter (raw):", p.location);
      console.log("detect-intent - Query text:", response.queryResult?.queryText);
      console.log("detect-intent - Detected product:", productName);
      console.log("detect-intent - Detected location:", locationName);
      
      // If location is missing (including "?" placeholder), and we have product, route to CheckStock
      if (!locationName && productName && intentName === "CheckStockAtLocation") {
        // Fall through to CheckStock handler below instead of returning error
      } else if (!productName || !locationName) {
        return res.json({ 
          fulfillmentText: "Please specify both product and location.",
          raw: response.queryResult 
        });
      } else {
        // Both product and location are valid - process CheckStockAtLocation
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
            fulfillmentText: `Yes, ${it.name} is available at ${locationName}. There are ${qty} units in stock.`,
            raw: response.queryResult 
          });
        } else {
          return res.json({ 
            fulfillmentText: `Sorry, ${it.name} is currently out of stock at ${locationName}.`,
            raw: response.queryResult 
          });
        }
      }
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

      // Use the best match
      const it = bestMatches[0].item;
      const qty = Number(it.qty ?? 0);
      const where = it.storeName ? ` at ${it.storeName}` : "";

      // If we found items but they were outside the user's selected store
      if (scope === "any" && items.length > 0 && storeIdParam) {
        return res.json({ 
          fulfillmentText: `I couldn't find "${term}" at your selected store, but it is in stock at ${it.storeName || 'another store'}. We have ${qty} units there.`,
          raw: response.queryResult 
        });
      }
      
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
    
    // If we reach here, the intent was not recognized
    const fulfillmentText = response.queryResult?.fulfillmentText || "Sorry, I didn't get that. Please specify the product you're looking for, or include a location for location-specific queries.";
    return res.json({ fulfillmentText, raw: response.queryResult });
  } catch (e) {
    console.error("detect-intent error", e);
    return res.status(500).json({ fulfillmentText: "Error calling Dialogflow." });
  }
});

// ---------- export ----------
exports.webhook = onRequest(app);
