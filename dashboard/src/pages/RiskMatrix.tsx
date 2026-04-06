import { useState, useMemo } from 'react';
import {
  Eye, Warning, Info, ArrowUp, ArrowRight, ArrowDown, FloppyDisk, User,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import {
  RISKS, Risk, severityColor, statusColor, formatDate,
} from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';

// ── Risk Score Color ──────────────────────────────────────────────────────────
function riskScoreStyle(score: number): { bg: string; text: string; bold: boolean } {
  if (score >= 17) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', bold: true };
  if (score >= 10) return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', bold: false };
  if (score >= 5) return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', bold: false };
  return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', bold: false };
}

function cellColor(score: number): string {
  if (score >= 17) return 'hsl(0 72% 51% / 0.22)';
  if (score >= 10) return 'hsl(25 95% 53% / 0.22)';
  if (score >= 5) return 'hsl(45 93% 47% / 0.18)';
  return 'hsl(142 71% 45% / 0.15)';
}

function TrendIcon({ trend }: { trend: Risk['trending'] }) {
  if (trend === 'up') return <ArrowUp size={12} weight="bold" style={{ color: 'hsl(var(--s-er-tx))' }} />;
  if (trend === 'down') return <ArrowDown size={12} weight="bold" style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  return <ArrowRight size={12} weight="bold" style={{ color: 'hsl(var(--text-4))' }} />;
}

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok';
}) {
  const colors = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))' }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function RiskMatrix() {
  const { orgName } = useSettingsStore();
  const risks = RISKS; // Consistent 12 risks from seed

  // Cell sheet state
  const [cellSheetOpen, setCellSheetOpen] = useState(false);
  const [cellRisks, setCellRisks] = useState<Risk[]>([]);
  const [cellLabel, setCellLabel] = useState('');

  // Detail sheet state
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  // ── Metrics — Consistent with /risk page ──────────────────────────────────
  const totalRisks = risks.length;
  const criticalCount = risks.filter(r => r.severity === 'critical').length;
  const highCount = risks.filter(r => r.severity === 'high').length;
  const openCount = risks.filter(r => r.status === 'open' || r.status === 'accepted').length;

  // ── Build matrix data ─────────────────────────────────────────────────────
  const matrix = useMemo(() => {
    const m: Record<string, Risk[]> = {};
    risks.forEach(r => {
      const key = `${r.likelihood}-${r.impact}`;
      if (!m[key]) m[key] = [];
      m[key].push(r);
    });
    return m;
  }, [risks]);

  const openCellSheet = (l: number, i: number, cellRiskList: Risk[]) => {
    setCellRisks(cellRiskList);
    setCellLabel(`Likelihood ${l} × Impact ${i} (Score: ${l * i})`);
    setCellSheetOpen(true);
  };

  const openRiskDetail = (risk: Risk) => {
    setSelectedRisk(risk);
    setCellSheetOpen(false);
    setDetailSheetOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Risk Matrix</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · 5×5 risk heat map — {totalRisks} risks plotted
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" style={{ borderRadius: 0 }}>
                  <FloppyDisk size={14} className="mr-1.5" />Save View
                </Button>
              </TooltipTrigger>
              <TooltipContent style={{ borderRadius: 0 }}>Save current matrix view and filters as a preset</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Metrics — Consistent with /risk */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Total Risks" value={totalRisks} variant="default" />
          <MetricTile label="Critical" value={criticalCount} variant="error" />
          <MetricTile label="High" value={highCount} variant="warn" />
          <MetricTile label="Open" value={openCount} variant="warn" />
        </div>

        {/* Matrix Grid */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="p-6">
            <div className="flex items-end gap-0">
              {/* Y-axis label */}
              <div className="flex flex-col items-center justify-center pr-3" style={{ height: 400 }}>
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'hsl(var(--text-4))', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 }}
                >
                  LIKELIHOOD →
                </span>
              </div>

              {/* Y-axis numbers */}
              <div className="flex flex-col gap-1 pr-2" style={{ paddingBottom: 28 }}>
                {[5, 4, 3, 2, 1].map(l => (
                  <div key={l} className="flex items-center justify-center" style={{ height: 76 }}>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{l}</span>
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-1">
                  {[5, 4, 3, 2, 1].map(l =>
                    [1, 2, 3, 4, 5].map(i => {
                      const score = l * i;
                      const bg = cellColor(score);
                      const cr = matrix[`${l}-${i}`] || [];
                      const visible = cr.slice(0, 2);
                      const overflow = cr.length - 2;

                      return (
                        <div
                          key={`${l}-${i}`}
                          className="flex flex-col items-center justify-center gap-1 cursor-pointer hover:brightness-110 transition-all relative"
                          style={{
                            height: 76,
                            background: bg,
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 0,
                          }}
                          onClick={() => {
                            if (cr.length === 1) openRiskDetail(cr[0]);
                            else if (cr.length > 1) openCellSheet(l, i, cr);
                          }}
                        >
                          {/* Score label */}
                          <span className="absolute top-1 right-1.5 text-[9px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>
                            {score}
                          </span>

                          {visible.map(r => (
                            <span
                              key={r.id}
                              className="font-mono text-xs font-medium cursor-pointer hover:underline"
                              style={{ color: 'hsl(var(--text-1))' }}
                              onClick={(e) => { e.stopPropagation(); openRiskDetail(r); }}
                            >
                              {r.id}
                            </span>
                          ))}
                          {overflow > 0 && (
                            <Badge
                              className="text-[9px] px-1 py-0 cursor-pointer"
                              style={{ background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))', borderRadius: 0, border: '1px solid hsl(var(--border))' }}
                              onClick={(e) => { e.stopPropagation(); openCellSheet(l, i, cr); }}
                            >
                              +{overflow} more
                            </Badge>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* X-axis numbers */}
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="text-center">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{i}</span>
                    </div>
                  ))}
                </div>

                {/* X-axis label */}
                <div className="text-center mt-2">
                  <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))', letterSpacing: 1 }}>
                    IMPACT →
                  </span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 pt-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {[
                { label: '1–4 Low', bg: 'hsl(142 71% 45% / 0.3)' },
                { label: '5–9 Medium', bg: 'hsl(45 93% 47% / 0.3)' },
                { label: '10–16 High', bg: 'hsl(25 95% 53% / 0.3)' },
                { label: '17–25 Critical', bg: 'hsl(0 72% 51% / 0.3)' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div style={{ width: 16, height: 16, background: l.bg, borderRadius: 0, border: '1px solid hsl(var(--border))' }} />
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Cell Detail Sheet ─────────────────────────────────────────────── */}
        <Sheet open={cellSheetOpen} onOpenChange={setCellSheetOpen}>
          <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto" style={{ borderRadius: 0 }}>
            <SheetHeader>
              <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>
                {cellLabel}
              </SheetTitle>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                {cellRisks.length} risk{cellRisks.length !== 1 ? 's' : ''} in this cell
              </p>
            </SheetHeader>
            <div className="space-y-3 mt-4">
              {cellRisks.map(r => {
                const sevColor = severityColor(r.severity);
                const statColor = statusColor(r.status);
                return (
                  <div
                    key={r.id}
                    className="p-3 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
                    style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}
                    onClick={() => openRiskDetail(r)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{r.id}</span>
                        <Badge style={{ background: sevColor.bg, color: sevColor.text, borderRadius: 0, fontSize: 10 }}>{r.severity}</Badge>
                      </div>
                      <Badge style={{ background: statColor.bg, color: statColor.text, borderRadius: 0, fontSize: 10 }}>{r.status}</Badge>
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.title}</p>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      <span className="flex items-center gap-1"><User size={11} />{r.owner}</span>
                      <span>Score: {r.score}</span>
                      <TrendIcon trend={r.trending} />
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs px-2" style={{ borderRadius: 0 }}>
                      <Eye size={12} className="mr-1" />View Details
                    </Button>
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* ── Risk Detail Sheet ─────────────────────────────────────────────── */}
        <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
          <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto" style={{ borderRadius: 0 }}>
            {selectedRisk && (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedRisk.id}</span>
                    <Badge style={{ background: severityColor(selectedRisk.severity).bg, color: severityColor(selectedRisk.severity).text, borderRadius: 0, fontSize: 11 }}>
                      {selectedRisk.severity}
                    </Badge>
                    <TrendIcon trend={selectedRisk.trending} />
                  </div>
                  <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.title}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  {/* Score */}
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Score</p>
                      {(() => {
                        const ss = riskScoreStyle(selectedRisk.score);
                        return (
                          <Badge style={{ background: ss.bg, color: ss.text, borderRadius: 0, fontWeight: ss.bold ? 800 : 600, fontSize: 14 }}>
                            {selectedRisk.score} / 25
                          </Badge>
                        );
                      })()}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Status</p>
                      <Badge style={{ background: statusColor(selectedRisk.status).bg, color: statusColor(selectedRisk.status).text, borderRadius: 0 }}>
                        {selectedRisk.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>L × I</p>
                      <span className="text-sm font-mono" style={{ color: 'hsl(var(--text-1))' }}>
                        {selectedRisk.likelihood} × {selectedRisk.impact}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Owner</p>
                      <div className="flex items-center gap-1">
                        <User size={12} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.owner}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Category</p>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.category}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedRisk.description}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Mitigations</p>
                    <div className="space-y-1">
                      {selectedRisk.mitigations.map((m, i) => (
                        <div key={i} className="text-xs px-2 py-1" style={{ background: 'hsl(var(--s-ok-bg))', borderLeft: '2px solid hsl(var(--s-ok-br))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    <span>Created: {formatDate(selectedRisk.createdDate)}</span>
                    <span>Updated: {formatDate(selectedRisk.lastUpdated)}</span>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
