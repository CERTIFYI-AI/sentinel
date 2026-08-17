// Risk Matrix — 5×5 likelihood × impact view over the real, org-scoped risk
// register (risks table via useRisksData). Cells bin real risks; clicking a
// cell lists its risks with deep links into the register (/risks?open=<id>).
import { useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Filter, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { Button } from "@/components/ui/button";
import { useRisksData, type RiskRecord } from "@/hooks/useRisksData";
import { scoreBand } from "@/services/riskService";

const likelihoodLabels = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const impactLabels = ["", "Negligible", "Minor", "Moderate", "Major", "Severe"];

const statusColors: Record<string, string> = {
  open: "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]",
  mitigating: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  in_progress: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  accepted: "bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))]",
  closed: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
  mitigated: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
};

function statusClass(status: string): string {
  return statusColors[status.toLowerCase().replace(/\s+/g, "_")] ?? "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]";
}

/** Unified band styling — delegates to the platform's single source of truth. */
function bandStyle(score: number): CSSProperties {
  const b = scoreBand(score);
  return { background: b.bg, color: b.text };
}

/** Clamp a stored value into the 1–5 matrix band so every risk lands in a cell. */
function band(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

/** True when a stored likelihood/impact had to be clamped into the 1–5 grid. */
function wasClamped(r: RiskRecord): boolean {
  return band(r.likelihood) !== r.likelihood || band(r.impact) !== r.impact;
}

function riskLabel(r: RiskRecord): string {
  if (r.risk_id) return r.risk_id;
  return r.id.length > 10 ? r.id.slice(0, 6) : r.id;
}

export default function RiskMatrix() {
  const navigate = useNavigate();
  const { risks, isLoading, error } = useRisksData();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(risks.map(r => r.category).filter(Boolean))).sort(),
    [risks],
  );

  const filtered = useMemo(
    () => (categoryFilter === "all" ? risks : risks.filter(r => r.category === categoryFilter)),
    [risks, categoryFilter],
  );

  const cellRisks = (likelihood: number, impact: number) =>
    filtered.filter(r => band(r.likelihood) === likelihood && band(r.impact) === impact);

  const stats = useMemo(() => ({
    // Band on the STORED risk_score — same figure the register shows.
    critical: filtered.filter(r => scoreBand(r.risk_score).label === "Critical").length,
    high: filtered.filter(r => scoreBand(r.risk_score).label === "High").length,
    mitigating: filtered.filter(r => /mitigating|in.?progress/i.test(r.status)).length,
    open: filtered.filter(r => /open/i.test(r.status)).length,
  }), [filtered]);

  const selectedRisks = selectedCell ? cellRisks(selectedCell.likelihood, selectedCell.impact) : [];

  if (isLoading) return <PageSkeleton title="Risk Matrix" showStats rows={5} />;

  const header = (
    <PageHeader
      title="Risk Matrix"
      subtitle="AI risk assessment aligned to ISO 31000 and NIST AI RMF"
      icon={AlertTriangle}
      actions={
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => navigate("/risks")}>
          Log Risk
        </Button>
      }
    />
  );

  if (error) {
    return (
      <div className="space-y-4">
        {header}
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load the risk register</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      {/* Stats — derived from the real rows only */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Critical Risks", value: stats.critical, color: "text-[hsl(var(--s-er-tx))]" },
          { label: "High Risks", value: stats.high, color: "text-[hsl(var(--s-wn-tx))]" },
          { label: "Being Mitigated", value: stats.mitigating, color: "text-[hsl(var(--s-wn-tx))]" },
          { label: "Open / Unaddressed", value: stats.open, color: "text-[hsl(var(--s-er-tx))]" },
        ].map((s, i) => (
          <Card key={i} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))] font-medium">{s.label}</p>
              <p className={`text-2xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[hsl(var(--text-4))]" />
          <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setSelectedCell(null); }}>
            <SelectTrigger className="w-[220px]" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
            <SelectContent style={{ borderRadius: 0 }}>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} of {risks.length} risks</span>
        </div>
      )}

      {risks.length === 0 ? (
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardContent className="py-14 text-center">
            <AlertTriangle size={28} className="mx-auto mb-3 opacity-40 text-[hsl(var(--text-4))]" />
            <p className="text-sm text-[hsl(var(--text-2))]">No risks recorded yet.</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1">
              Log your first risk in the <Link to="/risks" className="underline text-[hsl(var(--brand))]">Risk Register</Link> and it will appear on this matrix.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Heatmap — Likelihood vs Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="flex">
                  <div className="w-24" />
                  {[1, 2, 3, 4, 5].map(impact => (
                    <div key={impact} className="flex-1 text-center text-[10px] font-medium text-[hsl(var(--text-3))] pb-2">
                      {impactLabels[impact]}
                    </div>
                  ))}
                </div>
                {[5, 4, 3, 2, 1].map(likelihood => (
                  <div key={likelihood} className="flex items-stretch">
                    <div className="w-24 flex items-center text-[10px] font-medium text-[hsl(var(--text-3))] pr-2 justify-end">
                      {likelihoodLabels[likelihood]}
                    </div>
                    {[1, 2, 3, 4, 5].map(impact => {
                      const risksInCell = cellRisks(likelihood, impact);
                      const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;
                      return (
                        <button
                          type="button"
                          key={impact}
                          onClick={() => setSelectedCell(risksInCell.length > 0 ? { likelihood, impact } : null)}
                          aria-label={`Likelihood ${likelihood}, impact ${impact} — ${risksInCell.length} risk${risksInCell.length === 1 ? "" : "s"}`}
                          className={`flex-1 m-0.5 min-h-[60px] rounded-lg flex flex-col items-center justify-center p-1 border border-[hsl(var(--border))] ${risksInCell.length > 0 ? "ring-2 ring-[hsl(var(--bg-surface))] cursor-pointer" : "opacity-60 cursor-default"} ${isSelected ? "outline outline-2 outline-[hsl(var(--brand))]" : ""}`}
                          style={bandStyle(likelihood * impact)}
                        >
                          {risksInCell.length > 0 ? (
                            <div className="text-center">
                              <span className="text-lg font-bold">{risksInCell.length}</span>
                              <div className="text-[9px] leading-tight mt-0.5">
                                {risksInCell.slice(0, 3).map(riskLabel).join(", ")}
                                {risksInCell.length > 3 ? ` +${risksInCell.length - 3}` : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs opacity-50">{likelihood * impact}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="flex mt-2">
                  <div className="w-24" />
                  <div className="flex-1 text-center text-[10px] text-[hsl(var(--text-4))] font-medium">Impact &rarr;</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected-cell risk list — deep links into the real register */}
      {selectedCell && selectedRisks.length > 0 && (
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              {likelihoodLabels[selectedCell.likelihood]} likelihood × {impactLabels[selectedCell.impact]} impact — {selectedRisks.length} risk{selectedRisks.length === 1 ? "" : "s"}
            </CardTitle>
            <button aria-label="Close cell detail" onClick={() => setSelectedCell(null)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]">
              <X size={14} />
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))]">
                  {["ID", "Risk", "Category", "L x I", "Score", "Status", "Owner"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--text-3))]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {selectedRisks.map(r => {
                  // Show the STORED score — the same figure the register shows —
                  // never a recomputation from the clamped grid position.
                  const score = r.risk_score;
                  const clamped = wasClamped(r);
                  return (
                    <tr key={r.id} className="hover:bg-[hsl(var(--bg-raised))] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link to={`/risks?open=${r.id}`} className="text-[hsl(var(--brand))] hover:underline">{riskLabel(r)}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/risks?open=${r.id}`} className="font-medium text-[hsl(var(--text-1))] text-xs hover:underline">{r.title}</Link>
                        {r.description && <p className="text-[11px] text-[hsl(var(--text-4))] mt-0.5 line-clamp-1">{r.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{r.category || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-[hsl(var(--text-3))]">
                        {band(r.likelihood)} x {band(r.impact)}
                        {clamped && (
                          <span
                            title={`Stored values (L ${r.likelihood}, I ${r.impact}) were clamped into the 1–5 grid`}
                            aria-label="Stored value clamped into the 1–5 grid"
                            className="inline-block w-1.5 h-1.5 rounded-full bg-[hsl(var(--s-wn-tx))] ml-1.5 align-middle"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded" style={bandStyle(score)}>{score}</span></td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusClass(r.status)}`}>{r.status}</span></td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{r.owner || "Unassigned"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
