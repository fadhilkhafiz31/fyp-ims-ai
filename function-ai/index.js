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

async function searchInventory({ term, storeId }) {
  const snap = await db.collection("inventory").get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const q = norm(term);
  const qTokens = tokens(term);

  let filtered = items.filter(x => {
    const fields = [x.name, x.sku, x.category].map(norm);
    const sym = fields.some(f => f.includes(q) || q.includes(f));
    const tok = qTokens.length ? fields.some(f => qTokens.every(tk => f.includes(tk))) : false;
    return sym || tok;
  });

  if (storeId) filtered = filtered.filter(x => norm(x.storeId) === norm(storeId));
  return filtered;
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

      const results = await searchInventory({ term, storeId: store });
      if (!results.length) {
        return res.json(reply(`I couldn't find "${term}". Want me to check similar items?`));
      }
      const it = results[0];
      const qty = Number(it.qty ?? 0);
      const where = it.storeName ? ` at ${it.storeName}` : "";
      if (qty > 0) {
        return res.json(reply(`Yes, ${it.name} (SKU: ${it.sku || "—"}) — ${qty} in stock${where}.`));
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
    if (!text.trim()) return res.status(400).json({ fulfillmentText: "What should I check?" });

    const request = {
      session: sessionPath,
      queryInput: {
        text: { text, languageCode },
      },
    };

    const [response] = await sessionClient.detectIntent(request);
    const fulfillmentText = response.queryResult?.fulfillmentText || "Sorry, I didn't get that.";
    return res.json({ fulfillmentText, raw: response.queryResult });
  } catch (e) {
    console.error("detect-intent error", e);
    return res.status(500).json({ fulfillmentText: "Error calling Dialogflow." });
  }
});

// ---------- export ----------
exports.webhook = onRequest(app);
