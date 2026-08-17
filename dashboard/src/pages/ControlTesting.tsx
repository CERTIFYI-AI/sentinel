// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Control Testing — the real testing surface over the org's control library:
// the catalog comes from `controls` (useControls), history from
// `control_tests` (useControlTests — a save also stamps the control row),
// and remediation tasks are REAL remediation_plans rows written through
// incidentResponseService.saveRemediation. No simulated runs, no hardcoded
// trends: the trend chart derives from recorded tests and an empty history
// shows an honest empty state.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { CheckCircle, XCircle, Warning, ClipboardText, ArrowSquareOut, Flask } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useChartTheme } from '../hooks/useChartTheme';
import { useControls } from '../hooks/queries/useControls';
import { useControlTests } from '../hooks/useComplianceGroup';
import { useAuthStore } from '../stores/authStore';
import { saveRemediation } from '../services/incidentResponseService';
import type { ControlRecord } from '../services/controlService';
import type { ControlTestRecord } from '../services/complianceOpsService';

const RESULT_TONE: Record<string, { bg: string; tx: string }> = {
  pass: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' },
  fail: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))' },
  partial: { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' },
  not_tested: { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--text-3))' },
};

const displayRef = (c: ControlRecord) => c.controlRef || (c.id ? `${c.id.slice(0, 8)}…` : '—');

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const isDue = (c: ControlRecord) => !!c.nextTestAt && new Date(c.nextTestAt).getTime() < Date.now();

interface TestForm { result: string; tester: string; notes: string }

