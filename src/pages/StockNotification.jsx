// src/pages/StockNotification.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../contexts/StoreContext";
import { useRole } from "../hooks/useRole";
import { PageReady } from "../components/NProgressBar";
import LocationSelector from "../components/LocationSelector";

// ============================================
// Constants
// ============================================
const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
function TopNavigation() {
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

            {/* Location */}
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

            {/* Icons */}
            <Link to="/chatbot" className="p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition text-xl">
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
            <Link to="/stock-notification" className="relative p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition bg-green-700/40">
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full"></span>
            </Link>

            {/* Menu Links */}
            <div className="hidden sm:flex items-center gap-4 border-l border-green-400/30 pl-4 ml-2">
              <Link
                to="/dashboard"
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
  const isStockNotificationActive = location.pathname === "/stock-notification";

  const menuItems = [
    { icon: "grid", label: "Dashboard", path: "/dashboard", active: isDashboardActive },
    { icon: "transaction", label: "Transaction", path: "/transactions" },
    { icon: "bell", label: "Stock Notification", path: "/stock-notification", active: isStockNotificationActive, badge: activeItemCount || 0 },
    { icon: "chatbot", label: "SmartStockAI Assistant", path: "/chatbot" },
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

function OutOfStockCard({ item }) {
  const qty = Number(item.qty ?? 0);
  const isOutOfStock = qty === 0;
  const statusText = isOutOfStock ? "is out of stock" : "needs restocking";

  return (
    <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900 hover:shadow-md transition-shadow">
      {/* Alert badge - centered at top */}
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-md">
          <svg
            className="w-3 h-3 text-white"
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
            <div className="grid grid-cols-3 gap-0.5 w-12 h-12 opacity-30">
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
      <div className="p-2 text-center">
        <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100 leading-tight">
          {item.name} <span className="text-red-600 dark:text-red-400 text-[10px]">{statusText}</span>
        </h3>
        {!isOutOfStock && (
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
            Stock: {qty}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================
export default function StockNotification() {
  const { user } = useAuth();
  const { role } = useRole();
  const { storeId } = useStore();
  const [inventory, setInventory] = useState([]);

  // ============================================
  // Effects
  // ============================================
useEffect(() => {
  // Admins can view all stores, but when a store is selected in LocationSelector,
  // we scope results to that location so the UI stays in sync with the inventory page.
  const baseRef = collection(db, "inventory");

  // If a storeId is selected (for both admin & staff), filter by that store.
  if (storeId) {
    const storeScopedRef = query(baseRef, where("storeId", "==", storeId));
    const unsubscribe = onSnapshot(storeScopedRef, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(items);
    });
    return () => unsubscribe();
  }

  // No store selected:
  // - Admins fall back to viewing every item.
  // - Staff see nothing until a store is assigned.
  if (role === "admin") {
    const unsubscribe = onSnapshot(baseRef, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(items);
    });
    return () => unsubscribe();
  }

  setInventory([]);
  return () => {};
}, [storeId, role]);

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
  // Handlers
  // ============================================
  const handleNotifySupplier = () => {
    // Default supplier WhatsApp number (format: country code + number without + or spaces)
    // Example: 60123456789 for Malaysia (+60 12-345 6789)
    const supplierPhoneNumber = "60123456789"; // TODO: Replace with actual supplier phone number or make it configurable
    
    // Build the message with low stock items
    const itemList = lowStockItems
      .map((item) => {
        const qty = Number(item.qty ?? 0);
        const status = qty === 0 ? "OUT OF STOCK" : `Low stock (${qty} remaining)`;
        return `• ${item.name} - ${status}`;
      })
      .join("\n");

    const message = `Hello! We need to restock the following items:\n\n${itemList}\n\nTotal items needing restock: ${lowStockItems.length}\n\nPlease arrange for restocking as soon as possible. Thank you!`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${supplierPhoneNumber}?text=${encodedMessage}`;

    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, "_blank");
  };

  // ============================================
  // Render
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation */}
        <SideNavigation activeItemCount={lowStockItems.length} />

        {/* Main Content Area */}
        <main className="flex-1 ml-64 p-6">
          {/* Location Selector */}
          <div className="mb-6">
            <LocationSelector />
          </div>

          {/* Low Stock Items Grid */}
          {lowStockItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6">
                {lowStockItems.map((item) => (
                  <OutOfStockCard key={item.id} item={item} />
                ))}
              </div>

              {/* Alert Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleNotifySupplier}
                  className="px-12 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-lg rounded-full shadow-lg transition-colors transform hover:scale-105 flex items-center gap-2"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Click to alert Supplier for restock
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
