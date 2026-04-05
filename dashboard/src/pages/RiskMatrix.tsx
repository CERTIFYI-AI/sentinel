import { useState } from 'react';
import { Warning, FloppyDisk, TrendUp, XCircle, CheckCircle } from '@phosphor-icons/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RISKS, severityColor, statusColor, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';

// 5x5 risk matrix: x=Likelihood(1-5), y=Impact(1-5)
// Cell color = combined risk (L * I)
const getCellColor = (likelihood: number, impact: number) => {
  const score = likelihood * impact;
  if (score >= 16) return { bg: '#7f1d1d', text: '#fca5a5', border: '#991b1b', label: 'critical' };
  if (score >= 9) return { bg: '#7c2d12', text: '#fdba74', border: '#9a3412', label: 'high' };
  if (score >= 4) return { bg: '#713f12', text: '#fde047', border: '#854d0e', label: 'medium' };
  return { bg: '#14532d', text: '#86efac', border: '#166534', label: 'low' };
};

const LIKELIHOODS = [1, 2, 3, 4, 5];
const IMPACTS = [5, 4, 3, 2, 1]; // Display top-down (high impact at top)
const IMPACT_LABELS: Record<number, string> = { 5: 'Catastrophic', 4: 'Major', 3: 'Moderate', 2: 'Minor', 1: 'Negligible' };
const LIKELIHOOD_LABELS: Record<number, string> = { 1: 'Rare', 2: 'Unlikely', 3: 'Possible', 4: 'Likely', 5: 'Almost Certain' };

interface CellData {
  likelihood: number;
  impact: number;
  risks: typeof RISKS;
}

