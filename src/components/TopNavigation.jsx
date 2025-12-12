import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import * as motion from "motion/react-client";
import { useAuth } from "../contexts/AuthContext";
import { useStore } from "../contexts/StoreContext";
import { useSearch } from "../contexts/SearchContext";
import { useToast } from "../contexts/ToastContext";
import AnimatedLink from "./ui/AnimatedLink";

export default function TopNavigation({ role = null, onToggleSidebar = null }) {
  const { user } = useAuth();
  const { storeName, storeId } = useStore();
  const { searchQuery, updateSearch, clearSearch, hasSearch } = useSearch();
  const { toast } = useToast();
  const location = useLocation();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  
  // Hide Home button on About and Contact pages
  const hideHomeButton = location.pathname === "/about" || location.pathname === "/contact";

  const effectiveRole = typeof role === "string" ? role.toLowerCase() : null;
  const isPrivileged = effectiveRole === "admin" || effectiveRole === "staff";

  const displayName =
    effectiveRole === "customer" 
      ? (user?.displayName || (user?.email ? user.email.split("@")[0] : "Customer"))
      : effectiveRole === "guest"
      ? "customer"
      : user?.displayName || (user?.email ? user.email.split("@")[0] : null) || "User";

  const storeLabel = storeName || storeId || "Select a store";

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSearch(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, updateSearch]);

  // Sync local search with context when cleared externally
  useEffect(() => {
    if (!searchQuery && localSearch) {
      setLocalSearch("");
    }
  }, [searchQuery, localSearch]);

  return (
    <nav className="w-full bg-[#0F5132] border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="flex items-center h-16">
        {/* Left: Hamburger button (if provided) and SmartStockAI Logo */}
        <div className="flex items-center pl-2">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="mr-2 inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-green-700/30 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Toggle sidebar"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          {hideHomeButton ? (
            <img
              src="/Smart Stock AI (1).png"
              alt="SmartStockAI Logo"
              className="h-10 w-auto bg-transparent object-contain"
              style={{ mixBlendMode: "normal" }}
            />
          ) : (
            <Link to={isPrivileged ? "/dashboard" : "/chatbot"} className="flex items-center">
              <img
                src="/Smart Stock AI (1).png"
                alt="SmartStockAI Logo"
                className="h-10 w-auto bg-transparent object-contain cursor-pointer hover:opacity-80 transition-opacity"
                style={{ mixBlendMode: "normal" }}
              />
            </Link>
          )}
        </div>

        {/* Center and Right content */}
        <div className="flex-1 flex items-center justify-between max-w-7xl mx-auto pr-4 sm:pr-6 lg:px-8">
          {/* Center: Search Bar (only for admin/staff) or 99 Speedmart Logo (for customer/guest) */}
          {isPrivileged ? (
            <div className="hidden xl:flex flex-1 max-w-lg mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Search items by name, SKU, category..."
                  className="w-full pl-10 pr-10 py-2 border border-green-400/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-green-100/70 focus:ring-2 focus:ring-green-300 focus:border-transparent focus:bg-white/20"
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
                {hasSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSearch("");
                      clearSearch();
                    }}
                    className="absolute right-3 top-2.5 text-green-100 hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <img
                src="/99speedmart logo.png"
                alt="99 Speedmart Logo"
                className="h-8 w-auto"
              />
            </div>
          )}

          {/* Right: Store Info, Icons and Menu */}
          <div className="flex items-center gap-3">
            {/* 99 Speedmart Logo */}
            {isPrivileged && (
              <div className="hidden md:flex items-center border-r border-green-400/30 pr-4">
                <img
                  src="/99speedmart logo.png"
                  alt="99 Speedmart Logo"
                  className="h-8 w-auto"
                />
              </div>
            )}

            {/* Location */}
            {isPrivileged && (
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
                <span className="text-white">{storeLabel}</span>
              </div>
            )}

            {/* User Greeting */}
            {!isPrivileged && displayName && (
              <div className="hidden md:flex items-center gap-2 text-sm border-r border-green-400/30 pr-4">
                <span className="text-white">
                  Welcome, {displayName}
                </span>
              </div>
            )}

            {/* Chatbot Icon */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                to="/chatbot"
                className="p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition text-xl block"
                title="Chatbot"
              >
                🤖
              </Link>
            </motion.div>

            {/* Heart Icon */}
            <motion.button
              className="p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition"
              type="button"
              aria-label="Favorite"
              onClick={() => toast.info("Favorites - Coming soon!")}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <motion.svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                whileHover={{ scale: 1.1 }}
                animate={{ scale: 1 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </motion.svg>
            </motion.button>

            {/* Stock Notification */}
            {isPrivileged && (
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  to="/stock-notification"
                  className="relative p-2 text-white hover:text-green-100 hover:bg-green-700/30 rounded-lg transition block"
                  title="Stock Notifications"
                >
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
                  <motion.span
                    className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </Link>
              </motion.div>
            )}

            {/* Menu Links */}
            <div className="hidden sm:flex items-center gap-4 border-l border-green-400/30 pl-4 ml-2">
              {hideHomeButton && (
                <AnimatedLink
                  to="/login"
                  className="text-sm font-medium text-white hover:text-green-100 transition"
                >
                  LOG IN
                </AnimatedLink>
              )}
              <AnimatedLink
                to="/about"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                ABOUT US
              </AnimatedLink>
              <AnimatedLink
                to="/contact"
                className="text-sm font-medium text-white hover:text-green-100 transition"
              >
                CONTACT
              </AnimatedLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}




