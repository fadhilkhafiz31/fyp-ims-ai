import { useEffect, useMemo, useRef, useState } from "react";
import * as motion from "motion/react-client";
import { useStore } from "../contexts/StoreContext";
import { useRole } from "../hooks/useRole";

// Helper function to get localStorage key for a specific role
const getStorageKey = (role) => {
  if (!role) return null;
  return `messages_${role}`;
};

// Helper function to load messages for a specific role
const loadMessages = (role) => {
  const storageKey = getStorageKey(role);
  if (!storageKey) {
    // No role, return default welcome message
    return [{ role: "assistant", text: "Hi! I can help check item availability and stock levels." }];
  }

  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Validate that parsed data is an array
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn(`Failed to parse saved chat messages for role ${role}:`, error);
    }
  }
  // Default welcome message if no saved messages for this role
  return [{ role: "assistant", text: "Hi! I can help check item availability and stock levels." }];
};

// Helper function to save messages for a specific role
const saveMessages = (role, messages) => {
  const storageKey = getStorageKey(role);
  if (!storageKey) {
    // No role, don't save (user is logged out)
    return;
  }
  localStorage.setItem(storageKey, JSON.stringify(messages));
};

export default function ChatbotPanel({ fullHeight = false }) {
  const webhookUrl = useMemo(() => import.meta.env.VITE_AI_WEBHOOK_URL || "", []);
  const { storeName, storeId } = useStore();
  const { role, ready } = useRole();
  
  // Initialize messages state - will be updated when role is ready
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I can help check item availability and stock levels." },
  ]);
  
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // Load messages when role changes or becomes ready
  useEffect(() => {
    if (!ready) return; // Wait for role to be ready
    
    if (!role) {
      // User logged out - clear messages but don't delete other roles' messages
      setMessages([{ role: "assistant", text: "Hi! I can help check item availability and stock levels." }]);
      return;
    }
    
    // Load messages for the current role
    const roleMessages = loadMessages(role);
    setMessages(roleMessages);
  }, [role, ready]);

  // Save messages to localStorage whenever they change (only if role is available)
  useEffect(() => {
    if (!ready || !role) return; // Don't save if no role (logged out)
    saveMessages(role, messages);
  }, [messages, role, ready]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check if the message is asking about the current time
  function isTimeQuestion(text) {
    const normalized = text.toLowerCase().trim();
    const timeKeywords = [
      "what time",
      "what's the time",
      "what is the time",
      "current time",
      "time now",
      "time is it",
      "tell me the time",
      "what time is",
      "time please",
      "show me the time",
      "time please",
      "time?"
    ];
    return timeKeywords.some((keyword) => normalized.includes(keyword));
  }

  // Get formatted current time
  function getCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const dateString = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return `The current time is ${timeString}.\nToday is ${dateString}.`;
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);

    // Check if it's a time question and handle it directly
    if (isTimeQuestion(text)) {
      const timeResponse = getCurrentTime();
      setMessages((m) => [...m, { role: "assistant", text: timeResponse }]);
      return;
    }

    if (!webhookUrl) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "AI webhook not configured. Set VITE_AI_WEBHOOK_URL to enable live replies." },
      ]);
      return;
    }

    setSending(true);
    try {
      // Call Gemini /chat endpoint (ensure no double slash)
      const chatUrl = `${webhookUrl.replace(/\/$/, "")}/chat`;
      const res = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data?.response || data?.fulfillmentText || "Sorry, I couldn't process that.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (_e) {
      setMessages((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  const containerClasses =
    "border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 overflow-hidden flex flex-col";
  return (
    <div className={`${containerClasses} ${fullHeight ? "h-full" : ""}`}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">SmartStock Assistant</h2>
          {!import.meta.env.VITE_AI_WEBHOOK_URL && import.meta.env.DEV && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Demo mode</span>
          )}
        </div>

      </div>

      <div
        className={`space-y-3 overflow-y-auto p-4 ${fullHeight ? "flex-1" : "h-80"}`}
        style={fullHeight ? { minHeight: 0 } : undefined}
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
                "inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm " +
                (m.role === "user"
                  ? "bg-[#0F5132] text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white")
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
            <div className="inline-block px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800">
              <div className="flex gap-1">
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-gray-600 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about an item, e.g., 'Do you have Beras Faiza 5KG?'"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F5132] placeholder-gray-500 dark:placeholder-gray-400"
        />
        <motion.button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-[#0F5132] hover:bg-[#0d4528] disabled:opacity-50 text-white rounded-md flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {sending && (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {sending ? "Sending..." : "Send"}
        </motion.button>
      </form>
    </div>
  );
}


