"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const quickActions = [
  { type: "recommend", label: "What should I open tonight?", icon: "🍷" },
  { type: "pairing", label: "Food pairing help", icon: "🍽️" },
  { type: "insights", label: "Analyze my taste", icon: "📊" },
];

export default function SommelierPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (message: string, type?: string) => {
    if (!message.trim() && !type) return;

    const userMsg = message || quickActions.find((a) => a.type === type)?.label || "";
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/sommelier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, type }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, I encountered an error: ${e instanceof Error ? e.message : "Unknown error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-wine-100">AI Sommelier</h1>
        <p className="text-sm text-wine-400">Your personal wine expert, powered by AI with knowledge of your collection</p>
      </div>

      {/* Quick actions */}
      {messages.length === 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-sm text-wine-500">Quick actions:</p>
          {quickActions.map((action) => (
            <button
              key={action.type}
              onClick={() => send("", action.type)}
              className="w-full text-left bg-wine-900/40 border border-wine-800/40 rounded-xl p-4 hover:border-wine-700/60 hover:bg-wine-900/60 transition-all flex items-center gap-3"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-wine-200 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-wine-700 text-white"
                  : "bg-wine-900/60 border border-wine-800/40 text-wine-100"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br/>")
              }} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-wine-900/60 border border-wine-800/40 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-wine-400 animate-bounce [animation-delay:0ms]" />
                <div className="w-2 h-2 rounded-full bg-wine-400 animate-bounce [animation-delay:150ms]" />
                <div className="w-2 h-2 rounded-full bg-wine-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send(input)}
          placeholder="Ask me anything about wine..."
          className="flex-1 px-4 py-3 rounded-xl border border-wine-800/50 bg-wine-900/50 text-stone-100 placeholder-wine-600 focus:outline-none focus:ring-2 focus:ring-wine-500"
          disabled={loading}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-wine-700 hover:bg-wine-600 disabled:bg-wine-900 disabled:text-wine-700 text-white px-5 py-3 rounded-xl font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
