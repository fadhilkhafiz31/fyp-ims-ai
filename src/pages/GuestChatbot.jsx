import { Link } from "react-router-dom";
import ChatbotPanel from "../components/ChatbotPanel";
import LocationSelector from "../components/LocationSelector";
import { PageReady } from "../components/NProgressBar";

export default function GuestChatbot() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <PageReady />

      <header className="bg-[#2E6A4E] text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Smart Stock AI (1).png"
              alt="SmartStock AI Logo"
              className="h-10 w-auto"
            />
            <div>
              <p className="text-sm uppercase tracking-widest text-white/70">
                Guest Assistant
              </p>
              <h1 className="text-lg font-semibold">SmartStockAI</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="bg-white text-[#2E6A4E] font-semibold px-4 py-2 rounded-lg hover:bg-green-50 transition"
            >
              Log in for full access
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Choose a nearby store
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Where should we check stock?
                </h2>
              </div>
              <Link
                to="/register"
                className="text-sm font-medium text-[#2E6A4E] hover:underline"
              >
                Create an account
              </Link>
            </div>
            <div className="mt-4">
              <LocationSelector />
            </div>
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl" role="img" aria-label="Chatbot">
                🤖
              </span>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  SmartStockAI Assistant
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Guest mode: responses are limited to public inventory data.
                </p>
              </div>
            </div>
            <ChatbotPanel />
          </section>
        </div>
      </main>
    </div>
  );
}


