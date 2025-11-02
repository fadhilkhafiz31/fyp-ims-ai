// src/pages/Dashboard.jsx (Router/Orchestrator)
import { useRole } from "../hooks/useRole";
import { PageReady } from "../components/NProgressBar";
import DashboardCustomer from "./DashboardCustomer";
import DashboardStaff from "./DashboardStaff";
import DashboardAdmin from "./DashboardAdmin";

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
      <div className="p-6">
        <PageReady />
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Loading dashboard…
        </div>
      </div>
    );
  }

  // ============================================
  // Route to appropriate dashboard based on role
  // ============================================
  switch (role) {
    case "customer":
      return <DashboardCustomer />;
    case "staff":
      return <DashboardStaff />;
    case "admin":
      return <DashboardAdmin />;
    default:
      // Fallback to customer dashboard if role is unknown
      return <DashboardCustomer />;
  }
}