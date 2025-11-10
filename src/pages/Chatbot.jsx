// src/pages/Chatbot.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";

import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../hooks/useRole";
import { useStore } from "../contexts/StoreContext";
import ChatbotPanel from "../components/ChatbotPanel";
import LocationSelector from "../components/LocationSelector";
import { PageReady } from "../components/NProgressBar";

// ============================================
// Constants
// ============================================
const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
function TopNavigation({ isGuest = false }) {
  return (
    <nav className="w-full bg-[#2E6A4E] border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="flex items-center h-16">
        {/* Left: SmartStockAI Logo - Absolute left corner */}
        <div className="flex items-center pl-2">
          <img
            src="/Smart Stock AI (1).png"
            alt="SmartStockAI Logo"
            className="h-10 w-auto bg-transparent object-contain"
            style={{ mixBlendMode: 'normal' }}
          />
        </div>

        {/* Center and Right content */}
        <div className="flex-1 flex items-center justify-between max-w-7xl mx-auto pr-4 sm:pr-6 lg:px-8">

          {/* Center: Search Bar */}
          <div className="hidden xl:flex flex-1 max-w-lg mx-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for an item from nearby location"
                className="w-full pl-10 pr-4 py-2 border border-green-400/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-green-100/70 focus:ring-2 focus:ring-green-300 focus:border-transparent focus:bg-white/20"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-green-100"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Right: Store Info, Icons and Menu */}
          <div className="flex items-center gap-3">
            {/* 99 Speedmart Logo */}
            <div className="hidden md:flex items-center border-r border-green-400/30 pr-4">
              <img 
                src="/99speedmart logo.png" 
                alt="99 Speedmart Logo" 
                className="h-8 w-auto"
              />
            </div>

            {/* Location - Hide for guests (they use LocationSelector instead) */}
            {!isGuest && (
              <div className="hidden lg:flex items-center gap-2 text-sm border-r border-green-400/30 pr-4">
                <svg
                  className="w-5 h-5 text-red-300"
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
                <span className="text-white">
                  99 Speedmart Acacia, Nilai
                </span>
              </div>
            )}

            {/* Icons - Hide admin/staff features for guests */}
            {!isGuest && (
              <>
                <Link to="/chatbot" className="p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition text-xl bg-green-700/40">
                  🤖
                </Link>
                <button className="p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
                <Link to="/stock-notification" className="relative p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full"></span>
                </Link>
              </>
            )}

            {/* Menu Links */}
            <div className="hidden sm:flex items-center gap-4 border-l border-green-400/30 pl-4 ml-2">
              <Link
                to="/"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                HOME
              </Link>
              <Link
                to="/about"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                ABOUT US
              </Link>
              <Link
                to="/contact"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                CONTACT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function SideNavigation({ activeItemCount }) {
  const location = useLocation();
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
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-[calc(100vh-4rem)] overflow-y-auto fixed left-0 top-16">
      <nav className="p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h2>
        </div>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
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
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

// ============================================
// Main Component
// ============================================
export default function Chatbot() {
  const { user } = useAuth();
  const { role, ready: roleReady } = useRole();
  const { storeId } = useStore();
  const [inventory, setInventory] = useState([]);

  // ============================================
  // Effects
  // ============================================
  useEffect(() => {
    // Don't fetch if role is not ready yet
    if (!roleReady) {
      return;
    }
    
    // Only fetch inventory for admin/staff (not guests)
    if (role === "guest") {
      setInventory([]);
      return;
    }
    
    // Get inventory items for badge count (only for admin/staff)
    const invRef = collection(db, "inventory");
    const unsubscribe = onSnapshot(invRef, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(items);
    });
    return () => unsubscribe();
  }, [role, roleReady]);

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
  
  const isGuest = role === "guest";
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation isGuest={isGuest} />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation - Only show for admin/staff */}
        {!isGuest && <SideNavigation activeItemCount={lowStockItems.length} />}

        {/* Main Content Area */}
        <main className={`flex-1 ${isGuest ? 'p-6' : 'ml-64 p-6'}`}>
          {/* Location Selector - Show for guests and authenticated users */}
          {isGuest && (
            <div className="mb-6">
              <LocationSelector />
            </div>
          )}
          
          {/* Chatbot Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">SmartStockAI Assistant</h2>
            </div>
            <ChatbotPanel />
          </section>
        </main>
      </div>
    </div>
  );
}

