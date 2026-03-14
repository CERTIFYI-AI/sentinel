import React, { useState, useEffect } from "react";
import { Scales, Plus, MagnifyingGlass, ArrowsClockwise } from "@phosphor-icons/react";
import Badge from "../components/ui/badge";

const MOCK: any[] = [
  { id: "1", name: "ISO 27001:2022", version: "2022", status: "active", score: 87, controls_total: 114, controls_passing: 99, description: "Information security management systems", last_assessed: "2025-05-30" },
  { id: "2", name: "SOC 2 Type II", version: "2017", status: "active", score: 82, controls_total: 64, controls_passing: 53, description: "Service organization controls for security", last_assessed: "2025-05-28" },
  { id: "3", name: "EU AI Act", version: "2024", status: "active", score: 71, controls_total: 48, controls_passing: 34, description: "European Union AI regulation compliance", last_assessed: "2025-06-01" },
  { id: "4", name: "OWASP LLM Top 10", version: "2023", status: "active", score: 68, controls_total: 30, controls_passing: 20, description: "LLM application security risks", last_assessed: "2025-05-25" },
  { id: "5", name: "NIST AI RMF", version: "1.0", status: "draft", score: 55, controls_total: 40, controls_passing: 22, description: "AI Risk Management Framework", last_assessed: "2025-05-20" },
];

export default function Frameworks() {
  const [items, setItems] = useState(MOCK);
  const [search, setSearch] = useState("");
  useEffect(() => {
    fetch("/api/frameworks").then(r=>r.json()).then(d=>{ const arr=Array.isArray(d)?d:d.items||[]; if(arr.length) setItems(arr); }).catch(()=>{});
  }, []);
  const filtered = items.filter(x => x.name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-outfit flex items-center gap-2"><Scales size={20} className="text-emerald-400"/>Compliance Frameworks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track your compliance framework coverage</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-foreground text-sm font-medium rounded-sm transition-colors">
          <Plus size={16}/>Add Framework
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search frameworks..." className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
        </div>
        <button onClick={()=>setItems([...MOCK])} className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-sm text-muted-foreground rounded-sm hover:text-foreground transition-colors">
          <ArrowsClockwise size={14}/>Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(fw => (
          <div key={fw.id} className="bg-card border border-border rounded-sm p-5 hover:border-emerald-500/30 transition-colors cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground font-outfit">{fw.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">v{fw.version}</p>
              </div>
              <Badge variant={fw.score>=80?"healthy":fw.score>=60?"degraded":"critical"}>{fw.score>=80?"Healthy":fw.score>=60?"Degraded":"Critical"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{fw.description}</p>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{fw.controls_passing}/{fw.controls_total} controls</span>
                <span className="font-bold text-foreground">{fw.score}%</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${fw.score>=80?"bg-emerald-500":fw.score>=60?"bg-yellow-500":"bg-red-500"}`} style={{width:`${fw.score}%`}}/>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-[10px] text-muted-foreground">Last: {fw.last_assessed}</span>
              <Badge variant={fw.status as any} size="sm">{fw.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
