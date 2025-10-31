import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import { RouteProgress, PageReady } from "./components/NProgressBar";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Transactions = lazy(() => import("./pages/Transactions"));

export default function App() {
  return (
    <>
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
                <RoleGuard allow={["admin", "staff"]}>
                  <PageReady />
                  <Inventory />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

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

          {/* Default route */}
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
    </>
  );
}
