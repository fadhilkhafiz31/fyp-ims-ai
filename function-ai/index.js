// --- SmartStockAI Dialogflow webhook (Firebase Functions v2) ---
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Dialogflow detectIntent client (uses default creds in Functions)
const dialogflow = require('@google-cloud/dialogflow');

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
      
      // If location is provided, do location-specific search
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
        } else {
          return res.json(reply(
            `Sorry, ${it.name} is currently out of stock at ${locationName}.`
          ));
        }
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
          .join("\n");
        
        return res.json(reply(
          `Yes, ${matchedProductName} is available at ${groupedByStore.size} location(s):\n${locationList}`
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

      // If we found items but they were outside the user's selected store
      if (scope === "any" && items.length > 0 && storeId) {
        const firstMatch = bestMatches[0].item;
        return res.json(reply(
          `I couldn't find "${term}" at your selected store, but it is in stock at ${firstMatch.storeName || 'another store'}. We have ${Number(firstMatch.qty ?? 0)} units there.`
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
          .join("\n");
        
        return res.json(reply(
          `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n${locationList}`
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
    const queryText = qr.queryText || "";
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
                .join("\n");
              
              return res.json(reply(
                `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n${locationList}`
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
        
        // If location is provided, do location-specific search
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
          } else {
            return res.json({ 
              fulfillmentText: `Sorry, ${it.name} is currently out of stock at ${locationName}.`,
              raw: response.queryResult 
            });
          }
        }
        
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
            .join("\n");
          
          return res.json({ 
            fulfillmentText: `Yes, ${matchedProductName} is available at ${groupedByStore.size} location(s):\n${locationList}`,
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
      if (scope === "any" && items.length > 0 && storeIdParam) {
        const firstMatch = bestMatches[0].item;
        return res.json({ 
          fulfillmentText: `I couldn't find "${term}" at your selected store, but it is in stock at ${firstMatch.storeName || 'another store'}. We have ${Number(firstMatch.qty ?? 0)} units there.`,
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
          .join("\n");
        
        return res.json({ 
          fulfillmentText: `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n${locationList}`,
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
                .join("\n");
              
              return res.json({ 
                fulfillmentText: `Yes, ${productName} is available at ${groupedByStore.size} location(s):\n${locationList}`,
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
    
    // If we reach here, the intent was not recognized and we couldn't extract a product
    const fulfillmentText = response.queryResult?.fulfillmentText || "Sorry, I didn't get that. Please specify the product you're looking for, or include a location for location-specific queries.";
    return res.json({ fulfillmentText, raw: response.queryResult });
  } catch (e) {
    console.error("detect-intent error", e);
    return res.status(500).json({ fulfillmentText: "Error calling Dialogflow." });
  }
});

// ---------- export ----------
exports.webhook = onRequest(app);
