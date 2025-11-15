// src/pages/DashboardCustomer.jsx
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import ChatbotPanel from "../components/ChatbotPanel";
import LocationSelector from "../components/LocationSelector";
import { PageReady } from "../components/NProgressBar";
import TopNavigation from "../components/TopNavigation";
import { auth } from "../lib/firebase";

export default function DashboardCustomer() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopNavigation role="customer" />

      <div className="p-6 space-y-8">
        <PageReady />

        {/* Header */}
        <header className="space-y-3 sm:space-y-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customer Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome, <span className="font-medium text-gray-900 dark:text-gray-200">{user?.displayName || "Customer"}</span>
            </p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="inline-flex items-center justify-center rounded-lg bg-gray-800 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-gray-700 transition"
          >
            Log out
          </button>
        </header>

        {/* Location Selector */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Select Your Store</h2>
          <LocationSelector />
        </div>

        {/* Chatbot Assistant */}
        <div className="mt-6">
          <ChatbotPanel />
        </div>
      </div>
    </div>
  );
}

