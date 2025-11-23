import { useEffect, useMemo, useRef, useState } from "react";
import * as motion from "motion/react-client";
import { useStore } from "../contexts/StoreContext";

export default function ChatbotPanel() {
  const webhookUrl = useMemo(() => import.meta.env.VITE_AI_WEBHOOK_URL || "", []);
  const { storeName, storeId } = useStore();
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I can help check item availability and stock levels." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

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
      // Try Dialogflow detect-intent passthrough first (ensure no double slash)
      const detectUrl = `${webhookUrl.replace(/\/$/, "")}/detect-intent`;
      const res = await fetch(detectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          languageCode: "en",
          storeId: storeId || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data?.fulfillmentText || "Sorry, I couldn't process that.";
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (_e) {
      setMessages((m) => [...m, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">SmartStock Assistant</h2>
          {!import.meta.env.VITE_AI_WEBHOOK_URL && import.meta.env.DEV && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Demo mode</span>
          )}
        </div>

      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-3">
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
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100")
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

      <form onSubmit={handleSend} className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about an item, e.g., 'Do you have Beras Faiza 5KG?'"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <motion.button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          Send
        </motion.button>
      </form>
    </div>
  );
}