export default function ControlTesting() {
  const nav = useNavigate();
  const ct = useChartTheme();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const controlsQuery = useControls();
  const tests = useControlTests();

  const [tab, setTab] = useState('catalog');
  const [recordFor, setRecordFor] = useState<ControlRecord | null>(null);
  const [form, setForm] = useState<TestForm>({ result: 'pass', tester: '', notes: '' });

  const controls = useMemo(() => controlsQuery.data ?? [], [controlsQuery.data]);
  const controlById = useMemo(() => new Map(controls.map((c) => [c.id, c])), [controls]);

  // Real remediation task through the incident-response pipeline.
  const remediate = useMutation({
    mutationFn: (v: { control: ControlRecord; test?: ControlTestRecord }) =>
      saveRemediation({
        title: `Remediate failed control ${displayRef(v.control)}`,
        description: v.test?.notes
          ? `Raised from a failed control test. Test notes: ${v.test.notes}`
          : 'Raised from a failed control test.',
        status: 'planned',
        sourceType: 'control_test',
        sourceId: v.test?.id ?? v.control.id ?? null,
        owner: user?.fullName ?? user?.email ?? null,
        progressPct: 0,
        milestones: [],
        linkedModelIds: v.control.linkedModelIds ?? [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ri-remediations'] });
      toast.success('Remediation task created');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to create the remediation task'),
  });

  // Derived KPIs — real rows only.
  const dueControls = controls.filter(isDue);
  const passCount = tests.items.filter((t) => t.result === 'pass').length;
  const failCount = tests.items.filter((t) => t.result === 'fail').length;
  const passRate = tests.items.length ? Math.round((passCount / tests.items.length) * 100) : null;

  // Trend derived from real control_tests grouped by day.
  const trend = useMemo(() => {
    const byDay = new Map<string, { date: string; passed: number; failed: number; other: number }>();
    for (const t of tests.items) {
      const day = (t.testedAt ?? '').slice(0, 10);
      if (!day) continue;
      const row = byDay.get(day) ?? { date: day, passed: 0, failed: 0, other: 0 };
      if (t.result === 'pass') row.passed += 1;
      else if (t.result === 'fail') row.failed += 1;
      else row.other += 1;
      byDay.set(day, row);
    }
    return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [tests.items]);

  // Latest test per control (history is served newest-first).
  const latestTestByControl = useMemo(() => {
    const m = new Map<string, ControlTestRecord>();
    for (const t of tests.items) if (!m.has(t.controlId)) m.set(t.controlId, t);
    return m;
  }, [tests.items]);

  function openRecord(c: ControlRecord) {
    setForm({ result: 'pass', tester: user?.fullName ?? user?.email ?? '', notes: '' });
    setRecordFor(c);
  }

  // Persists the test AND stamps the control row (service is two checked
  // writes); the dialog closes only after the write resolves.
  async function submitTest() {
    if (!recordFor?.id) return;
    try {
      await tests.save({
        controlId: recordFor.id,
        result: form.result,
        tester: form.tester.trim() || null,
        notes: form.notes.trim() || null,
      });
      setRecordFor(null);
    } catch { /* hook fires the error toast */ }
  }

  const isLoading = controlsQuery.isLoading || tests.isLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Control Testing"
        subtitle={`${controls.length} controls in the library · ${tests.items.length} test${tests.items.length !== 1 ? 's' : ''} recorded`}
        icon={Flask}
        actions={
          <Button size="sm" variant="outline" onClick={() => nav('/compliance/controls')}>
            <ArrowSquareOut size={13} /> View in Controls
          </Button>
        }
      />

      {/* Errors */}
      {(controlsQuery.isError || tests.error) && (
        <div className="p-4" style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}>
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>Failed to load control testing data</p>
          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
            {(controlsQuery.error as Error)?.message ?? (tests.error as Error)?.message}
          </p>
        </div>
      )}

      {/* KPI strip — derived from real rows */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Controls', value: String(controls.length), sub: 'In the library' },
          { label: 'Tests Recorded', value: String(tests.items.length), sub: 'All time' },
          { label: 'Pass Rate', value: passRate == null ? '—' : `${passRate}%`, sub: passRate == null ? 'No tests recorded yet' : `${passCount} passed · ${failCount} failed`, alert: passRate != null && passRate < 70 },
          { label: 'Tests Due', value: String(dueControls.length), sub: 'next_test_at in the past', alert: dueControls.length > 0 },
        ].map((tile, i) => (
          <div key={i} className="p-3" style={{ border: `1px solid ${tile.alert ? 'hsl(var(--destructive) / 0.4)' : 'hsl(var(--border))'}`, background: tile.alert ? 'hsl(var(--s-er-bg) / 0.5)' : 'hsl(var(--bg-surface))' }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{tile.label}</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: tile.alert ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>{isLoading ? '…' : tile.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{tile.sub}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger value="catalog" style={{ borderRadius: 0 }}>Control Catalog</TabsTrigger>
          <TabsTrigger value="history" style={{ borderRadius: 0 }}>Test History</TabsTrigger>
          <TabsTrigger value="trend" style={{ borderRadius: 0 }}>Trend</TabsTrigger>
        </TabsList>

        {/* ── Catalog ── */}
        <TabsContent value="catalog" className="mt-4">
          {isLoading ? (
            <div className="animate-pulse space-y-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-[hsl(var(--bg-sunken))]" />)}
            </div>
          ) : controls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed" style={{ borderColor: 'hsl(var(--border))' }}>
              <ClipboardText size={34} style={{ color: 'hsl(var(--text-4))' }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No controls to test yet</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>Define controls in the control library first.</p>
              <Button size="sm" className="mt-4" onClick={() => nav('/compliance/controls')}>Go to Compliance Controls</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {controls.map((c) => {
                const latest = c.id ? latestTestByControl.get(c.id) : undefined;
                const lastResult = (c.testResult ?? latest?.result ?? '').toLowerCase();
                const tone = RESULT_TONE[lastResult];
                const due = isDue(c);
                return (
                  <div key={c.id} className="p-3" style={{ border: `1px solid ${due ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))'}`, background: 'hsl(var(--bg-surface))' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{displayRef(c)}</span>
                          {c.framework && <span className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }}>{c.framework}</span>}
                          {tone && (
                            <span className="text-[9px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: tone.bg, color: tone.tx }}>
                              {lastResult.replace('_', ' ')}
                            </span>
                          )}
                          {due && (
                            <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
                              <Warning size={9} /> TEST DUE
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{c.name || c.title || 'Untitled control'}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                          Last tested: {formatDate(c.lastTestedAt)} · Next test: {formatDate(c.nextTestAt)}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" style={{ borderRadius: 0 }}
                          onClick={() => openRecord(c)} disabled={tests.isSaving}>
                          Record test result
                        </Button>
                        {lastResult === 'fail' && (
                          <Button size="sm" className="h-7 text-[10px] px-2" style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}
                            onClick={() => remediate.mutate({ control: c, test: latest })} disabled={remediate.isPending}>
                            Create remediation task
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" style={{ borderRadius: 0 }}
                          onClick={() => nav(`/compliance/controls?open=${c.id}`)}>
                          View in Controls
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── History ── */}
        <TabsContent value="history" className="mt-4">
          {tests.isLoading ? (
            <div className="animate-pulse space-y-2" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-[hsl(var(--bg-sunken))]" />)}
            </div>
          ) : tests.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed" style={{ borderColor: 'hsl(var(--border))' }}>
              <ClipboardText size={34} style={{ color: 'hsl(var(--text-4))' }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No tests recorded yet</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>Record a test result against a control to build the audit trail.</p>
            </div>
          ) : (
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                        {['Control', 'Result', 'Tester', 'Notes', 'Tested At', ''].map((h, i) => (
                          <th key={h || i} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tests.items.map((t) => {
                        const control = controlById.get(t.controlId);
                        const tone = RESULT_TONE[t.result] ?? RESULT_TONE.not_tested;
                        return (
                          <tr key={t.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-[hsl(var(--bg-raised))]">
                            <td className="px-4 py-2.5">
                              {control ? (
                                <button className="text-xs font-medium underline-offset-2 hover:underline cursor-pointer text-left" style={{ color: 'hsl(var(--brand))' }}
                                  onClick={() => nav(`/compliance/controls?open=${control.id}`)}>
                                  <span className="font-mono mr-1.5" style={{ color: 'hsl(var(--text-4))' }}>{displayRef(control)}</span>
                                  {control.name || control.title}
                                </button>
                              ) : (
                                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Unavailable</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: tone.bg, color: tone.tx }}>
                                {t.result.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{t.tester || '—'}</td>
                            <td className="px-4 py-2.5 text-xs max-w-xs truncate" style={{ color: 'hsl(var(--text-3))' }}>{t.notes || '—'}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(t.testedAt)}</td>
                            <td className="px-4 py-2.5 text-right">
                              {t.result === 'fail' && control && (
                                <Button size="sm" variant="outline" className="h-6 text-[9px] px-2" style={{ borderRadius: 0 }}
                                  onClick={() => remediate.mutate({ control, test: t })} disabled={remediate.isPending}>
                                  Create remediation task
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Trend (derived from real tests) ── */}
        <TabsContent value="trend" className="mt-4">
          {trend.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 border border-dashed" style={{ borderColor: 'hsl(var(--border))' }}>
              <ClipboardText size={34} style={{ color: 'hsl(var(--text-4))' }} />
              <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>No test trend yet</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>The pass/fail trend appears once test results are recorded.</p>
            </div>
          ) : (
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Recorded Tests by Day</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trend} barCategoryGap={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="date" tick={{ fill: ct.axis, fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: ct.axis, fontSize: 11 }} />
                    <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="passed" name="Passed" stackId="a" fill="hsl(var(--s-ok-tx))" />
                    <Bar dataKey="failed" name="Failed" stackId="a" fill="hsl(var(--destructive))" />
                    <Bar dataKey="other" name="Partial / Other" stackId="a" fill="hsl(var(--s-wn-tx))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Record test result dialog ── */}
      <Dialog open={!!recordFor} onOpenChange={(o) => !o && setRecordFor(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>
              Record test result{recordFor ? ` — ${displayRef(recordFor)}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {recordFor && (
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{recordFor.name || recordFor.title}</p>
            )}
            {/* Recording advances next_test_at by the control's own declared
                cadence (service-side, checked write) — say so honestly. */}
            {recordFor?.testFrequency && (
              <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                Recording this test stamps the control and advances its next test date by its {recordFor.testFrequency} cadence.
              </p>
            )}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Result *</label>
              <Select value={form.result} onValueChange={(v) => setForm((f) => ({ ...f, result: v }))}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="pass"><span className="inline-flex items-center gap-1.5"><CheckCircle size={12} /> Pass</span></SelectItem>
                  <SelectItem value="fail"><span className="inline-flex items-center gap-1.5"><XCircle size={12} /> Fail</span></SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Tester</label>
              <Input value={form.tester} onChange={(e) => setForm((f) => ({ ...f, tester: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Notes</label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="What was tested, what was observed…" style={{ borderRadius: 0 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setRecordFor(null)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={submitTest} disabled={tests.isSaving} loading={tests.isSaving}>
              Record test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