export default function RiskMatrix() {
  const orgName = useSettingsStore(s => s.orgName);
  const [activeCell, setActiveCell] = useState<CellData | null>(null);
  const [savedView, setSavedView] = useState(false);

  const stats = {
    total: RISKS.length,
    critical: RISKS.filter(r => r.severity === 'critical').length,
    open: RISKS.filter(r => r.status === 'open').length,
    mitigated: RISKS.filter(r => r.status === 'mitigated').length,
    avgScore: (RISKS.reduce((s, r) => s + r.score, 0) / RISKS.length).toFixed(1),
    trendingUp: RISKS.filter(r => r.trending === 'up').length,
  };

  const getRisksForCell = (likelihood: number, impact: number) =>
    RISKS.filter(r => r.likelihood === likelihood && r.impact === impact);

  const handleCellClick = (likelihood: number, impact: number) => {
    const risks = getRisksForCell(likelihood, impact);
    if (risks.length > 0) {
      setActiveCell({ likelihood, impact, risks });
    }
  };

  const handleSaveView = () => {
    setSavedView(true);
    setTimeout(() => setSavedView(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Risk Matrix</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — 5×5 likelihood × impact heat map</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleSaveView}>
          <FloppyDisk size={16} />
          {savedView ? 'Saved!' : 'Save View'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <Warning size={20} />, value: stats.total, label: 'Total Risks' },
          { icon: <XCircle size={20} />, value: stats.critical, label: 'Critical', sub: `${stats.open} Open` },
          { icon: <CheckCircle size={20} />, value: `${stats.avgScore}/25`, label: 'Avg Risk Score', sub: `${stats.mitigated} Mitigated` },
          { icon: <TrendUp size={20} />, value: stats.trendingUp, label: 'Trending Up' },
        ].map((s, i) => (
          <Card key={i} className="p-4 flex items-start gap-3">
            <div className="mt-0.5 text-[hsl(var(--brand))]">{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{s.value}</div>
              <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.label}</div>
              {s.sub && <div className="text-xs text-[hsl(var(--text-4))]">{s.sub}</div>}
            </div>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-[hsl(var(--text-4))]">Risk Level:</span>
        {[
          { bg: '#14532d', label: 'Low (1–3)' },
          { bg: '#713f12', label: 'Medium (4–8)' },
          { bg: '#7c2d12', label: 'High (9–15)' },
          { bg: '#7f1d1d', label: 'Critical (16–25)' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3" style={{ background: l.bg }} />
            <span className="text-xs text-[hsl(var(--text-3))]">{l.label}</span>
          </div>
        ))}
        <span className="text-xs text-[hsl(var(--text-4))] ml-4">Click a cell to view risks</span>
      </div>

      {/* Matrix */}
      <Card className="p-4 overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Y-axis label */}
          <div className="flex">
            <div className="w-28 shrink-0" />
            <div className="flex-1 text-center text-xs text-[hsl(var(--text-4))] mb-2 font-medium uppercase tracking-wide">
              Likelihood →
            </div>
          </div>

          {/* Likelihood column headers */}
          <div className="flex">
            <div className="w-28 shrink-0 flex items-center justify-end pr-3">
              <span className="text-xs text-[hsl(var(--text-4))] font-medium uppercase tracking-wide" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                Impact ↑
              </span>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-0.5 mb-0.5">
              {LIKELIHOODS.map(l => (
                <div key={l} className="text-center py-2">
                  <div className="text-sm font-bold text-[hsl(var(--text-1))]">{l}</div>
                  <div className="text-xs text-[hsl(var(--text-4))]">{LIKELIHOOD_LABELS[l]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Matrix grid */}
          {IMPACTS.map(impact => (
            <div key={impact} className="flex mb-0.5">
              {/* Impact row label */}
              <div className="w-28 shrink-0 flex items-center justify-end pr-3">
                <div className="text-right">
                  <div className="text-sm font-bold text-[hsl(var(--text-1))]">{impact}</div>
                  <div className="text-xs text-[hsl(var(--text-4))]">{IMPACT_LABELS[impact]}</div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-5 gap-0.5">
                {LIKELIHOODS.map(likelihood => {
                  const cell = getCellColor(likelihood, impact);
                  const cellRisks = getRisksForCell(likelihood, impact);
                  const hasRisks = cellRisks.length > 0;
                  const maxShow = 2;

                  return (
                    <div
                      key={likelihood}
                      className={`h-20 p-1.5 relative transition-all flex flex-col gap-0.5 ${hasRisks ? 'cursor-pointer' : ''}`}
                      style={{
                        background: cell.bg,
                        border: `1px solid ${cell.border}`,
                        opacity: hasRisks ? 1 : 0.85,
                      }}
                      onClick={() => handleCellClick(likelihood, impact)}
                    >
                      {/* Score */}
                      <div className="text-xs font-bold" style={{ color: cell.text, opacity: 0.7 }}>
                        {likelihood * impact}
                      </div>

                      {/* Risk IDs */}
                      {cellRisks.slice(0, maxShow).map(r => (
                        <div key={r.id} className="text-xs px-1 py-0.5 truncate font-mono" style={{ background: `${cell.text}20`, color: cell.text }}>
                          {r.id}
                        </div>
                      ))}
                      {cellRisks.length > maxShow && (
                        <div className="text-xs" style={{ color: cell.text, opacity: 0.8 }}>
                          +{cellRisks.length - maxShow} more
                        </div>
                      )}

                      {/* Click indicator */}
                      {hasRisks && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5" style={{ background: cell.text, opacity: 0.6 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cell Detail Sheet */}
      <Sheet open={!!activeCell} onOpenChange={o => { if (!o) setActiveCell(null); }}>
        <SheetContent className="w-[540px] max-w-full overflow-y-auto" side="right">
          {activeCell && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Warning size={18} />
                  L{activeCell.likelihood} × I{activeCell.impact} — Score {activeCell.likelihood * activeCell.impact}
                </SheetTitle>
                <p className="text-sm text-[hsl(var(--text-4))]">
                  Likelihood: {LIKELIHOOD_LABELS[activeCell.likelihood]} · Impact: {IMPACT_LABELS[activeCell.impact]}
                </p>
              </SheetHeader>
              <div className="space-y-3">
                <div className="text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">
                  {activeCell.risks.length} risk{activeCell.risks.length !== 1 ? 's' : ''} in this cell
                </div>
                {activeCell.risks.map(r => {
                  const rc = severityColor(r.severity);
                  const sc = statusColor(r.status);
                  return (
                    <div key={r.id} className="p-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm text-[hsl(var(--text-1))]">{r.title}</div>
                          <div className="text-xs text-[hsl(var(--text-4))] mt-0.5 font-mono">{r.id}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{r.severity}</span>
                          <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{r.status}</span>
                        </div>
                      </div>
                      <div className="text-xs text-[hsl(var(--text-3))]">{r.description}</div>
                      <div className="flex items-center justify-between text-xs text-[hsl(var(--text-4))]">
                        <span>Owner: {r.owner}</span>
                        <span>Updated: {formatDate(r.lastUpdated)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
