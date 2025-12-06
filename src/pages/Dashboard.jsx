// src/pages/Dashboard.jsx (Router/Orchestrator)
import { Navigate } from "react-router-dom";
import { useRole } from "../hooks/useRole";
import { PageReady } from "../components/NProgressBar";
import TopNavigation from "../components/TopNavigation";
import DashboardStaff from "./DashboardStaff";
import DashboardAdmin from "./DashboardAdmin";
import MotionWrapper from "../components/MotionWrapper";

// ============================================
// Main Component - Routes to appropriate dashboard based on role
// ============================================
export default function Dashboard() {
  const { role, ready } = useRole();

  // ============================================
  // Loading State
  // ============================================
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <TopNavigation />
        <div className="p-6">
          <PageReady />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Loading dashboard…
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // Route to appropriate dashboard based on role
  // ============================================
  switch (role) {
    case "customer":
      // Redirect customers to guest-chatbot page
      return <Navigate to="/guest-chatbot" replace />;
    case "staff":
      return (
        <MotionWrapper>
          <DashboardStaff />
        </MotionWrapper>
      );
    case "admin":
      return (
        <MotionWrapper>
          <DashboardAdmin />
        </MotionWrapper>
      );
    default:
      // Fallback: redirect to guest-chatbot if role is unknown (treat as customer)
      return <Navigate to="/guest-chatbot" replace />;
  }
}