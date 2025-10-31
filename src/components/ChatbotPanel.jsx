// src/components/ChatbotPanel.jsx
import { useEffect, useMemo } from "react";

const CHATBOT_IFRAME_URL = import.meta.env.VITE_CHATBOT_IFRAME_URL?.trim();
const DIALOGFLOW_AGENT_ID = import.meta.env.VITE_DIALOGFLOW_AGENT_ID?.trim();
const DIALOGFLOW_CHAT_TITLE =
  import.meta.env.VITE_DIALOGFLOW_CHAT_TITLE?.trim() || "IMS Assistant";
const DIALOGFLOW_LANGUAGE =
  import.meta.env.VITE_DIALOGFLOW_LANGUAGE?.trim() || "en";

export default function ChatbotPanel() {
  const mode = useMemo(() => {
    if (CHATBOT_IFRAME_URL) return "iframe";
    if (DIALOGFLOW_AGENT_ID) return "dialogflow";
    return "placeholder";
  }, []);

  useEffect(() => {
    if (mode !== "dialogflow") return undefined;

    // Load Dialogflow messenger bootstrap script once.
    const existing = document.querySelector("script[data-dialogflow-messenger]");
    if (existing) return undefined;

    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/dialogflow-console/fast/messenger/bootstrap.js?v=1";
    script.async = true;
    script.setAttribute("data-dialogflow-messenger", "true");
    document.body.appendChild(script);

    return undefined;
  }, [mode]);

  return (
    <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
          Inventory Chatbot
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Ask about stock availability, pricing, or SKU details.
        </p>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-900">
        {mode === "iframe" && (
          <iframe
            src={CHATBOT_IFRAME_URL}
            title="Inventory chatbot"
            allow="microphone;"
            className="w-full h-[480px] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          />
        )}

        {mode === "dialogflow" && (
          <div className="flex justify-center">
            <df-messenger
              chat-title={DIALOGFLOW_CHAT_TITLE}
              agent-id={DIALOGFLOW_AGENT_ID}
              language-code={DIALOGFLOW_LANGUAGE}
            ></df-messenger>
          </div>
        )}

        {mode === "placeholder" && (
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              Configure <code className="font-mono">VITE_CHATBOT_IFRAME_URL</code> or
              <code className="font-mono"> VITE_DIALOGFLOW_AGENT_ID</code> in your environment file to enable the customer
              chatbot widget.
            </p>
            <p>
              Once configured, customers will see the live chatbot here instead of this message.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
