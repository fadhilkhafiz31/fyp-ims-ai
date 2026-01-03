// src/hooks/useRole.js
import { useAuth } from "../contexts/AuthContext";

export function useRole() {
  const { user, profile, loading } = useAuth();
  
  // If still loading auth state, not ready
  if (loading) {
    return { role: null, ready: false };
  }
  
  // If no user, ready with no role
  if (!user) {
    return { role: null, ready: true };
  }
  
  // Check if user is anonymous (guest)
  if (user.isAnonymous) {
    return { role: "guest", ready: true };
  }
  
  // For authenticated users, get role from profile
  const role = profile?.role ?? null;
  return { role, ready: true };
}
