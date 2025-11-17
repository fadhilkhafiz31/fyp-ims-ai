import { useState, useEffect } from "react";
import * as motion from "motion/react-client";
import { getStores } from "../lib/db";
import { PageReady } from "../components/NProgressBar";

export default function About() {
  const [viewMode, setViewMode] = useState(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem("aboutViewMode");
    return saved || "project";
  });
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Save viewMode to localStorage
    localStorage.setItem("aboutViewMode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "stores") {
      setLoading(true);
      setError(null);
      getStores()
        .then((data) => {
          setStores(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [viewMode]);

  return (
    <div>
      <PageReady />
      
      {/* Toggle Control */}
      <motion.div
        className="flex justify-end mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1">
          <motion.button
            type="button"
            onClick={() => setViewMode("project")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E] ${
              viewMode === "project"
                ? "bg-[#2E6A4E] text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            aria-pressed={viewMode === "project"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Project details
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setViewMode("stores")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E6A4E] ${
              viewMode === "stores"
                ? "bg-[#2E6A4E] text-white"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            aria-pressed={viewMode === "stores"}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Local markets
          </motion.button>
        </div>
      </motion.div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-right mb-6 -mt-4">
        Switch to view local market info.
      </p>

      {viewMode === "project" ? (
        <motion.div
          key="project-view"
          className="space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              About This Project
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Inventory Management System with AI chatbot for minimarkets. Real-time stock tracking,
              role-based access control, and Dialogflow-powered natural language queries to help
              small businesses manage inventory efficiently.
            </p>
            <motion.div
              className="mt-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Features
              </h2>
              <motion.ul
                className="space-y-3 text-gray-700 dark:text-gray-300 text-base"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                <motion.li
                  className="flex items-start gap-3"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-xl leading-6">🔐</span>
                  <span>
                    <strong>Role-based Authentication</strong> (Admin / Staff / Customer)
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start gap-3"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-xl leading-6">📦</span>
                  <span>
                    <strong>Real-time Inventory CRUD</strong> with Firestore
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start gap-3"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-xl leading-6">🤖</span>
                  <span>
                    <strong>AI Chatbot Integration</strong> via Dialogflow
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start gap-3"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-xl leading-6">⚡</span>
                  <span>
                    <strong>Live KPIs & Low-Stock Dashboard</strong> using onSnapshot
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start gap-3"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-xl leading-6">💬</span>
                  <span>
                    Optional <strong>Push Notifications</strong> (Firebase FCM)
                  </span>
                </motion.li>
              </motion.ul>
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              How It Works
            </h2>
            <motion.div
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <motion.ul
                className="space-y-3 text-gray-700 dark:text-gray-300"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
              >
                <motion.li
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-[#2E6A4E] dark:text-green-400 mr-2">•</span>
                  <span>
                    <strong>Frontend:</strong> React + Vite + Tailwind CSS
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-[#2E6A4E] dark:text-green-400 mr-2">•</span>
                  <span>
                    <strong>Backend:</strong> Firebase Cloud Functions (Node.js)
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-[#2E6A4E] dark:text-green-400 mr-2">•</span>
                  <span>
                    <strong>Data:</strong> Cloud Firestore (real-time database)
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-[#2E6A4E] dark:text-green-400 mr-2">•</span>
                  <span>
                    <strong>AI Module:</strong> Dialogflow ES orchestrates natural language understanding and fulfillment.
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-[#2E6A4E] dark:text-green-400 mr-2">•</span>
                  <span>
                    <strong>Hosting:</strong> Firebase Hosting delivers the web app globally with SSL by default.
                  </span>
                </motion.li>
                <motion.li
                  className="flex items-start"
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <span className="text-[#2E6A4E] dark:text-green-400 mr-2">•</span>
                  <span>
                    <strong>Dev Tools:</strong> VS Code, GitHub, Postman, and Trello streamline development and collaboration.
                  </span>
                </motion.li>
              </motion.ul>
            </motion.div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              AI Integration Flow
            </h2>
            <motion.div
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <motion.ol
                className="space-y-4 list-decimal list-inside text-gray-700 dark:text-gray-300"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.15
                    }
                  }
                }}
              >
                <motion.li
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <strong>User Query (Frontend):</strong> Customer asks, "Do you have <em>Beras Faiza 5KG</em> at 99 Speedmart Acacia?"
                </motion.li>
                <motion.li
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <strong>Dialogflow ES Agent (NLP Layer):</strong> Detects <code>CheckStock</code> intent and forwards
                  the request to the webhook.
                </motion.li>
                <motion.li
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <strong>Firebase Cloud Function (Webhook):</strong> Reads Firestore
                  (<code>{"items/{id}"}</code>) in real time and returns availability with optional alternatives.
                </motion.li>
                <motion.li
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <strong>Chatbot Response (Frontend):</strong> Displays <em>In stock</em>, <em>Low stock</em>, or
                  <em>Out of stock</em> with a suggested item.
                </motion.li>
                <motion.li
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <strong>Inventory Sync (Realtime):</strong> Staff/Admin updates <code>qty</code>, triggering
                  <code>onSnapshot()</code> to refresh the dashboard and power the chatbot's next answer.
                </motion.li>
              </motion.ol>
            </motion.div>
          </motion.section>
        </motion.div>
      ) : (
        <motion.div
          key="stores-view"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <motion.h1
            className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Local Markets
          </motion.h1>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                </motion.div>
              ))}
            </div>
          ) : error ? (
            <motion.div
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-red-800 dark:text-red-200">
                Error loading stores: {error}
              </p>
              <button
                onClick={() => {
                  setError(null);
                  setViewMode("stores");
                }}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Retry
              </button>
            </motion.div>
          ) : stores.length === 0 ? (
            <motion.div
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-gray-500 dark:text-gray-400">
                No stores available at this time.
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              {stores.map((store, index) => (
                <motion.div
                  key={store.id}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                  variants={{
                    hidden: { opacity: 0, scale: 0.9, y: 20 },
                    visible: { opacity: 1, scale: 1, y: 0 }
                  }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {store.storeName || store.name || "Unnamed Store"}
                  </h3>
                  {store.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      📞 {store.phone}
                    </p>
                  )}
                  {store.address && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📍 {store.address}
                    </p>
                  )}
                  {store.storeId && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      ID: {store.storeId}
                    </p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

