// src/pages/StockNotification.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { PageReady } from "../components/NProgressBar";

// ============================================
// Constants
// ============================================
const OUT_OF_STOCK_THRESHOLD = 0;

// ============================================
// Helper Components
// ============================================
function OutOfStockCard({ item }) {
  return (
    <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow">
      {/* Alert badge */}
      <div className="absolute top-3 left-3">
        <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>

      {/* Image placeholder */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1 w-24 h-24 opacity-30">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-400 dark:bg-gray-600 rounded"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 truncate">
          {item.name}
        </h3>
        {item.sku && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            SKU: {item.sku}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-red-600 dark:text-red-400 font-medium text-sm">
            Out of stock
          </span>
          {item.qty !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Qty: {item.qty}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationSelector({ selectedLocation, onLocationChange }) {
  const locations = useMemo(() => {
    const locs = new Set();
    // TODO: Add locations from inventory or settings
    locs.add("99 Speedmart Acacia, Nilai");
    return Array.from(locs);
  }, []);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400"
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
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Choose Location:
        </span>
      </div>
      <select
        value={selectedLocation}
        onChange={(e) => onLocationChange(e.target.value)}
        className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================
// Main Component
// ============================================
export default function StockNotification() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(
    "99 Speedmart Acacia, Nilai"
  );

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
  const outOfStockItems = useMemo(
    () =>
      inventory.filter(
        (item) => Number(item.qty ?? 0) <= OUT_OF_STOCK_THRESHOLD
      ),
    [inventory]
  );

  // ============================================
  // Render
  // ============================================
  return (
    <div className="p-6 space-y-6">
      <PageReady />

      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Notification</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Items requiring restocking
          </p>
        </div>
        <Link
          to="/dashboard"
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition"
        >
          ← Back to Dashboard
        </Link>
      </header>

      {/* Location Selector */}
      <LocationSelector
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
      />

      {/* Out of Stock Items Grid */}
      <section className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">SmartStockAI 1.5</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {outOfStockItems.length} item(s) out of stock
              </p>
            </div>
          </div>
        </div>

        {outOfStockItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-green-100 dark:bg-green-900/40 rounded-full mb-4">
              <svg
                className="w-12 h-12 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              All Items In Stock
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No items require restocking at this time.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {outOfStockItems.map((item) => (
                <OutOfStockCard key={item.id} item={item} />
              ))}
            </div>

            {/* Alert Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => {
                  alert(
                    `Notifying supplier to restock ${outOfStockItems.length} item(s).`
                  );
                  // TODO: Implement actual supplier notification functionality
                }}
                className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-lg transition-colors transform hover:scale-105"
              >
                Click to alert Supplier for restock
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

