// src/pages/GuestChatbotFull.jsx
import { useState } from "react";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";

import { useLowStockCount } from "../hooks/useLowStockCount";
import { useStore } from "../contexts/StoreContext";
import ChatbotPanel from "../components/ChatbotPanel";
import { PageReady } from "../components/NProgressBar";
import TopNavigation from "../components/TopNavigation";
import SideNavigation from "../components/SideNavigation";
import { useToast } from "../contexts/ToastContext";

// ============================================
// Main Component
// ============================================
export default function GuestChatbotFull() {
  const { storeId } = useStore();
  const { toast } = useToast();
  const { globalLowStockCount } = useLowStockCount(storeId || null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageReady />

      {/* Top Navigation */}
      <TopNavigation role="guest" onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      {/* Sidebar + Main Content */}
      <div className="flex">
        {/* Side Navigation */}
        <AnimatePresence>
          {sidebarOpen && (
            <SideNavigation
              key="sidebar"
              activeItemCount={globalLowStockCount || 0}
              onClose={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Content Area - Full Page Chatbot */}
        <main className={`flex-1 ${sidebarOpen ? "ml-64" : ""} p-6 flex flex-col min-h-[calc(100vh-4rem)]`}>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col flex-1 min-h-0">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🤖</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SmartStockAI Assistant</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ask me about product availability and stock levels</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 p-4">
                <ChatbotPanel fullHeight={true} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}



