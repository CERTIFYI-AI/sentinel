import { useState, useRef, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PaperPlaneRight, Robot, User, CircleNotch } from "@phosphor-icons/react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What compliance frameworks apply to our AI systems?",
  "Summarize our highest-risk use cases",
  "Draft a risk assessment for facial recognition",
  "What are the EU AI Act requirements for high-risk AI?",
];

export default function AIAdvisor() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hello! I'm your AI Governance advisor. I can help with compliance questions, risk assessments, policy drafting, and regulatory guidance. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(p => [...p, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setMessages(p => [...p, { role: "assistant", content: "Thank you for your question. Based on your organization's compliance posture and the current regulatory landscape, I'd recommend reviewing the relevant framework controls and ensuring documentation is up to date. Would you like me to generate a detailed report?" }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">AI Advisor</h1>
        <p className="text-[hsl(var(--text-3))]">AI-powered governance and compliance assistant</p>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <div className="w-8 h-8 flex items-center justify-center bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] shrink-0"><Robot weight="duotone" size={18} /></div>}
              <div className={`max-w-[75%] px-4 py-2.5 text-sm ${m.role === "user" ? "bg-[hsl(var(--brand))] text-white" : "bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))]"}`}>{m.content}</div>
              {m.role === "user" && <div className="w-8 h-8 flex items-center justify-center bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-2))] shrink-0"><User weight="duotone" size={18} /></div>}
            </div>
          ))}
          {loading && <div className="flex gap-3"><div className="w-8 h-8 flex items-center justify-center bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]"><CircleNotch className="animate-spin" size={18} /></div><div className="bg-[hsl(var(--bg-raised))] px-4 py-2.5 text-sm text-[hsl(var(--text-3))]">Thinking...</div></div>}
          <div ref={endRef} />
        </div>
        {messages.length === 1 && <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">{SUGGESTIONS.map((s,i) => <button key={i} onClick={() => send(s)} className="text-left text-sm px-3 py-2 border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-2))] transition-colors">{s}</button>)}</div>}
        <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)} placeholder="Ask about governance, compliance, risk..." className="flex-1" />
          <Button onClick={() => send(input)} disabled={!input.trim() || loading} size="icon"><PaperPlaneRight weight="fill" size={18} /></Button>
        </div>
      </Card>
    </div>
  );
}
