import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TooltipProvider } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Clock, Lightning, Brain, ArrowRight,
  Warning, Play, CalendarBlank, ChartBar, Funnel, Plus,
  ShieldCheck, Robot, ClipboardText, TrendUp, TrendDown,
} from '@phosphor-icons/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';

// ── Control Test Definitions ───────────────────────────────────────────────────
type TestStatus = 'passed' | 'failed' | 'running' | 'scheduled' | 'not_tested';
type TestSeverity = 'critical' | 'high' | 'medium' | 'low';

interface ControlTest {
  id: string;
  control: string;
  controlId: string;
  framework: string;
  family: string;
  testType: 'automated' | 'manual' | 'hybrid';
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  status: TestStatus;
  lastRun: string;
  nextRun: string;
  passRate30d: number;
  consecutivePasses: number;
  evidence: string[];
  severity: TestSeverity;
  failureReason?: string;
}

const CONTROL_TESTS: ControlTest[] = [
  { id: 'CT-001', control: 'Model drift threshold monitoring — production models', controlId: 'CTL-014', framework: 'NIST AI RMF', family: 'MEASURE', testType: 'automated', frequency: 'continuous', status: 'passed', lastRun: '2026-04-12T14:00Z', nextRun: '2026-04-12T15:00Z', passRate30d: 97, consecutivePasses: 14, evidence: ['Drift score: 0.04 < 0.1 threshold', 'All 6 models within bounds'], severity: 'high' },
  { id: 'CT-002', control: 'Bias score below DI threshold per ECOA Reg B', controlId: 'CTL-023', framework: 'ECOA Reg B', family: 'Fairness', testType: 'automated', frequency: 'daily', status: 'failed', lastRun: '2026-04-12T06:00Z', nextRun: '2026-04-13T06:00Z', passRate30d: 71, consecutivePasses: 0, evidence: ['MDL-001 Gender DI: 0.84 — BELOW 0.85 threshold', 'MDL-001 Age DI: 0.81 — BELOW 0.85 threshold'], severity: 'critical', failureReason: 'MDL-001 CreditRisk-XGB: Gender parity DI score (0.84) below ECOA Reg B minimum threshold of 0.85. Immediate remediation required.' },
  { id: 'CT-003', control: 'EU AI Act Art. 52 transparency disclosure — user notification', controlId: 'CTL-031', framework: 'EU AI Act', family: 'Transparency', testType: 'automated', frequency: 'daily', status: 'passed', lastRun: '2026-04-12T06:00Z', nextRun: '2026-04-13T06:00Z', passRate30d: 100, consecutivePasses: 28, evidence: ['Disclosure banner present on 3/3 user-facing AI features', 'API response includes ai-generated header'], severity: 'high' },
  { id: 'CT-004', control: 'Explainability output availability — adverse action notices', controlId: 'CTL-009', framework: 'ECOA Reg B', family: 'Explainability', testType: 'automated', frequency: 'continuous', status: 'passed', lastRun: '2026-04-12T14:30Z', nextRun: '2026-04-12T15:30Z', passRate30d: 94, consecutivePasses: 5, evidence: ['SHAP values returned for 100% of credit decisions', 'Latency P99: 47ms < 200ms SLA'], severity: 'high' },
  { id: 'CT-005', control: 'Human oversight checkpoint — high-risk AI decisions above threshold', controlId: 'CTL-041', framework: 'EU AI Act', family: 'Human Oversight', testType: 'hybrid', frequency: 'weekly', status: 'passed', lastRun: '2026-04-10T09:00Z', nextRun: '2026-04-17T09:00Z', passRate30d: 88, consecutivePasses: 3, evidence: ['HITL queue processing time: 4.2h avg < 24h SLA', '100% of flagged decisions reviewed within SLA'], severity: 'high' },
  { id: 'CT-006', control: 'Model training data documentation — lineage and consent records', controlId: 'CTL-018', framework: 'GDPR', family: 'Data Governance', testType: 'automated', frequency: 'weekly', status: 'passed', lastRun: '2026-04-09T10:00Z', nextRun: '2026-04-16T10:00Z', passRate30d: 100, consecutivePasses: 9, evidence: ['5/6 models have complete lineage graphs', 'Consent records verified for 3 consumer datasets'], severity: 'medium' },
  { id: 'CT-007', control: 'Kill switch functionality test — emergency shutdown latency', controlId: 'CTL-055', framework: 'EU AI Act', family: 'Safety', testType: 'automated', frequency: 'monthly', status: 'scheduled', lastRun: '2026-03-15T14:00Z', nextRun: '2026-04-15T14:00Z', passRate30d: 100, consecutivePasses: 0, evidence: [], severity: 'critical' },
  { id: 'CT-008', control: 'Vendor AI risk assessment — current and complete', controlId: 'CTL-067', framework: 'ISO 42001', family: 'Vendor Risk', testType: 'manual', frequency: 'quarterly', status: 'not_tested', lastRun: '2025-12-01T09:00Z', nextRun: '2026-04-01T09:00Z', passRate30d: 0, consecutivePasses: 0, evidence: [], severity: 'medium', failureReason: 'Manual assessment due — 43 days overdue. Assign to vendor risk team.' },
  { id: 'CT-009', control: 'SOC 2 CC6.1 — Logical access controls review', controlId: 'CTL-003', framework: 'SOC 2', family: 'Access Control', testType: 'automated', frequency: 'daily', status: 'passed', lastRun: '2026-04-12T00:00Z', nextRun: '2026-04-13T00:00Z', passRate30d: 100, consecutivePasses: 31, evidence: ['0 unauthorized access attempts in last 24h', 'MFA enforced for all 47 users', '3 accounts disabled post-termination within SLA'], severity: 'high' },
  { id: 'CT-010', control: 'NIST GOVERN 5.1 — AI policy documentation current', controlId: 'CTL-072', framework: 'NIST AI RMF', family: 'Governance', testType: 'automated', frequency: 'monthly', status: 'running', lastRun: '2026-04-12T14:00Z', nextRun: '2026-05-12T14:00Z', passRate30d: 91, consecutivePasses: 0, evidence: [], severity: 'medium' },
];

