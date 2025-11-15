import { useEffect, useMemo, useRef, useState } from "react";

export default function ChatbotPanel() {
  const webhookUrl = useMemo(() => import.meta.env.VITE_AI_WEBHOOK_URL || "", []);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I can help check item availability and stock levels." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);

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
      let res = await fetch(detectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          languageCode: "en",
          storeId: "", // Always search all stores for chatbot queries
        }),
      });
      if (!res.ok) {
        // Fallback to existing DF-like payload endpoint
        res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queryResult: {
              queryText: text,
              parameters: { any: text, store: "" }, // Global search
            },
          }),
        });
      }
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
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold">SmartStock Assistant</h2>
        {!import.meta.env.VITE_AI_WEBHOOK_URL && import.meta.env.DEV && (
          <span className="text-xs text-amber-600 dark:text-amber-400">Demo mode</span>
        )}
      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={
                "inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm " +
                (m.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100")
              }
            >
              {m.text}
            </div>
          </div>
        ))}
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
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md"
        >
          Send
        </button>
      </form>
    </div>
  );
}


