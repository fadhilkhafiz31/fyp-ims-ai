import { Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";
import { RouteProgress, PageReady } from "./components/NProgressBar";
import { AnimatePresence } from "motion/react";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Transactions = lazy(() => import("./pages/Transactions"));
const Checkout = lazy(() => import("./pages/Checkout"));
const StockNotification = lazy(() => import("./pages/StockNotification"));
const GuestChatbot = lazy(() => import("./pages/CustomerOrGuestDashboard"));
const GeminiChatTest = lazy(() => import("./pages/GeminiChatTest"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));
const RedeemPoints = lazy(() => import("./pages/RedeemPoints"));
const Chatbot = lazy(() => import("./pages/Chatbot"));
const GuestChatbotFull = lazy(() => import("./pages/GuestChatbotFull"));

export default function App() {
  const location = useLocation();

  return (
    <>
      <RouteProgress />
      <Suspense
        fallback={
          <div className="p-6 flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border border-gray-400 border-t-transparent" />
            Loading…
          </div>
        }
      >
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard-customer-guest" element={<GuestChatbot />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PageReady />
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <PageReady />
                    <Inventory />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <PageReady />
                    <Transactions />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <PageReady />
                    <Checkout />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/stock-notification"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <PageReady />
                    <StockNotification />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/gemini-chat-test"
              element={
                <ProtectedRoute>
                  <PageReady />
                  <GeminiChatTest />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["customer"]}>
                    <PageReady />
                    <CustomerProfile />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/redeem-points"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["customer", "guest"]}>
                    <PageReady />
                    <RedeemPoints />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/chatbot"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["admin", "staff"]}>
                    <PageReady />
                    <Chatbot />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            <Route
              path="/guest-chatbot-full"
              element={
                <ProtectedRoute>
                  <RoleGuard allow={["customer", "guest"]}>
                    <PageReady />
                    <GuestChatbotFull />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Default route */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <PageReady />
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  );
}
