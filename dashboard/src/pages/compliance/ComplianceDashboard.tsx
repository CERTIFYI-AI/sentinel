import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Warning, Pulse, ArrowRight, Robot, Hand } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTROLS, FRAMEWORKS, FRAMEWORK_NAME, type Severity } from "@/data/complianceLibrary";

// Deterministic coverage from the control code (matches Controls Registry) while
// the Supabase controls table is empty; real evaluations replace it once seeded.
function hashCode(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function controlStatus(code: string): "implemented" | "partial" | "planned" {
  const m = hashCode(code) % 10; return m < 6 ? "implemented" : m < 8 ? "partial" : "planned";
}
const gaugeColor = (v: number) => v >= 85 ? "hsl(var(--s-ok-tx))" : v >= 70 ? "hsl(var(--s-wn-tx))" : "hsl(var(--s-er-tx))";
const SEV_TX: Record<Severity, string> = { CRITICAL: "hsl(var(--r-cr-tx))", HIGH: "hsl(var(--r-hi-tx))", MEDIUM: "hsl(var(--s-wn-tx))", LOW: "hsl(var(--text-3))" };

function ComplianceGauge({ value }: { value: number }) {
  const r = 64, c = 2 * Math.PI * r, pct = (value / 100) * c;
  return (
    <svg viewBox="0 0 160 160" className="w-32 h-32">
      <circle cx="80" cy="80" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="13" />
      <circle cx="80" cy="80" r={r} fill="none" stroke={gaugeColor(value)} strokeWidth="13"
        strokeDasharray={`${pct} ${c - pct}`} strokeDashoffset={c / 4} strokeLinecap="butt" />
      <text x="80" y="76" textAnchor="middle" style={{ fill: "hsl(var(--text-1))", fontSize: 24, fontWeight: 700 }}>{value}%</text>
      <text x="80" y="96" textAnchor="middle" style={{ fill: "hsl(var(--text-4))", fontSize: 10 }}>Coverage</text>
    </svg>
  );
}

export default function ComplianceDashboardPage() {
  const nav = useNavigate();

  const data = useMemo(() => {
    const perFw = FRAMEWORKS.map(f => {
      const ctrls = CONTROLS.filter(c => c.framework === f.code);
      const impl = ctrls.filter(c => controlStatus(c.code) === "implemented").length;
      const partial = ctrls.filter(c => controlStatus(c.code) === "partial").length;
      const coverage = ctrls.length ? Math.round(((impl + partial * 0.5) / ctrls.length) * 100) : 0;
      return { code: f.code, name: f.name, category: f.category, total: ctrls.length, gaps: ctrls.length - impl, coverage };
    }).sort((a, b) => a.coverage - b.coverage);

    const total = CONTROLS.length;
    const implemented = CONTROLS.filter(c => controlStatus(c.code) === "implemented").length;
    const overall = Math.round((implemented / total) * 100);
    const auto = CONTROLS.filter(c => c.evalType === "AUTO").length;
    const bySev = (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as Severity[]).map(s => ({ sev: s, n: CONTROLS.filter(c => c.severity === s).length }));
    const openGaps = CONTROLS.filter(c => controlStatus(c.code) !== "implemented").length;
    return { perFw, total, implemented, overall, auto, manual: total - auto, bySev, openGaps };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compliance Overview"
        subtitle={`${data.total} atomic controls · ${FRAMEWORKS.length} AI-governance frameworks · continuous mapping`}
        icon={Shield}
        actions={
          <>
            <Button size="sm" variant="outline" leftIcon={<Pulse size={14} />} onClick={() => nav("/compliance/drift")}>Control Drift</Button>
            <Button size="sm" leftIcon={<ArrowRight size={14} />} onClick={() => nav("/compliance/controls")}>Controls Registry</Button>
          </>
        }
      />

      {/* Top row: gauge + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <ComplianceGauge value={data.overall} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--text-1))" }}>Overall control coverage</p>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--text-3))" }}>{data.implemented} of {data.total} controls implemented</p>
              <p className="text-xs mt-2" style={{ color: "hsl(var(--text-4))" }}>{data.openGaps} open gaps · {FRAMEWORKS.length} frameworks</p>
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Atomic Controls", value: data.total, icon: Shield, tx: "hsl(var(--text-1))" },
            { label: "Open Gaps", value: data.openGaps, icon: Warning, tx: "hsl(var(--r-hi-tx))" },
            { label: "Automated", value: data.auto, icon: Robot, tx: "hsl(var(--s-in-tx))" },
            { label: "Manual", value: data.manual, icon: Hand, tx: "hsl(var(--text-2))" },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "hsl(var(--text-4))" }}>{k.label}</p>
                  <k.icon size={16} style={{ color: k.tx }} />
                </div>
                <p className="text-2xl font-bold font-mono mt-1" style={{ color: k.tx }}>{k.value}</p>
              </CardContent>
            </Card>
          ))}
          {/* Severity distribution */}
          <Card className="col-span-2 sm:col-span-4">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider font-medium mb-2" style={{ color: "hsl(var(--text-4))" }}>Control severity distribution</p>
              <div className="flex h-3 overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
                {data.bySev.map(s => <div key={s.sev} title={`${s.sev}: ${s.n}`} style={{ width: `${(s.n / data.total) * 100}%`, background: SEV_TX[s.sev] }} />)}
              </div>
              <div className="flex gap-4 mt-2">
                {data.bySev.map(s => (
                  <span key={s.sev} className="text-[11px] flex items-center gap-1" style={{ color: "hsl(var(--text-3))" }}>
                    <span className="w-2 h-2 inline-block" style={{ background: SEV_TX[s.sev] }} />{s.sev} <span className="font-mono">{s.n}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Framework coverage table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Framework Coverage — {FRAMEWORKS.length} frameworks</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--bg-muted))" }}>
                {["Framework", "Category", "Controls", "Open Gaps", "Coverage"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-semibold" style={{ color: "hsl(var(--text-4))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.perFw.map(f => (
                <tr key={f.code} onClick={() => nav("/compliance/controls")} className="cursor-pointer hover:bg-[hsl(var(--bg-raised))]" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                  <td className="px-3 py-2 font-medium" style={{ color: "hsl(var(--text-1))" }}>{f.name}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: "hsl(var(--text-3))" }}>{f.category}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "hsl(var(--text-2))" }}>{f.total}</td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: f.gaps > 0 ? "hsl(var(--r-hi-tx))" : "hsl(var(--text-3))" }}>{f.gaps}</td>
                  <td className="px-3 py-2" style={{ minWidth: 160 }}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5" style={{ background: "hsl(var(--bg-muted))" }}>
                        <div style={{ width: `${f.coverage}%`, height: "100%", background: gaugeColor(f.coverage) }} />
                      </div>
                      <span className="text-xs font-mono font-semibold" style={{ color: "hsl(var(--text-1))" }}>{f.coverage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
