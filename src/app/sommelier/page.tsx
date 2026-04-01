"use client";

import { useState, useRef, useEffect } from "react";

interface Message { role: "user" | "assistant"; content: string; }

const quickActions = [
  { type: "recommend", label: "What should I open tonight?", sub: "Get a recommendation from your cellar" },
  { type: "pairing", label: "Food pairing help", sub: "Find the right wine for your meal" },
  { type: "insights", label: "Analyze my palate", sub: "Discover your taste patterns" },
];

export default function SommelierPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (message: string, type?: string) => {
    if (!message.trim() && !type) return;
    const userMsg = message || quickActions.find((a) => a.type === type)?.label || "";
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/sommelier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, type }) });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.error ? `Error: ${data.error}` : data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Sommelier</h1>
        <p className="text-[13px] text-text-tertiary mt-1">AI wine expert with knowledge of your collection</p>
      </div>

      {messages.length === 0 && (
        <div className="space-y-2 mb-6">
          {quickActions.map((a) => (
            <button key={a.type} onClick={() => send("", a.type)}
              className="w-full text-left bg-surface-raised rounded-xl border border-border p-4 hover:border-accent/20 transition-all group">
              <p className="text-[14px] text-text-primary font-medium group-hover:text-accent transition-colors">{a.label}</p>
              <p className="text-[12px] text-text-tertiary mt-0.5">{a.sub}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
              msg.role === "user"
                ? "bg-accent/15 text-text-primary"
                : "bg-surface-raised border border-border text-text-secondary"
            }`}>
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{
                __html: msg.content.replace(/\*\*(.*?)\*\*/g, "<strong class='text-text-primary'>$1</strong>").replace(/\n/g, "<br/>")
              }} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-raised border border-border rounded-xl px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => <div key={d} className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send(input)}
          placeholder="Ask about wine..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-[14px] text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          disabled={loading} />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          className="bg-accent/90 hover:bg-accent disabled:opacity-30 text-surface px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all">
          Send
        </button>
      </div>
    </div>
  );
}
