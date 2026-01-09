// src/pages/Chatbot.jsx
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import * as motion from "motion/react-client";

import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../hooks/useRole";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { useStore } from "../contexts/StoreContext";
import ChatbotPanel from "../components/ChatbotPanel";
import LocationSelector from "../components/LocationSelector";
import TopNavigation from "../components/TopNavigation";
import SideNavigation from "../components/SideNavigation";
import { PageReady } from "../components/NProgressBar";
import { useToast } from "../contexts/ToastContext";

// ============================================
// Constants
// ============================================
const LOW_STOCK_THRESHOLD = 5;

// ============================================
// Main Component
// ============================================
export default function Chatbot() {
  const { user } = useAuth();
  const { role, ready: roleReady } = useRole();
  const { storeId } = useStore();
  const { toast } = useToast();
  const { globalLowStockCount } = useLowStockCount(storeId); // Pass storeId to filter by selected store
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
            activeItemCount={globalLowStockCount}
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

