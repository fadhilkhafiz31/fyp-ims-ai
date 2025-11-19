import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react-client";
import { EnhancedSpinner } from "./components/ui/EnhancedSpinner";
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
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Routes location={location}>
            <Route 
              path="/login" 
              element={<Login />} 
            />
            <Route 
              path="/register" 
              element={<Register />} 
            />

            {/* Public routes with AppLayout - accessible without authentication */}
            <Route
              path="/about"
              element={
                <AppLayout>
                  <About />
                </AppLayout>
              }
            />
            <Route
              path="/contact"
              element={
                <AppLayout>
                  <Contact />
                </AppLayout>
              }
            />

            {/* Protected routes - Dashboard has its own layout with navigation */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PageReady />
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <PageReady />
                  <Inventory />
                </ProtectedRoute>
              }
            />

            {/* ✅ Transactions — only admin & staff can access */}
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <PageReady />
                    <Transactions />
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
                    <PageReady />
                    <StockNotification />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* ✅ Chatbot — accessible by admin, staff, and guests */}
            <Route
              path="/chatbot"
              element={
                <ProtectedRoute allowGuest={true}>
                  <PageReady />
                  <Chatbot />
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
        </motion.div>
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
        </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
