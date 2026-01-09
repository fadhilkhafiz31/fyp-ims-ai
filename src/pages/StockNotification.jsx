// src/pages/StockNotification.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import * as motion from "motion/react-client";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../contexts/StoreContext";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { useRole } from "../hooks/useRole";
import { PageReady } from "../components/NProgressBar";
import LocationSelector from "../components/LocationSelector";
import TopNavigation from "../components/TopNavigation";
import ChatbotPanel from "../components/ChatbotPanel";
import SideNavigation from "../components/SideNavigation";
import { useToast } from "../contexts/ToastContext";
import { useSearch } from "../contexts/SearchContext";

// ============================================
// Constants
// ============================================
const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Helper Components
// ============================================
function OutOfStockCard({ item, index }) {
  const qty = Number(item.qty ?? 0);
  const isOutOfStock = qty === 0;
  const statusText = isOutOfStock ? "is out of stock" : "needs restocking";

  return (
    <motion.div
      className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-900"
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        scale: 1.05,
        y: -5,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)"
      }}
      style={{ willChange: 'transform, opacity' }}
    >
      {/* Alert badge - centered at top */}
      <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
        <motion.div
          className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-md"
          animate={isOutOfStock ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: isOutOfStock ? Infinity : 0,
            ease: "easeInOut"
          }}
        >
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
        </motion.div>
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
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================
export default function StockNotification() {
  const { user } = useAuth();
  const { role } = useRole();
  const { storeId } = useStore();
  const { toast } = useToast();
  const { filterItems, searchQuery, hasSearch } = useSearch();
  const { globalLowStockCount } = useLowStockCount(storeId); // Pass storeId to filter by selected store
  const [inventory, setInventory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);

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
    return () => { };
  }, [storeId, role]);

  // ============================================
  // Computed Values
  // ============================================
  // Filter inventory based on search, then filter for low stock
  const filteredInventory = useMemo(() => {
    return filterItems(inventory, ["name", "sku", "category"]);
  }, [inventory, filterItems]);

  // Low stock items for the current page (filtered by storeId if selected)
  const lowStockItems = useMemo(
    () =>
      filteredInventory.filter(
        (item) => Number(item.qty ?? 0) <= LOW_STOCK_THRESHOLD
      ),
    [filteredInventory]
  );

  // Note: Global low stock count is now provided by useLowStockCount hook
  // This ensures consistency across all pages

  // ============================================
  // Handlers
  // ============================================
  const handleNotifySupplier = () => {
    // Default supplier WhatsApp number (format: country code + number without + or spaces)
    // Example: 60123456789 for Malaysia (+60 12-345 6789)
    const supplierPhoneNumber = "60146379535"; // TODO: Replace with actual supplier phone number or make it configurable

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
      <TopNavigation role={role} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation */}
        {sidebarOpen && (
          <SideNavigation
            activeItemCount={globalLowStockCount}
            onClose={() => setSidebarOpen(false)}
            toast={toast}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6`}>
          {/* Location Selector */}
          <div className="mb-6">
            <LocationSelector />
          </div>

          {/* Low Stock Items Grid */}
          {lowStockItems.length === 0 ? (
            <motion.div
              key={`all-in-stock-${storeId || 'all'}-${lowStockItems.length}`}
              className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.div
                className="inline-block p-4 bg-green-100 dark:bg-green-900/40 rounded-full mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
              >
                <svg
                  className="w-12 h-12 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <motion.path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      duration: 0.8,
                      delay: 0.5,
                      ease: "easeInOut"
                    }}
                  />
                </svg>
              </motion.div>
              <motion.h3
                className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                {hasSearch ? "No Low Stock Items Found" : "All Items In Stock"}
              </motion.h3>
              <motion.p
                className="text-sm text-gray-600 dark:text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                {hasSearch
                  ? `No items matching "${searchQuery}" require restocking.`
                  : "No items require restocking at this time."}
              </motion.p>
            </motion.div>
          ) : (
            <>
              <div
                key={`grid-${lowStockItems.length}-${lowStockItems.map(i => i.id).join('-')}`}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-6"
              >
                {lowStockItems.map((item, index) => (
                  <OutOfStockCard key={item.id} item={item} index={index} />
                ))}
              </div>

              {/* Alert Button */}
              <div className="flex justify-center">
                <motion.button
                  onClick={handleNotifySupplier}
                  className="px-12 py-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-lg rounded-full shadow-lg flex items-center gap-2"
                  whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(20, 184, 166, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Click to alert Supplier for restock
                </motion.button>
              </div>
            </>
          )}
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