const TEST_TREND = [
  { date: 'Mar 14', passed: 8, failed: 2, total: 10 },
  { date: 'Mar 21', passed: 8, failed: 2, total: 10 },
  { date: 'Mar 28', passed: 9, failed: 1, total: 10 },
  { date: 'Apr 4', passed: 9, failed: 1, total: 10 },
  { date: 'Apr 12', passed: 8, failed: 2, total: 10 },
];

const FAMILY_HEALTH = [
  { family: 'Access Control', pass: 100 },
  { family: 'Data Governance', pass: 100 },
  { family: 'Transparency', pass: 100 },
  { family: 'Explainability', pass: 94 },
  { family: 'Human Oversight', pass: 88 },
  { family: 'MEASURE', pass: 97 },
  { family: 'Fairness', pass: 71 },
  { family: 'Governance', pass: 91 },
  { family: 'Vendor Risk', pass: 0 },
  { family: 'Safety', pass: 100 },
];

function testStatusStyle(s: TestStatus) {
  const map: Record<TestStatus, { bg: string; tx: string; label: string }> = {
    passed: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', label: 'PASSED' },
    failed: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))', label: 'FAILED' },
    running: { bg: 'hsl(var(--brand) / 0.1)', tx: 'hsl(var(--brand))', label: 'RUNNING' },
    scheduled: { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--text-3))', label: 'SCHEDULED' },
    not_tested: { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))', label: 'OVERDUE' },
  };
  return map[s];
}

function freqIcon(f: ControlTest['frequency']) {
  if (f === 'continuous') return <Lightning size={10} style={{ color: 'hsl(var(--brand))' }} />;
  if (f === 'daily') return <CalendarBlank size={10} style={{ color: 'hsl(var(--s-ok-tx))' }} />;
  return <Clock size={10} style={{ color: 'hsl(var(--text-4))' }} />;
}

