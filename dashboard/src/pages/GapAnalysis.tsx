// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Gap Analysis — DERIVED, read-only view over the real control library and
// the mesh-written compliance_scores gap strings (useGaps →
// complianceOpsService.fetchGaps). No seeded gaps: an implemented library
// shows an honest empty state, and every control-backed gap deep-links to
// its record in Compliance Controls.
import { useMemo, useState } from "react";
import { Target, ChevronDown, ChevronRight, Download } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { PageHeader } from "../components/ui/PageHeader";
import { Button } from "../components/ui/button";
import { InterlinkChip } from "../components/ui/InterlinkChip";
import { useGaps } from "../hooks/useComplianceGroup";
import type { GapRecord } from "../services/complianceOpsService";
import { exportCsv } from "../lib/exportUtils";

const SEVERITY_TONE: Record<string, string> = {
  critical: "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]",
  high: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  major: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  medium: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  moderate: "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]",
  low: "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]",
};

const prettyStatus = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—";

function formatDate(d?: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function GapAnalysis() {
  const { items: gaps, rollups, isLoading, error } = useGaps();
  const [expandedFw, setExpandedFw] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byFw = new Map<string, GapRecord[]>();
    for (const g of gaps) {
      const list = byFw.get(g.frameworkName) ?? [];
      list.push(g);
      byFw.set(g.frameworkName, list);
    }
    return Array.from(byFw.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [gaps]);

  // KPIs derived only from the real gap rows.
  const today = new Date().toISOString().slice(0, 10);
  const controlGaps = gaps.filter((g) => g.controlId).length;
  const meshGaps = gaps.length - controlGaps;
  const overdueRemediation = gaps.filter((g) => g.remediationDeadline && g.remediationDeadline.slice(0, 10) < today).length;

  const handleExport = () => {
    exportCsv(
      gaps.map((g) => ({
        framework: g.frameworkName,
        control_ref: g.controlRef ?? "",
        control_id: g.controlId ?? "",
        title: g.title,
        status: g.status,
        severity: g.severity ?? "",
        owner: g.owner ?? "",
        remediation_deadline: g.remediationDeadline ?? "",
        source: g.controlId ? "control" : "mesh",
      })),
      `gap-report-${today}.csv`,
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gap Analysis"
        subtitle="Gaps derived from real control statuses and mesh-recorded findings — nothing asserted, everything traceable"
        icon={Target}
        actions={
          <Button size="sm" variant="outline" leftIcon={<Download size={14} />} onClick={handleExport} disabled={gaps.length === 0}>
            Export Gap Report
          </Button>
        }
      />

      {error && (
        <div className="p-4" style={{ background: "hsl(var(--s-er-bg))", border: "1px solid hsl(var(--s-er-br))" }}>
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--s-er-tx))" }}>Failed to load gap analysis</p>
          <p className="text-xs mt-0.5" style={{ color: "hsl(var(--text-3))" }}>{(error as Error).message}</p>
        </div>
      )}

      {/* Summary — derived */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open Gaps", value: gaps.length, sub: "Across all frameworks" },
          { label: "Control Gaps", value: controlGaps, sub: "Controls not yet implemented" },
          { label: "Mesh-Flagged", value: meshGaps, sub: "Recorded by the governance mesh" },
          { label: "Overdue Remediation", value: overdueRemediation, sub: "Past their deadline" },
        ].map((s) => (
          <Card key={s.label} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))] font-medium">{s.label}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-[hsl(var(--text-1))]">{isLoading ? "…" : s.value}</p>
              <p className="text-[11px] text-[hsl(var(--text-4))] mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-framework rollup — derived live from the control library
          (implemented+effective over in-scope controls; not_applicable
          controls are out of scope), never stored. */}
      {!isLoading && rollups.length > 0 && (
        <Card className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))] font-medium mb-3">
              Framework Coverage (implemented or effective / in-scope controls)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3">
              {rollups.map((r) => (
                <div key={r.frameworkName}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-[hsl(var(--text-1))] truncate">{r.frameworkName}</span>
                    <span className="text-xs font-mono text-[hsl(var(--text-2))] flex-shrink-0">
                      {r.implemented}/{r.total}{r.coveragePct != null ? ` · ${r.coveragePct}%` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-[hsl(var(--bg-sunken))]" role="presentation">
                    <div
                      className="h-full"
                      style={{
                        width: `${r.coveragePct ?? 0}%`,
                        background: (r.coveragePct ?? 0) >= 85 ? "hsl(var(--s-ok-tx))" : (r.coveragePct ?? 0) >= 50 ? "hsl(var(--s-wn-tx))" : "hsl(var(--s-er-tx))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* States */}
      {isLoading && (
        <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Loading gaps">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-[hsl(var(--bg-sunken))]" />
          ))}
        </div>
      )}

      {!isLoading && !error && gaps.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[hsl(var(--border))] text-center">
          <Target size={36} className="text-[hsl(var(--text-4))]" />
          <p className="mt-3 text-sm font-medium text-[hsl(var(--text-1))]">
            No gaps — every mapped control is implemented, or no controls are mapped yet.
          </p>
          <p className="text-xs mt-1 text-[hsl(var(--text-3))]">
            Gaps appear here when controls are not yet implemented or the governance mesh flags a finding.
          </p>
        </div>
      )}

      {/* Framework accordion — real derived gaps */}
      {!isLoading && gaps.length > 0 && (
        <div className="space-y-3">
          {grouped.map(([framework, fwGaps]) => {
            const isExpanded = expandedFw === framework || (expandedFw === null && grouped[0][0] === framework);
            return (
              <Card key={framework} className="bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]">
                <button
                  onClick={() => setExpandedFw(isExpanded ? "" : framework)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-[hsl(var(--bg-muted))] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={16} className="text-[hsl(var(--text-4))]" /> : <ChevronRight size={16} className="text-[hsl(var(--text-4))]" />}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{framework}</p>
                      <p className="text-[11px] text-[hsl(var(--text-3))]">{fwGaps.length} gap{fwGaps.length !== 1 ? "s" : ""} identified</p>
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <CardContent className="px-5 pb-4 pt-0">
                    <div className="border-t border-[hsl(var(--border))] pt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-[hsl(var(--text-3))]">
                            <th className="text-left pb-2 font-semibold">Gap</th>
                            <th className="text-left pb-2 font-semibold">Status</th>
                            <th className="text-left pb-2 font-semibold">Severity</th>
                            <th className="text-left pb-2 font-semibold">Owner</th>
                            <th className="text-left pb-2 font-semibold">Deadline</th>
                            <th className="text-left pb-2 font-semibold">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--border))]">
                          {fwGaps.map((g, idx) => (
                            <tr key={`${g.controlId ?? g.title}-${idx}`} className="hover:bg-[hsl(var(--bg-muted))]">
                              <td className="py-2.5 pr-3">
                                {g.controlRef && <span className="font-mono text-[11px] text-[hsl(var(--text-4))] mr-1.5">{g.controlRef}</span>}
                                {g.controlId ? (
                                  <InterlinkChip label={g.title} to={`/compliance/controls?open=${g.controlId}`} />
                                ) : (
                                  <span className="text-xs text-[hsl(var(--text-1))]">{g.title}</span>
                                )}
                              </td>
                              <td className="py-2.5 pr-3">
                                <span className="inline-flex text-[10px] font-medium px-2 py-0.5 bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]">
                                  {prettyStatus(g.status)}
                                </span>
                              </td>
                              <td className="py-2.5 pr-3">
                                {g.severity ? (
                                  <span className={`text-[10px] font-medium px-2 py-0.5 capitalize ${SEVERITY_TONE[g.severity.toLowerCase()] ?? "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]"}`}>
                                    {g.severity}
                                  </span>
                                ) : (
                                  <span className="text-xs text-[hsl(var(--text-4))]">—</span>
                                )}
                              </td>
                              <td className="py-2.5 pr-3 text-xs text-[hsl(var(--text-3))]">{g.owner || "—"}</td>
                              <td className="py-2.5 pr-3 text-xs text-[hsl(var(--text-4))]">{formatDate(g.remediationDeadline)}</td>
                              <td className="py-2.5 text-[10px] text-[hsl(var(--text-4))]">{g.controlId ? "Control status" : "Mesh finding"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
