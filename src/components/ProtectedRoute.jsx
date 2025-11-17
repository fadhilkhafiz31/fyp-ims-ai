// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowGuest = false }) {
  const { user, authReady } = useAuth();
  const location = useLocation();
  
  // Wait for auth to be ready
  if (!authReady) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-sm text-gray-600 dark:text-gray-400">Checking session…</div>
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
