// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowGuest = false }) {
  const { user, authReady } = useAuth();
  const location = useLocation();
  
  if (!authReady) {
    return <div className="p-6">Checking session…</div>;
  }
  
  // Allow guest access on chatbot route if allowGuest is true
  if (allowGuest && location.pathname === "/chatbot") {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return children;
  }
  
  // For all other routes, require authenticated user
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}
