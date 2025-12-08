// src/pages/GuestChatbot.jsx
import { useEffect, useMemo, useState } from "react";
// Force recompilation
import { Link, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import * as motion from "motion/react-client";

import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../hooks/useRole";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { useStore } from "../contexts/StoreContext";
import { useDarkMode } from "../contexts/DarkModeContext";
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
  const { role } = useRole();
  const isDashboardActive = location.pathname === "/guest-chatbot";
  const isChatbotActive = location.pathname === "/guest-chatbot-full";
  const isRedeemPointsActive = location.pathname === "/redeem-points";
  const isGuest = role === "guest";

  const menuItems = [
    { icon: "grid", label: "Dashboard", path: "/guest-chatbot", active: isDashboardActive },
    { icon: "chatbot", label: "SmartStockAI Assistant", path: "/guest-chatbot-full", active: isChatbotActive },
    { icon: "gift", label: "Redeem Points", path: "/redeem-points", active: isRedeemPointsActive, isGuestRestricted: isGuest },
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
      envelope: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
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
      gift: (
        <span className="text-xl">🎁</span>
      ),
    };
    return icons[iconName] || icons.grid;
  };

  const handleMockClick = (e, item) => {
    if (item.isGuestRestricted) {
      e.preventDefault();
      toast.info("You need to create account");
      return;
    }
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isGuest ? "Guest Assistant" : role === "customer" ? "Customer Dashboard" : "Admin Dashboard"}
            </h2>
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

function OutOfStockCard({ item, index }) {
  const qty = Number(item.qty ?? 0);
  const isOutOfStock = qty === 0;
  const statusText = isOutOfStock ? "is out of stock" : "needs restocking";

  return (
    <motion.div
      className="relative border-2 border-gray-300 dark:border-gray-500 rounded-lg overflow-hidden bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Alert badge - centered at top */}
      <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 z-10">
        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
          <svg
            className="w-4 h-4 text-white"
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
      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="grid grid-cols-3 gap-1 w-16 h-16 opacity-30">
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
      <div className="p-3 text-center">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {item.name} <span className="text-red-600 dark:text-red-400">{statusText}</span>
        </h3>
        {!isOutOfStock && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Current stock: {qty}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================
export default function GuestChatbot() {
  // Hooks must be called unconditionally
  const { user } = useAuth();
  const { role } = useRole();
  const { storeId } = useStore();
  const { toast } = useToast();
  const { globalLowStockCount } = useLowStockCount(storeId || null);
  const [inventory, setInventory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stockNotificationsExpanded, setStockNotificationsExpanded] = useState(false);
  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
  
  // Poster images for carousel
  const posterImages = [
    "/Speedmart poster.png",
    "/SMARTSTOK AI POSTER.png"
  ];
  
  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPosterIndex((prevIndex) => (prevIndex + 1) % posterImages.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [posterImages.length]);
  
  // Debug: Log state values
  console.log('🔵 GuestChatbot component loaded!', new Date().toISOString());
  console.log('🔵 Current URL:', window.location.pathname);
  console.log('🔵 GuestChatbot state:', { 
    sidebarOpen, 
    storeId, 
    inventoryCount: inventory.length,
    globalLowStockCount 
  });

  // ============================================
  // Effects
  // ============================================
  useEffect(() => {
    // Guests can view all stores, but when a store is selected in LocationSelector,
    // we scope results to that location so the UI stays in sync with the Stock Notification page.
    try {
      const baseRef = collection(db, "inventory");

      // If a storeId is selected, filter by that store.
      if (storeId) {
        const storeScopedRef = query(baseRef, where("storeId", "==", storeId));
        const unsubscribe = onSnapshot(
          storeScopedRef, 
          (snapshot) => {
            const items = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setInventory(items);
          },
          (error) => {
            console.error('Firestore error:', error);
            setInventory([]);
          }
        );
        return () => unsubscribe();
      }

      // No store selected: Guests can view all items
      const unsubscribe = onSnapshot(
        baseRef, 
        (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setInventory(items);
        },
        (error) => {
          console.error('Firestore error:', error);
          setInventory([]);
        }
      );
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up inventory listener:', error);
      setInventory([]);
    }
  }, [storeId]);

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
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation role={role || "guest"} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation */}
        {sidebarOpen && (
          <SideNavigation
            activeItemCount={globalLowStockCount || 0}
            onClose={() => setSidebarOpen(false)}
            toast={toast}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6 flex flex-col min-h-[calc(100vh-4rem)]`}>
          {/* Promo Poster Carousel - Top */}
          <section className="mb-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden relative">
              <div className="relative w-full h-[120px] sm:h-[160px] md:h-[180px] lg:h-[200px]">
                {posterImages.map((image, index) => (
                  <motion.img
                    key={index}
                    src={image}
                    alt={`Promo Poster ${index + 1}`}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    initial={{ opacity: 0, x: index === 0 ? 0 : 100 }}
                    animate={{
                      opacity: currentPosterIndex === index ? 1 : 0,
                      x: currentPosterIndex === index ? 0 : (index < currentPosterIndex ? -100 : 100),
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                ))}
                
                {/* Navigation Dots */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                  {posterImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPosterIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentPosterIndex === index
                          ? "bg-white w-6"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
                
                {/* Navigation Arrows */}
                <button
                  onClick={() => setCurrentPosterIndex((prev) => (prev - 1 + posterImages.length) % posterImages.length)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors z-10"
                  aria-label="Previous slide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPosterIndex((prev) => (prev + 1) % posterImages.length)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors z-10"
                  aria-label="Next slide"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* Location Selector - Below Promo */}
          <section className="mb-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <LocationSelector />
            </div>
          </section>

          {/* Collapsible Stock Notifications - Middle */}
          <section className="mb-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <button
                onClick={() => setStockNotificationsExpanded(!stockNotificationsExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-yellow-500"
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Stock Notifications
                  </h3>
                  {lowStockItems.length > 0 && (
                    <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full">
                      {lowStockItems.length}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${stockNotificationsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {stockNotificationsExpanded && (
                <motion.div
                  className="px-4 pb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {lowStockItems.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="inline-block p-3 bg-green-100 dark:bg-green-900/40 rounded-full mb-3">
                        <svg
                          className="w-8 h-8 text-green-600 dark:text-green-400"
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">All items are in stock</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
                      {lowStockItems.map((item, index) => (
                        <OutOfStockCard key={item.id} item={item} index={index} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </section>

        </main>
        </div>

    </div>
  );
}
