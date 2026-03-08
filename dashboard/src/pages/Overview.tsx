import { mockMetrics, mockLiveFeed, mockTrustHistory } from "../lib/mockData";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

const tc = (s: number) => s >= 0.85 ? "text-green-400" : s >= 0.7 ? "text-amber-400" : "text-red-400";
const ic = (i: string) => ({ NONE: "bg-zinc-700", REGENERATE: "bg-blue-600", UPGRADE: "bg-amber-600", HITL: "bg-red-600", BLOCKED: "bg-purple-600" }[i] || "bg-zinc-700");

export default function Overview() {
  const d = mockMetrics;
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-xl font-bold">Overview</h1><p className="text-sm text-muted-foreground">Real-time AI pipeline monitoring — trust, intervention, and cost</p></div>

      {/* ROW 1: 6 STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "AVG TRUST SCORE", value: d.avg_trust_score.toFixed(4), color: tc(d.avg_trust_score), trend: "+0.0012 vs last hour", sub: "Threshold: 0.85" },
          { label: "REQUESTS / MIN", value: "187", color: "text-foreground", trend: "+14 vs last hour", sub: "Peak: 203 req/min at 14:30" },
          { label: "INTERVENTION RATE", value: `${d.intervention_rate}%`, color: d.intervention_rate > 10 ? "text-red-400" : d.intervention_rate > 5 ? "text-amber-400" : "text-green-400", trend: "-1.1% vs last hour", sub: "12 HITL jobs triggered today" },
          { label: "ACTIVE PROVIDERS", value: "3 / 4", color: "text-amber-400", trend: "1 OPEN circuit breaker", sub: "GPT-4o-mini CLOSED · Llama 3.1 OPEN" },
          { label: "COST / TRUTH", value: "$0.0004", color: "text-foreground", trend: "-8% vs yesterday", sub: "$34.20 total today" },
          { label: "CHAIN INTEGRITY", value: "INTACT", color: "text-green-400", trend: "14,820 entries verified", sub: "Last verified 2 min ago" },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.trend}</p>
            <div className="border-t border-border mt-2 pt-2"><p className="text-[11px] text-muted-foreground">{s.sub}</p></div>
          </Card>
        ))}
      </div>

      {/* ROW 2: TRUST GAUGE + PROVIDER HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Trust Score — Live</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="relative w-[140px] h-[140px]">
                <svg viewBox="0 0 140 140" className="w-full h-full">
                  <circle cx="70" cy="70" r="58" fill="none" stroke="hsl(var(--surface-3,240 8% 9%))" strokeWidth="12" strokeDasharray="273" strokeDashoffset="68" transform="rotate(135 70 70)" strokeLinecap="round" />
                  <circle cx="70" cy="70" r="58" fill="none" stroke="hsl(142 71% 45%)" strokeWidth="12" strokeDasharray="273" strokeDashoffset={273 - d.avg_trust_score * 273 + 68} transform="rotate(135 70 70)" strokeLinecap="round" />
                  <text x="70" y="66" textAnchor="middle" className="fill-green-400 text-lg font-bold font-mono">{d.avg_trust_score.toFixed(4)}</text>
                  <text x="70" y="82" textAnchor="middle" className="fill-muted-foreground text-[8px] uppercase tracking-[0.1em]">TRUST</text>
                </svg>
              </div>
              <div className="flex-1 space-y-2">
                {[{ l: "RAG Entailment", s: 0.9312 }, { l: "Cross-Check", s: 0.9104 }, { l: "PII Clean", s: 1.0 }, { l: "Drift Score", s: 0.8891 }].map((c, i) => (
                  <div key={i}><div className="flex justify-between text-[10px]"><span className="text-muted-foreground">{c.l}</span><span className={`font-mono ${tc(c.s)}`}>{c.s.toFixed(4)}</span></div><div className="h-[3px] rounded bg-[hsl(var(--surface-3,240_8%_9%))] mt-1"><div className={`h-full rounded ${c.s >= 0.85 ? "bg-green-500" : c.s >= 0.7 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.s * 100}%` }} /></div></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Provider Health</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "gpt-4o", provider: "OpenAI", cb: "CLOSED", failures: 0 },
              { name: "gpt-4o-mini", provider: "OpenAI", cb: "CLOSED", failures: 2 },
              { name: "claude-3-5-sonnet", provider: "Anthropic", cb: "HALF_OPEN", failures: 8 },
              { name: "llama-3.1-70b", provider: "Local", cb: "CLOSED", failures: 0 },
            ].map((m, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 rounded ${m.cb !== "CLOSED" ? "bg-[hsl(var(--surface-2,240_10%_6.5%))]" : ""}`}>
                <span className={`w-2 h-2 rounded-full ${m.cb === "CLOSED" ? "bg-green-500" : m.cb === "HALF_OPEN" ? "bg-amber-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                <span className="text-sm font-mono flex-1">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.provider}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.cb === "CLOSED" ? "bg-green-950 text-green-400" : m.cb === "HALF_OPEN" ? "bg-amber-950 text-amber-400" : "bg-red-950 text-red-400"}`}>{m.cb}</span>
                <span className="text-xs text-muted-foreground">{m.failures} fail</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: INTERVENTION + LATENCY */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-sm">Intervention Breakdown — 24h</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex gap-2 flex-1">
                {Object.entries(d.intervention_counts).map(([k, v]) => (
                  <div key={k} className="flex-1">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">{k}</div>
                    <div className="text-lg font-mono font-bold">{v.toLocaleString()}</div>
                    <div className={`h-2 rounded mt-1 ${ic(k.toUpperCase())}`} style={{ width: `${(v / d.total_requests) * 100}%`, minWidth: "4px" }} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Pipeline Latency P95</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[{ stage: "Sanitize", ms: 12 }, { stage: "LLM", ms: 198 }, { stage: "Verify", ms: 45 }, { stage: "CB", ms: 3 }].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs w-16 text-muted-foreground">{s.stage}</span>
                  <div className="flex-1 h-4 rounded bg-[hsl(var(--surface-3,240_8%_9%))]">
                    <div className="h-full rounded bg-[hsl(var(--primary,136_45%_45%))]" style={{ width: `${(s.ms / 258) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono w-12 text-right">{s.ms}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: LIVE FEED */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Live Feed — Real-time request stream</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {mockLiveFeed.map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${i % 2 === 0 ? "bg-[hsl(var(--surface-1,240_10%_5%))]" : ""}`} style={{ borderLeft: `3px solid ${r.intervention === "NONE" ? "#64748b" : r.intervention === "HITL" ? "#ef4444" : r.intervention === "REGENERATE" ? "#3b82f6" : "#f59e0b"}` }}>
                <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${tc(r.trust)}`}>{r.trust.toFixed(4)}</span>
                <span className="text-xs font-mono text-muted-foreground truncate w-24">{r.id}</span>
                <span className="text-xs">{r.model}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${ic(r.intervention)}`}>{r.intervention}</span>
                <span className="text-xs font-mono text-muted-foreground">{r.latency}ms</span>
                <span className="text-xs text-muted-foreground ml-auto">{r.ago}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
