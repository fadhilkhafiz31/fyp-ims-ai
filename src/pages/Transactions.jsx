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

const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
function SideNavigation({ activeItemCount, onClose }) {
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
    { icon: "logout", label: "Log Out", path: "/login" },
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
      logout: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4-4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12H9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16v1a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h3a3 3 0 013 3v1" />
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
    <motion.aside
      className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-4rem)] overflow-y-auto fixed left-0 top-16 z-40"
      initial={{ x: -256, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -256, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
    >
      <nav className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <motion.ul
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
        >
          {menuItems.map((item, index) => (
            <motion.li
              key={`${item.icon}-${item.label}-${index}`}
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 }
              }}
              transition={{ duration: 0.3 }}
            >
              <Link
                to={item.path}
                onClick={(e) => handleMockClick(e, item)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  item.active
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <AnimatedIcon hoverRotate={item.icon === "gear"} hoverScale={true}>
                  {getIcon(item.icon)}
                </AnimatedIcon>
                <span className="font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <AnimatedBadge count={item.badge} />
                )}
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </nav>
    </motion.aside>
  );
}

// ============================================
// Main Component
// ============================================
export default function Transactions() {
  const { role } = useRole();
  const { storeId } = useStore();
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
    if (!storeId) return alert("Please select a location first");
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
        </main>
      </div>
    </div>
  );
}
