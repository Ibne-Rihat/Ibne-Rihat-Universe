import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, X, Send, Loader2, Zap, Check } from "lucide-react";
import api from "@/lib/api";

const SUGGESTIONS = [
  "Add a $500 Fiverr payment today",
  "Create a client called Acme from USA",
  "Log a 50 min chest workout, 600 calories",
  "How much income do I have this month?",
  "Set a monthly goal: hit 10k revenue at 30%",
];

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (open && messages.length === 0) {
      api.get("/ai/messages").then((r) => {
        const hist = [];
        (r.data || []).forEach((m) => {
          hist.push({ role: "user", text: m.message });
          hist.push({ role: "ai", text: m.reply, actions: m.actions || [] });
        });
        setMessages(hist);
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const { data } = await api.post("/ai/chat", { message: msg });
      setMessages((m) => [...m, { role: "ai", text: data.reply, actions: data.actions_done || [] }]);
      if ((data.actions_done || []).length) {
        // Refresh every data view in the app
        qc.invalidateQueries();
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "ai", text: e.response?.data?.detail || "Something went wrong.", actions: [] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <button onClick={() => setOpen((o) => !o)} data-testid="ai-launcher"
        className="fixed bottom-24 right-6 z-[60] h-14 w-14 rounded-2xl bg-lime-400 text-black flex items-center justify-center neon-glow hover:bg-lime-300 transition-all hover:scale-105">
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-40 right-6 z-[60] w-[calc(100vw-3rem)] sm:w-[420px] h-[560px] max-h-[72vh] glass rounded-2xl flex flex-col overflow-hidden fade-up" data-testid="ai-panel">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
            <div className="h-9 w-9 rounded-xl bg-lime-400 flex items-center justify-center">
              <Zap className="h-4 w-4 text-black" />
            </div>
            <div>
              <div className="font-head font-semibold text-white text-sm">Azmuth</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-lime-400/80">AI Operator</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Sparkles className="h-8 w-8 text-lime-400/40 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">Tell me anything — I'll update your Universe.</p>
                <div className="flex flex-col gap-2 mt-5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} data-testid="ai-suggestion"
                      className="text-left text-xs text-zinc-300 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-lime-400/30 hover:text-white transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-lime-400 text-black rounded-br-sm" : "bg-white/[0.05] text-zinc-200 border border-white/5 rounded-bl-sm"
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.actions?.length > 0 && (
                    <div className="mt-2 space-y-1 pt-2 border-t border-black/10">
                      {m.actions.map((a, j) => (
                        <div key={j} className="flex items-center gap-1.5 text-[11px] opacity-80">
                          <Check className="h-3 w-3" /> {a}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.05] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 text-lime-400 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a command or question..."
                data-testid="ai-input"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-lime-400/50"
              />
              <button onClick={() => send()} disabled={loading || !input.trim()} data-testid="ai-send"
                className="h-10 w-10 rounded-xl bg-lime-400 text-black flex items-center justify-center hover:bg-lime-300 disabled:opacity-40 transition-all">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
