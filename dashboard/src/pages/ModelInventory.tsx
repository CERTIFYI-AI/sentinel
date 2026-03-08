import { mockModels } from "../lib/mockData";
import { Card, CardContent } from "../components/ui/card";

const pc = (p: string) => ({ openai: "bg-green-950 text-green-400", anthropic: "bg-orange-950 text-orange-400", local: "bg-zinc-800 text-zinc-400", mistral: "bg-blue-950 text-blue-400" }[p] || "bg-zinc-800 text-zinc-400");
const rc = (r: string) => ({ PRIMARY: "bg-green-950 text-green-400 border border-green-800", FALLBACK: "bg-blue-950 text-blue-400 border border-blue-800", EVALUATION: "bg-zinc-800 text-zinc-400 border border-zinc-700", DISABLED: "bg-red-950 text-red-400 border border-red-800" }[r] || "bg-zinc-800 text-zinc-400");
const cc = (c: string) => ({ CLOSED: "bg-green-500", HALF_OPEN: "bg-amber-500 animate-pulse", OPEN: "bg-red-500 animate-pulse" }[c] || "bg-zinc-500");
const tc = (s: number) => s >= 0.85 ? "text-green-400" : s >= 0.7 ? "text-amber-400" : "text-red-400";

export default function ModelInventory() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between"><div><h1 className="text-xl font-bold">Model Inventory</h1><p className="text-sm text-muted-foreground">Manage LLM providers and monitor circuit breaker health in real time</p></div><button className="px-4 py-2 text-sm rounded bg-[hsl(var(--primary,136_45%_45%))] text-white">Add Model</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {mockModels.map(m => (
          <Card key={m.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${pc(m.provider)}`}>{m.provider}</span>
              <span className={`w-2 h-2 rounded-full ${cc(m.cb_status)}`} />
            </div>
            <h3 className="text-base font-mono font-bold">{m.name}</h3>
            <p className="text-[10px] text-muted-foreground">v{m.version}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[{ l: "Trust P95", v: m.trust_p95.toFixed(4), c: tc(m.trust_p95) }, { l: "Latency P95", v: `${m.latency_p95_ms}ms`, c: m.latency_p95_ms > 500 ? "text-amber-400" : "text-green-400" }, { l: "Req/7d", v: m.requests_7d.toLocaleString(), c: "text-foreground" }, { l: "Cost/req", v: `$${m.cost_per_req.toFixed(5)}`, c: "text-foreground" }].map((s, i) => (
                <div key={i} className="bg-[hsl(var(--surface-2,240_10%_6.5%))] p-2 rounded">
                  <p className="text-[9px] uppercase text-muted-foreground">{s.l}</p>
                  <p className={`text-sm font-mono font-bold ${s.c}`}>{s.v}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 p-2 rounded bg-[hsl(var(--surface-2,240_10%_6.5%))]">
              <span className={`w-1.5 h-1.5 rounded-full ${cc(m.cb_status)}`} />
              <span className="text-[11px] font-bold">{m.cb_status}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{m.failures_7d} failures</span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-[10px] px-2 py-0.5 rounded ${rc(m.role)}`}>{m.role}</span>
              <button className="text-xs text-muted-foreground hover:text-foreground ml-auto">Test</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
