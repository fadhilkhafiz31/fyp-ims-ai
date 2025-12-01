import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import * as motion from "motion/react-client";
import { EnhancedSpinner } from "./components/ui/EnhancedSpinner";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { StoreProvider } from "./contexts/StoreContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { RouteProgress, PageReady } from "./components/NProgressBar";
import RoleGuard from "./components/RoleGuard";
import AppLayout from "./layouts/AppLayout";
import { ToastProvider } from "./contexts/ToastContext";
import { SearchProvider } from "./contexts/SearchContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Transactions = lazy(() => import("./pages/Transactions"));
const StockNotification = lazy(() => import("./pages/StockNotification"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const GeminiChatTest = lazy(() => import("./pages/GeminiChatTest"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
            <Route 
              path="/login" 
              element={
                <motion.div
                  key="login"
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
                  key="register"
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
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <AppLayout>
                    <About />
                  </AppLayout>
                </motion.div>
              }
            />
            <Route
              path="/contact"
              element={
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <AppLayout>
                    <Contact />
                  </AppLayout>
                </motion.div>
              }
            />

            {/* Protected routes - Dashboard has its own layout with navigation */}
            <Route
              path="/dashboard"
              element={
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute>
                    <PageReady />
                    <Dashboard />
                  </ProtectedRoute>
                </motion.div>
              }
            />

            <Route
              path="/inventory"
              element={
                <motion.div
                  key="inventory"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute>
                    <PageReady />
                    <Inventory />
                  </ProtectedRoute>
                </motion.div>
              }
            />

            {/* ✅ Transactions — only admin & staff can access */}
            <Route
              path="/transactions"
              element={
                <motion.div
                  key="transactions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute>
                    <RoleGuard allow={["admin", "staff"]}>
                      <PageReady />
                      <Transactions />
                    </RoleGuard>
                  </ProtectedRoute>
                </motion.div>
              }
            />

            {/* ✅ Stock Notification — only admin & staff can access */}
            <Route
              path="/stock-notification"
              element={
                <motion.div
                  key="stock-notification"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute>
                    <RoleGuard allow={["admin", "staff"]}>
                      <PageReady />
                      <StockNotification />
                    </RoleGuard>
                  </ProtectedRoute>
                </motion.div>
              }
            />

            {/* ✅ Chatbot — accessible by admin, staff, and guests */}
            <Route
              path="/chatbot"
              element={
                <motion.div
                  key="chatbot"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute allowGuest={true}>
                    <PageReady />
                    <Chatbot />
                  </ProtectedRoute>
                </motion.div>
              }
            />

            {/* ✅ Gemini AI Chat Test — dedicated test page for Gemini AI */}
            <Route
              path="/gemini-chat-test"
              element={
                <motion.div
                  key="gemini-chat-test"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute>
                    <PageReady />
                    <GeminiChatTest />
                  </ProtectedRoute>
                </motion.div>
              }
            />

            {/* Root redirect to dashboard */}
            <Route
              path="/"
              element={
                <motion.div
                  key="root"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute>
                    <PageReady />
                    <Dashboard />
                  </ProtectedRoute>
                </motion.div>
              }
            />

            {/* Default route fallback - redirect to dashboard */}
            <Route
              path="*"
              element={
                <motion.div
                  key="fallback"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProtectedRoute>
                    <PageReady />
                    <Dashboard />
                  </ProtectedRoute>
                </motion.div>
              }
            />
          </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StoreProvider>
          <ToastProvider>
            <SearchProvider>
              <ErrorBoundary>
                <RouteProgress />
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
                      <div className="text-center">
                        <EnhancedSpinner size="lg" className="mb-4" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                      </div>
                    </div>
                  }
                >
                  <AnimatedRoutes />
                </Suspense>
              </ErrorBoundary>
            </SearchProvider>
          </ToastProvider>
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
