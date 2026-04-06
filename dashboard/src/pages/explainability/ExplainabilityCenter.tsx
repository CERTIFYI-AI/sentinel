import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, MagnifyingGlass, Brain,
  Warning, CheckCircle, Info, Lightning, ArrowRight,
  FileText, ChartBar, Clock, ShieldCheck,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EXPLAINABILITY_REPORTS, MODELS, formatDate } from '../../data/seed';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Mock Decision Audit Trail ────────────────────────────────────────────────

const MOCK_DECISIONS: Record<string, Array<{
  id: string; inputSummary: string; topFeature: string; score: number; date: string; status: string;
}>> = {
  'MDL-001': [
    { id: 'DEC-001', inputSummary: 'Applicant: 680 FICO, 45% utilization', topFeature: 'Credit Utilization', score: 0.92, date: '2026-03-15', status: 'Explained' },
    { id: 'DEC-002', inputSummary: 'Applicant: 720 FICO, 20% utilization', topFeature: 'Payment History', score: 0.88, date: '2026-03-14', status: 'Explained' },
    { id: 'DEC-003', inputSummary: 'Applicant: 580 FICO, 78% utilization', topFeature: 'Credit Utilization', score: 0.95, date: '2026-03-13', status: 'Review Required' },
    { id: 'DEC-004', inputSummary: 'Applicant: 750 FICO, 12% utilization', topFeature: 'Account Age', score: 0.85, date: '2026-03-12', status: 'Explained' },
    { id: 'DEC-005', inputSummary: 'Applicant: 650 FICO, 55% utilization', topFeature: 'Total Debt', score: 0.91, date: '2026-03-11', status: 'Explained' },
  ],
  'MDL-004': [
    { id: 'DEC-101', inputSummary: 'Loan: $50K, DTI 35%, employed', topFeature: 'Debt-to-Income Ratio', score: 0.87, date: '2026-03-20', status: 'Review Required' },
    { id: 'DEC-102', inputSummary: 'Loan: $25K, DTI 20%, self-employed', topFeature: 'Employment Status', score: 0.79, date: '2026-03-19', status: 'Explained' },
    { id: 'DEC-103', inputSummary: 'Loan: $100K, DTI 42%, employed', topFeature: 'Debt-to-Income Ratio', score: 0.93, date: '2026-03-18', status: 'Explained' },
    { id: 'DEC-104', inputSummary: 'Loan: $15K, DTI 15%, student', topFeature: 'Credit Score', score: 0.82, date: '2026-03-17', status: 'Explained' },
    { id: 'DEC-105', inputSummary: 'Loan: $75K, DTI 38%, contractor', topFeature: 'Employment Status', score: 0.76, date: '2026-03-16', status: 'Review Required' },
  ],
  'MDL-002': [
    { id: 'DEC-201', inputSummary: 'Txn: $4,200 electronics, new merchant', topFeature: 'Transaction Amount', score: 0.94, date: '2026-03-15', status: 'Explained' },
    { id: 'DEC-202', inputSummary: 'Txn: $890 fuel, known merchant', topFeature: 'Merchant Category', score: 0.72, date: '2026-03-14', status: 'Explained' },
    { id: 'DEC-203', inputSummary: 'Txn: $12,500 wire, 2AM', topFeature: 'Time of Day', score: 0.98, date: '2026-03-13', status: 'Explained' },
    { id: 'DEC-204', inputSummary: 'Txn: $3,100 travel, new country', topFeature: 'Location Change', score: 0.91, date: '2026-03-12', status: 'Explained' },
    { id: 'DEC-205', inputSummary: 'Txn: $250 groceries, regular', topFeature: 'Transaction Amount', score: 0.45, date: '2026-03-11', status: 'Explained' },
  ],
  'MDL-005': [
    { id: 'DEC-301', inputSummary: 'Alert: Rapid structuring, 5 txns <$10K', topFeature: 'Transaction Pattern', score: 0.96, date: '2026-03-10', status: 'Explained' },
    { id: 'DEC-302', inputSummary: 'Alert: High-risk jurisdiction wire', topFeature: 'Geographic Risk', score: 0.89, date: '2026-03-09', status: 'Explained' },
    { id: 'DEC-303', inputSummary: 'Alert: Velocity spike, 20 txns/hr', topFeature: 'Account Velocity', score: 0.94, date: '2026-03-08', status: 'Explained' },
    { id: 'DEC-304', inputSummary: 'Alert: Round-tripping pattern', topFeature: 'Transaction Pattern', score: 0.91, date: '2026-03-07', status: 'Review Required' },
    { id: 'DEC-305', inputSummary: 'Alert: Shell company wire', topFeature: 'Geographic Risk', score: 0.97, date: '2026-03-06', status: 'Explained' },
  ],
};

