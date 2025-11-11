# fyp-ims-ai
[![Firebase Hosting](https://img.shields.io/badge/Live%20Demo-https%3A%2F%2Fims--ai--821f0.web.app-blue?style=flat&logo=firebase&logoColor=white)](https://ims-ai-821f0.web.app)

> **Inventory Management System with AI Chatbot for SMEs**
> A web-based platform built with **React (Vite)**, **Firebase**, and **Dialogflow ES** to help small businesses manage stock levels, track low-inventory items in real time, and interact with an integrated AI chatbot for stock inquiries.

---

## 🚀 Features
- 🔐 **Role-based Authentication** (Admin / Staff / Customer)
- 📦 **Real-time Inventory CRUD** with Firestore
- 🤖 **AI Chatbot Integration** via Dialogflow
- ⚡ **Live KPIs & Low-Stock Dashboard** using onSnapshot
- 💬 Optional **Push Notifications** (Firebase FCM)

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-------------|
| Frontend | React (Vite) + Tailwind CSS |
| Backend / API | Firebase Cloud Functions (Node.js) |
| Database | Cloud Firestore |
| AI Module | Dialogflow ES |
| Hosting | Firebase Hosting |
| Dev Tools | VS Code · GitHub · Postman · Trello |

---
## 🧩 Project Structure
## 🧩 Project Structure

| File / Folder | Description |
|---------------|-------------|
| `fyp-ims-ai/` | Root project directory |
| `├── public/` | Static assets (favicon, manifest, etc.) |
| `├── src/` | Main React app source |
| `│ ├── assets/` | Images, logos, and icons |
| `│ ├── components/` | Reusable UI components (Navbar, Modal, etc.) |
| `│ ├── contexts/` | Auth & role context providers |
| `│ ├── hooks/` | Custom React hooks (e.g., useRole) |
| `│ ├── lib/` | Firebase configuration & helper functions |
| `│ ├── pages/` | Application pages (Login, Dashboard, Inventory) |
| `│ ├── App.jsx` | Root React component |
| `│ └── main.jsx` | Entry point that renders App.jsx |
| `├── .firebaserc` | Firebase project alias configuration |
| `├── firebase.json` | Firebase hosting and rewrite rules |
| `├── .gitignore` | Files ignored by Git (node_modules, dist, etc.) |
| `├── index.html` | Main HTML entry point for Vite build |
| `├── package.json` | Dependencies and scripts |
| `├── postcss.config.js` | PostCSS + Tailwind configuration |
| `├── tailwind.config.js` | Tailwind CSS design setup |
| `├── vite.config.js` | Vite build and dev server configuration |
| `└── README.md` | Project documentation (this file) |


## 📅 7-Week Development Timeline

| **Week** | **Focus Area** | **Key Deliverables / Tasks** |
|---------:|-----------------|-------------------------------|
| **Week 1** | Setup & Login System | Initialize Firebase project · Configure Authentication · Scaffold React (Vite + Tailwind) · Deploy base site to Firebase Hosting |
| **Week 2** | Inventory CRUD + RBAC | Create Firestore collections · Build add/edit/delete item forms · Implement role-based access (admin / staff / customer) |
| **Week 3** | Realtime Dashboard + Low-Stock Alerts | Build KPI cards (total SKUs / low-stock) · Use `onSnapshot()` for live updates · Add sample dataset loader |
| **Week 4** | AI Chatbot Integration | Create Dialogflow ES agent · Configure intents (CheckStock, Greeting, Fallback) · Build Cloud Function webhook · Embed chatbot widget |
| **Week 5** | Security & UI Polish | Strengthen Firestore rules v2 · Add role-management UI · Implement responsive design & error states |
| **Week 6** | UAT & Bug Fixing | Prepare User-Acceptance Test scripts · Collect tester feedback · Resolve logic & UI issues · *(Optional)* add FCM alerts |
| **Week 7** | Final Demo & Documentation | Seed realistic data · Create demo accounts · Record 2–3 min video demo · Prepare slides, ERD & architecture documentation |


---

## 🤖 AI Integration Flow

1. **User Query (Frontend)**
   Customer asks: "Do you have *Beras Faiza 5KG* at 99 Speedmart Acacia?"

2. **Dialogflow ES Agent (NLP Layer)**
   Detects `CheckStock` intent → forwards to webhook.

3. **Firebase Cloud Function (Webhook)**
   Reads Firestore (`items/{id}`) in real time → returns availability (and optional alternatives).

4. **Chatbot Response (Frontend)**
   Shows: *In stock / Low stock / Out of stock* + suggested item.

5. **Inventory Sync (Realtime)**
   Staff/Admin updates `qty` → `onSnapshot()` refreshes dashboard and feeds the chatbot's next answer.

---

## 🎯 Intelligent Matching Algorithm

The chatbot uses a **multi-dimensional scoring algorithm** to accurately match user queries with inventory items, preventing false positives and handling natural language variations.

### How It Works

**Product Matching** (0-100 points):
- **100**: Exact name/SKU match
- **50**: All tokens match (e.g., "faiza rice 5kg" → "Faiza Rice 5KG Premium")
- **30**: Partial name match
- **20**: SKU match
- **10**: Category match

**Location Matching** (0-100 points):
- **100**: Exact store name/ID match
- **50**: Store name starts with query
- **30**: All location tokens present
- **10**: Substring match

**Combined Scoring**:
```
Total Score = (Product Score × 1000) + Location Score
```
This weighting ensures product accuracy is prioritized over location, preventing incorrect product matches even when location is ambiguous.

### Example

**Query:** "Do you have Faiza Rice 5KG at 99 Speedmart Acacia?"

| Item | Product Score | Location Score | Total | Result |
|------|--------------|----------------|-------|--------|
| Faiza Rice 5KG at 99 Speedmart Acacia | 100 | 100 | **101,100** | ✅ **Best Match** |
| Oil Packet 1KG at 99 Speedmart Acacia | 0 | 100 | **0** | ❌ Filtered out |

📖 **Full Documentation:** See [`function-ai/SCORING_ALGORITHM.md`](function-ai/SCORING_ALGORITHM.md) for complete algorithm details, examples, and performance analysis.

---

## 🔧 Configuration: Chatbot + Dialogflow

### 1) Environment variable (frontend)

- Create `.env.local` at project root:

  ```bash
  VITE_AI_WEBHOOK_URL=https://asia-southeast1-<project-id>.cloudfunctions.net/webhook
  ```

- Restart dev server: `npm run dev`.
- **Production build and deploy** (recommended):
  - Windows: `.\deploy.ps1`
  - Linux/Mac: `./deploy.sh`
- One‑off production build with URL baked in:

  ```bash
  VITE_AI_WEBHOOK_URL="https://asia-southeast1-<project-id>.cloudfunctions.net/webhook" npm run build
  firebase deploy --only hosting
  ```

### 2) Backend (Firebase Functions)

- Codebase lives in `function-ai/`.
- Deploy only the webhook:

  ```bash
  firebase deploy --only functions:function-ai:webhook
  ```

### 3) Dialogflow Integration

- The frontend sends user text to `POST {WEBHOOK_URL}/detect-intent`.
- The function calls Dialogflow `detectIntent` and returns `fulfillmentText`.
- If Dialogflow is not configured, the function falls back to a simple Firestore keyword search.
- To change language, set `languageCode` in the body (default `en`).

### 4) GitHub Actions (optional)

Inject the env var during build:

```yaml
- run: echo "VITE_AI_WEBHOOK_URL=${{ secrets.AI_WEBHOOK_URL }}" >> .env
- run: npm run build
```

---

## 🎯 Impact Summary

- **Operational Efficiency:** AI chat reduces manual stock checks.
- **Business Readiness:** Full integration of frontend, backend, and NLP.
- **Academic Strength:** Demonstrates applied AI, RBAC security, and real-time sync.
- **Professional Presentation:** Clear Agile-style plan with measurable milestones.
