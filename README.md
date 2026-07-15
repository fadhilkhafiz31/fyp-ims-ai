# fyp-ims-ai

Final year project: an inventory management system for a small multi-location retail chain (built around a 99 Speedmart-style setup), with a chatbot on top so customers and staff can ask about stock instead of digging through a dashboard.

Live demo: https://ims-ai-821f0.web.app/login

## What it does

Admins and staff manage inventory per store location, everything updates live through Firestore, and there's a checkout flow that deducts stock and prints a PDF receipt with a loyalty points code on it. Customers (or anonymous guests) can ask the chatbot things like "do you have Beras Faiza 5KG at KL?" and get an answer pulled from the actual inventory data, instead of a canned response.

The in-app chatbot is backed by Gemini: the Cloud Function grabs the current inventory, drops it into the prompt as context, and lets the model answer in plain language. Dialogflow ES is also set up, but as a separate intent/fulfillment webhook that does its own product/location matching, it ranks items against store name, SKU, and category with `productScore * 1000 + locationScore`, so a strong product match always beats a strong location one. Both live in the same Cloud Function on different routes (`function-ai/index.js`), but the chat widgets you see in the app call the Gemini route directly. I never wired the two into a single fallback chain, Dialogflow ended up being more of a parallel experiment.

## Stack

- React 19 + Vite, Tailwind CSS
- Firebase: Firestore, Auth, Cloud Functions (Node 20), Hosting, Storage
- Dialogflow ES + Gemini API for the chatbot
- PDFKit for receipts

## Running it locally

```bash
git clone <repo-url>
cd fyp-ims-ai
npm install
npm run dev
```

You'll need a `.env.local` with:

```
VITE_AI_WEBHOOK_URL=https://asia-southeast1-<your-project>.cloudfunctions.net/webhook
```

For the Cloud Functions side:

```bash
cd function-ai
npm install
firebase deploy --only functions
```

Gemini needs an API key set as a Firebase secret (`firebase functions:secrets:set GEMINI_API_KEY`) — without it the `/chat` endpoint just returns an error and the chatbot won't reply until it's set.

If the inventory collection is empty and LocationSelector shows "No locations available", there's a `PopulateSampleData` component (`src/components/PopulateSampleData.jsx`) you can drop into any admin page to seed a few sample stores and products.

## Layout

- `src/pages` — one file per route (Dashboard, Inventory, Checkout, Chatbot, etc.), split by role where it matters
- `src/contexts` — Auth, Store, DarkMode, Search, Toast
- `src/lib` — Firebase init and Firestore helper functions
- `src/utils` — product search/filtering logic used by the searchable dropdowns
- `function-ai/` — the webhook (Dialogflow + Gemini), PDF receipt generation, rate limiting

Stores aren't a separate collection — `StoreContext` derives the list of locations from whatever `storeId`/`storeName` values show up in the inventory documents. That was a deliberate fix (see git history) after the original design had a separate, usually-empty `storeId` collection.

## License

MIT, see [LICENSE](LICENSE).
