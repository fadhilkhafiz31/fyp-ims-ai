// src/pages/DashboardAdmin.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";

import { auth, db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import ChatbotPanel from "../components/ChatbotPanel";
import { PageReady } from "../components/NProgressBar";

// ============================================
// Constants
// ============================================
const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
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

function LowStockTable({ lowStock }) {
  return (
    <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-lg">
          Low Stock (≤ {LOW_STOCK_THRESHOLD})
        </h2>
        <span
          className={`text-sm font-medium ${
            lowStock.length
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
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
            .map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-3 gap-2 px-4 py-3 text-sm text-gray-900 dark:text-gray-200"
              >
                <div className="font-medium truncate">{item.name || item.id}</div>
                <div>Qty: {Number(item.qty ?? 0)}</div>
                <div className="text-gray-500 dark:text-gray-400 truncate">
                  SKU: {item.sku || "—"}
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

function QuickActions({ lowStockCount }) {
  return (
    <section className="flex flex-wrap gap-4 mt-6">
      <Link
        to="/inventory"
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition"
      >
        Manage Inventory
      </Link>
      <Link
        to="/stock-notification"
        className="relative bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition"
      >
        Stock Notifications
        {lowStockCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {lowStockCount}
          </span>
        )}
      </Link>
      <Link
        to="/transactions"
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition"
      >
        View Transactions
      </Link>
      <button
        onClick={() => signOut(auth)}
        className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-lg transition"
      >
        Sign out
      </button>
    </section>
  );
}

// ============================================
// Main Component
// ============================================
export default function DashboardAdmin() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);

  // ============================================
  // Effects
  // ============================================
  useEffect(() => {
    const invRef = collection(db, "inventory");
    const unsubscribe = onSnapshot(invRef, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(items);
    });

    return () => unsubscribe();
  }, []);

  // ============================================
  // Computed Values
  // ============================================
  const totalItems = inventory.length;

  const totalCategories = useMemo(() => {
    const normalize = (category) => (category || "Uncategorized").trim().toLowerCase();
    const categories = new Set(inventory.map((item) => normalize(item.category)));
    return categories.size;
  }, [inventory]);

  const totalQty = useMemo(
    () => inventory.reduce((sum, item) => sum + Number(item.qty ?? 0), 0),
    [inventory]
  );

  const lowStock = useMemo(
    () =>
      inventory.filter((item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD),
    [inventory]
  );

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-6 space-y-8">
      <PageReady />

      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome, <span className="font-medium text-gray-900 dark:text-gray-200">{user?.displayName || "Administrator"}</span>
        </p>
      </header>

      {/* Quick Actions */}
      <QuickActions lowStockCount={lowStock.length} />

      {/* KPI Cards */}
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

      {/* Low Stock Table */}
      <LowStockTable lowStock={lowStock} />

      {/* Chatbot Assistant */}
      <div className="mt-6">
        <ChatbotPanel />
      </div>
    </div>
  );
}

