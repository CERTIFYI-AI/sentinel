import { useState } from 'react';
import {
  Eye, Plus, Warning, CheckCircle, XCircle, Robot, ChartLine
} from '@phosphor-icons/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { BIAS_AUDITS, MODELS, statusColor, severityColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="mt-0.5 text-[hsl(var(--brand))]">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[hsl(var(--text-1))]">{value}</div>
        <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{label}</div>
      </div>
    </Card>
  );
}

const WIZARD_STEPS = ['Select Model', 'Choose Framework', 'Configure Attributes', 'Run Audit'];

export default function BiasAuditWizard() {
  const orgName = useSettingsStore(s => s.orgName);
  const chart = useChartTheme();

  const [selected, setSelected] = useState<typeof BIAS_AUDITS[0] | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardModel, setWizardModel] = useState('');
  const [wizardFramework, setWizardFramework] = useState('');
  const [wizardRunning, setWizardRunning] = useState(false);

  const stats = {
    total: BIAS_AUDITS.length,
    failed: BIAS_AUDITS.filter(a => a.result === 'failed').length,
    passed: BIAS_AUDITS.filter(a => a.result === 'passed').length,
  };

  const resultColor = (r: string) => {
    if (r === 'passed') return { bg: '#14532d', text: '#86efac', border: '#166534' };
    if (r === 'failed') return { bg: '#7f1d1d', text: '#fca5a5', border: '#991b1b' };
    return { bg: '#713f12', text: '#fde047', border: '#854d0e' };
  };

  const scoreChartData = selected?.dimensions.map(d => ({
    attribute: d.attribute.length > 12 ? d.attribute.slice(0, 12) + '…' : d.attribute,
    score: Math.round(d.score * 100),
    threshold: Math.round(d.threshold * 100),
    pass: d.pass,
  })) || [];

  const handleWizardNext = () => {
    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep(s => s + 1);
    } else {
      setWizardRunning(true);
      setTimeout(() => {
        setWizardRunning(false);
        setWizardOpen(false);
        setWizardStep(0);
        setWizardModel('');
        setWizardFramework('');
      }, 2000);
    }
  };

  const handleWizardBack = () => setWizardStep(s => Math.max(0, s - 1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">Bias Audit Wizard</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">{orgName} — AI fairness and bias audit management</p>
        </div>
        <Button className="gap-2" onClick={() => { setWizardOpen(true); setWizardStep(0); }}>
          <Plus size={16} /> Run Bias Audit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<ChartLine size={20} />} value={stats.total} label="Total Audits" />
        <StatCard icon={<XCircle size={20} />} value={stats.failed} label="Failed" />
        <StatCard icon={<CheckCircle size={20} />} value={stats.passed} label="Passed" />
      </div>

      {/* Audit Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                {['ID', 'Model', 'Dataset', 'Framework', 'Score', 'Protected Attributes', 'Result', 'Date', 'Auditor', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BIAS_AUDITS.map(audit => {
                const rc = resultColor(audit.result);
                const sc = severityColor(audit.severity);
                return (
                  <tr key={audit.id} className={`border-b border-[hsl(var(--border))] transition-colors ${audit.result === 'failed' ? 'bg-red-950/10 hover:bg-red-950/20' : 'hover:bg-[hsl(var(--bg-surface))/50]'}`}>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-4))]">{audit.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Robot size={13} className="text-[hsl(var(--brand))]" />
                        <span className="text-sm font-medium text-[hsl(var(--text-1))]">{audit.modelName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{audit.dataset}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))]">{audit.framework}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={audit.overallScore * 100} className="w-16 h-1.5" />
                        <span className="text-xs font-medium" style={{ color: audit.overallScore >= 0.85 ? '#4ade80' : audit.overallScore >= 0.70 ? '#facc15' : '#f87171' }}>
                          {(audit.overallScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {audit.protectedAttributes.slice(0, 2).map(attr => (
                          <span key={attr} className="px-1.5 py-0.5 text-xs bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{attr}</span>
                        ))}
                        {audit.protectedAttributes.length > 2 && (
                          <span className="text-xs text-[hsl(var(--text-4))]">+{audit.protectedAttributes.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{audit.result}</span>
                    </td>
                    <td className="px-4 py-3 text-[hsl(var(--text-4))] text-xs">{formatDate(audit.date)}</td>
                    <td className="px-4 py-3 text-[hsl(var(--text-3))] text-xs">{audit.auditor}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setSelected(audit)}>
                        <Eye size={13} /> View Report
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={o => { if (!o) setSelected(null); }}>
        <SheetContent className="w-[700px] max-w-full overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <ChartLine size={18} /> {selected.modelName} — Bias Audit Report
                  <span className="font-mono text-xs text-[hsl(var(--text-4))]">{selected.id}</span>
                </SheetTitle>
              </SheetHeader>

              {selected.result === 'failed' && (
                <div className="mb-4 border border-red-700 bg-red-950/30 p-3 flex items-center gap-2">
                  <Warning size={16} className="text-red-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-red-300">Audit Failed</div>
                    <div className="text-xs text-red-400 mt-0.5">
                      {selected.status === 'blocked' ? 'Deployment BLOCKED until remediation is complete.' : 'Remediation actions required before production deployment.'}
                    </div>
                  </div>
                </div>
              )}

              <Tabs defaultValue="dimensions">
                <TabsList className="mb-4">
                  <TabsTrigger value="dimensions">Dimension Breakdown</TabsTrigger>
                  <TabsTrigger value="chart">Threshold Chart</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>

                <TabsContent value="dimensions" className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] p-3">
                      <div className="text-xs text-[hsl(var(--text-4))]">Overall Score</div>
                      <div className="text-xl font-bold mt-1" style={{ color: selected.overallScore >= 0.85 ? '#4ade80' : '#f87171' }}>
                        {(selected.overallScore * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] p-3">
                      <div className="text-xs text-[hsl(var(--text-4))]">Framework</div>
                      <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1">{selected.framework}</div>
                    </div>
                    <div className="bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] p-3">
                      <div className="text-xs text-[hsl(var(--text-4))]">Auditor</div>
                      <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1">{selected.auditor}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[hsl(var(--border))]">
                          {['Attribute', 'Score', 'Threshold', 'Pass/Fail'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.dimensions.map(d => (
                          <tr key={d.attribute} className="border-b border-[hsl(var(--border))]">
                            <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))]">{d.attribute}</td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-sm" style={{ color: d.pass ? '#4ade80' : '#f87171' }}>
                                {(d.score * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[hsl(var(--text-3))] font-mono text-sm">{(d.threshold * 100).toFixed(0)}%</td>
                            <td className="px-4 py-3">
                              {d.pass
                                ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle size={14} /> Pass</span>
                                : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={14} /> Fail</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="chart">
                  <div className="text-xs text-[hsl(var(--text-4))] mb-3">Score vs. threshold (85%) by protected attribute</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={scoreChartData} margin={{ left: 10, right: 10, top: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                      <XAxis dataKey="attribute" stroke={chart.axis} tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis domain={[0, 100]} stroke={chart.axis} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} label={{ value: 'Score (%)', angle: -90, position: 'insideLeft', style: { fill: chart.axis, fontSize: 11 } }} />
                      <Tooltip
                        contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, color: chart.tooltipText }}
                        formatter={(v: number) => [`${v}%`]}
                      />
                      <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="6 3" label={{ value: 'Threshold 85%', position: 'right', fill: '#f59e0b', fontSize: 11 }} />
                      <Line type="monotone" dataKey="score" stroke={chart.brand} strokeWidth={2} dot={{ r: 5, fill: chart.brand }} name="Fairness Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-2">
                  <div className="text-xs text-[hsl(var(--text-4))] mb-3">Remediation recommendations from audit</div>
                  {selected.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]">
                      <div className="w-5 h-5 mt-0.5 border border-[hsl(var(--border))] flex items-center justify-center text-xs text-[hsl(var(--text-4))] shrink-0">{i + 1}</div>
                      <div className="text-sm text-[hsl(var(--text-1))]">{rec}</div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Run Bias Audit Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={o => { if (!o) { setWizardOpen(false); setWizardStep(0); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Run Bias Audit — Step {wizardStep + 1} of {WIZARD_STEPS.length}</DialogTitle>
          </DialogHeader>

          {/* Step Progress */}
          <div className="flex gap-1 mb-4">
            {WIZARD_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1 flex-1">
                <div className={`w-5 h-5 text-xs flex items-center justify-center font-bold shrink-0 ${i <= wizardStep ? 'bg-[hsl(var(--brand))] text-white' : 'bg-[hsl(var(--border))] text-[hsl(var(--text-4))]'}`}>
                  {i < wizardStep ? '✓' : i + 1}
                </div>
                <div className="text-xs text-[hsl(var(--text-4))] hidden sm:block">{step}</div>
                {i < WIZARD_STEPS.length - 1 && <div className={`flex-1 h-px ${i < wizardStep ? 'bg-[hsl(var(--brand))]' : 'bg-[hsl(var(--border))]'}`} />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="py-4 space-y-3 min-h-[160px]">
            {wizardStep === 0 && (
              <div>
                <label className="text-sm font-medium text-[hsl(var(--text-1))] mb-2 block">Select Model to Audit</label>
                <Select value={wizardModel} onValueChange={setWizardModel}>
                  <SelectTrigger><SelectValue placeholder="Choose a model..." /></SelectTrigger>
                  <SelectContent>
                    {MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.id})</SelectItem>)}
                  </SelectContent>
                </Select>
                {wizardModel && (
                  <div className="mt-3 p-3 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--text-3))]">
                    {MODELS.find(m => m.id === wizardModel)?.description}
                  </div>
                )}
              </div>
            )}
            {wizardStep === 1 && (
              <div>
                <label className="text-sm font-medium text-[hsl(var(--text-1))] mb-2 block">Compliance Framework</label>
                <Select value={wizardFramework} onValueChange={setWizardFramework}>
                  <SelectTrigger><SelectValue placeholder="Choose framework..." /></SelectTrigger>
                  <SelectContent>
                    {['EU AI Act', 'NIST AI RMF', 'EEOC', 'GDPR', 'ISO/IEC 42001'].map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[hsl(var(--text-1))] mb-2 block">Protected Attributes to Audit</label>
                {['Gender', 'Age', 'Race/Ethnicity', 'Geography', 'Disability', 'Income Bracket'].map(attr => (
                  <label key={attr} className="flex items-center gap-2 p-2 border border-[hsl(var(--border))] cursor-pointer hover:bg-[hsl(var(--bg-surface))]">
                    <input type="checkbox" defaultChecked className="accent-[hsl(var(--brand))]" />
                    <span className="text-sm text-[hsl(var(--text-1))]">{attr}</span>
                  </label>
                ))}
              </div>
            )}
            {wizardStep === 3 && (
              <div className="text-center py-6 space-y-3">
                {wizardRunning ? (
                  <>
                    <div className="w-12 h-12 border-4 border-[hsl(var(--brand))] border-t-transparent animate-spin mx-auto" />
                    <div className="text-sm text-[hsl(var(--text-1))]">Running bias audit...</div>
                    <div className="text-xs text-[hsl(var(--text-4))]">This may take a few minutes</div>
                  </>
                ) : (
                  <>
                    <ChartLine size={40} className="mx-auto text-[hsl(var(--brand))]" />
                    <div className="text-sm font-medium text-[hsl(var(--text-1))]">Ready to run audit</div>
                    <div className="text-xs text-[hsl(var(--text-4))]">
                      Model: {MODELS.find(m => m.id === wizardModel)?.name || wizardModel || 'Not selected'}<br />
                      Framework: {wizardFramework || 'Not selected'}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {wizardStep > 0 && (
              <Button variant="outline" onClick={handleWizardBack} disabled={wizardRunning}>Back</Button>
            )}
            <Button onClick={handleWizardNext} disabled={wizardRunning || (wizardStep === 0 && !wizardModel) || (wizardStep === 1 && !wizardFramework)}>
              {wizardStep === WIZARD_STEPS.length - 1 ? (wizardRunning ? 'Running...' : 'Run Audit') : 'Next'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
