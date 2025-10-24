import { Navigate } from "react-router-dom";
import { useRole } from "../hooks/useRole";

export default function RoleGuard({ allow = [], children }) {
  const { role, ready } = useRole();
  if (!ready) return null; // wait for role fetch
  if (!role || !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