export default function ControlTesting() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [tab, setTab] = useState('tests');
  const [filter, setFilter] = useState<TestStatus | 'all'>('all');
  const [runningAll, setRunningAll] = useState(false);

  const passed = CONTROL_TESTS.filter(t => t.status === 'passed').length;
  const failed = CONTROL_TESTS.filter(t => t.status === 'failed').length;
  const overdue = CONTROL_TESTS.filter(t => t.status === 'not_tested').length;
  const passRate = Math.round((passed / CONTROL_TESTS.length) * 100);

  const filtered = filter === 'all' ? CONTROL_TESTS : CONTROL_TESTS.filter(t => t.status === filter);

  async function runAllTests() {
    setRunningAll(true);
    toast.info('Running all automated control tests…');
    await new Promise(r => setTimeout(r, 2000));
    setRunningAll(false);
    toast.success('All automated tests complete — 8 passed, 2 require attention');
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <PageHeader
          title="Continuous Control Testing"
          subtitle={`${orgName} · ${CONTROL_TESTS.filter(t => t.testType === 'automated' || t.testType === 'hybrid').length} automated tests running continuously · replaces manual quarterly testing`}
          badge={
            <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--s-ok-tx))' }} />
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--s-ok-tx))' }}>Live · {CONTROL_TESTS.filter(t => t.frequency === 'continuous').length} monitors active</span>
            </div>
          }
          actions={
            <>
              <Button size="sm" variant="outline" leftIcon={<CalendarBlank size={13} />} onClick={() => toast.success('Schedule view — all test runs in calendar')}>View Schedule</Button>
              <Button size="sm" leftIcon={<Play size={13} />} onClick={runAllTests} disabled={runningAll}>{runningAll ? 'Running…' : 'Run All Now'}</Button>
            </>
          }
        />

        {/* KPI Strip */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Overall Pass Rate', value: `${passRate}%`, sub: 'Last 30 days', ok: passRate >= 90 },
            { label: 'Tests Passing', value: passed, sub: `of ${CONTROL_TESTS.length} total`, ok: true },
            { label: 'Tests Failing', value: failed, sub: 'Require remediation', alert: failed > 0 },
            { label: 'Overdue (Manual)', value: overdue, sub: 'Assigned but not completed', alert: overdue > 0 },
            { label: 'Continuous Tests', value: CONTROL_TESTS.filter(t => t.frequency === 'continuous').length, sub: 'Running every hour' },
          ].map((tile, i) => (
            <div key={i} className="p-3" style={{ border: `1px solid ${tile.alert ? 'hsl(var(--destructive) / 0.4)' : tile.ok === false ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))'}`, background: tile.alert ? 'hsl(var(--s-er-bg) / 0.5)' : 'hsl(var(--bg-surface))' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{tile.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: tile.alert ? 'hsl(var(--destructive))' : tile.ok === false ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>{tile.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{tile.sub}</p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="tests" style={{ borderRadius: 0 }}>All Tests</TabsTrigger>
            <TabsTrigger value="failures" style={{ borderRadius: 0 }}>
              Failures & Issues
              {(failed + overdue) > 0 && <span className="ml-1.5 text-[9px] px-1 py-0.5 font-bold" style={{ background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}>{failed + overdue}</span>}
            </TabsTrigger>
            <TabsTrigger value="analytics" style={{ borderRadius: 0 }}>Trend Analytics</TabsTrigger>
            <TabsTrigger value="schedule" style={{ borderRadius: 0 }}>Test Schedule</TabsTrigger>
          </TabsList>

          {/* ── All Tests ── */}
          <TabsContent value="tests" className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              {(['all', 'passed', 'failed', 'running', 'scheduled', 'not_tested'] as const).map(f => (
                <button key={f} className="text-[10px] px-2.5 py-1 font-medium"
                  style={{ background: filter === f ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))', color: filter === f ? 'hsl(var(--bg-surface))' : 'hsl(var(--text-3))', border: `1px solid ${filter === f ? 'hsl(var(--brand))' : 'hsl(var(--border))'}` }}
                  onClick={() => setFilter(f)}>
                  {f === 'not_tested' ? 'overdue' : f}{f === 'all' && ` (${CONTROL_TESTS.length})`}
                  {f === 'failed' && ` (${failed})`}{f === 'not_tested' && ` (${overdue})`}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filtered.map(test => {
                const ss = testStatusStyle(test.status);
                return (
                  <div key={test.id} className="p-3" style={{ border: `1px solid ${test.status === 'failed' ? 'hsl(var(--destructive) / 0.3)' : test.status === 'not_tested' ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))'}`, background: test.status === 'failed' ? 'hsl(var(--s-er-bg) / 0.3)' : 'hsl(var(--bg-surface))' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{test.controlId}</span>
                          <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</span>
                          <span className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }}>{test.framework}</span>
                          <span className="text-[9px] px-1.5 py-0.5" style={{ background: test.testType === 'automated' ? 'hsl(var(--brand) / 0.08)' : 'hsl(var(--s-nt-bg))', color: test.testType === 'automated' ? 'hsl(var(--brand))' : 'hsl(var(--text-4))' }}>
                            {test.testType === 'automated' ? <Robot size={9} className="inline mr-0.5" /> : null}{test.testType}
                          </span>
                          <span className="flex items-center gap-0.5 text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{freqIcon(test.frequency)}{test.frequency}</span>
                        </div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{test.control}</p>
                        {test.status === 'passed' && test.evidence.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {test.evidence.map((e, ei) => (
                              <span key={ei} className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>✓ {e}</span>
                            ))}
                          </div>
                        )}
                        {test.failureReason && (
                          <p className="text-[10px] mt-1.5 p-1.5" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' }}>
                            {test.failureReason}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="text-[9px] mb-1" style={{ color: 'hsl(var(--text-4))' }}>30-day pass rate</div>
                        <div className="text-base font-bold" style={{ color: test.passRate30d >= 90 ? 'hsl(var(--s-ok-tx))' : test.passRate30d >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>
                          {test.passRate30d}%
                        </div>
                        <div className="flex gap-1 mt-1.5 justify-end">
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-2" style={{ borderRadius: 0 }}
                            onClick={() => toast.success(`Running ${test.id}…`)}>
                            <Play size={8} />Run
                          </Button>
                          {test.status === 'failed' && (
                            <Button size="sm" className="h-6 text-[9px] px-2" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                              onClick={() => toast.success('Remediation task created')}>
                              Fix
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Failures ── */}
          <TabsContent value="failures" className="mt-4">
            <div className="space-y-3">
              {CONTROL_TESTS.filter(t => t.status === 'failed' || t.status === 'not_tested').map(test => {
                const ss = testStatusStyle(test.status);
                return (
                  <Card key={test.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${test.status === 'failed' ? 'hsl(var(--destructive) / 0.4)' : 'hsl(var(--s-wn-br))'}` }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {test.status === 'failed' ? <XCircle size={14} weight="fill" style={{ color: 'hsl(var(--destructive))' }} /> : <Warning size={14} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />}
                            <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</span>
                            <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{test.control}</span>
                          </div>
                          <div className="text-[10px] mb-2" style={{ color: 'hsl(var(--text-4))' }}>
                            {test.controlId} · {test.framework} · {test.frequency} test · Last run: {test.lastRun.split('T')[0]}
                          </div>
                          {test.failureReason && (
                            <div className="p-2 text-xs" style={{ background: test.status === 'failed' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))', color: test.status === 'failed' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))' }}>
                              {test.failureReason}
                            </div>
                          )}
                          {test.evidence.map((e, ei) => (
                            <p key={ei} className="text-[10px] mt-1" style={{ color: 'hsl(var(--s-er-tx))' }}>• {e}</p>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }} className="h-7 text-[10px] px-3"
                            onClick={() => toast.success('Remediation task created and assigned')}>
                            Create Remediation Task
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-3" style={{ borderRadius: 0 }}
                            onClick={() => toast.info('Opening compliance controls for manual testing')}>
                            Mark In-Progress
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Weekly Pass/Fail Trend (5 weeks)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={TEST_TREND} barCategoryGap={12}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="date" tick={{ fill: ct.axis, fontSize: 11 }} />
                      <YAxis tick={{ fill: ct.axis, fontSize: 11 }} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="passed" name="Passed" stackId="a" fill="hsl(var(--s-ok-tx))" />
                      <Bar dataKey="failed" name="Failed" stackId="a" fill="hsl(var(--destructive))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Pass Rate by Control Family</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={FAMILY_HEALTH} layout="vertical" barCategoryGap={6}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 9 }} />
                      <YAxis dataKey="family" type="category" tick={{ fill: ct.axis, fontSize: 9 }} width={90} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                      <Bar dataKey="pass" name="Pass Rate %" radius={0}>
                        {FAMILY_HEALTH.map((entry, i) => (
                          <Cell key={i} fill={entry.pass >= 90 ? 'hsl(var(--s-ok-tx))' : entry.pass >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Test Schedule ── */}
          <TabsContent value="schedule" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Upcoming Test Runs — Next 7 Days</p>
                  <div className="space-y-2">
                    {CONTROL_TESTS
                      .filter(t => t.frequency !== 'continuous')
                      .sort((a, b) => new Date(a.nextRun).getTime() - new Date(b.nextRun).getTime())
                      .map(test => {
                        const ss = testStatusStyle(test.status);
                        const nextDate = new Date(test.nextRun);
                        const hoursUntil = Math.round((nextDate.getTime() - Date.now()) / 3600000);
                        const daysUntil = Math.floor(hoursUntil / 24);
                        return (
                          <div key={test.id} className="flex items-center gap-3 p-2.5"
                            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                            <div className="w-10 text-center flex-shrink-0">
                              <p className="text-[8px] uppercase font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{nextDate.toLocaleDateString('en-US', { month: 'short' })}</p>
                              <p className="text-base font-bold leading-none" style={{ color: 'hsl(var(--text-1))' }}>{nextDate.getDate()}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{test.control}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] px-1.5 py-0.5" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</span>
                                <span className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{test.framework} · {test.testType}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] font-semibold" style={{ color: hoursUntil < 24 ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                                {hoursUntil < 24 ? `${hoursUntil}h` : `${daysUntil}d`}
                              </p>
                              <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{test.frequency}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Continuous Tests — Live Status</p>
                  <div className="space-y-2 mb-4">
                    {CONTROL_TESTS.filter(t => t.frequency === 'continuous').map(test => {
                      const ss = testStatusStyle(test.status);
                      return (
                        <div key={test.id} className="flex items-center gap-3 p-2.5"
                          style={{ border: `1px solid ${test.status === 'passed' ? 'hsl(var(--s-ok-br))' : 'hsl(var(--destructive) / 0.3)'}`, background: test.status === 'passed' ? 'hsl(var(--s-ok-bg) / 0.4)' : 'hsl(var(--s-er-bg) / 0.3)' }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                            style={{ background: test.status === 'passed' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{test.control}</p>
                            <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>
                              Runs every hour · Next: {new Date(test.nextRun).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                    <p className="text-[10px] font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>30-Day SLA Performance</p>
                    {[
                      { label: 'Test execution SLA (< 5min)', met: 98.2 },
                      { label: 'Alert notification SLA (< 15min)', met: 99.6 },
                      { label: 'Remediation task creation SLA (< 1hr)', met: 94.1 },
                      { label: 'Overall control coverage', met: 80 },
                    ].map((s, i) => (
                      <div key={i} className="mb-2">
                        <div className="flex justify-between text-[9px] mb-0.5">
                          <span style={{ color: 'hsl(var(--text-4))' }}>{s.label}</span>
                          <span className="font-bold" style={{ color: s.met >= 95 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{s.met}%</span>
                        </div>
                        <div className="h-1 w-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                          <div style={{ width: `${s.met}%`, height: '100%', background: s.met >= 95 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
