// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../hooks/useRole";

// 👇 Progress bar stopper
import { PageReady } from "../components/NProgressBar";

const LOW_STOCK_THRESHOLD = 5; // tweak as needed

export default function Dashboard() {
  const { user } = useAuth();
  const { role } = useRole();

  // Realtime inventory state
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const invRef = collection(db, "inventory");
    const unsub = onSnapshot(invRef, (snap) => {
      setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ---------- KPIs (derived) ----------
  const totalItems = inventory.length;

  const totalCategories = useMemo(() => {
    const norm = (c) => (c || "Uncategorized").trim().toLowerCase();
    return new Set(inventory.map((it) => norm(it.category))).size;
  }, [inventory]);

  const totalQty = useMemo(
    () => inventory.reduce((sum, it) => sum + Number(it.qty ?? 0), 0),
    [inventory]
  );

  const lowStock = useMemo(
    () => inventory.filter((it) => Number(it.qty ?? 0) <= LOW_STOCK_THRESHOLD),
    [inventory]
  );

  return (
    <div className="p-6 space-y-8">
      {/* Stop top progress bar once page mounts */}
      <PageReady />

      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome,{" "}
          <span className="font-medium text-gray-900 dark:text-gray-200">
            {user?.email}
          </span>
        </p>
      </header>

  {/* KPI cards */}
  <section className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <KPI label="Total Items" value={totalItems} />
        <KPI label="Total Categories" value={totalCategories} />
        <KPI label="Total Stock Qty" value={totalQty} />
        <KPI
          label={`Low Stock (≤ ${LOW_STOCK_THRESHOLD})`}
          value={lowStock.length}
          pill={lowStock.length > 0 ? "warning" : "ok"}
        />
      </section>

      {/* Quick actions */}
      <section className="flex flex-wrap gap-4 mt-6">
        <Link
          to="/inventory"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition"
        >
          Manage Inventory
        </Link>

        {(role === "admin" || role === "staff") && (
          <Link
            to="/transactions"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition"
          >
            View Transactions
          </Link>
        )}

        <button
          onClick={() => signOut(auth)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg transition"
        >
          Sign out
        </button>
      </section>

      {/* Low stock table */}
      <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-lg">Low Stock (≤ {LOW_STOCK_THRESHOLD})</h2>
          <span
            className={`text-sm font-medium ${
              lowStock.length ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            }`}
          >
            {lowStock.length ? `${lowStock.length} item(s)` : "All good"}
          </span>
        </div>

        {lowStock.length === 0 ? (
          <div className="px-4 py-5 text-gray-600 dark:text-gray-400 text-sm">
            No items are low on stock.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {lowStock
              .sort((a, b) => Number(a.qty ?? 0) - Number(b.qty ?? 0))
              .map((it) => (
                <div
                  key={it.id}
                  className="grid grid-cols-3 gap-2 px-4 py-3 text-sm text-gray-900 dark:text-gray-200"
                >
                  <div className="font-medium truncate">{it.name || it.id}</div>
                  <div>Qty: {Number(it.qty ?? 0)}</div>
                  <div className="text-gray-500 dark:text-gray-400 truncate">
                    SKU: {it.sku || "—"}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Tiny KPI card component
function KPI({ label, value, pill }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
        {label}
        {pill === "warning" && (
          <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
            Attention
          </span>
        )}
        {pill === "ok" && (
          <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
            OK
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
