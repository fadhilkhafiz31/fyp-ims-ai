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

fyp-ims-ai/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── App.jsx
│   └── main.jsx
├── .firebaserc
├── firebase.json
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── README.md


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
   Customer asks: “Is *Blue Lemonade* available?”

2. **Dialogflow ES Agent (NLP Layer)**  
   Detects `CheckStock` intent → forwards to webhook.

3. **Firebase Cloud Function (Webhook)**  
   Reads Firestore (`items/{id}`) in real time → returns availability (and optional alternatives).

4. **Chatbot Response (Frontend)**  
   Shows: *In stock / Low stock / Out of stock* + suggested item.

5. **Inventory Sync (Realtime)**  
   Staff/Admin updates `qty` → `onSnapshot()` refreshes dashboard and feeds the chatbot’s next answer.

---

## 🎯 Impact Summary

- **Operational Efficiency:** AI chat reduces manual stock checks.  
- **Business Readiness:** Full integration of frontend, backend, and NLP.  
- **Academic Strength:** Demonstrates applied AI, RBAC security, and real-time sync.  
- **Professional Presentation:** Clear Agile-style plan with measurable milestones.

