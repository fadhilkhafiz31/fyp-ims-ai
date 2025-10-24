import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { RouteProgress, PageReady } from "./components/NProgressBar";
import RoleGuard from "./components/RoleGuard"; // ✅ already imported

// Lazy load pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Transactions = lazy(() => import("./pages/Transactions"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RouteProgress />

        <Suspense
          fallback={
            <div className="p-6 flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border border-gray-400 border-t-transparent" />
              Loading…
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

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

            {/* Default route fallback */}
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
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
