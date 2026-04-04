"use client";

import { useState, useRef, useEffect } from "react";
import { useCategory } from "@/lib/CategoryContext";

interface Message { role: "user" | "assistant"; content: string; }

export default function SommelierPage() {
  const { category, config } = useCategory();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { type: "link", href: "/fridge/drink", label: config.drinkPrompt, sub: `Get an AI pick from your ${config.fridgeLabel.toLowerCase()} based on mood or food`, icon: config.icon },
    { type: "recommend", label: `General ${config.itemName} recommendation`, sub: `Get a recommendation from your full collection`, icon: config.icon },
    { type: "pairing", label: `${config.pairingLabel.toLowerCase()} help`, sub: `Find the right ${config.itemName} for your meal`, icon: "🍽" },
    { type: "insights", label: "Analyze my palate", sub: "Discover your taste patterns", icon: "✨" },
  ];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (message: string, type?: string) => {
    if (!message.trim() && !type) return;
    const userMsg = message || quickActions.find((a) => a.type === type)?.label || "";
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/sommelier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, type, category }) });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.error ? `Error: ${data.error}` : data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">{config.sommelierLabel}</h1>
        <p className="text-[13px] text-text-tertiary mt-0.5">AI {config.itemName} expert with knowledge of your collection</p>
      </div>

      {messages.length === 0 && (
        <div className="space-y-2 mb-6">
          {quickActions.map((a) => (
            a.type === "link" ? (
            <a key={a.type} href={a.href}
              className="w-full text-left bg-surface-raised rounded-xl border border-border-subtle p-4 hover:border-border transition-all group flex items-center gap-3.5">
              <span className="text-xl opacity-50 group-hover:opacity-80 transition-opacity">{a.icon}</span>
              <div>
                <p className="text-[13px] text-text-primary font-medium group-hover:text-gold transition-colors">{a.label}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{a.sub}</p>
              </div>
            </a>
            ) : (
            <button key={a.type} onClick={() => send("", a.type)}
              className="w-full text-left bg-surface-raised rounded-xl border border-border-subtle p-4 hover:border-border transition-all group flex items-center gap-3.5">
              <span className="text-xl opacity-50 group-hover:opacity-80 transition-opacity">{a.icon}</span>
              <div>
                <p className="text-[13px] text-text-primary font-medium group-hover:text-gold transition-colors">{a.label}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{a.sub}</p>
              </div>
            </button>
            )
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
              msg.role === "user"
                ? "bg-gold-muted text-text-primary border border-gold/10"
                : "bg-surface-raised border border-border-subtle text-text-secondary"
            }`}>
              <div className="text-[13px] leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{
                __html: msg.content.replace(/\*\*(.*?)\*\*/g, "<strong class='text-text-primary'>$1</strong>").replace(/\n/g, "<br/>")
              }} />
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-raised border border-border-subtle rounded-xl px-4 py-3">
              <div className="flex gap-1.5">
                {[0, 150, 300].map((d) => <div key={d} className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send(input)}
          placeholder={`Ask about ${config.itemNamePlural}...`}
          className="flex-1 px-3.5 py-2.5 rounded-lg bg-surface-raised border border-border-subtle text-[13px] text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/30 focus:ring-1 focus:ring-gold/20 transition-all"
          disabled={loading} />
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          className="bg-gold/90 hover:bg-gold disabled:opacity-30 text-bg px-4 py-2.5 rounded-lg text-[12px] font-semibold transition-all">
          Send
        </button>
      </div>
    </div>
  );
}
