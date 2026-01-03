// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { EnhancedSpinner } from "./ui/EnhancedSpinner";

export default function ProtectedRoute({ children, allowGuest = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log("[ProtectedRoute]", { loading, user: user ? user.uid : "null", path: location.pathname });

  // Wait for auth to be ready
  if (loading) {
    console.log("[ProtectedRoute] Still loading, showing spinner");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <EnhancedSpinner size="lg" className="mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Checking session…</p>
        </div>
      </div>
    );
  }

  // Allow guest access on chatbot route if allowGuest is true
  if (allowGuest && location.pathname === "/chatbot") {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  }

  // For all other routes, require authenticated user
  // Double check: user must exist and be truthy
  if (!user || user === null || user === undefined) {
    // Redirect to login and replace history to prevent back navigation
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
