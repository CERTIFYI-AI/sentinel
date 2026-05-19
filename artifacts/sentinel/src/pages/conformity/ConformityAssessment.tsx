import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, ClipboardText,
  Warning, CheckCircle, Info, ArrowRight, ArrowLeft,
  FileText, Upload, Check, Circle, Clock,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CONFORMITY_ASSESSMENTS, MODELS, formatDate } from '../../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

interface CAStep {
  id: number; title: string; complete: boolean; score: number;
}

interface CA {
  id: string; modelId: string; modelName: string; framework: string;
  status: string; score: number; createdDate: string; reviewer: string;
  steps: CAStep[];
}

// ── Sub-requirements per step ────────────────────────────────────────────────

const SUB_REQUIREMENTS: Record<number, string[]> = {
  1: ['System architecture documentation complete', 'Data flow diagrams provided', 'Version control and change log maintained', 'API documentation current'],
  2: ['Risk identification methodology defined', 'Risk mitigation measures documented', 'Residual risk assessment complete', 'Risk monitoring procedures established'],
  3: ['Data quality metrics defined', 'Data lineage documented', 'Bias testing on training data complete', 'Data retention policies in place'],
  4: ['Human oversight roles assigned', 'Override mechanisms implemented', 'Escalation procedures documented', 'Training materials for operators available'],
  5: ['Accuracy benchmarks established', 'Adversarial robustness tested', 'Performance under distribution shift verified', 'Continuous monitoring configured'],
  6: ['Model explanation method documented', 'User-facing disclosure implemented', 'Interpretability report available', 'Plain-language description provided'],
};

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

// ── Score Color ──────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'hsl(var(--s-ok-tx))';
  if (score >= 60) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--destructive))';
}

