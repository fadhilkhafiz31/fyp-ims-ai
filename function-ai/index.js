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

    if (intent === "CheckStock") {
      const term = p.product || p.any || qr.queryText || "";
      const store = p.store || "";
      if (!term) return res.json(reply("What item are you looking for?"));

      const { items, scope } = await queryInventoryByStoreAndTerm({ term, storeId: store });
      if (!items.length) {
        return res.json(reply(`I couldn't find "${term}" in any store right now.`));
      }
      
      const it = items[0];
      const qty = Number(it.qty ?? 0);
      const where = it.storeName ? ` at ${it.storeName}` : "";
      
      // If found in selected store
      if (scope === "selected") {
        if (qty > 0) {
          return res.json(reply(`Yes, ${it.name} (SKU: ${it.sku || "—"}) — ${qty} in stock${where}.`));
        }
        return res.json(reply(`Currently out of stock for ${it.name}${where}.`));
      }
      
      // If found in different store
      if (scope === "any" && store) {
        return res.json(reply(
          `There is no ${term} in your selected store. You can go to ${it.storeName || it.storeId}; they have it there.`
        ));
      }
      
      // Generic response if no store selected
      if (qty > 0) {
        return res.json(reply(`Yes, ${it.name} (SKU: ${it.sku || "—"}) — ${qty} in stock${where}.`));
      }
      return res.json(reply(`Currently out of stock for ${it.name}${where}.`));
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

    // Fallback: allow direct free-text stock queries without Dialogflow
    const rawText = (qr.queryText || req.body?.text || req.body?.message || "").toString().trim();
    if (rawText) {
      const results = await searchInventory({ term: rawText, storeId: p.store || "" });
      if (!results.length) {
        return res.json(reply(`I couldn't find "${rawText}". Want me to check similar items?`));
      }
      const it = results[0];
      const qty = Number(it.qty ?? 0);
      const where = it.storeName ? ` at ${it.storeName}` : "";
      if (qty > 0) {
        return res.json(reply(`Yes, ${it.name} (SKU: ${it.sku || "—"}) — ${qty} in stock${where}.`));
      }
      return res.json(reply(`Currently out of stock for ${it.name}${where}.`));
    }

    return res.json(reply("Sorry, I didn't get that. Which item should I check?"));
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
    
    // Check if fulfillment needs webhook processing
    if (response.queryResult?.intent?.displayName === "CheckStock") {
      // Process with our custom logic
      const p = response.queryResult.parameters || {};
      const term = p.product || p.any || text;
      const store = p.store || storeId;
      
      if (term) {
        const { items, scope } = await queryInventoryByStoreAndTerm({ term, storeId: store });
        if (!items.length) {
          return res.json({ 
            fulfillmentText: `I couldn't find "${term}" in any store right now.`,
            raw: response.queryResult 
          });
        }
        
        const it = items[0];
        const qty = Number(it.qty ?? 0);
        const where = it.storeName ? ` at ${it.storeName}` : "";
        
        let fulfillmentText;
        if (scope === "selected") {
          fulfillmentText = qty > 0
            ? `Yes, ${it.name} (SKU: ${it.sku || "—"}) — ${qty} in stock${where}.`
            : `Currently out of stock for ${it.name}${where}.`;
        } else if (scope === "any" && store) {
          fulfillmentText = `There is no ${term} in your selected store. You can go to ${it.storeName || it.storeId}; they have it there.`;
        } else {
          fulfillmentText = qty > 0
            ? `Yes, ${it.name} (SKU: ${it.sku || "—"}) — ${qty} in stock${where}.`
            : `Currently out of stock for ${it.name}${where}.`;
        }
        
        return res.json({ fulfillmentText, raw: response.queryResult });
      }
    }

    const fulfillmentText = response.queryResult?.fulfillmentText || "Sorry, I didn't get that.";
    return res.json({ fulfillmentText, raw: response.queryResult });
  } catch (e) {
    console.error("detect-intent error", e);
    return res.status(500).json({ fulfillmentText: "Error calling Dialogflow." });
  }
});

// ---------- export ----------
exports.webhook = onRequest(app);
