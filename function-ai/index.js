// --- SmartStockAI Dialogflow webhook (Firebase Functions v2) ---
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Init Admin SDK once
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ---------- helpers ----------
function norm(s){ return (s || "").toString().trim().toLowerCase(); }
function tokens(s){ return norm(s).split(/[^a-z0-9]+/).filter(Boolean); }

async function searchInventory({ term, storeId }) {
  const snap = await db.collection("inventory").get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const q = norm(term);
  const qTokens = tokens(term);

  let filtered = items.filter(x => {
    const fields = [x.name, x.sku, x.category].map(norm);

    // symmetric contains (“do you have spritzer 550ml” vs “spritzer 550ml”)
    const sym = fields.some(f => f.includes(q) || q.includes(f));

    // token-based match: all query tokens appear in any field
    const tok = qTokens.length
      ? fields.some(f => qTokens.every(tk => f.includes(tk)))
      : false;

    return sym || tok;
  });

  if (storeId) {
    filtered = filtered.filter(x => norm(x.storeId) === norm(storeId));
  }
  return filtered;
}

const reply = (text) => ({ fulfillmentText: text });

// ---------- routes ----------
app.get("/", (_req, res) => res.status(200).send("SmartStockAI webhook is running."));
app.get("/df", (_req, res) =>
  res.status(405).send("This endpoint expects POST from Dialogflow. Try a POST request.")
);

// Accept POST at / and /webhook too (so either URL works)
app.post("/", (req, res) => app._router.handle({ ...req, url: "/df" }, res));
app.post("/webhook", (req, res) => app._router.handle({ ...req, url: "/df" }, res));

app.post("/df", async (req, res) => {
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

    return res.json(reply("Sorry, I didn't get that. Which item should I check?"));
  } catch (e) {
    console.error(e);
    return res.json(reply("Something went wrong while checking stock."));
  }
});

// ---------- EXPORT THE FUNCTION (required) ----------
exports.webhook = onRequest({ region: "asia-southeast1" }, app);
