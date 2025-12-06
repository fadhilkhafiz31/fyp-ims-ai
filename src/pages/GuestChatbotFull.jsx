// src/pages/GuestChatbotFull.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as motion from "motion/react-client";
import { AnimatePresence } from "motion/react";

import { useDarkMode } from "../contexts/DarkModeContext";
import { useLowStockCount } from "../hooks/useLowStockCount";
import { useStore } from "../contexts/StoreContext";
import ChatbotPanel from "../components/ChatbotPanel";
import { PageReady } from "../components/NProgressBar";
import TopNavigation from "../components/TopNavigation";
import AnimatedBadge from "../components/ui/AnimatedBadge";
import AnimatedIcon from "../components/ui/AnimatedIcon";
import { useToast } from "../contexts/ToastContext";

// ============================================
// Helper Components
// ============================================
function SideNavigation({ activeItemCount, onClose, toast }) {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const isDashboardActive = location.pathname === "/guest-chatbot";
  const isChatbotActive = location.pathname === "/guest-chatbot-full";

  const menuItems = [
    { icon: "grid", label: "Dashboard", path: "/guest-chatbot", active: isDashboardActive },
    { icon: "chatbot", label: "SmartStockAI Assistant", path: "/guest-chatbot-full", active: isChatbotActive },
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
      chatbot: (
        <span className="text-xl">🤖</span>
      ),
      logout: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4-4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12H9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16v1a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h3a3 3 0 013 3v1" />
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
      toast?.info(`${item.label} - Coming soon!`);
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Guest Assistant</h2>
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
              toast={toast}
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



