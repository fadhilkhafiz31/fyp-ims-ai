// src/pages/Inventory.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PageReady } from "../components/NProgressBar";
import { useRole } from "../hooks/useRole";
import { useStore } from "../contexts/StoreContext";

const INVENTORY_COL = "inventory";
const LOW_STOCK_THRESHOLD = 5;

function KPI({ label, value }) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================
function TopNavigation() {
  return (
    <nav className="w-full bg-[#2E6A4E] border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto pl-2 pr-4 sm:pl-4 sm:pr-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: SmartStockAI Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/Logo SmartStockAI.png"
              alt="SmartStockAI Logo"
              className="w-10 h-10 bg-transparent object-contain"
              style={{ mixBlendMode: 'normal' }}
            />
            <span className="font-bold text-lg text-white">
              SmartStockAI
            </span>
          </div>

          {/* Center: Search Bar */}
          <div className="hidden xl:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for an item from nearby location"
                className="w-full pl-10 pr-4 py-2 border border-green-400/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-green-100/70 focus:ring-2 focus:ring-green-300 focus:border-transparent focus:bg-white/20"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-green-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Right: Store Info, Icons and Menu */}
          <div className="flex items-center gap-3">
            {/* 99 Speedmart Logo */}
            <div className="hidden md:flex items-center border-r border-green-400/30 pr-4">
              <img 
                src="/99speedmart logo.png" 
                alt="99 Speedmart Logo" 
                className="h-8 w-auto"
              />
            </div>

            {/* Location */}
            <div className="hidden lg:flex items-center gap-2 text-sm border-r border-green-400/30 pr-4">
              <svg
                className="w-5 h-5 text-red-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-white">
                99 Speedmart Acacia, Nilai
              </span>
            </div>

            {/* Icons */}
            <Link to="/chatbot" className="p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition text-xl">
              🤖
            </Link>
            <button className="p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
            <Link to="/stock-notification" className="relative p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full"></span>
            </Link>

            {/* Menu Links */}
            <div className="hidden sm:flex items-center gap-4 border-l border-green-400/30 pl-4 ml-2">
              <Link
                to="/"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                HOME
              </Link>
              <Link
                to="/about"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                ABOUT US
              </Link>
              <Link
                to="/contact"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                CONTACT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function SideNavigation({ activeItemCount }) {
  const location = useLocation();
  const isDashboardActive = location.pathname === "/dashboard";
  const isTransactionsActive = location.pathname === "/transactions";
  const isInventoryActive = location.pathname === "/inventory";
  const isChatbotActive = location.pathname === "/chatbot";

  const menuItems = [
    { icon: "grid", label: "Dashboard", path: "/dashboard", active: isDashboardActive },
    { icon: "transaction", label: "Transaction", path: "/transactions", active: isTransactionsActive },
    { icon: "bell", label: "Stock Notification", path: "/stock-notification", badge: activeItemCount || 0 },
    { icon: "chatbot", label: "SmartStockAI Assistant", path: "/chatbot", active: isChatbotActive },
    { icon: "inventory", label: "Inventory", path: "/inventory", active: isInventoryActive },
    { icon: "user", label: "My Profile", path: "#", isMock: true },
    { icon: "gear", label: "Settings", path: "#", isMock: true },
    { icon: "question", label: "Help & Support", path: "#", isMock: true },
  ];

  const getIcon = (iconName) => {
    const icons = {
      grid: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      transaction: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      bell: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      chatbot: (
        <span className="text-xl">🤖</span>
      ),
      inventory: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      user: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      gear: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      question: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
    return icons[iconName] || icons.grid;
  };

  const handleMockClick = (e, item) => {
    if (item.isMock) {
      e.preventDefault();
      alert(`${item.label} - Coming soon!`);
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-4rem)] overflow-y-auto fixed left-0 top-16">
      <nav className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h2>
        </div>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                onClick={(e) => handleMockClick(e, item)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  item.active
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {getIcon(item.icon)}
                <span className="font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

// ============================================
// Main Component
// ============================================
export default function Inventory() {
  const { role } = useRole();
  const { storeId, storeName, setStore, stores } = useStore();

  const defaultFormState = {
    name: "",
    sku: "",
    qty: "",
    reorderPoint: "5",
    category: "",
    StoreId: "",
    StoreName: "",
    Keywords: "",
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => ({ ...defaultFormState }));
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [storeOptions, setStoreOptions] = useState([]);
  const [storeLoadError, setStoreLoadError] = useState("");

  // ---- realtime subscription ----
  useEffect(() => {
    if (!storeId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const qRef = query(
      collection(db, INVENTORY_COL),
      where("storeId", "==", storeId),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("onSnapshot error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [storeId]);

  // ---- load store options ----
  useEffect(() => {
    const ref = collection(db, "storeId");
    
    // Log Firebase project for verification
    // eslint-disable-next-line no-console
    console.log("Firebase projectId:", db.app.options.projectId);
    
    // Live listener with error callback
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // eslint-disable-next-line no-console
        console.log("[storeId] onSnapshot size:", snap.size);
        const opts = snap.docs.map((d) => ({
          id: d.id,
          name: d.data()?.storeName || d.id,
        }));
        // eslint-disable-next-line no-console
        console.log("[storeId] options:", opts);
        setStoreOptions(opts);
        setStoreLoadError("");
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[storeId] onSnapshot error:", err);
        setStoreLoadError(err.message || "Failed to load stores");
      }
    );
    
    // One-shot fallback for diagnostics
    (async () => {
      try {
        const s = await getDocs(ref);
        // eslint-disable-next-line no-console
        console.log("[storeId] getDocs size:", s.size, "ids:", s.docs.map((d) => d.id));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[storeId] getDocs error:", e);
      }
    })();
    
    return () => unsub();
  }, []);

  // ---- derived totals (for quick context) ----
  const totals = useMemo(() => {
    const totalQty = items.reduce((s, it) => s + Number(it.qty ?? 0), 0);
    const totalItems = items.length;
    const totalCategories = new Set(
      items.map((it) => (it.category || "Uncategorized").trim().toLowerCase())
    ).size;
    return { totalQty, totalItems, totalCategories };
  }, [items]);

  // Calculate low stock items for badge
  const lowStockItems = useMemo(
    () =>
      items.filter(
        (item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD
      ),
    [items]
  );

  // ---- helpers ----
  const resetForm = () => setForm({ ...defaultFormState });

  const handleSelectStore = (id) => {
    const found = storeOptions.find((s) => s.id === id);
    setForm((f) => ({
      ...f,
      StoreId: found?.id || "",
      StoreName: found?.name || "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // keep only integers in qty/reorderPoint (but allow empty string for UX)
    if (name === "qty" || name === "reorderPoint") {
      if (value === "" || /^[0-9]+$/.test(value)) {
        setForm((f) => ({ ...f, [name]: value }));
      }
      return;
    }

    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const errors = [];
    if (!form.name.trim()) errors.push("Name is required.");
    if (!form.sku.trim()) errors.push("SKU is required.");
    if (form.qty === "" || Number.isNaN(Number(form.qty))) errors.push("Qty must be a number.");
    if (form.reorderPoint === "" || Number.isNaN(Number(form.reorderPoint)))
      errors.push("Reorder point must be a number.");
    if (!form.category.trim()) errors.push("Category is required.");
    if (!form.Keywords.trim()) errors.push("Keywords are required.");
    if (!storeId && !form.StoreId.trim()) errors.push("Store ID is required.");
    return errors;
  };

  // ---- create or update ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) {
      // eslint-disable-next-line no-alert
      alert(errs.join("\n"));
      return;
    }

    // Use selected store if available, otherwise fall back to form values
    const finalStoreId = storeId || (form.StoreId || "").trim();
    const finalStoreName = storeName || (form.StoreName || "").trim();

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      qty: Number(form.qty),
      reorderPoint: Number(form.reorderPoint),
      category: form.category.trim(),
      // canonical fields (lowercase)
      storeId: finalStoreId,
      storeName: finalStoreName,
      // legacy compatibility
      StoreId: finalStoreId,
      StoreName: finalStoreName,
      Keywords: (form.Keywords || "").trim(),
      updatedAt: serverTimestamp(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, INVENTORY_COL, editingId), payload);
        setEditingId(null);
      } else {
        await addDoc(collection(db, INVENTORY_COL), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("save error:", err);
      // eslint-disable-next-line no-alert
      alert("Failed to save item.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (it) => {
    setEditingId(it.id);
    setForm({
      ...defaultFormState,
      name: it.name || "",
      sku: it.sku || "",
      qty: String(Number(it.qty ?? 0)),
      reorderPoint: String(Number(it.reorderPoint ?? 5)),
      category: it.category || "",
      StoreId: it.storeId || it.StoreId || "",
      StoreName: it.storeName || it.StoreName || "",
      Keywords: Array.isArray(it.Keywords) ? it.Keywords.join(", ") : it.Keywords || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, INVENTORY_COL, id));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("delete error:", err);
      // eslint-disable-next-line no-alert
      alert("Failed to delete item.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation */}
        <SideNavigation activeItemCount={lowStockItems.length} />

        {/* Main Content Area */}
        <main className="flex-1 ml-64 p-6 space-y-8">
          {/* Header */}
          <header className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Inventory</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome,{" "}
              <span className="font-medium text-gray-900 dark:text-gray-200">
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
              </span>
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Manage items (Name, SKU, Qty, Reorder Point, Category, Store Name, Store ID, Keywords)
            </p>
          </header>

      {/* Location Selector */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <label htmlFor="location-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Location:
        </label>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <select
            id="location-select"
            value={storeId || ""}
            onChange={(e) => {
              const selectedStoreId = e.target.value;
              if (selectedStoreId && setStore) {
                setStore(selectedStoreId);
              }
            }}
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {storeOptions.length === 0 ? (
              <option value="" disabled>
                {storeLoadError || "Loading stores..."}
              </option>
            ) : (
              <>
                <option value="">Select a location...</option>
                {storeOptions.map((s, index) => (
                  <option key={s.id} value={s.id}>
                    {s.id}{index === 0 ? " (Default)" : ""}
                  </option>
                ))}
              </>
            )}
          </select>
          {storeId && storeName && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Current location: <span className="font-semibold text-gray-900 dark:text-gray-100">{storeName}</span>
              </span>
              <span className="text-gray-500 dark:text-gray-500">({storeId})</span>
            </div>
          )}
        </div>
        {storeId && items.length > 0 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-semibold">{items.length}</span> item{items.length !== 1 ? "s" : ""} from this location
          </p>
        )}
        {storeId && items.length === 0 && !loading && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            No items found for this location
          </p>
        )}
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KPI label="Total Items" value={totals.totalItems} />
        <KPI label="Total Stock Qty" value={totals.totalQty} />
        <KPI label="Total Categories" value={totals.totalCategories} />
      </section>

      {/* Add / Edit form */}
      <section className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{editingId ? "Edit Item" : "Add New Item"}</h2>
          {storeName && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Store: <span className="font-medium">{storeName}</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Spritzer 550ml"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label htmlFor="sku" className="block text-sm mb-1">
              SKU
            </label>
            <input
              id="sku"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., SPR-550"
              autoComplete="off"
              required
            />
          </div>

          <div>
            <label htmlFor="qty" className="block text-sm mb-1">
              Qty
            </label>
            <input
              id="qty"
              name="qty"
              value={form.qty}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="0"
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
          </div>

          <div>
            <label htmlFor="reorderPoint" className="block text-sm mb-1">
              Reorder Point
            </label>
            <input
              id="reorderPoint"
              name="reorderPoint"
              value={form.reorderPoint}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="5"
              inputMode="numeric"
              pattern="[0-9]*"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm mb-1">
              Category
            </label>
            <input
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Beverages"
              autoComplete="off"
              required
            />
          </div>

          {!storeId && (
            <>
              <div>
                <label htmlFor="StoreId" className="block text-sm mb-1">
                  Store ID
                </label>
                {storeLoadError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                    Stores error: {storeLoadError}
                  </p>
                )}
                <select
                  id="StoreId"
                  name="StoreId"
                  value={form.StoreId}
                  onChange={(e) => handleSelectStore(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {storeOptions.length === 0 ? (
                    <option value="" disabled>
                      No stores found
                    </option>
                  ) : (
                    <>
                      <option value="">Select a store…</option>
                      {storeOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="StoreName" className="block text-sm mb-1">
                  Store Name
                </label>
                <input
                  id="StoreName"
                  name="StoreName"
                  value={form.StoreName}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  placeholder="Auto-filled"
                  autoComplete="off"
                  readOnly
                />
              </div>
            </>
          )}
          {storeId && (
            <>
              <div>
                <label htmlFor="StoreId" className="block text-sm mb-1">
                  Store ID
                </label>
                {storeLoadError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-1">
                    Stores error: {storeLoadError}
                  </p>
                )}
                <select
                  id="StoreId"
                  name="StoreId"
                  value={form.StoreId || storeId}
                  onChange={(e) => handleSelectStore(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {storeOptions.length === 0 ? (
                    <option value="" disabled>
                      No stores found
                    </option>
                  ) : (
                    <>
                      <option value={storeId}>
                        {storeId} (Default)
                      </option>
                      {storeOptions
                        .filter((s) => s.id !== storeId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.id}
                          </option>
                        ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="StoreName" className="block text-sm mb-1">
                  Store Name
                </label>
                <input
                  id="StoreName"
                  name="StoreName"
                  value={form.StoreName || storeName}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800"
                  placeholder="Auto-filled"
                  autoComplete="off"
                  readOnly
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="Keywords" className="block text-sm mb-1">
              Keywords
            </label>
            <input
              id="Keywords"
              name="Keywords"
              value={form.Keywords}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., water,bottle,drinks"
              autoComplete="off"
              required
            />
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-60"
            >
              {saving ? (editingId ? "Saving..." : "Adding...") : editingId ? "Save" : "Add"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                }}
                className="border border-gray-400 px-4 py-2 rounded hover:bg-gray-700 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Table */}
      <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg">Items</h2>
          <div className="text-sm text-gray-500">{items.length} total</div>
        </div>

        {loading ? (
          <div className="px-4 py-5 text-gray-600 dark:text-gray-400 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-5 text-gray-600 dark:text-gray-400 text-sm">No items yet.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* header */}
            <div className="grid grid-cols-9 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500">
              <div>Name</div>
              <div>SKU</div>
              <div>Qty</div>
              <div>Reorder</div>
              <div>Category</div>
              <div>Store Name</div>
              <div>Store ID</div>
              <div>Keywords</div>
              <div className="text-right">Actions</div>
            </div>

            {/* rows */}
            {items.map((it) => (
              <div key={it.id} className="grid grid-cols-9 gap-2 px-4 py-3 text-sm items-center">
                <div className="truncate">{it.name || "—"}</div>
                <div className="truncate">{it.sku || "—"}</div>
                <div>{Number(it.qty ?? 0)}</div>
                <div>{Number(it.reorderPoint ?? 0)}</div>
                <div className="truncate">{it.category || "—"}</div>
                <div className="truncate">{it.StoreName || "—"}</div>
                <div className="truncate">{it.StoreId || "—"}</div>
                <div className="truncate">
                  {Array.isArray(it.Keywords) ? it.Keywords.join(", ") : it.Keywords || "—"}
                </div>

                {/* actions */}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleEdit(it)}
                    className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(it.id)}
                    className="px-3 py-1 border rounded hover:bg-red-600 hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </main>
      </div>
    </div>
  );
}
