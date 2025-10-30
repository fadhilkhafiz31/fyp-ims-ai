// --- SmartStockAI Dialogflow webhook (Firebase Functions v2) ---
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Global defaults from your existing file
setGlobalOptions({ region: "asia-southeast1", timeoutSeconds: 10, memory: "256MiB" });

// Init Admin SDK once
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const INVENTORY_COLLECTION = "inventory"; // Using your correct collection name

/**
 * Finds a product, optionally filtered by store.
 * Now uses 'keywords' array for flexible matching.
 */
async function findProduct({ productName, storeId, size }) {
  const coll = db.collection(INVENTORY_COLLECTION);
  const phrase = (productName || "").toLowerCase().trim();

  // tokens: "air putih 550ml" -> ["air","putih","550ml"]
  const tokens = Array.from(
    new Set(phrase.split(/[^a-z0-9]+/i).filter(Boolean).map(t => t.toLowerCase()))
  ).slice(0, 10);

  async function queryOnce({ withSize, withStore, mode }) {
    let q = coll;
    if (withStore && storeId) q = q.where("storeId", "==", storeId.toLowerCase());
    if (withSize && size) q = q.where("size", "==", size);

    // Try exact phrase in keywords first (e.g., "air putih")
    if (phrase) {
      const snapPhrase = await q.where("keywords", "array-contains", phrase).limit(5).get();
      if (!snapPhrase.empty) return snapPhrase.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Then ANY token in keywords
    if (tokens.length) {
      const snapAny = await q.where("keywords", "array-contains-any", tokens).limit(5).get();
      if (!snapAny.empty) return snapAny.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Exact name (rarely used but cheap)
    if (phrase) {
      const snapName = await q.where("name", "==", productName).limit(5).get();
      if (!snapName.empty) return snapName.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // Loose contains (last resort)
    const snapLoose = await q.limit(10).get();
    if (!snapLoose.empty) {
      const rows = snapLoose.docs.map(d => ({ id: d.id, ...d.data() }));
      const byLoose = rows.filter(r => (r.name || "").toLowerCase().includes(tokens[0] || phrase));
      if (byLoose.length) return byLoose;
    }
    return [];
  }

  // Helpful logging
  console.log("FIND query → storeId:", storeId, "size:", size, "phrase:", phrase, "tokens:", tokens);

  // Pass order:
  // 1) with store + with size
  // 2) with store + without size
  // 3) WITHOUT store + with size   <-- fallback to ignore store filter
  // 4) WITHOUT store + without size
  let rows = await queryOnce({ withSize: true,  withStore: true,  mode: "S+Z" });
  if (!rows.length) rows = await queryOnce({ withSize: false, withStore: true,  mode: "S"   });
  if (!rows.length) rows = await queryOnce({ withSize: true,  withStore: false, mode: "Z"   });
  if (!rows.length) rows = await queryOnce({ withSize: false, withStore: false, mode: "-"   });

  if (!rows.length) return null;

  // Prefer exact size, then higher qty
  if (rows.length > 1) {
    rows.sort((a, b) => {
      const aSize = (a.size || "").toLowerCase() === (size || "").toLowerCase() ? 0 : 1;
      const bSize = (b.size || "").toLowerCase() === (size || "").toLowerCase() ? 0 : 1;
      if (aSize !== bSize) return aSize - bSize;
      return (b.qty || 0) - (a.qty || 0);
    });
  }
  return rows[0];
}

/**
 * Helper to get parameters from Dialogflow
 */
function extractParam(dfReq, name) {
  const param = dfReq.body?.queryResult?.parameters?.[name];
  if (!param) return null;
  if (Array.isArray(param)) return param.map(x => (x?.name ?? x ?? "")).join(" ").trim();
  if (typeof param === "string") return param.trim();
  if (typeof param === "object") return (param.name ? String(param.name) : String(param)).trim();
  return null;
}


/**
 * Main handler for all Dialogflow intents
 */
async function dfHandler(req, res) {
  try {
    const qr = req.body?.queryResult || {};
    const intent = qr.intent?.displayName || "";
    console.log("DF payload:", JSON.stringify(qr, null, 2));

    // --- Log every query to Firestore ---
    await db.collection("chat_logs").add({
      text: qr.queryText || "",
      intent,
      ts: admin.firestore.FieldValue.serverTimestamp(),
    });

    // --- CheckStock intent (with location) ---
    if (intent === "CheckStock") {
      const prodParam = extractParam(req, "product") || extractParam(req, "any");
      const sizeParam = extractParam(req, "size");
      const storeParam = extractParam(req, "store"); // This will be the original text, e.g., "Acacia"

// Fallback: if Dialogflow didn't capture a product, use the whole query
if (!prodParam) {
  prodParam = (qr.queryText || "").toLowerCase();
  // Optional: strip common filler words
  prodParam = prodParam
    .replace(/(do you have|ada ke|ada|stok|stock|yang|the)/gi, "")
    .trim();
}

      const storeId = (storeParam || "sm-acacia-nilai").toLowerCase(); // Default to Acacia, Nilai

      const item = await findProduct({
        productName: prodParam,
        storeId: storeId,
        size: sizeParam,
      });

      // --- THIS IS THE FIX ---
      if (!item) {
  let notFoundMsg = `I couldn’t find "${prodParam || "that item"}"`;
  if (storeParam) notFoundMsg += ` at ${storeParam}`;
  notFoundMsg += ". Could you tell me the exact name or size?";
  return res.json({ fulfillmentText: notFoundMsg });
}

// if we found it WITHOUT the store filter, mention the store we found
const foundStore = item.storeName || item.storeId || "";
const storeNote = storeParam && foundStore && !foundStore.includes(storeParam.toLowerCase())
  ? ` Note: I found it in ${foundStore}.`
  : "";

return res.json({ fulfillmentText: msg + extra + storeNote });
      // --- END OF FIX ---

     // build response
const storeName = item.storeName ? ` at ${item.storeName}` : "";
const itemName = `"${item.name}" ${item.size ? "(" + item.size + ") " : ""}`;
const qty = Number(item.qty ?? 0);

if (qty > 0) {
  msg = `Yes, ${itemName}is in stock: ${qty} unit(s) available${storeName}.`;
} else {
  msg = `Sorry, ${itemName}is currently out of stock${storeName}.`;
}

const reorderLevel = Number(item.reorderPoint ?? 5);
const extra = qty > 0 && qty <= reorderLevel
  ? " Note: it’s running low—better act fast."
  : "";

return res.json({ fulfillmentText: msg + extra + storeNote });


    // --- Other intents ---
    if (intent === "StoreHours") {
      return res.json({ fulfillmentText: "We’re open Mon–Fri 9:00–18:00, Sat 10:00–16:00." });
    }

    if (intent === "LowStockPolicy") {
      return res.json({ fulfillmentText: "If an item is out of stock, we’ll restock within 3–5 days. You can leave your contact to be notified." });
    }

    // --- Fallback ---
    return res.json({
      fulfillmentText: "I didn’t quite get that. You can ask: “Do you have Seaweed Snack at Acacia?”",
    });
  } catch (e) {
    console.error(e);
    if (e.message && e.message.includes("requires an index")) {
        console.error("FIRESTORE ERROR: You are missing a composite index. Please create it in the Firebase console.");
        return res.json({ fulfillmentText: "The database needs a new index. Please ask the administrator to check the function logs." });
    }
    return res.json({ fulfillmentText: "Something went wrong while checking inventory." });
  }
}

// Health check for browser
app.get("/", (req, res) => res.status(200).send("SmartStock AI is Running Smoothly"));

// --- routes ---
app.post("/", dfHandler);
app.post("/webhook", dfHandler);
app.post("/df", dfHandler);

// --- export ---
exports.webhook = onRequest(app);
exports.webhook = onRequest({ region: "asia-southeast1" }, app);
