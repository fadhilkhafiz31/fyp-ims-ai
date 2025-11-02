// src/pages/DashboardCustomer.jsx
import { useAuth } from "../contexts/AuthContext";
import ChatbotPanel from "../components/ChatbotPanel";
import { PageReady } from "../components/NProgressBar";

export default function DashboardCustomer() {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-8">
      <PageReady />

      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Customer Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome, <span className="font-medium text-gray-900 dark:text-gray-200">{user?.displayName || "Customer"}</span>
        </p>
      </header>

      {/* Chatbot Assistant */}
      <div className="mt-6">
        <ChatbotPanel />
      </div>
    </div>
  );
}

