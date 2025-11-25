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
import { PageReady } from "../components/NProgressBar";
import { useStore } from "../contexts/StoreContext";
import LocationSelector from "../components/LocationSelector";
import TopNavigation from "../components/TopNavigation";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ type: "IN", itemId: "", qty: 1, note: "" });

  const txRef = collection(db, "transactions");
  const invRef = collection(db, "inventory");

  // realtime transactions - Both staff and admin see all transactions
  useEffect(() => {
    const q = query(txRef, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) =>
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // Filter transactions based on search
  const filteredTransactions = useMemo(() => {
    return filterItems(items, ["itemName", "note", "type"]);
  }, [items, filterItems]);

  // load inventory - Both staff and admin see all inventory from all stores
  // This allows staff to help customers find items at other locations
  useEffect(() => {
    return onSnapshot(invRef, (snap) => {
      const invItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCatalog(invItems);
      setInventory(invItems);
    });
  }, []);

  // Clear selected item when location changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, itemId: "" }));
  }, [storeId]);

  // Calculate low stock items for badge
  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD
      ),
    [inventory]
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

  // --- Last 7 Days summary ---
  const last7 = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const within7 = items.filter(
      (t) => t.createdAt?.toDate && t.createdAt.toDate() >= since
    );

    const inTx = within7.filter((t) => t.type === "IN");
    const outTx = within7.filter((t) => t.type === "OUT");

    const inQty = inTx.reduce((s, t) => s + Number(t.qty ?? 0), 0);
    const outQty = outTx.reduce((s, t) => s + Number(t.qty ?? 0), 0);
    const net = inQty - outQty;

    // per-item breakdown (carry id and name)
    const byItemMap = new Map();
    for (const t of within7) {
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
  }, [items]);

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
            activeItemCount={lowStockItems.length}
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

          {/* Last 7 Days Visual Summary */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 space-y-3">
            <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">📦 Last 7 Days Summary</h2>

            <div className="text-sm leading-relaxed">
              <p className="text-green-700 dark:text-green-400">
                + IN: <b>{last7.inQty}</b> units ({last7.inTx.length} transactions)
              </p>
              <p className="text-red-700 dark:text-red-400">
                – OUT: <b>{last7.outQty}</b> units ({last7.outTx.length} transactions)
              </p>
              <hr className="my-2 border-gray-300 dark:border-gray-700" />
              <p
                className={`font-medium ${last7.net >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                  }`}
              >
                {last7.net >= 0 ? "▲ Net Gain" : "▼ Net Loss"}:{" "}
                {last7.net > 0 ? "+" : ""}
                {last7.net} units
              </p>
            </div>

            {/* Per-item breakdown */}
            {last7.byItem.length > 0 && (
              <div className="mt-3 border-t border-gray-300 dark:border-gray-700 pt-3">
                <div className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Per Item</div>
                <div className="grid grid-cols-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700 pb-1">
                  <div>Item</div>
                  <div className="text-green-700 dark:text-green-400">IN Qty</div>
                  <div className="text-red-700 dark:text-red-400">OUT Qty</div>
                </div>
                {last7.byItem.map((it) => (
                  <div
                    key={it.id || it.name}
                    className="grid grid-cols-3 text-sm border-b border-gray-200 dark:border-gray-800 py-1"
                  >
                    <div className="truncate text-gray-900 dark:text-gray-100">
                      {displayNameById(it.id || it.name, it.name)}
                      <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">(current: {currentQtyByIdOrName(it.id, it.name)})</span>
                    </div>
                    <div className="text-green-700 dark:text-green-400">
                      ➕ {it.inQty} <span className="text-xs text-gray-600 dark:text-gray-400">IN</span>
                    </div>
                    <div className="text-red-700 dark:text-red-400">
                      ➖ {it.outQty} <span className="text-xs text-gray-600 dark:text-gray-400">OUT</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Selector */}
          <LocationSelector />

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
          <div className="border rounded">
            {/* Header row with search info and total count */}
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Transactions</h3>
                {hasSearch && (
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                    Searching: "{searchQuery}"
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {hasSearch ? (
                  <span>
                    {filteredTransactions.length} of {items.length}
                  </span>
                ) : (
                  <span>{items.length} total</span>
                )}
              </div>
            </div>

            {/* Table header row - aligned with data rows */}
            <div className="grid grid-cols-5 gap-2 px-3 py-2 border-b bg-gray-50 dark:bg-gray-800/50 font-semibold text-sm text-gray-700 dark:text-gray-300">
              <div>Time</div>
              <div>Type</div>
              <div>Item</div>
              <div>Qty</div>
              <div>Note</div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="px-3 py-4 text-center">
                {hasSearch ? (
                  <div className="text-gray-500">
                    <p className="text-sm mb-1">No transactions found matching "{searchQuery}"</p>
                    <p className="text-xs text-gray-400">Try a different search term</p>
                  </div>
                ) : (
                  <div className="text-gray-500">No transactions yet.</div>
                )}
              </div>
            ) : (
              filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-5 gap-2 px-3 py-2 border-b text-sm"
                >
                  <div>
                    {t.createdAt?.toDate
                      ? t.createdAt.toDate().toLocaleString()
                      : "—"}
                  </div>
                  <div
                    className={
                      t.type === "OUT"
                        ? "text-red-600 font-medium"
                        : "text-green-600 font-medium"
                    }
                  >
                    {t.type}
                  </div>
                  <div>
                    {displayNameById(t.itemId, t.itemName)}
                    {typeof t.balanceAfter === "number"
                      ? ` (stock after: ${t.balanceAfter})`
                      : ""}
                  </div>
                  <div>{t.qty}</div>
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
    </div>
  );
}
