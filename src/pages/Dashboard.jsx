// src/pages/Dashboard.jsx
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useRole } from "../hooks/useRole";

// 👇 Add this import
import { PageReady } from "../components/NProgressBar";

export default function Dashboard() {
  const { user } = useAuth();
  const { role } = useRole();

  // 👇 inventory state
  const [inventory, setInventory] = useState([]);
  const LOW_STOCK_THRESHOLD = 5; // tweak as you like

  useEffect(() => {
    const invRef = collection(db, "inventory");
    const unsub = onSnapshot(invRef, (snap) => {
      setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // KPIs
  const totalItems = inventory.length;
  const totalQty = useMemo(
    () => inventory.reduce((sum, it) => sum + Number(it.qty ?? 0), 0),
    [inventory]
  );
  const lowStock = useMemo(
    () => inventory.filter((it) => Number(it.qty ?? 0) <= LOW_STOCK_THRESHOLD),
    [inventory]
  );

  return (
    <div className="p-6 space-y-6">
      {/* 👇 Stop top progress bar once page mounts */}
      <PageReady />

      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p>Welcome, {user?.displayName || user?.email}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI label="Total Items" value={totalItems} />
        <KPI label="Total Stock" value={totalQty} />
        <KPI
          label="Low Stock"
          value={lowStock.length}
          pill={lowStock.length > 0 ? "warning" : "ok"}
        />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mt-4">
  <Link
    to="/inventory"
    className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
  >
    Manage Inventory
  </Link>

  {/* Only admin or staff can see the transactions button */}
  {(role === "admin" || role === "staff") && (
    <Link
      to="/transactions"
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      View Transactions
    </Link>
  )}

  <button
    onClick={() => signOut(auth)}
    className="border border-gray-400 px-4 py-2 rounded hover:bg-gray-700 hover:text-white"
  >
    Sign out
  </button>
</div>


      {/* Low stock table */}
      <div className="border rounded">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-semibold">
            Low Stock (≤ {LOW_STOCK_THRESHOLD})
          </div>
          <div
            className={`text-sm ${
              lowStock.length ? "text-red-600" : "text-green-600"
            }`}
          >
            {lowStock.length ? `${lowStock.length} items` : "All good"}
          </div>
        </div>

        {lowStock.length === 0 ? (
          <div className="px-3 py-4 text-gray-500">
            No items are low on stock.
          </div>
        ) : (
          <div className="divide-y">
            {lowStock
              .sort((a, b) => Number(a.qty ?? 0) - Number(b.qty ?? 0))
              .map((it) => (
                <div key={it.id} className="grid grid-cols-3 gap-2 px-3 py-2">
                  <div className="font-medium truncate">
                    {it.name || it.id}
                  </div>
                  <div>Qty: {Number(it.qty ?? 0)}</div>
                  <div className="text-sm text-gray-500 truncate">
                    SKU: {it.sku || "—"}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tiny KPI card component
function KPI({ label, value, pill }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-500 flex items-center gap-2">
        {label}
        {pill === "warning" && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            Attention
          </span>
        )}
        {pill === "ok" && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            OK
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
