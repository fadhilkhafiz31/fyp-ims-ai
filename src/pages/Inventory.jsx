// src/pages/Inventory.jsx
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
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
import * as motion from "motion/react-client";
import { db } from "../lib/firebase";
import TopNavigation from "../components/TopNavigation";
import ChatbotPanel from "../components/ChatbotPanel";
import { PageReady } from "../components/NProgressBar";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { useRole } from "../hooks/useRole";
import { useStore } from "../contexts/StoreContext";
import { SkeletonTableRow, SkeletonKPI } from "../components/ui/SkeletonLoader";
import { EnhancedSpinner } from "../components/ui/EnhancedSpinner";
import AnimatedBadge from "../components/ui/AnimatedBadge";
import AnimatedIcon from "../components/ui/AnimatedIcon";
import { useToast } from "../contexts/ToastContext";
import { useSearch } from "../contexts/SearchContext";
import CopyInventory from "../components/CopyInventory";
import MotionWrapper from "../components/MotionWrapper";
import ScrollReveal from "../components/ScrollReveal";

const INVENTORY_COL = "inventory";
const LOW_STOCK_THRESHOLD = 5;

const formatTimestamp = (ts) => {
  if (!ts) return "—";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function KPI({ label, value }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

import SideNavigation from "../components/SideNavigation";

// ============================================
// Main Component
// ============================================
export default function Inventory() {
  const { role, ready: roleReady } = useRole();
  const { storeId, storeName, setStore, stores } = useStore();
  const { toast } = useToast();
  const { searchQuery, filterItems, hasSearch } = useSearch();
  const { globalLowStockCount } = useLowStockCount(storeId); // Pass storeId to filter by selected store
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);

  const defaultFormState = {
    name: "",
    sku: "",
    qty: "",
    reorderPoint: "5",
    category: "",
    price: "",
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
  const [highlightedItems, setHighlightedItems] = useState(new Set());

  // ---- realtime subscription ----
  useEffect(() => {
    if (!storeId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // eslint-disable-next-line no-console
    console.log("Inventory: Loading items for storeId:", storeId);
    let cleanup = () => { };

    // Try query with orderBy first (requires composite index)
    const qRef = query(
      collection(db, INVENTORY_COL),
      where("storeId", "==", storeId),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const itemsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // eslint-disable-next-line no-console
        console.log(`Inventory: Loaded ${itemsData.length} items for storeId: ${storeId}`);

        // Highlight newly added or updated items
        if (items.length > 0) {
          const newItemIds = new Set(itemsData.map(item => item.id));
          const oldItemIds = new Set(items.map(item => item.id));
          const changedItems = new Set();

          // Find new items
          newItemIds.forEach(id => {
            if (!oldItemIds.has(id)) {
              changedItems.add(id);
            }
          });

          // Find updated items (compare timestamps)
          itemsData.forEach(newItem => {
            const oldItem = items.find(item => item.id === newItem.id);
            if (oldItem && newItem.updatedAt?.toMillis?.() > oldItem.updatedAt?.toMillis?.()) {
              changedItems.add(newItem.id);
            }
          });

          if (changedItems.size > 0) {
            setHighlightedItems(changedItems);
            // Remove highlight after 2 seconds
            setTimeout(() => {
              setHighlightedItems(new Set());
            }, 2000);
          }
        }

        setItems(itemsData);
        setLoading(false);
      },
      (err) => {
        // If composite index error, try without orderBy (this is expected and handled gracefully)
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          // eslint-disable-next-line no-console
          console.warn("Composite index missing, falling back to query without orderBy. To fix: create the index at the link provided in the error, or the app will continue using the fallback query.");
          const fallbackRef = query(
            collection(db, INVENTORY_COL),
            where("storeId", "==", storeId)
          );

          const fallbackUnsub = onSnapshot(
            fallbackRef,
            (snap) => {
              const itemsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
              // Sort manually by updatedAt
              itemsData.sort((a, b) => {
                const aTime = a.updatedAt?.toMillis?.() || 0;
                const bTime = b.updatedAt?.toMillis?.() || 0;
                return bTime - aTime;
              });
              // eslint-disable-next-line no-console
              console.log(`Inventory: Loaded ${itemsData.length} items (fallback) for storeId: ${storeId}`);

              // Highlight newly added or updated items
              if (items.length > 0) {
                const newItemIds = new Set(itemsData.map(item => item.id));
                const oldItemIds = new Set(items.map(item => item.id));
                const changedItems = new Set();

                // Find new items
                newItemIds.forEach(id => {
                  if (!oldItemIds.has(id)) {
                    changedItems.add(id);
                  }
                });

                // Find updated items (compare timestamps)
                itemsData.forEach(newItem => {
                  const oldItem = items.find(item => item.id === newItem.id);
                  if (oldItem && newItem.updatedAt?.toMillis?.() > oldItem.updatedAt?.toMillis?.()) {
                    changedItems.add(newItem.id);
                  }
                });

                if (changedItems.size > 0) {
                  setHighlightedItems(changedItems);
                  // Remove highlight after 2 seconds
                  setTimeout(() => {
                    setHighlightedItems(new Set());
                  }, 2000);
                }
              }

              setItems(itemsData);
              setLoading(false);
            },
            (fallbackErr) => {
              // eslint-disable-next-line no-console
              console.error("Fallback query error:", fallbackErr);
              setItems([]);
              setLoading(false);
            }
          );
          cleanup = () => fallbackUnsub();
        } else {
          // Only log as error if it's not an expected index error
          // eslint-disable-next-line no-console
          console.error("onSnapshot error:", err);
          setItems([]);
          setLoading(false);
        }
      }
    );

    return () => {
      unsub();
      cleanup();
    };
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

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    return filterItems(items, ["name", "sku", "category", "Keywords"]);
  }, [items, filterItems]);

  // Calculate low stock items for badge (from filtered items)
  const lowStockItems = useMemo(
    () =>
      filteredItems.filter(
        (item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD
      ),
    [filteredItems]
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

    // Allow decimals for price (e.g., 10.50, 0.99)
    if (name === "price") {
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
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
      toast.error(errs.join("\n"));
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
      price: form.price ? Number(form.price) : null, // Price in RM (can be decimal)
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
      toast.success(editingId ? "Item updated successfully!" : "Item added successfully!");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("save error:", err);
      toast.error("Failed to save item. Please try again.");
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
      price: it.price ? String(it.price) : "",
      StoreId: it.storeId || it.StoreId || "",
      StoreName: it.storeName || it.StoreName || "",
      Keywords: Array.isArray(it.Keywords) ? it.Keywords.join(", ") : it.Keywords || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteDoc(doc(db, INVENTORY_COL, id));
      toast.success("Item deleted successfully!");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("delete error:", err);
      toast.error("Failed to delete item. Please try again.");
    }
  };

  if (!roleReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <PageReady />
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  if (role !== "admin" && role !== "staff") {
    return <Navigate to="/chatbot" replace />;
  }

  return (
    <MotionWrapper className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation role={role} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation */}
        {sidebarOpen && (
          <SideNavigation
            activeItemCount={globalLowStockCount}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6 space-y-8`}>
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
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="location-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Location:
              </label>
              <CopyInventory />
            </div>
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
                    {storeLoadError ? "No stores available. Please contact administrator." : "Loading stores..."}
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
            {loading ? (
              <>
                <SkeletonKPI />
                <SkeletonKPI />
                <SkeletonKPI />
              </>
            ) : (
              <>
                <ScrollReveal delay={0.1}>
                  <KPI label="Total Items" value={totals.totalItems} />
                </ScrollReveal>
                <ScrollReveal delay={0.2}>
                  <KPI label="Total Stock Qty" value={totals.totalQty} />
                </ScrollReveal>
                <ScrollReveal delay={0.3}>
                  <KPI label="Total Categories" value={totals.totalCategories} />
                </ScrollReveal>
              </>
            )}
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
                <label htmlFor="name" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <motion.input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none transition-colors"
                  placeholder="e.g., Spritzer 550ml"
                  autoComplete="off"
                  required
                  whileFocus={{
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div>
                <label htmlFor="sku" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  SKU
                </label>
                <motion.input
                  id="sku"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none transition-colors"
                  placeholder="e.g., SPR-550"
                  autoComplete="off"
                  required
                  whileFocus={{
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div>
                <label htmlFor="qty" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  Qty
                </label>
                <motion.input
                  id="qty"
                  name="qty"
                  value={form.qty}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none transition-colors"
                  placeholder="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  whileFocus={{
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div>
                <label htmlFor="reorderPoint" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  Reorder Point
                </label>
                <motion.input
                  id="reorderPoint"
                  name="reorderPoint"
                  value={form.reorderPoint}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none transition-colors"
                  placeholder="5"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  whileFocus={{
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <motion.input
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none transition-colors"
                  placeholder="e.g., Beverages"
                  autoComplete="off"
                  required
                  whileFocus={{
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              {!storeId && (
                <>
                  <div>
                    <label htmlFor="StoreId" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
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
                    <label htmlFor="StoreName" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                      Store Name
                    </label>
                    <input
                      id="StoreName"
                      name="StoreName"
                      value={form.StoreName}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
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
                    <label htmlFor="StoreId" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
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
                    <label htmlFor="StoreName" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                      Store Name
                    </label>
                    <input
                      id="StoreName"
                      name="StoreName"
                      value={form.StoreName || storeName}
                      onChange={handleChange}
                      className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                      placeholder="Auto-filled"
                      autoComplete="off"
                      readOnly
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="Keywords" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  Keywords
                </label>
                <motion.input
                  id="Keywords"
                  name="Keywords"
                  value={form.Keywords}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none transition-colors"
                  placeholder="e.g., water,bottle,drinks"
                  autoComplete="off"
                  required
                  whileFocus={{
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">
                  Selling Price (RM)
                </label>
                <motion.input
                  id="price"
                  name="price"
                  type="text"
                  value={form.price}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none transition-colors"
                  placeholder="e.g., 2.50"
                  inputMode="decimal"
                  autoComplete="off"
                  whileFocus={{
                    borderColor: "#3b82f6",
                    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                  }}
                  transition={{ duration: 0.2 }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Unit selling price - customers can inquire about this price via chatbot
                </p>
              </div>

              <div className="flex items-end gap-3">
                <motion.button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-60 flex items-center gap-2"
                  whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {saving && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {saving ? (editingId ? "Saving..." : "Adding...") : editingId ? "Save" : "Add"}
                </motion.button>

                {editingId && (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      resetForm();
                    }}
                    className="border border-gray-400 dark:border-gray-500 px-4 py-2 rounded hover:bg-gray-700 hover:text-white dark:text-gray-200 dark:hover:bg-gray-600 text-gray-900"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    Cancel
                  </motion.button>
                )}
              </div>
            </form>
          </section>

          {/* Table */}
          <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-lg">Items</h2>
                {hasSearch && (
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                    Searching: "{searchQuery}"
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {hasSearch ? (
                  <span>
                    {filteredItems.length} of {items.length} items
                  </span>
                ) : (
                  <span>{items.length} total</span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="px-4 py-5 text-center">
                {hasSearch ? (
                  <div className="text-gray-600 dark:text-gray-300">
                    <p className="text-sm mb-2">No items found matching "{searchQuery}"</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-gray-600 dark:text-gray-300 text-sm">No items yet.</div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="divide-y divide-gray-200 dark:divide-gray-700 min-w-[1000px]">
                  {/* header */}
                  <div className="grid grid-cols-9 gap-2 px-4 py-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  <div>Name</div>
                  <div>SKU</div>
                  <div>Qty</div>
                  <div>Category</div>
                  <div>Reorder</div>
                  <div>Store Name</div>
                  <div>Price (RM)</div>
                  <div>Keywords</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* rows */}
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.03
                      }
                    }
                  }}
                >
                  {filteredItems.map((it, index) => {
                    const isHighlighted = highlightedItems.has(it.id);
                    return (
                      <motion.div
                        key={it.id}
                        className="grid grid-cols-9 gap-2 px-4 py-3 text-sm items-center text-gray-900 dark:text-white"
                        variants={{
                          hidden: { opacity: 0, x: -20, backgroundColor: "rgba(0,0,0,0)" },
                          visible: { opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" },
                          highlighted: { opacity: 1, x: 0, backgroundColor: "rgba(59, 130, 246, 0.1)" }
                        }}
                        initial="hidden"
                        animate={isHighlighted ? "highlighted" : "visible"}
                        transition={{
                          duration: 0.3,
                          ease: "easeOut"
                        }}
                        whileHover={{
                          backgroundColor: "rgba(0, 0, 0, 0.02)",
                          transition: { duration: 0.2 }
                        }}
                        style={{ willChange: 'transform, opacity' }}
                      >
                        <div
                          className="break-words whitespace-normal text-sm leading-tight"
                          title={it.name || undefined}
                        >
                          {it.name || "—"}
                        </div>
                        <div className="truncate">{it.sku || "—"}</div>
                        <div>{Number(it.qty ?? 0)}</div>
                        <div
                          className="break-words whitespace-normal text-sm leading-tight"
                          title={it.category || undefined}
                        >
                          {it.category || "—"}
                        </div>
                        <div>{Number(it.reorderPoint ?? 0)}</div>
                        <div
                          className="break-words whitespace-normal text-sm leading-tight"
                          title={it.storeName || it.StoreName || undefined}
                        >
                          {it.storeName || it.StoreName || "—"}
                        </div>
                        <div className="font-medium">
                          {it.price !== null && it.price !== undefined ? `RM ${Number(it.price).toFixed(2)}` : "—"}
                        </div>
                        <div className="truncate">
                          {Array.isArray(it.Keywords) ? it.Keywords.join(", ") : it.Keywords || "—"}
                        </div>

                        {/* actions */}
                        <div className="flex gap-2 justify-end">
                          <motion.button
                            type="button"
                            onClick={() => handleEdit(it)}
                            className="px-3 py-1 border border-blue-500 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-600 hover:text-white transition-colors"
                            whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            Edit
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => handleDelete(it.id)}
                            className="px-3 py-1 border border-red-500 text-red-600 dark:text-red-400 rounded hover:bg-red-600 hover:text-white transition-colors"
                            whileHover={{ scale: 1.05, boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            Delete
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Floating Chat Widget */}
      {chatWidgetOpen ? (
        <motion.div
          className="fixed bottom-4 right-4 z-50 w-96 h-[600px] shadow-2xl"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <ChatbotPanel fullHeight={true} />
          <button
            onClick={() => setChatWidgetOpen(false)}
            className="absolute top-2 right-2 p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Minimize chat"
            title="Minimize chat"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      ) : (
        <motion.button
          onClick={() => setChatWidgetOpen(true)}
          className="fixed bottom-4 right-4 z-50 w-16 h-16 bg-[#0F5132] hover:bg-[#0d4528] text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          aria-label="Open chat"
          title="Open SmartStockAI Assistant"
        >
          <span className="text-2xl">🤖</span>
        </motion.button>
      )}
    </MotionWrapper>
  );
}
