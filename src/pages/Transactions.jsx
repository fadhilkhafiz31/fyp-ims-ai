// src/pages/Transactions.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  runTransaction,
} from "firebase/firestore";
import * as motion from "motion/react-client";
import { db } from "../lib/firebase";
import { useRole } from "../hooks/useRole";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { PageReady } from "../components/NProgressBar";
import { useStore } from "../contexts/StoreContext";
import LocationSelector from "../components/LocationSelector";
import TopNavigation from "../components/TopNavigation";
import ChatbotPanel from "../components/ChatbotPanel";
import AnimatedBadge from "../components/ui/AnimatedBadge";
import AnimatedIcon from "../components/ui/AnimatedIcon";
import { useToast } from "../contexts/ToastContext";
import { useSearch } from "../contexts/SearchContext";

const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
import SideNavigation from "../components/SideNavigation";

// ============================================
// Main Component
// ============================================
export default function Transactions() {
  const { role } = useRole();
  const { storeId } = useStore();
  const { toast } = useToast();
  const { filterItems, searchQuery, hasSearch } = useSearch();
  const { globalLowStockCount } = useLowStockCount(storeId); // Pass storeId to filter by selected store
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ type: "IN", itemId: "", qty: 1, note: "" });
  const [transactionsError, setTransactionsError] = useState(null);
  const [inventoryError, setInventoryError] = useState(null);

  const txRef = collection(db, "transactions");
  const invRef = collection(db, "inventory");

  // realtime transactions - Both staff and admin see all transactions
  useEffect(() => {
    const q = query(txRef, orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setTransactionsError(null);
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error("Transactions query error:", error);
        setTransactionsError(error);
        // Show user-friendly error message
        if (error.code === "failed-precondition") {
          toast.error(
            "Firestore index missing. Please create the required index in Firebase Console."
          );
        } else if (error.code === "permission-denied") {
          toast.error("You don't have permission to view transactions.");
        } else {
          toast.error("Failed to load transactions. Please try again.");
        }
      }
    );
  }, []);

  // Filter transactions by location first
  const locationFilteredTransactions = useMemo(() => {
    if (!storeId) return [];
    return items.filter((t) => t && t.storeId === storeId);
  }, [items, storeId]);

  // Filter transactions based on location and search
  const filteredTransactions = useMemo(() => {
    return filterItems(locationFilteredTransactions, ["itemName", "note", "type"]);
  }, [locationFilteredTransactions, filterItems]);

  // load inventory - Both staff and admin see all inventory from all stores
  // This allows staff to help customers find items at other locations
  useEffect(() => {
    return onSnapshot(
      invRef,
      (snap) => {
        setInventoryError(null);
        const invItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCatalog(invItems);
        setInventory(invItems);
      },
      (error) => {
        console.error("Inventory query error:", error);
        setInventoryError(error);
        // Show user-friendly error message
        if (error.code === "permission-denied") {
          toast.error("You don't have permission to view inventory.");
        } else {
          toast.error("Failed to load inventory. Please try again.");
        }
      }
    );
  }, []);

  // Clear selected item when location changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, itemId: "" }));
  }, [storeId]);

  // Calculate low stock items for page display (filtered by selected store if applicable)
  // Note: For sidebar badge, we use globalLowStockCount from useLowStockCount hook
  const lowStockItems = useMemo(
    () => {
      let filtered = inventory.filter(
        (item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD
      );
      // If a store is selected, filter by that store for page display
      if (storeId) {
        filtered = filtered.filter((item) => item.storeId === storeId);
      }
      return filtered;
    },
    [inventory, storeId]
  );

  // Filter catalog by selected location
  const filteredCatalog = useMemo(() => {
    if (!storeId) return [];
    return catalog.filter((item) => item.storeId === storeId);
  }, [catalog, storeId]);

  // resolve display name with unit (store name not needed since we filter by location)
  const displayNameById = (id, fallbackName) => {
    const it = catalog.find((x) => x.id === id);
    if (!it) return fallbackName || id || "unknown";
    const base = it.name || fallbackName || id;
    const unit = it.unit || it.Unit || it.package || it.size || it.measure || it.UOM || it.uom;
    return unit ? `${base} ${unit}` : base;
  };

  // Format transaction timestamp (time first, then date)
  const formatTransactionTime = (timestamp) => {
    if (!timestamp) return "—";
    
    let date;
    if (timestamp?.toDate) {
      // Firestore Timestamp
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      // Regular Date object
      date = timestamp;
    } else if (typeof timestamp === "number" || typeof timestamp === "string") {
      // Unix timestamp or date string
      date = new Date(timestamp);
    } else {
      return "—";
    }

    // Check if date is valid
    if (isNaN(date.getTime())) return "—";

    // Format: HH:MM:SS AM/PM, MM/DD/YYYY
    const time = date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateStr = date.toLocaleString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    return `${time}, ${dateStr}`;
  };

  // --- Last 30 Days summary ---
  const last30 = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const within30 = locationFilteredTransactions.filter(
      (t) => t && t.createdAt?.toDate && t.createdAt.toDate() >= since
    );

    const inTx = within30.filter((t) => t && t.type === "IN");
    const outTx = within30.filter((t) => t && t.type === "OUT");

    const inQty = inTx.reduce((s, t) => s + Number(t?.qty ?? 0), 0);
    const outQty = outTx.reduce((s, t) => s + Number(t?.qty ?? 0), 0);
    const net = inQty - outQty;

    // per-item breakdown (carry id and name)
    const byItemMap = new Map();
    for (const t of within30) {
      if (!t) continue;
      const key = t.itemId || t.itemName || "unknown";
      const prev = byItemMap.get(key) || { id: t.itemId || null, name: t.itemName || key, inQty: 0, outQty: 0 };
      if (t.itemId && !prev.id) prev.id = t.itemId;
      if (t.itemName && !prev.name) prev.name = t.itemName;
      if (t.type === "IN") prev.inQty += Number(t.qty ?? 0);
      else if (t.type === "OUT") prev.outQty += Number(t.qty ?? 0);
      byItemMap.set(key, prev);
    }
    const byItem = Array.from(byItemMap.values()).sort(
      (a, b) => b.inQty + b.outQty - (a.inQty + a.outQty)
    );

    return { inTx, outTx, inQty, outQty, net, byItem };
  }, [locationFilteredTransactions]);

  const currentQtyByIdOrName = (id, name) => {
    let it = null;
    if (id) it = catalog.find((x) => x.id === id);
    if (!it && name) it = catalog.find((x) => (x.name || "").trim() === (name || "").trim());
    return Number(it?.qty ?? 0);
  };

  // transaction handler
  async function handleAdd(e) {
    e.preventDefault();
    if (!storeId) {
      toast.warning("Please select a location first");
      return;
    }
    if (!form.itemId) {
      toast.warning("Choose an item");
      return;
    }
    const delta = Number(form.qty);
    if (!Number.isFinite(delta) || delta <= 0) {
      toast.warning("Qty must be > 0");
      return;
    }

    const invDocRef = doc(db, "inventory", form.itemId);
    const txDocRef = doc(txRef);
    const type = form.type;

    try {
      await runTransaction(db, async (tx) => {
        const invSnap = await tx.get(invDocRef);
        if (!invSnap.exists()) throw new Error("Inventory item not found");

        const inv = invSnap.data();
        const currentQty = Number(inv.qty ?? 0);
        const nextQty = type === "IN" ? currentQty + delta : currentQty - delta;
        if (nextQty < 0) {
          throw new Error(`Not enough stock. Current: ${currentQty}, removing: ${delta}`);
        }

        tx.update(invDocRef, { qty: nextQty, updatedAt: serverTimestamp() });
        tx.set(txDocRef, {
          type,
          itemId: form.itemId,
          itemName: inv.name ?? null,
          storeId: inv.storeId || null, // Store the storeId for transaction tracking
          qty: delta,
          note: (form.note || "").trim() || null,
          createdAt: serverTimestamp(),
          balanceBefore: currentQty,
          balanceAfter: nextQty,
        });
      });

      setForm({ type: "IN", itemId: "", qty: 1, note: "" });
      toast.success("Transaction added successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to add transaction");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
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
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transactions</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome,{" "}
              <span className="font-medium text-gray-900 dark:text-gray-200">
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Select a location first, then log stock in/out for products at that location.
            </p>
          </header>

          {/* Location Selector */}
          <LocationSelector />

          {/* Last 30 Days Visual Summary */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">📦 Last 30 Days Summary</h2>

            <div className="text-sm leading-relaxed">
              <p className="text-green-700 dark:text-green-400">
                + IN: <b>{last30.inQty}</b> units ({last30.inTx.length} transactions)
              </p>
              <p className="text-red-700 dark:text-red-400">
                – OUT: <b>{last30.outQty}</b> units ({last30.outTx.length} transactions)
              </p>
              <hr className="my-2 border-gray-300 dark:border-gray-700" />
              <p
                className={`font-medium ${last30.net >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  }`}
              >
                {last30.net >= 0 ? "▲ Net Gain" : "▼ Net Loss"}:{" "}
                {last30.net > 0 ? "+" : ""}
                {last30.net} units
              </p>
            </div>

            {/* Per-item breakdown */}
            {last30.byItem.length > 0 && (
              <div className="mt-3 border-t border-gray-300 dark:border-gray-700 pt-3">
                <div className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Per Item</div>
                <div className="grid grid-cols-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 pb-1">
                  <div>Item</div>
                  <div className="text-green-700 dark:text-green-400">IN Qty</div>
                  <div className="text-red-700 dark:text-red-400">OUT Qty</div>
                </div>
                {last30.byItem
                  .filter((it) => it) // Filter out invalid items
                  .map((it) => (
                    <div
                      key={it.id || it.name || "unknown"}
                      className="grid grid-cols-3 text-sm border-b border-gray-200 dark:border-gray-800 py-1"
                    >
                      <div className="truncate text-gray-900 dark:text-gray-100">
                        {displayNameById(it.id || null, it.name || "Unknown Item")}
                        <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">(current: {currentQtyByIdOrName(it.id || null, it.name || null)})</span>
                      </div>
                      <div className="text-green-700 dark:text-green-400">
                        ➕ {it.inQty ?? 0} <span className="text-xs text-gray-600 dark:text-gray-400">IN</span>
                      </div>
                      <div className="text-red-700 dark:text-red-400">
                        ➖ {it.outQty ?? 0} <span className="text-xs text-gray-600 dark:text-gray-400">OUT</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Error Messages */}
          {transactionsError && (
            <div className="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 dark:text-red-400 font-semibold">⚠️ Error Loading Transactions</div>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                {transactionsError.code === "failed-precondition"
                  ? "A Firestore index is required. Please check the Firebase Console for index creation instructions."
                  : transactionsError.code === "permission-denied"
                  ? "You don't have permission to view transactions."
                  : transactionsError.message || "Failed to load transactions. Please refresh the page."}
              </p>
            </div>
          )}

          {inventoryError && (
            <div className="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-600 dark:text-red-400 font-semibold">⚠️ Error Loading Inventory</div>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                {inventoryError.code === "permission-denied"
                  ? "You don't have permission to view inventory."
                  : inventoryError.message || "Failed to load inventory. The item dropdown may not work correctly."}
              </p>
            </div>
          )}

          {/* Entry form */}
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              className="border rounded px-3 py-2"
              value={form.type}
              onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="IN">IN (add stock)</option>
              <option value="OUT">OUT (remove stock)</option>
            </select>

            <select
              className="border rounded px-3 py-2"
              value={form.itemId}
              onChange={(e) => setForm((s) => ({ ...s, itemId: e.target.value }))}
              disabled={!storeId}
            >
              <option value="">
                {storeId ? "Select item…" : "Please select a location first"}
              </option>
              {filteredCatalog
                .sort((a, b) => {
                  const nameA = (a.name || "").toLowerCase();
                  const nameB = (b.name || "").toLowerCase();
                  return nameA.localeCompare(nameB);
                })
                .map((it) => (
                  <option key={it.id} value={it.id}>
                    {displayNameById(it.id, it.name || it.title || it.id)}
                  </option>
                ))}
            </select>

            <input
              type="number"
              className="border rounded px-3 py-2"
              placeholder="Qty"
              value={form.qty}
              min={1}
              onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))}
            />

            <input
              className="border rounded px-3 py-2"
              placeholder="Note (optional)"
              value={form.note}
              onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
            />

            <button className="bg-black text-white rounded px-4 py-2">
              Add Transaction
            </button>
          </form>

          {/* Full transaction list */}
          <div className="border border-gray-200 dark:border-gray-700 rounded">
            {/* Header row with search info and total count */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Transactions</h3>
                {hasSearch && (
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                    Searching: "{searchQuery}"
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {!storeId ? (
                  <span>Select location to view transactions</span>
                ) : hasSearch ? (
                  <span>
                    {filteredTransactions.length} of {locationFilteredTransactions.length}
                  </span>
                ) : (
                  <span>{locationFilteredTransactions.length} transaction{locationFilteredTransactions.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>

            {/* Table header row - aligned with data rows */}
            <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b bg-gray-50 dark:bg-gray-800/50 font-semibold text-sm text-gray-700 dark:text-gray-300">
              <div>Item</div>
              <div className="text-center">Type</div>
              <div>Time</div>
              <div>Qty</div>
              <div>Note</div>
            </div>

            {transactionsError ? (
              <div className="px-3 py-4 text-center">
                <div className="text-red-600 dark:text-red-400">
                  <p className="text-sm mb-1 font-semibold">Unable to load transactions</p>
                  <p className="text-xs text-red-500 dark:text-red-500">
                    {transactionsError.code === "failed-precondition"
                      ? "Please create the required Firestore index."
                      : "Please check your connection and try again."}
                  </p>
                </div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="px-3 py-4 text-center">
                {!storeId ? (
                  <div className="text-gray-500">
                    <p className="text-sm mb-1">Please select a location to view transactions</p>
                    <p className="text-xs text-gray-400">Use the location selector above to filter transactions</p>
                  </div>
                ) : hasSearch ? (
                  <div className="text-gray-500">
                    <p className="text-sm mb-1">No transactions found matching "{searchQuery}"</p>
                    <p className="text-xs text-gray-400">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-gray-500">No transactions found for this location.</div>
                )}
              </div>
            ) : (
              filteredTransactions
                .filter((t) => t && t.id) // Filter out invalid transactions
                .map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-5 gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white"
                  >
                    <div>
                      {displayNameById(t.itemId || null, t.itemName || "Unknown Item")}
                      {typeof t.balanceAfter === "number"
                        ? ` (stock after: ${t.balanceAfter})`
                        : ""}
                    </div>
                    <div
                      className={
                        (t.type || "IN") === "OUT"
                          ? "text-red-600 dark:text-red-400 font-medium text-center"
                          : "text-green-600 dark:text-green-400 font-medium text-center"
                      }
                    >
                      {t.type || "IN"}
                    </div>
                    <div>
                      {formatTransactionTime(t.createdAt)}
                    </div>
                    <div>{t.qty ?? 0}</div>
                    <div className="truncate">
                      {t.note ||
                        (typeof t.balanceBefore === "number"
                          ? `prev: ${t.balanceBefore}`
                          : "—")}
                    </div>
                  </div>
                ))
            )}
          </div>
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
    </div>
  );
}
