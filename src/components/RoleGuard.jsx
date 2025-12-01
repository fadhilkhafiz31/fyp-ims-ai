import { Navigate } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import { EnhancedSpinner } from "./ui/EnhancedSpinner";

export default function RoleGuard({ allow = [], children }) {
  const { role, ready } = useRole();
  
  // Show visible loading state instead of blank page
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <EnhancedSpinner size="lg" className="mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verifying access...
          </p>
        </div>
      </div>
    );
  }
  
  if (!role || !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
