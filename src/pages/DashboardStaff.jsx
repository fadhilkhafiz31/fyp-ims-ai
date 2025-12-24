// src/pages/DashboardStaff.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import * as motion from "motion/react-client";

import { auth, db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { useStore } from "../contexts/StoreContext";
import ChatbotPanel from "../components/ChatbotPanel";
import LocationSelector from "../components/LocationSelector";
import { PageReady } from "../components/NProgressBar";
import TopNavigation from "../components/TopNavigation";
import AnimatedBadge from "../components/ui/AnimatedBadge";
import AnimatedIcon from "../components/ui/AnimatedIcon";
import { useToast } from "../contexts/ToastContext";

// ============================================
// Constants
// ============================================
const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
function SideNavigation({ activeItemCount, onClose, toast }) {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const isDashboardActive = location.pathname === "/dashboard";
  const isTransactionsActive = location.pathname === "/transactions";
  const isInventoryActive = location.pathname === "/inventory";
  const isChatbotActive = location.pathname === "/chatbot";

  const menuItems = [
    { icon: "grid", label: "Dashboard", path: "/dashboard", active: isDashboardActive },
    { icon: "transaction", label: "Transaction", path: "/transactions", active: isTransactionsActive },
    { icon: "checkout", label: "Checkout", path: "/checkout" },
    { icon: "bell", label: "Stock Notification", path: "/stock-notification", badge: activeItemCount || 0 },
    { icon: "chatbot", label: "SmartStockAI Assistant", path: "/chatbot", active: isChatbotActive },
    { icon: "inventory", label: "Inventory", path: "/inventory", active: isInventoryActive },
    { icon: "user", label: "My Profile", path: "/staff-profile" },
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
      checkout: (
        <span className="text-xl">🛒</span>
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
      toast.info(`${item.label} - Coming soon!`);
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
          <div className="flex items-center gap-3">
            {/* Dark Mode Button */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="text-xl">
                {isDarkMode ? '☀️' : '🌙'}
              </span>
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Staff Dashboard</h2>
          </div>
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

function KPI({ label, value, pill, index = 0 }) {
  return (
    <motion.div
      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900"
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ scale: 1.02, y: -2 }}
      style={{ willChange: 'transform, opacity' }}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
        {label}
        {pill === "warning" && (
          <motion.span
            className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
          >
            Attention
          </motion.span>
        )}
        {pill === "ok" && (
          <motion.span
            className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
          >
            OK
          </motion.span>
        )}
      </div>
      <motion.div
        className="text-2xl font-semibold mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.2 }}
      >
        {value}
      </motion.div>
    </motion.div>
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

function QuickActions() {
  return (
    <section className="flex flex-wrap gap-4 mt-6">
      <Link
        to="/inventory"
        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition"
      >
        Manage Inventory
      </Link>
      <Link
        to="/transactions"
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition"
      >
        View Transactions
      </Link>
    </section>
  );
}

// ============================================
// Main Component
// ============================================
export default function DashboardStaff() {
  const { user } = useAuth();
  const { storeId, storeName } = useStore();
  const { toast } = useToast();
  const { globalLowStockCount } = useLowStockCount(); // Use shared hook for consistent count
  const [inventory, setInventory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);

  // ============================================
  // Effects
  // ============================================
  useEffect(() => {
    if (!storeId) {
      setInventory([]);
      return;
    }

    const invRef = query(
      collection(db, "inventory"),
      where("storeId", "==", storeId)
    );
    const unsubscribe = onSnapshot(invRef, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(items);
    });

    return () => unsubscribe();
  }, [storeId]);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopNavigation role="staff" onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex">
        {sidebarOpen && (
          <SideNavigation
            activeItemCount={globalLowStockCount}
            onClose={() => setSidebarOpen(false)}
            toast={toast}
          />
        )}

        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6 space-y-8`}>
          <PageReady />

          {/* Header */}
          <header className="space-y-1">
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome, <span className="font-medium text-gray-900 dark:text-gray-200">{user?.displayName || "Staff"}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {storeName ? `Currently viewing: ${storeName}` : "Select a location to view its inventory."}
            </p>
          </header>

          <section>
            <LocationSelector label="Select location to view inventory:" />
            {!storeId && (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                Choose a location to load metrics below.
              </p>
            )}
          </section>

          {/* Quick Actions */}
          <QuickActions />

          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <KPI label="Total Items" value={totalItems} index={0} />
            <KPI label="Total Categories" value={totalCategories} index={1} />
            <KPI label="Total Stock Qty" value={totalQty} index={2} />
            <KPI
              label={`Low Stock (≤ ${LOW_STOCK_THRESHOLD})`}
              value={lowStock.length}
              pill={lowStock.length > 0 ? "warning" : "ok"}
              index={3}
            />
          </section>

          {/* Low Stock Table */}
          <LowStockTable lowStock={lowStock} />
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

