import React, { useState, useEffect } from "react";
import { ShieldCheck, Warning, XCircle, FileText, TrendUp, ClockCountdown, Scales } from "@phosphor-icons/react";
import Badge from "../components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';

const MOCK_METRICS = [
  { label: "Compliance Score", value: "84%", delta: "+3%", icon: ShieldCheck, color: "text-emerald-400 bg-emerald-500/10" },
  { label: "Open Risks", value: "12", delta: "-2", icon: Warning, color: "text-yellow-400 bg-yellow-500/10" },
  { label: "Failing Controls", value: "7", delta: "-1", icon: XCircle, color: "text-red-400 bg-red-500/10" },
  { label: "Active Policies", value: "23", delta: "+1", icon: FileText, color: "text-blue-400 bg-emerald-600/10" },
];

const MOCK_FRAMEWORKS = [
  { name: "ISO 27001", score: 87, controls: 114, passing: 99, status: "healthy" },
  { name: "SOC 2 Type II", score: 82, controls: 64, passing: 53, status: "healthy" },
  { name: "EU AI Act", score: 71, controls: 48, passing: 34, status: "degraded" },
  { name: "OWASP LLM Top 10", score: 68, controls: 30, passing: 20, status: "degraded" },
];

const MOCK_RISKS = [
  { id: 1, title: "Prompt Injection via Customer Input", score: 16, status: "open", category: "AI Security" },
  { id: 2, title: "Unauthorized Model Access", score: 12, status: "mitigated", category: "Access Control" },
  { id: 3, title: "Data Leakage in LLM Context", score: 15, status: "open", category: "Data Privacy" },
];

const MOCK_EVENTS = [
  { id: 1, action: "Control assessed", resource: "AC-2 Account Management", user: "admin@certifyi.ai", outcome: "passing", ts: "2025-06-03 09:12" },
  { id: 2, action: "Risk created", resource: "Data Breach via LLM Output", user: "bhaskar@certifyi.ai", outcome: "open", ts: "2025-06-03 08:45" },
  { id: 3, action: "Policy updated", resource: "AI Acceptable Use Policy", user: "admin@certifyi.ai", outcome: "active", ts: "2025-06-02 17:30" },
  { id: 4, action: "Framework synced", resource: "ISO 27001", user: "system", outcome: "healthy", ts: "2025-06-02 15:00" },
  { id: 5, action: "Control failed", resource: "IA-5 Authenticator Mgmt", user: "scanner", outcome: "failing", ts: "2025-06-02 12:15" },
];

export default function Overview() {
  const [frameworks, setFrameworks] = useState(MOCK_FRAMEWORKS);
  useEffect(() => {
    fetch("/api/overview/summary").then(r=>r.json()).then(d=>{ if(d?.frameworks) setFrameworks(d.frameworks); }).catch(()=>{});
  }, []);
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-outfit">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI governance posture at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="healthy" pulse>Live</Badge>
          <span className="text-xs text-muted-foreground">Updated just now</span>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_METRICS.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-sm p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                <p className="text-3xl font-bold text-foreground font-outfit">{m.value}</p>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendUp size={12}/><span>{m.delta} this week</span></p>
              </div>
              <div className={`p-2.5 rounded-sm ${m.color}`}><Icon size={22} weight="duotone"/></div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground font-outfit flex items-center gap-2"><Scales size={16} className="text-emerald-400"/>Compliance Frameworks</h2>
          </div>
          <div className="divide-y divide-border">
            {frameworks.map((fw, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{fw.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{fw.score}%</span>
                    <Badge variant={fw.status as any}>{fw.status}</Badge>
                  </div>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${fw.score>=80?"bg-emerald-500":fw.score>=60?"bg-yellow-500":"bg-red-500"}`} style={{width:`${fw.score}%`}}/>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{fw.passing}/{fw.controls} controls passing</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground font-outfit flex items-center gap-2"><Warning size={16} className="text-yellow-400"/>Top Risks</h2>
          </div>
          <div className="divide-y divide-border">
            {MOCK_RISKS.map(r => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground leading-snug">{r.title}</p>
                  <Badge variant={r.score>=15?"critical":r.score>=10?"warning":"low"} size="sm">{r.score}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={r.status as any} size="sm">{r.status}</Badge>
                  <span className="text-[10px] text-muted-foreground">{r.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-sm">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground font-outfit flex items-center gap-2"><ClockCountdown size={16} className="text-blue-400"/>Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader><TableRow className="border-b border-border text-muted-foreground">
              <TableHead className="px-5 py-2.5 text-left font-medium">Action</TableHead>
              <TableHead className="px-5 py-2.5 text-left font-medium">Resource</TableHead>
              <TableHead className="px-5 py-2.5 text-left font-medium">User</TableHead>
              <TableHead className="px-5 py-2.5 text-left font-medium">Outcome</TableHead>
              <TableHead className="px-5 py-2.5 text-left font-medium">Time</TableHead>
            </TableRow></TableHeader>
            <TableBody className="divide-y divide-border">
              {MOCK_EVENTS.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="px-5 py-3 text-foreground">{e.action}</TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground">{e.resource}</TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground">{e.user}</TableCell>
                  <TableCell className="px-5 py-3"><Badge variant={e.outcome as any}>{e.outcome}</Badge></TableCell>
                  <TableCell className="px-5 py-3 text-muted-foreground whitespace-nowrap">{e.ts}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