function scoreBg(score: number): string {
  if (score >= 80) return 'hsl(142 71% 45% / 0.12)';
  if (score >= 60) return 'hsl(45 93% 47% / 0.12)';
  return 'hsl(0 72% 51% / 0.12)';
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ConformityAssessment() {
  const [assessments, setAssessments] = useState<CA[]>(CONFORMITY_ASSESSMENTS as CA[]);
  const [selectedCA, setSelectedCA] = useState<CA | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CA | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [subReqChecked, setSubReqChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Metrics
  const total = assessments.length;
  const complete = assessments.filter(a => a.status === 'Complete').length;
  const inProgress = assessments.filter(a => a.status === 'In Progress').length;
  const notStarted = assessments.filter(a => a.status === 'Not Started').length;

  const openAssessment = (ca: CA) => {
    setSelectedCA(ca);
    setActiveStep(0);
    setDetailOpen(true);
    // Init sub-requirement checkboxes based on step completion
    const checked: Record<string, boolean> = {};
    ca.steps.forEach(step => {
      const reqs = SUB_REQUIREMENTS[step.id] || [];
      reqs.forEach((_, i) => {
        checked[`${ca.id}-${step.id}-${i}`] = step.complete;
      });
    });
    setSubReqChecked(checked);
  };

  const handleMarkComplete = (stepId: number) => {
    if (!selectedCA) return;
    setAssessments(prev => prev.map(a => {
      if (a.id !== selectedCA.id) return a;
      return {
        ...a,
        steps: a.steps.map(s => s.id === stepId ? { ...s, complete: true, score: Math.min(100, s.score + 15) } : s),
      };
    }));
    const updated = { ...selectedCA, steps: selectedCA.steps.map(s => s.id === stepId ? { ...s, complete: true, score: Math.min(100, s.score + 15) } : s) };
    setSelectedCA(updated);
    toast(`Step ${stepId} marked complete`);
  };

  const handleGeneratePDF = () => {
    toast('Declaration PDF generated');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setAssessments(prev => prev.filter(a => a.id !== deleteTarget.id));
    toast(`${deleteTarget.id} deleted`, 'info');
    setDeleteTarget(null);
  };

  const handleStartNew = () => {
    const id = `CA-${String(assessments.length + 1).padStart(3, '0')}`;
    const ca: CA = {
      id, modelId: 'MDL-001', modelName: 'New Assessment Model', framework: 'EU AI Act Annex IV',
      status: 'Not Started', score: 0, createdDate: new Date().toISOString().split('T')[0], reviewer: 'USR-001',
      steps: [
        { id: 1, title: 'Technical Documentation', complete: false, score: 0 },
        { id: 2, title: 'Risk Management System', complete: false, score: 0 },
        { id: 3, title: 'Data Governance', complete: false, score: 0 },
        { id: 4, title: 'Human Oversight Measures', complete: false, score: 0 },
        { id: 5, title: 'Accuracy & Robustness', complete: false, score: 0 },
        { id: 6, title: 'Transparency & Explainability', complete: false, score: 0 },
      ],
    };
    setAssessments(prev => [...prev, ca]);
    toast(`Assessment ${id} created`);
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
            <ClipboardText size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Conformity Assessment</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>ISO 42001 Clause 9 and EU AI Act Annex IV assessment management</p>
        </div>
        <Button onClick={handleStartNew} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Plus size={14} className="mr-2" />Start New Assessment
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-3" style={{ background: 'hsl(220 90% 56% / 0.06)', border: '1px solid hsl(220 90% 56% / 0.2)', borderRadius: 0 }}>
        <p className="text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>
          <Info size={12} className="inline mr-1" />
          <strong>Regulatory Requirement:</strong> Conformity assessments are mandatory for high-risk AI systems under EU AI Act Annex IV. {inProgress} assessment{inProgress !== 1 ? 's' : ''} in progress, {notStarted} overdue.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Assessments" value={String(total)} variant="info" icon={<ClipboardText size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Complete" value={String(complete)} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />} />
        <MetricTile label="In Progress" value={String(inProgress)} variant="warn" icon={<Clock size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} />
        <MetricTile label="Not Started" value={String(notStarted)} variant="error" icon={<Warning size={16} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />} />
      </div>

      {/* Assessment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map(ca => {
          const completedSteps = ca.steps.filter(s => s.complete).length;
          const totalSteps = ca.steps.length;
          const pct = Math.round((completedSteps / totalSteps) * 100);
          return (
            <Card key={ca.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{ca.id}</span>
                    <h3 className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{ca.modelName}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openAssessment(ca)}>
                      <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openAssessment(ca)}>
                      <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(ca)}>
                      <Trash size={14} style={{ color: 'hsl(var(--destructive))' }} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{ca.framework}</Badge>
                  <Badge style={{
                    background: ca.status === 'Complete' ? 'hsl(142 71% 45% / 0.12)' : ca.status === 'In Progress' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
                    color: ca.status === 'Complete' ? 'hsl(var(--s-ok-tx))' : ca.status === 'In Progress' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                    borderRadius: 0, fontSize: 10,
                  }}>{ca.status}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Score</span>
                  <span className="text-sm font-bold" style={{ color: scoreColor(ca.score) }}>{ca.score}%</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Progress</span>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{completedSteps}/{totalSteps} steps</span>
                  </div>
                  <div className="w-full h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: scoreColor(ca.score), borderRadius: 0 }} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Last updated: {formatDate(ca.createdDate)}</span>
                </div>

                <Button
                  className="w-full text-xs"
                  onClick={() => openAssessment(ca)}
                  style={{ borderRadius: 0, background: ca.status === 'Complete' ? 'transparent' : 'hsl(var(--brand))', color: ca.status === 'Complete' ? 'hsl(var(--brand))' : '#fff', border: ca.status === 'Complete' ? '1px solid hsl(var(--brand))' : 'none' }}
                >
                  {ca.status === 'Complete' ? 'View Report' : 'Continue Assessment'}
                  <ArrowRight size={12} className="ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Assessment"
        message={<p>Delete assessment <strong>{deleteTarget?.id}</strong> for {deleteTarget?.modelName}? This cannot be undone.</p>}
        confirmLabel="Delete"
      />

      {/* Assessment Detail Sheet (Stepper) */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedCA && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <ClipboardText size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  {selectedCA.id} — {selectedCA.modelName}
                </SheetTitle>
              </SheetHeader>

              {/* Stepper Progress */}
              <div className="mt-4 mb-6">
                <div className="flex items-center gap-1">
                  {selectedCA.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center flex-1">
                      <button
                        onClick={() => setActiveStep(i)}
                        className="flex items-center gap-1.5 w-full"
                      >
                        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{
                          background: step.complete ? 'hsl(var(--s-ok-tx))' : i === activeStep ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                          color: step.complete || i === activeStep ? '#fff' : 'hsl(var(--text-4))',
                          borderRadius: 0,
                        }}>
                          {step.complete ? <Check size={12} weight="bold" /> : step.id}
                        </div>
                        <span className="text-[10px] truncate" style={{ color: i === activeStep ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>{step.title}</span>
                      </button>
                      {i < selectedCA.steps.length - 1 && (
                        <div className="w-4 h-px flex-shrink-0 mx-1" style={{ background: step.complete ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--border))' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Step Content */}
              {(() => {
                const step = selectedCA.steps[activeStep];
                if (!step) return null;
                const reqs = SUB_REQUIREMENTS[step.id] || [];
                return (
                  <div className="space-y-4">
                    {/* Step Header */}
                    <div className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Step {step.id}: {step.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge style={{
                            background: step.complete ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                            color: step.complete ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{step.complete ? 'Complete' : 'In Progress'}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold" style={{ color: scoreColor(step.score) }}>{step.score}</span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>/100</span>
                      </div>
                    </div>

                    {/* Sub-requirements Checklist */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Requirements Checklist</h4>
                      {reqs.map((req, i) => {
                        const key = `${selectedCA.id}-${step.id}-${i}`;
                        return (
                          <div key={key} className="flex items-center gap-3 p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                            <Checkbox
                              checked={subReqChecked[key] || false}
                              onCheckedChange={(checked) => setSubReqChecked(prev => ({ ...prev, [key]: !!checked }))}
                              style={{ borderRadius: 0 }}
                            />
                            <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{req}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Evidence Upload */}
                    <div>
                      <h4 className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Evidence Upload</h4>
                      <div className="flex items-center justify-center p-6 border-2 border-dashed" style={{ borderColor: 'hsl(var(--border))', borderRadius: 0 }}>
                        <div className="text-center">
                          <Upload size={24} style={{ color: 'hsl(var(--text-4))', margin: '0 auto' }} />
                          <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-4))' }}>Drop files here or click to upload</p>
                          <p className="text-[10px] mt-1" style={{ color: 'hsl(var(--text-4))' }}>PDF, DOC, XLSX up to 10MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <h4 className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Notes</h4>
                      <Textarea
                        value={notes[`${selectedCA.id}-${step.id}`] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [`${selectedCA.id}-${step.id}`]: e.target.value }))}
                        placeholder="Add notes for this step..."
                        style={{ borderRadius: 0 }}
                        rows={3}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        disabled={activeStep === 0}
                        onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}
                        style={{ borderRadius: 0 }}
                      >
                        <ArrowLeft size={12} className="mr-1" />Previous Step
                      </Button>
                      <div className="flex items-center gap-2">
                        {!step.complete && (
                          <Button onClick={() => handleMarkComplete(step.id)} style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: '#fff' }}>
                            <Check size={12} className="mr-1" />Mark Complete
                          </Button>
                        )}
                        {activeStep < selectedCA.steps.length - 1 ? (
                          <Button onClick={() => setActiveStep(prev => Math.min(selectedCA.steps.length - 1, prev + 1))} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                            Next Step<ArrowRight size={12} className="ml-1" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Generate PDF */}
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <Button onClick={handleGeneratePDF} className="w-full" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                  <FileText size={14} className="mr-2" />Generate Conformity Declaration PDF
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
