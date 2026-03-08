import { useState } from "react";
import { mockAuditEntries } from "../lib/mockData";
import { Card, CardContent } from "../components/ui/card";

const tc = (s: number) => s >= 0.85 ? "text-green-400" : s >= 0.7 ? "text-amber-400" : "text-red-400";
const ib = (i: string) => ({ NONE: "bg-zinc-800 text-zinc-400", REGENERATE: "bg-blue-950 text-blue-400", UPGRADE: "bg-amber-950 text-amber-400", HITL: "bg-red-950 text-red-400", BLOCKED: "bg-purple-950 text-purple-400" }[i] || "bg-zinc-800 text-zinc-400");

export default function AuditLog() {
  const [filter, setFilter] = useState("All");
  const entries = filter === "All" ? mockAuditEntries : mockAuditEntries.filter(e => e.intervention === filter);
  return (
    <div className="p-6 space-y-4">
      <div><h1 className="text-xl font-bold">Audit Log</h1><p className="text-sm text-muted-foreground">Append-only SHA-256 hash chain — cryptographic proof for every AI decision</p></div>
      <div className="flex gap-2 items-center">
        {["All","NONE","REGENERATE","UPGRADE","HITL","BLOCKED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs rounded ${filter === f ? "bg-[hsl(var(--primary,136_45%_45%))] text-white" : "bg-[hsl(var(--surface-2,240_10%_6.5%))] text-muted-foreground hover:bg-[hsl(var(--surface-3,240_8%_9%))]"}`}>{f}</button>
        ))}
        <div className="ml-auto"><button className="px-3 py-1.5 text-xs rounded bg-[hsl(var(--surface-2,240_10%_6.5%))] text-muted-foreground">Verify Chain</button></div>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-[hsl(var(--surface-2,240_10%_6.5%))]">
              {["Timestamp","Request ID","Model","Trust","Intervention","PII","Latency","Cost","Hash"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={i} className={`border-b border-[hsl(var(--border-2,240_3.7%_12%))] hover:bg-[hsl(var(--accent,240_3.7%_15.9%))] ${e.intervention === "HITL" ? "border-l-2 border-l-red-500" : e.intervention === "BLOCKED" ? "bg-red-950/20" : ""}`}>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.timestamp}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{e.id}</td>
                  <td className="px-3 py-2.5 text-xs">{e.model}</td>
                  <td className={`px-3 py-2.5 font-mono text-xs font-bold ${tc(e.trust_score)}`}>{e.trust_score.toFixed(4)}</td>
                  <td className="px-3 py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded ${ib(e.intervention)}`}>{e.intervention}</span></td>
                  <td className={`px-3 py-2.5 text-xs ${e.pii_count > 0 ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>{e.pii_count}</td>
                  <td className={`px-3 py-2.5 font-mono text-xs ${e.latency_ms > 800 ? "text-red-400" : e.latency_ms > 400 ? "text-amber-400" : "text-green-400"}`}>{e.latency_ms}ms</td>
                  <td className="px-3 py-2.5 font-mono text-xs">${e.cost.toFixed(5)}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">{e.chain_hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-3 py-2.5 text-xs text-muted-foreground border-t border-border">
            <span>Showing {entries.length} of {mockAuditEntries.length} entries</span>
            <div className="flex gap-1">{[1,2,3].map(p => <button key={p} className={`w-8 h-8 rounded ${p===1?"bg-[hsl(var(--primary,136_45%_45%))] text-white":"hover:bg-[hsl(var(--accent,240_3.7%_15.9%))]"}`}>{p}</button>)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
