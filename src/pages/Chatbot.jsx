// src/pages/Chatbot.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import * as motion from "motion/react-client";

import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../hooks/useRole";
import { useStore } from "../contexts/StoreContext";
import { useDarkMode } from "../contexts/DarkModeContext";
import ChatbotPanel from "../components/ChatbotPanel";
import LocationSelector from "../components/LocationSelector";
import TopNavigation from "../components/TopNavigation";
import { PageReady } from "../components/NProgressBar";
import { useToast } from "../contexts/ToastContext";

// ============================================
// Constants
// ============================================
const LOW_STOCK_THRESHOLD = 5;

function SideNavigation({ activeItemCount, onClose, toast }) {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const isDashboardActive = location.pathname === "/dashboard";
  const isChatbotActive = location.pathname === "/chatbot";

  const menuItems = [
    { icon: "grid", label: "Dashboard", path: "/dashboard", active: isDashboardActive },
    { icon: "transaction", label: "Transaction", path: "/transactions" },
    { icon: "bell", label: "Stock Notification", path: "/stock-notification", badge: activeItemCount || 0 },
    { icon: "chatbot", label: "SmartStockAI Assistant", path: "/chatbot", active: isChatbotActive },
    { icon: "inventory", label: "Inventory", path: "/inventory" },
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h2>
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
                {getIcon(item.icon)}
                <span className="font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
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
export default function Chatbot() {
  const { user } = useAuth();
  const { role, ready: roleReady } = useRole();
  const { storeId } = useStore();
  const { toast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);

  // ============================================
  // Effects
  // ============================================
  useEffect(() => {
    if (!roleReady) {
      return;
    }

    if (role === "guest" || !storeId) {
      setInventory([]);
      return;
    }

    const baseRef = collection(db, "inventory");
    const storeScopedRef = query(
      baseRef,
      where("storeId", "==", storeId)
    );

    const unsubscribe = onSnapshot(storeScopedRef, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(items);
    });

    return () => unsubscribe();
  }, [role, roleReady, storeId]);

  // ============================================
  // Computed Values
  // ============================================
  const lowStockItems = useMemo(
    () =>
      inventory.filter(
        (item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD
      ),
    [inventory]
  );

  // ============================================
  // Render
  // ============================================
  // Wait for role to be ready before rendering
  if (!roleReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <PageReady />
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }
  
  const isRestricted = role === "guest" || role === "customer";
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation role={role} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation - Only show for admin/staff */}
        {!isRestricted && sidebarOpen && (
          <SideNavigation
            activeItemCount={lowStockItems.length}
            onClose={() => setSidebarOpen(false)}
            toast={toast}
          />
        )}

        {/* Main Content Area */}
        <main
          className={`flex-1 ${isRestricted ? "p-6" : sidebarOpen ? "ml-64 p-6" : "p-6"} flex flex-col min-h-[calc(100vh-4rem)]`}
        >
          {/* Location Selector - Show for guests and authenticated users */}
          {isRestricted && (
            <div className="mb-6">
              <LocationSelector />
            </div>
          )}
          
          {/* Chatbot Section */}
          <section className="flex-1 flex flex-col gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">SmartStockAI Assistant</h2>
            </div>
            <div className="flex-1 min-h-0">
              <ChatbotPanel fullHeight />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

