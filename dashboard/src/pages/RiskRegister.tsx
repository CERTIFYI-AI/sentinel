import React, { useState, useEffect } from "react";
import { Warning, Plus, MagnifyingGlass } from "@phosphor-icons/react";
import Badge from "../components/ui/badge";

const MOCK: any[] = [
  { id:"1", title:"Prompt Injection via Customer Input", description:"Malicious prompts injected through user-facing AI interfaces", likelihood:4, impact:4, risk_score:16, status:"open", category:"AI Security", owner:"ai@certifyi.ai", created_at:"2025-05-15" },
  { id:"2", title:"Unauthorized Model Access", description:"Unauthorized access to proprietary AI models", likelihood:3, impact:4, risk_score:12, status:"mitigated", category:"Access Control", owner:"sec@certifyi.ai", created_at:"2025-05-10" },
  { id:"3", title:"Data Leakage in LLM Context Window", description:"Sensitive data exposed via LLM context", likelihood:3, impact:5, risk_score:15, status:"open", category:"Data Privacy", owner:"privacy@certifyi.ai", created_at:"2025-05-20" },
  { id:"4", title:"Supply Chain Attack on AI Dependencies", description:"Compromised third-party AI libraries", likelihood:2, impact:5, risk_score:10, status:"accepted", category:"Supply Chain", owner:"ops@certifyi.ai", created_at:"2025-04-28" },
  { id:"5", title:"Model Hallucination in Compliance Guidance", description:"AI gives incorrect compliance advice", likelihood:4, impact:3, risk_score:12, status:"open", category:"AI Reliability", owner:"ai@certifyi.ai", created_at:"2025-05-25" },
  { id:"6", title:"Insider Threat - Data Exfiltration", description:"Employee exfiltrates training data", likelihood:2, impact:4, risk_score:8, status:"closed", category:"Insider Threat", owner:"hr@certifyi.ai", created_at:"2025-04-15" },
];

const riskLevel = (score: number) => score>=15?"critical":score>=10?"high":score>=5?"medium":"low";

export default function RiskRegister() {
  const [items, setItems] = useState(MOCK);
  const [search, setSearch] = useState("");
  const [statusFunnel, setStatusFunnel] = useState("all");
  useEffect(() => {
    fetch("/api/risks").then(r=>r.json()).then(d=>{ const arr=Array.isArray(d)?d:d.items||[]; if(arr.length) setItems(arr); }).catch(()=>{});
  }, []);
  const filtered = items
    .filter(x=>statusFunnel==="all"||x.status===statusFunnel)
    .filter(x=>x.title?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>b.risk_score-a.risk_score);
  const counts = { open:items.filter(x=>x.status==="open").length, critical:items.filter(x=>x.risk_score>=15).length, mitigated:items.filter(x=>x.status==="mitigated").length };
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-outfit flex items-center gap-2"><Warning size={20} className="text-yellow-400"/>Risk Register</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage AI governance risks</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-foreground text-sm font-medium rounded-sm transition-colors">
          <Plus size={16}/>Add Risk
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Open Risks",count:counts.open,v:"open"},{label:"Critical",count:counts.critical,v:"critical"},{label:"Mitigated",count:counts.mitigated,v:"mitigated"}].map((s,i)=>(
          <div key={i} className="bg-card border border-border rounded-sm p-4">
            <p className="text-2xl font-bold text-foreground font-outfit">{s.count}</p>
            <div className="flex items-center gap-2 mt-1"><Badge variant={s.v as any} size="sm">{s.label}</Badge></div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="MagnifyingGlass risks..." className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
        </div>
        <select value={statusFunnel} onChange={e=>setStatusFunnel(e.target.value)} className="px-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground focus:outline-none">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="mitigated">Mitigated</option>
          <option value="accepted">Accepted</option>
          <option value="closed">Closed</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered.map(r => (
          <div key={r.id} className="bg-card border border-border rounded-sm p-5 hover:border-yellow-500/20 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{r.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Owner: <span className="text-foreground">{r.owner}</span></span>
                  <span>Category: <span className="text-foreground">{r.category}</span></span>
                  <span>Created: {r.created_at}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-center">
                  <div className={`text-2xl font-bold font-outfit ${r.risk_score>=15?"text-red-400":r.risk_score>=10?"text-yellow-400":"text-blue-400"}`}>{r.risk_score}</div>
                  <div className="text-[10px] text-muted-foreground">Risk Score</div>
                </div>
                <Badge variant={riskLevel(r.risk_score) as any}>{riskLevel(r.risk_score)}</Badge>
                <Badge variant={r.status as any}>{r.status}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>Likelihood: <span className="font-semibold text-foreground">{r.likelihood}/5</span></span>
              <span>Impact: <span className="font-semibold text-foreground">{r.impact}/5</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