// More decisions for detail sheet (10 per model)
const EXTENDED_DECISIONS: Record<string, Array<{
  id: string; inputSummary: string; topFeature: string; score: number; date: string; status: string;
}>> = Object.fromEntries(
  Object.entries(MOCK_DECISIONS).map(([key, vals]) => [
    key,
    [
      ...vals,
      ...vals.map((v, i) => ({ ...v, id: `${v.id}-EXT`, inputSummary: `${v.inputSummary} (batch)`, date: '2026-03-0' + (5 - i) })),
    ],
  ])
);

// ── MetricTile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Chart Tooltip ────────────────────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
      borderRadius: 0, color: 'hsl(var(--text-1))',
    }}>
      <p className="font-semibold mb-1">{label}</p>
      <p>Importance: <span className="font-bold">{(payload[0].value * 100).toFixed(0)}%</span></p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ExplainabilityCenter() {
  const ct = useChartTheme();
  const [reports, setReports] = useState(EXPLAINABILITY_REPORTS);
  const [selectedModel, setSelectedModel] = useState(EXPLAINABILITY_REPORTS[0]?.modelId || '');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof EXPLAINABILITY_REPORTS[0] | null>(null);
  const [detailTab, setDetailTab] = useState('features');
  const [decisionSheetOpen, setDecisionSheetOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<typeof EXPLAINABILITY_REPORTS[0] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Current model's report
  const currentReport = reports.find(r => r.modelId === selectedModel);
  const modelTabs = [...new Set(reports.map(r => r.modelId))];
  const reviewRequired = reports.filter(r => r.status === 'Review Required').length;
  const gdprGap = 2; // Models requiring updated reports

  // Feature chart data for current model
  const featureData = currentReport?.topFeatures.map(f => ({
    name: f.name,
    importance: f.importance,
  })) || [];

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const newId = `EXP-${String(reports.length + 1).padStart(3, '0')}`;
      toast(`${newId} generated successfully`);
      setGenerating(false);
    }, 2000);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setReports(prev => prev.filter(r => r.id !== deleteTarget.id));
    toast(`${deleteTarget.id} deleted`, 'info');
    setDeleteTarget(null);
  };

  const openDetailSheet = (report: typeof EXPLAINABILITY_REPORTS[0]) => {
    setSelectedReport(report);
    setDetailTab('features');
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Brain size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Explainability Center</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>Per-model explanations required by GDPR Art. 22 and EU AI Act Art. 13</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          {generating ? <><Clock size={14} className="mr-2 animate-spin" />Generating...</> : <><Plus size={14} className="mr-2" />Generate Explanation</>}
        </Button>
      </div>

      {/* Regulatory Context Banner */}
      <div className="p-3" style={{ background: 'hsl(220 90% 56% / 0.06)', border: '1px solid hsl(220 90% 56% / 0.2)', borderRadius: 0 }}>
        <p className="text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>
          <Info size={12} className="inline mr-1" />
          <strong>Regulatory Context:</strong> Explainability reports are required by GDPR Art. 22 (automated decisions) and EU AI Act Art. 13 (transparency). {gdprGap} models require updated reports.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Reports" value={String(reports.length)} variant="info" icon={<FileText size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Models Covered" value={String(modelTabs.length)} variant="info" icon={<Brain size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Review Required" value={String(reviewRequired)} variant="warn" icon={<Warning size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} />
        <MetricTile label="GDPR Art.22 Gap" value={String(gdprGap)} variant="error" icon={<Warning size={16} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />} />
      </div>

      {/* Model Selector Tabs */}
      <Tabs value={selectedModel} onValueChange={setSelectedModel}>
        <TabsList style={{ borderRadius: 0 }}>
          {modelTabs.map(mId => {
            const report = reports.find(r => r.modelId === mId);
            return <TabsTrigger key={mId} value={mId} style={{ borderRadius: 0 }}>{report?.modelName || mId}</TabsTrigger>;
          })}
        </TabsList>
      </Tabs>

      {/* Main Content for Selected Model */}
      {currentReport && (
        <div className="grid grid-cols-3 gap-4">
          {/* Left: Feature Importance Chart */}
          <div className="col-span-2">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Feature Importance — {currentReport.method}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={featureData} layout="vertical" margin={{ top: 8, right: 24, left: 120, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                    <XAxis type="number" domain={[0, 0.5]} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} width={110} />
                    <ReTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="importance" maxBarSize={28}>
                      {featureData.map((_, i) => (
                        <Cell key={i} fill={ct.brand} fillOpacity={1 - i * 0.15} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right: Metadata */}
          <div>
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Explanation Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Method', value: currentReport.method },
                  { label: 'Type', value: currentReport.type },
                  { label: 'Date', value: formatDate(currentReport.date) },
                  { label: 'Owner', value: currentReport.owner },
                  { label: 'Framework', value: currentReport.framework },
                  { label: 'Audit Trail', value: `${currentReport.auditTrailCount.toLocaleString()} decisions` },
                  { label: 'Status', value: currentReport.status },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{f.label}</span>
                    {f.label === 'Status' ? (
                      <Badge style={{
                        background: f.value === 'Complete' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                        color: f.value === 'Complete' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                        borderRadius: 0, fontSize: 10,
                      }}>{f.value}</Badge>
                    ) : (
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.value}</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Decision Audit Trail */}
      {currentReport && (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Decision Audit Trail — {currentReport.modelName}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Decision ID', 'Input Summary', 'Top Feature', 'Score', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(MOCK_DECISIONS[selectedModel] || []).map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{d.id}</td>
                      <td className="px-4 py-3 text-xs max-w-[250px] truncate" style={{ color: 'hsl(var(--text-1))' }}>{d.inputSummary}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{d.topFeature}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold" style={{ color: d.score >= 0.9 ? 'hsl(var(--s-ok-tx))' : d.score >= 0.8 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>
                          {(d.score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(d.date)}</td>
                      <td className="px-4 py-3">
                        <Badge style={{
                          background: d.status === 'Explained' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                          color: d.status === 'Explained' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                          borderRadius: 0, fontSize: 10,
                        }}>{d.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSelectedDecision(d); setDecisionSheetOpen(true); }} style={{ borderRadius: 0 }}>
                          View Full Explanation <ArrowRight size={10} className="ml-1" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Management Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Explainability Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['EXP-ID', 'Model', 'Method', 'Date', 'Status', 'Owner', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{r.id}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{r.modelName}</td>
                    <td className="px-4 py-3">
                      <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{r.method}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(r.date)}</td>
                    <td className="px-4 py-3">
                      <Badge style={{
                        background: r.status === 'Complete' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                        color: r.status === 'Complete' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                        borderRadius: 0, fontSize: 10,
                      }}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{r.owner}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetailSheet(r)}>
                          <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleGenerate} style={{ borderRadius: 0 }}>
                          <Lightning size={12} className="mr-1" />Generate
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(r)}>
                          <Trash size={14} style={{ color: 'hsl(var(--destructive))' }} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Report"
        message={<p>Delete <strong>{deleteTarget?.id}</strong> for {deleteTarget?.modelName}? This cannot be undone.</p>}
        confirmLabel="Delete"
      />

      {/* Decision Full Explanation Sheet */}
      <Sheet open={decisionSheetOpen} onOpenChange={setDecisionSheetOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedDecision && currentReport && (
            <>
              <SheetHeader>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Decision Explanation — {selectedDecision.id}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Input Summary</span>
                  <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedDecision.inputSummary}</p>
                </div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Feature Breakdown</div>
                {currentReport.topFeatures.map(f => (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="text-xs w-36 truncate" style={{ color: 'hsl(var(--text-4))' }}>{f.name}</span>
                    <div className="flex-1 h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                      <div className="h-full" style={{ width: `${f.importance * 100}%`, background: 'hsl(var(--brand))', borderRadius: 0 }} />
                    </div>
                    <span className="text-xs font-mono w-12 text-right" style={{ color: 'hsl(var(--text-1))' }}>{(f.importance * 100).toFixed(0)}%</span>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Explanation Score</span>
                    <p className="text-lg font-bold mt-1" style={{ color: selectedDecision.score >= 0.9 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>
                      {(selectedDecision.score * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Method</span>
                    <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{currentReport.method}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Explanation Detail Sheet (4 tabs) */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedReport && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Brain size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  {selectedReport.id} — {selectedReport.modelName}
                </SheetTitle>
              </SheetHeader>
              <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="features" style={{ borderRadius: 0 }}>Feature Importance</TabsTrigger>
                  <TabsTrigger value="model-card" style={{ borderRadius: 0 }}>Model Card Link</TabsTrigger>
                  <TabsTrigger value="decisions" style={{ borderRadius: 0 }}>Decision History</TabsTrigger>
                  <TabsTrigger value="regulatory" style={{ borderRadius: 0 }}>Regulatory Mapping</TabsTrigger>
                </TabsList>

                {/* Feature Importance */}
                <TabsContent value="features" className="mt-4 space-y-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={selectedReport.topFeatures.map(f => ({ name: f.name, importance: f.importance }))} layout="vertical" margin={{ top: 8, right: 24, left: 120, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 0.5]} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: ct.axis, fontSize: 11 }} axisLine={{ stroke: ct.grid }} tickLine={false} width={110} />
                      <ReTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="importance" fill={ct.brand} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Feature</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Importance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.topFeatures.map(f => (
                          <tr key={f.name} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</td>
                            <td className="px-3 py-2 text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{(f.importance * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* Model Card Link */}
                <TabsContent value="model-card" className="mt-4 space-y-3">
                  <div className="p-4" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center gap-3 mb-3">
                      <ChartBar size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{selectedReport.modelName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span style={{ color: 'hsl(var(--text-4))' }}>Model ID:</span> <span style={{ color: 'hsl(var(--text-1))' }}>{selectedReport.modelId}</span></div>
                      <div><span style={{ color: 'hsl(var(--text-4))' }}>Method:</span> <span style={{ color: 'hsl(var(--text-1))' }}>{selectedReport.method}</span></div>
                      <div><span style={{ color: 'hsl(var(--text-4))' }}>Type:</span> <span style={{ color: 'hsl(var(--text-1))' }}>{selectedReport.type}</span></div>
                      <div><span style={{ color: 'hsl(var(--text-4))' }}>Framework:</span> <span style={{ color: 'hsl(var(--text-1))' }}>{selectedReport.framework}</span></div>
                    </div>
                    <Button variant="outline" className="mt-3 text-xs" style={{ borderRadius: 0 }} onClick={() => window.open(`/models/inventory/${selectedReport.modelId}`, '_blank')}>
                      View Full Model Detail <ArrowRight size={10} className="ml-1" />
                    </Button>
                  </div>
                </TabsContent>

                {/* Decision History */}
                <TabsContent value="decisions" className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          {['ID', 'Input', 'Top Feature', 'Score', 'Status'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(EXTENDED_DECISIONS[selectedReport.modelId] || []).slice(0, 10).map(d => (
                          <tr key={d.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            <td className="px-3 py-2 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{d.id}</td>
                            <td className="px-3 py-2 text-xs max-w-[180px] truncate" style={{ color: 'hsl(var(--text-1))' }}>{d.inputSummary}</td>
                            <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{d.topFeature}</td>
                            <td className="px-3 py-2 text-xs font-bold" style={{ color: d.score >= 0.9 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{(d.score * 100).toFixed(0)}%</td>
                            <td className="px-3 py-2">
                              <Badge style={{
                                background: d.status === 'Explained' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                                color: d.status === 'Explained' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                                borderRadius: 0, fontSize: 10,
                              }}>{d.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* Regulatory Mapping */}
                <TabsContent value="regulatory" className="mt-4 space-y-3">
                  {[
                    { reg: 'GDPR Art. 22', title: 'Automated Decision-Making', status: selectedReport.framework.includes('GDPR') ? 'Compliant' : 'Gap Identified', desc: 'Requires meaningful explanation of automated decisions affecting data subjects.' },
                    { reg: 'EU AI Act Art. 13', title: 'Transparency Requirements', status: selectedReport.status === 'Complete' ? 'Compliant' : 'Pending Review', desc: 'High-risk AI systems must provide sufficient transparency for users to interpret output.' },
                  ].map(item => (
                    <div key={item.reg} className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.reg}</span>
                          <span className="text-xs ml-2" style={{ color: 'hsl(var(--text-4))' }}>— {item.title}</span>
                        </div>
                        <Badge style={{
                          background: item.status === 'Compliant' ? 'hsl(142 71% 45% / 0.12)' : item.status === 'Pending Review' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
                          color: item.status === 'Compliant' ? 'hsl(var(--s-ok-tx))' : item.status === 'Pending Review' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                          borderRadius: 0, fontSize: 10,
                        }}>{item.status}</Badge>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{item.desc}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
