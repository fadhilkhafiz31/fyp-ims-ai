import { useEffect, useMemo, useRef, useState } from "react";
import * as motion from "motion/react-client";
import { PageReady } from "../components/NProgressBar";
import TopNavigation from "../components/TopNavigation";

export default function GeminiChatTest() {
  const webhookUrl = useMemo(() => import.meta.env.VITE_AI_WEBHOOK_URL || "", []);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm the Gemini AI test chatbot. I can help you check inventory and answer questions about stock levels." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem("geminiChatDarkMode");
    if (saved !== null) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Apply dark mode to document root
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Save to localStorage
    localStorage.setItem("geminiChatDarkMode", isDarkMode.toString());
  }, [isDarkMode]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);

    if (!webhookUrl) {
      setMessages((m) => [
        ...m,
        { 
          role: "assistant", 
          text: "Error: AI webhook not configured. Please set VITE_AI_WEBHOOK_URL environment variable to enable Gemini chat." 
        },
      ]);
      return;
    }

    setSending(true);
    try {
      // Call the new /chat endpoint
      const chatUrl = `${webhookUrl.replace(/\/$/, "")}/chat`;
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || data.response || `HTTP ${res.status}`);
      }
      
      const reply = data?.response || data?.fulfillmentText || "Sorry, I couldn't process that.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (error) {
      console.error("Gemini chat error:", error);
      setMessages((m) => [
        ...m, 
        { 
          role: "assistant", 
          text: `Error: ${error.message || "Network error. Please try again."}` 
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageReady />
      <TopNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gemini AI Chat Test
            </h1>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <>
                  <svg className="w-5 h-5 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Light</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-gray-800 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Dark</span>
                </>
              )}
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Test the new Gemini AI integration. This component calls the /chat endpoint directly.
          </p>
          {!webhookUrl && (
            <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900 border border-amber-400 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ VITE_AI_WEBHOOK_URL is not set. Please configure it in your .env file.
              </p>
            </div>
          )}
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden flex flex-col h-[600px] shadow-lg">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">Gemini AI Assistant</h2>
                <p className="text-xs text-blue-100">Powered by Google Gemini 1.5 Flash</p>
              </div>
              {webhookUrl && (
                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">
                  Connected
                </span>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div
            className="space-y-3 overflow-y-auto p-4 flex-1"
            style={{ minHeight: 0 }}
          >
            {messages.map((m, i) => (
              <motion.div
                key={i}
                className={m.role === "user" ? "text-right" : "text-left"}
                initial={{ opacity: 0, y: 10, x: m.role === "user" ? 20 : -20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{
                  duration: 0.3,
                  delay: i === 0 ? 0 : 0.1,
                  ease: "easeOut"
                }}
              >
                <motion.div
                  className={
                    "inline-block max-w-[85%] px-4 py-2 rounded-lg text-sm " +
                    (m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100")
                  }
                  style={{ whiteSpace: "pre-line" }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  {m.text}
                </motion.div>
              </motion.div>
            ))}
            
            {sending && (
              <motion.div
                className="text-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="inline-block bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={endRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                disabled={sending || !webhookUrl}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending || !webhookUrl}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Example: "What products are in stock?" or "How many units of rice do we have?"
            </p>
          </form>
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">About This Test</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>This component directly calls the /chat endpoint (not Dialogflow)</li>
            <li>Uses Google Gemini 1.5 Flash model</li>
            <li>Has access to all inventory data through context injection</li>
            <li>This is a test component - it can be replaced with the main chatbot later</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

