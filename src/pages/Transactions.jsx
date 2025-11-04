// src/pages/Transactions.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  runTransaction,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRole } from "../hooks/useRole";

export default function Transactions() {
  const { role } = useRole();
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
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

  // load inventory - Both staff and admin see all inventory from all stores
  // This allows staff to help customers find items at other locations
  useEffect(() => {
    return onSnapshot(invRef, (snap) =>
      setCatalog(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
  }, []);

  // resolve display name with unit and store name for clarity
  const displayNameById = (id, fallbackName) => {
    const it = catalog.find((x) => x.id === id);
    if (!it) return fallbackName || id || "unknown";
    const base = it.name || fallbackName || id;
    const unit = it.unit || it.Unit || it.package || it.size || it.measure || it.UOM || it.uom;
    const nameWithUnit = unit ? `${base} ${unit}` : base;
    
    // Always show store name to distinguish between items from different stores
    if (it.storeName) {
      return `${nameWithUnit} - ${it.storeName}`;
    }
    return nameWithUnit;
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
    if (!form.itemId) return alert("Choose an item");
    const delta = Number(form.qty);
    if (!Number.isFinite(delta) || delta <= 0) return alert("Qty must be > 0");

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
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add transaction");
    }
  }

  return (
    <div className="p-6 space-y-8">
      <header className="space-y-1">
        <div>
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome,{" "}
          <span className="font-medium text-gray-900 dark:text-gray-200">
            {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
          </span>
        </p>
        <p className="text-sm text-gray-500">
          Log stock in/out and view recent activity. Staff can see all items from all stores to help customers.
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
            className={`font-medium ${
              last7.net >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
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
        >
          <option value="">Select item…</option>
          {catalog
            .sort((a, b) => {
              // Sort by store name first, then by item name
              const storeA = (a.storeName || "").toLowerCase();
              const storeB = (b.storeName || "").toLowerCase();
              if (storeA !== storeB) return storeA.localeCompare(storeB);
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
        <div className="grid grid-cols-5 gap-2 font-semibold px-3 py-2 border-b">
          <div>Time</div>
          <div>Type</div>
          <div>Item</div>
          <div>Qty</div>
          <div>Note</div>
        </div>

        {items.length === 0 ? (
          <div className="px-3 py-4 text-gray-500">No transactions yet.</div>
        ) : (
          items.map((t) => (
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
    </div>
  );
}
