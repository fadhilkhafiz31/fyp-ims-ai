import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react-client";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { StoreProvider } from "./contexts/StoreContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { RouteProgress, PageReady } from "./components/NProgressBar";
import RoleGuard from "./components/RoleGuard";
import AppLayout from "./layouts/AppLayout";

// Lazy load pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Transactions = lazy(() => import("./pages/Transactions"));
const StockNotification = lazy(() => import("./pages/StockNotification"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
            <Route 
              path="/login" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Login />
                </motion.div>
              } 
            />
            <Route 
              path="/register" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Register />
                </motion.div>
              } 
            />

            {/* Public routes with AppLayout - accessible without authentication */}
            <Route
              path="/about"
              element={
                <AppLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <About />
                  </motion.div>
                </AppLayout>
              }
            />
            <Route
              path="/contact"
              element={
                <AppLayout>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Contact />
                  </motion.div>
                </AppLayout>
              }
            />

            {/* Protected routes - Dashboard has its own layout with navigation */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PageReady />
                    <Dashboard />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PageReady />
                    <Inventory />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            {/* ✅ Transactions — only admin & staff can access */}
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PageReady />
                      <Transactions />
                    </motion.div>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* ✅ Stock Notification — only admin & staff can access */}
            <Route
              path="/stock-notification"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <PageReady />
                      <StockNotification />
                    </motion.div>
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* ✅ Chatbot — accessible by admin, staff, and guests */}
            <Route
              path="/chatbot"
              element={
                <ProtectedRoute allowGuest={true}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PageReady />
                    <Chatbot />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            {/* Root redirect to dashboard */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <PageReady />
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Default route fallback - redirect to dashboard */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <PageReady />
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
      </AnimatePresence>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <RouteProgress />
          <Suspense
            fallback={
              <div className="p-6 flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                Loading…
              </div>
            }
          >
            <AnimatedRoutes />
          </Suspense>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
