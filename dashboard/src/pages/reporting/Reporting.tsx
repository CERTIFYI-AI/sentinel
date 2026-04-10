import { useState } from 'react';
import {
  Eye, DownloadSimple, Clock, ChartBar, ShieldCheck,
  Warning, Siren, Scales, Brain, Gavel, ChartLine,
  Plus, PencilSimple, Trash, Play, Pause, Calendar,
  User, FileText, FilePdf, MagnifyingGlass, Check, Info,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatDate, AUDIT_LOG } from '../../data/seed';

// ── MetricTile ────────────────────────────────────────────────────────────────
function MetricTile({ label, value, variant }: {
  label: string; value: string | number; variant: 'default' | 'error' | 'warn' | 'ok' | 'info';
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    error: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' },
    ok: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' },
    info: { bg: 'hsl(var(--s-in-bg))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--s-in-br))' },
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

// ── Report Templates ──────────────────────────────────────────────────────────
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof ChartBar;
  lastGenerated: string;
  category: string;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'RPT-001', name: 'Compliance Summary',
    description: 'Cross-framework compliance status — EU AI Act, ISO 27001, SOC 2, NIST AI RMF, OWASP LLM Top 10 coverage and gap analysis.',
    icon: ShieldCheck, lastGenerated: '2026-04-01', category: 'Compliance',
  },
  {
    id: 'RPT-002', name: 'Risk Register',
    description: 'Complete risk register export — 12 risks with likelihood, impact, score, mitigations, and trend analysis.',
    icon: Warning, lastGenerated: '2026-04-03', category: 'Risk',
  },
  {
    id: 'RPT-003', name: 'Incident Report',
    description: 'AI incident summary — open, investigating, and resolved incidents with root cause analysis and corrective actions.',
    icon: Siren, lastGenerated: '2026-03-28', category: 'Incidents',
  },
  {
    id: 'RPT-004', name: 'Vendor Risk Assessment',
    description: 'Third-party AI vendor risk scorecard — DPA status, security scores, and compliance alignment for 7 vendors.',
    icon: Scales, lastGenerated: '2026-03-25', category: 'Vendor',
  },
  {
    id: 'RPT-005', name: 'Model Inventory',
    description: 'AI model lifecycle report — 6 models with risk tiers, fairness scores, drift status, and compliance mapping.',
    icon: Brain, lastGenerated: '2026-04-02', category: 'Models',
  },
  {
    id: 'RPT-006', name: 'EU AI Act Readiness',
    description: 'EU AI Act compliance readiness assessment — Article-by-article gap analysis with remediation timeline.',
    icon: Gavel, lastGenerated: '2026-03-30', category: 'Regulatory',
  },
  {
    id: 'RPT-007', name: 'Executive Dashboard',
    description: 'C-suite summary — trust score, risk posture, compliance status, incident count, and key action items.',
    icon: ChartLine, lastGenerated: '2026-04-05', category: 'Executive',
  },
  {
    id: 'RPT-008', name: 'Board Governance Report',
    description: 'Board-level AI governance summary — strategic risk posture, regulatory exposure, key metrics, and attestation status for directors and trustees.',
    icon: Gavel, lastGenerated: '2026-03-31', category: 'Executive',
  },
];

// ── Scheduled Reports ─────────────────────────────────────────────────────────
interface ScheduledReport {
  id: string;
  name: string;
  frequency: string;
  nextDelivery: string;
  recipients: string[];
  paused: boolean;
}

const SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 'SCH-001', name: 'Weekly Compliance Summary', frequency: 'Weekly', nextDelivery: '2026-04-07', recipients: ['Sarah Chen', 'James Patel'], paused: false },
  { id: 'SCH-002', name: 'Monthly Executive Dashboard', frequency: 'Monthly', nextDelivery: '2026-05-01', recipients: ['Sarah Chen', 'Emma Wilson'], paused: false },
  { id: 'SCH-003', name: 'Quarterly Risk Register', frequency: 'Quarterly', nextDelivery: '2026-07-01', recipients: ['David Kim', 'Raj Gupta'], paused: false },
];

// ── Generation History ────────────────────────────────────────────────────────
interface GenerationEntry {
  id: string;
  reportName: string;
  generatedAt: string;
  generatedBy: string;
  format: string;
  status: string;
  duration: string;
}

const GENERATION_HISTORY: GenerationEntry[] = [
  { id: 'GEN-001', reportName: 'Executive Dashboard', generatedAt: '2026-04-05T16:30:00Z', generatedBy: 'Sarah Chen', format: 'PDF', status: 'completed', duration: '3.8s' },
  { id: 'GEN-002', reportName: 'Compliance Summary', generatedAt: '2026-04-01T09:00:00Z', generatedBy: 'System (Scheduled)', format: 'PDF', status: 'completed', duration: '4.5s' },
  { id: 'GEN-003', reportName: 'Risk Register', generatedAt: '2026-04-03T14:15:00Z', generatedBy: 'David Kim', format: 'XLSX', status: 'completed', duration: '2.9s' },
  { id: 'GEN-004', reportName: 'Incident Report', generatedAt: '2026-03-28T11:00:00Z', generatedBy: 'James Patel', format: 'PDF', status: 'completed', duration: '3.2s' },
  { id: 'GEN-005', reportName: 'Vendor Risk Assessment', generatedAt: '2026-03-25T10:30:00Z', generatedBy: 'David Kim', format: 'PDF', status: 'completed', duration: '5.1s' },
  { id: 'GEN-006', reportName: 'Model Inventory', generatedAt: '2026-04-02T15:45:00Z', generatedBy: 'Raj Gupta', format: 'PDF', status: 'completed', duration: '4.0s' },
  { id: 'GEN-007', reportName: 'EU AI Act Readiness', generatedAt: '2026-03-30T08:00:00Z', generatedBy: 'System (Scheduled)', format: 'PDF', status: 'completed', duration: '6.2s' },
  { id: 'GEN-008', reportName: 'Weekly Compliance Summary', generatedAt: '2026-03-31T09:00:00Z', generatedBy: 'System (Scheduled)', format: 'PDF', status: 'completed', duration: '3.9s' },
];

// ── Sample chart data for Preview ─────────────────────────────────────────────
const COMPLIANCE_DATA = [
  { name: 'EU AI Act', score: 65 },
  { name: 'ISO 27001', score: 92 },
  { name: 'SOC 2', score: 85 },
  { name: 'NIST AI RMF', score: 71 },
  { name: 'OWASP LLM', score: 58 },
  { name: 'ISO 42001', score: 78 },
];

const RISK_TREND = [
  { month: 'Oct', critical: 2, high: 4, medium: 3 },
  { month: 'Nov', critical: 3, high: 4, medium: 3 },
  { month: 'Dec', critical: 3, high: 5, medium: 2 },
  { month: 'Jan', critical: 4, high: 5, medium: 2 },
  { month: 'Feb', critical: 4, high: 6, medium: 2 },
  { month: 'Mar', critical: 4, high: 6, medium: 2 },
];

const PIE_DATA = [
  { name: 'Compliant', value: 4 },
  { name: 'Partial', value: 3 },
  { name: 'Non-Compliant', value: 1 },
];
const PIE_COLORS = ['hsl(var(--s-ok-tx))', 'hsl(var(--s-wn-tx))', 'hsl(var(--destructive))'];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function Reporting() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [activeTab, setActiveTab] = useState('templates');

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<ReportTemplate | null>(null);

  // Generate modal
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateReport, setGenerateReport] = useState<ReportTemplate | null>(null);
  const [generateFormat, setGenerateFormat] = useState('pdf');
  const [generateDateRange, setGenerateDateRange] = useState('last-30d');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Schedule modal
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleReport, setScheduleReport] = useState<ReportTemplate | null>(null);
  const [scheduleFreq, setScheduleFreq] = useState('weekly');
  const [scheduleDay, setScheduleDay] = useState('monday');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  // Scheduled reports state
  const [scheduledReports, setScheduledReports] = useState(SCHEDULED_REPORTS);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const generatedThisMonth = GENERATION_HISTORY.filter(g => {
    const d = new Date(g.generatedAt);
    return d.getMonth() === 3 && d.getFullYear() === 2026; // April 2026
  }).length;
  const scheduledCount = scheduledReports.filter(s => !s.paused).length;
  const overdueCount = scheduledReports.filter(s => {
    const next = new Date(s.nextDelivery);
    return next.getTime() < Date.now() && !s.paused;
  }).length;

  // ── Generate handler ──────────────────────────────────────────────────────
  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
  };

  // ── Toggle pause ──────────────────────────────────────────────────────────
  const togglePause = (id: string) => {
    setScheduledReports(prev => prev.map(s => s.id === id ? { ...s, paused: !s.paused } : s));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Reporting</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} — Compliance reports, risk summaries, and regulatory documentation
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricTile label="Generated This Month" value={generatedThisMonth} variant="default" />
          <MetricTile label="Scheduled" value={scheduledCount} variant="info" />
          <MetricTile label="Overdue" value={overdueCount} variant="error" />
          <MetricTile label="Avg Generation Time" value="4.2s" variant="ok" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="templates" style={{ borderRadius: 0 }}>Report Templates</TabsTrigger>
            <TabsTrigger value="scheduled" style={{ borderRadius: 0 }}>Scheduled Reports</TabsTrigger>
            <TabsTrigger value="history" style={{ borderRadius: 0 }}>Generation History</TabsTrigger>
            <TabsTrigger value="builder" style={{ borderRadius: 0 }}>Custom Builder</TabsTrigger>
            <TabsTrigger value="signatures" style={{ borderRadius: 0 }}>Approvals & Sign-off</TabsTrigger>
          </TabsList>

          {/* ── Report Templates ──────────────────────────────────────────── */}
          <TabsContent value="templates" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              {REPORT_TEMPLATES.map(report => (
                <Card key={report.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <report.icon size={20} style={{ color: 'hsl(var(--brand))' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{report.name}</p>
                          <Badge className="text-[9px] px-1 py-0 mt-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0 }}>
                            {report.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--text-4))' }}>{report.description}</p>
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                      <Clock size={10} />
                      <span>Last generated: {formatDate(report.lastGenerated)}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            style={{ borderRadius: 0 }}
                            onClick={() => { setPreviewReport(report); setPreviewOpen(true); }}
                          >
                            <Eye size={12} className="mr-1" />Preview
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent style={{ borderRadius: 0 }}>Preview report with live data</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            style={{ borderRadius: 0 }}
                            onClick={() => { setGenerateReport(report); setGenerateOpen(true); setGenerated(false); }}
                          >
                            <DownloadSimple size={12} className="mr-1" />Generate
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent style={{ borderRadius: 0 }}>Generate PDF/XLSX report</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            style={{ borderRadius: 0 }}
                            onClick={() => { setScheduleReport(report); setScheduleOpen(true); }}
                          >
                            <Clock size={12} className="mr-1" />Schedule
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent style={{ borderRadius: 0 }}>Schedule recurring generation</TooltipContent>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Scheduled Reports ─────────────────────────────────────────── */}
          <TabsContent value="scheduled" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Name', 'Frequency', 'Next Delivery', 'Recipients', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledReports.map(sr => (
                      <tr key={sr.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{sr.name}</span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
                            {sr.frequency}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(sr.nextDelivery)}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {sr.recipients.map(r => (
                              <Badge key={r} className="text-[10px] px-1 py-0" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0 }}>
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <Badge style={{
                            background: sr.paused ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-ok-bg))',
                            color: sr.paused ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>
                            {sr.paused ? 'Paused' : 'Active'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => togglePause(sr.id)}>
                                  {sr.paused ? <Play size={14} style={{ color: 'hsl(var(--s-ok-tx))' }} /> : <Pause size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent style={{ borderRadius: 0 }}>{sr.paused ? 'Resume' : 'Pause'}</TooltipContent>
                            </Tooltip>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Generation History ────────────────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['ID', 'Report', 'Generated At', 'Generated By', 'Format', 'Duration', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GENERATION_HISTORY.map(entry => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-2">
                          <span className="font-mono text-xs" style={{ color: 'hsl(var(--brand))' }}>{entry.id}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.reportName}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{new Date(entry.generatedAt).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{entry.generatedBy}</span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', borderRadius: 0, fontSize: 10 }}>
                            {entry.format}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{entry.duration}</span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', borderRadius: 0, fontSize: 10 }}>
                            {entry.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Custom Report Builder ──────────────────────────────────────── */}
          <TabsContent value="builder" className="mt-4 space-y-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Custom Report Builder</p>
                <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-4))' }}>Select data modules, configure sections, and generate a branded board-ready PDF or XLSX report.</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-3))' }}>AVAILABLE MODULES</p>
                    <div className="space-y-1.5">
                      {[
                        { id: 'exec-summary', label: 'Executive Summary', icon: <User size={13} /> },
                        { id: 'risk-overview', label: 'Risk Overview', icon: <Warning size={13} /> },
                        { id: 'compliance-status', label: 'Compliance Status', icon: <ShieldCheck size={13} /> },
                        { id: 'bias-audit-summary', label: 'Bias Audit Summary', icon: <Scales size={13} /> },
                        { id: 'model-inventory', label: 'Model Inventory', icon: <Brain size={13} /> },
                        { id: 'incident-log', label: 'Incident Log', icon: <Siren size={13} /> },
                        { id: 'remediation-tracker', label: 'Remediation Tracker', icon: <Check size={13} /> },
                        { id: 'financial-risk', label: 'Financial Risk (FAIR)', icon: <ChartBar size={13} /> },
                        { id: 'agent-governance', label: 'Agentic Governance', icon: <Brain size={13} /> },
                        { id: 'sla-countdown', label: 'SLA Countdown', icon: <Clock size={13} /> },
                      ].map(m => (
                        <div key={m.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-[hsl(var(--bg-raised))]" style={{ border: '1px solid hsl(var(--border))' }}
                          onClick={() => {}}>
                          <span style={{ color: 'hsl(var(--brand))' }}>{m.icon}</span>
                          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{m.label}</span>
                          <span className="ml-auto text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))' }}>+ Add</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-3))' }}>SELECTED SECTIONS (drag to reorder)</p>
                    <div className="space-y-1.5 min-h-[200px]">
                      {[
                        { label: 'Executive Summary', order: 1 },
                        { label: 'Risk Overview', order: 2 },
                        { label: 'Compliance Status', order: 3 },
                        { label: 'Bias Audit Summary', order: 4 },
                        { label: 'Financial Risk (FAIR)', order: 5 },
                      ].map(s => (
                        <div key={s.label} className="flex items-center gap-2 p-2" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                          <span className="text-[10px] font-mono w-4" style={{ color: 'hsl(var(--text-4))' }}>{s.order}</span>
                          <span className="text-xs flex-1" style={{ color: 'hsl(var(--text-1))' }}>{s.label}</span>
                          <button className="text-[10px] px-1" style={{ color: 'hsl(var(--destructive))' }}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-2 text-center text-[10px]" style={{ border: '2px dashed hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
                      Drop modules here or click + Add
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>REPORT SETTINGS</p>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Report Title</Label>
                      <Input defaultValue="Q2 2026 AI Governance Report" style={{ borderRadius: 0 }} className="text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Date Range</Label>
                      <Select defaultValue="q2-2026">
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="last-30d">Last 30 days</SelectItem>
                          <SelectItem value="last-90d">Last 90 days</SelectItem>
                          <SelectItem value="q2-2026">Q2 2026</SelectItem>
                          <SelectItem value="ytd">Year to Date 2026</SelectItem>
                          <SelectItem value="custom">Custom range…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Output Format</Label>
                      <Select defaultValue="pdf-board">
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="pdf-board">Board-Ready PDF (branded)</SelectItem>
                          <SelectItem value="pdf-technical">Technical PDF</SelectItem>
                          <SelectItem value="xlsx">Excel Workbook</SelectItem>
                          <SelectItem value="json">JSON Export</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Branding</Label>
                      <Select defaultValue="corporate">
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="corporate">Corporate Theme</SelectItem>
                          <SelectItem value="minimal">Minimal / Clean</SelectItem>
                          <SelectItem value="regulatory">Regulatory Documentation Style</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Include</Label>
                      {['Executive summary page', 'Table of contents', 'Regulatory mapping appendix', 'Audit certificate', 'Digital signature block'].map(opt => (
                        <div key={opt} className="flex items-center gap-2">
                          <input type="checkbox" defaultChecked style={{ accentColor: 'hsl(var(--brand))' }} />
                          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{opt}</span>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                      onClick={() => {}}>
                      <FilePdf size={14} className="mr-2" />Generate Custom Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Approvals & Digital Signatures ────────────────────────────── */}
          <TabsContent value="signatures" className="mt-4 space-y-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Report Approval & Digital Signature Workflow</p>
                    <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Ensure reports are reviewed, signed, and locked before distribution. All signatures are timestamped and audit-logged.</p>
                  </div>
                  <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                    onClick={() => {}}>
                    <Plus size={14} className="mr-1" />New Approval Request
                  </Button>
                </div>
                <table className="w-full text-xs mb-4">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Report', 'Submitted By', 'Submitted At', 'Reviewers', 'Signatures', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { report: 'Q1 2026 Executive Risk Report', by: 'Sarah Chen', at: '2026-04-05 09:15', reviewers: ['James Patel', 'Dr. Aisha Reid'], sigs: 2, total: 2, status: 'Approved' },
                      { report: 'EU AI Act Gap Analysis v2', by: 'Marco Fontaine', at: '2026-04-08 14:30', reviewers: ['Sarah Chen', 'Legal Team'], sigs: 1, total: 2, status: 'Pending Signature' },
                      { report: 'Bias Audit Quarterly Summary', by: 'Dr. Nina Okafor', at: '2026-04-09 11:00', reviewers: ['James Patel'], sigs: 0, total: 1, status: 'Under Review' },
                      { report: 'NIST AI RMF Assessment', by: 'Raj Mehta', at: '2026-04-10 08:45', reviewers: ['Sarah Chen', 'Compliance Team', 'Board'], sigs: 0, total: 3, status: 'Draft' },
                    ].map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td className="px-3 py-2 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.report}</td>
                        <td className="px-3 py-2" style={{ color: 'hsl(var(--text-3))' }}>{item.by}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'hsl(var(--text-4))' }}>{item.at}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {item.reviewers.map(r => (
                              <span key={r} className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))', border: '1px solid hsl(var(--border))' }}>{r}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono font-bold text-xs" style={{ color: item.sigs === item.total ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>
                            {item.sigs}/{item.total}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[9px] px-2 py-0.5 font-medium" style={{
                            background: item.status === 'Approved' ? 'hsl(142 71% 45% / 0.12)' : item.status === 'Pending Signature' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(var(--s-nt-bg))',
                            color: item.status === 'Approved' ? 'hsl(var(--s-ok-tx))' : item.status === 'Pending Signature' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))',
                          }}>{item.status}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {item.status !== 'Approved' && (
                              <Button size="sm" className="h-6 text-[10px] px-2" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                                onClick={() => {}}>Sign</Button>
                            )}
                            {item.status === 'Approved' && (
                              <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" style={{ borderRadius: 0 }}
                                onClick={() => {}}>Download Signed PDF</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Digital Signature Standards</p>
                  <div className="grid grid-cols-3 gap-3 text-[10px]" style={{ color: 'hsl(var(--text-3))' }}>
                    <div><strong style={{ color: 'hsl(var(--text-2))' }}>Signature Method:</strong> RSA-SHA256 with certificate binding</div>
                    <div><strong style={{ color: 'hsl(var(--text-2))' }}>Timestamp Authority:</strong> RFC 3161 compliant TSA</div>
                    <div><strong style={{ color: 'hsl(var(--text-2))' }}>Audit Log:</strong> All sign events immutably logged</div>
                    <div><strong style={{ color: 'hsl(var(--text-2))' }}>Retention:</strong> 7 years per regulatory requirement</div>
                    <div><strong style={{ color: 'hsl(var(--text-2))' }}>Standards:</strong> eIDAS, SOC 2 Type II, ISO 27001</div>
                    <div><strong style={{ color: 'hsl(var(--text-2))' }}>Lock:</strong> Reports are PDF/A locked after signing</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* ── Preview Modal ────────────────────────────────────────────────── */}
        <Dialog open={previewOpen} onOpenChange={(o) => { setPreviewOpen(o); if (!o) setPreviewReport(null); }}>
          <DialogContent className="sm:max-w-3xl" style={{ borderRadius: 0, maxHeight: '85vh', overflow: 'auto' }}>
            {previewReport && (
              <>
                <DialogHeader>
                  <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{previewReport.name} — Preview</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="preview" className="mt-3">
                  <TabsList style={{ borderRadius: 0 }}>
                    <TabsTrigger value="preview" style={{ borderRadius: 0 }}>Preview</TabsTrigger>
                    <TabsTrigger value="sources" style={{ borderRadius: 0 }}>Data Sources</TabsTrigger>
                    <TabsTrigger value="export" style={{ borderRadius: 0 }}>Export Options</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="mt-4 space-y-4">
                    {/* Compliance Chart */}
                    {(previewReport.id === 'RPT-001' || previewReport.id === 'RPT-007') && (
                      <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Framework Compliance Scores</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={COMPLIANCE_DATA}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="name" tick={{ fill: ct.axis, fontSize: 10 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: ct.axis, fontSize: 10 }} label={{ value: 'Score (0-100)', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                            <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                            <Bar dataKey="score" fill={ct.brand} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Risk Trend */}
                    {(previewReport.id === 'RPT-002' || previewReport.id === 'RPT-007') && (
                      <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Risk Trend — 6 Months</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={RISK_TREND}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                            <XAxis dataKey="month" tick={{ fill: ct.axis, fontSize: 10 }} />
                            <YAxis tick={{ fill: ct.axis, fontSize: 10 }} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
                            <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line type="monotone" dataKey="critical" stroke="hsl(0 72% 51%)" strokeWidth={2} name="Critical" />
                            <Line type="monotone" dataKey="high" stroke="hsl(25 95% 53%)" strokeWidth={2} name="High" />
                            <Line type="monotone" dataKey="medium" stroke="hsl(45 93% 47%)" strokeWidth={2} name="Medium" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Pie chart for other types */}
                    {(previewReport.id === 'RPT-003' || previewReport.id === 'RPT-004' || previewReport.id === 'RPT-005' || previewReport.id === 'RPT-006') && (
                      <div>
                        <p className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Status Distribution</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={PIE_DATA}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {PIE_DATA.map((_entry, idx) => (
                                <Cell key={idx} fill={PIE_COLORS[idx]} />
                              ))}
                            </Pie>
                            <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="text-xs text-center py-2" style={{ color: 'hsl(var(--text-4))' }}>
                      Report preview generated with live data as of {new Date().toLocaleDateString()}
                    </div>
                  </TabsContent>

                  <TabsContent value="sources" className="mt-4 space-y-3">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Data sources used to generate this report:</p>
                    {[
                      { name: 'Risk Register', count: '12 risks', updated: '2026-04-06' },
                      { name: 'Compliance Frameworks', count: '6 frameworks', updated: '2026-04-05' },
                      { name: 'Incident Log', count: '5 incidents', updated: '2026-04-06' },
                      { name: 'Model Inventory', count: '6 models', updated: '2026-04-05' },
                      { name: 'Audit Log', count: `${AUDIT_LOG.length} entries`, updated: '2026-04-06' },
                    ].map(src => (
                      <div key={src.name} className="flex items-center justify-between p-2" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <div className="flex items-center gap-2">
                          <FileText size={14} style={{ color: 'hsl(var(--brand))' }} />
                          <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{src.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                          <span>{src.count}</span>
                          <span>Updated: {formatDate(src.updated)}</span>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="export" className="mt-4 space-y-3">
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Export options for this report:</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { format: 'PDF', icon: FilePdf, desc: 'Formatted PDF document' },
                        { format: 'XLSX', icon: FileText, desc: 'Excel spreadsheet' },
                        { format: 'CSV', icon: FileText, desc: 'Raw data export' },
                      ].map(opt => (
                        <div key={opt.format} className="p-3 text-center" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                          <opt.icon size={24} className="mx-auto mb-2" style={{ color: 'hsl(var(--brand))' }} />
                          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{opt.format}</p>
                          <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{opt.desc}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Generate Modal ───────────────────────────────────────────────── */}
        <Dialog open={generateOpen} onOpenChange={(o) => { setGenerateOpen(o); if (!o) { setGenerateReport(null); setGenerated(false); setGenerating(false); } }}>
          <DialogContent style={{ borderRadius: 0 }}>
            {generateReport && (
              <>
                <DialogHeader>
                  <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Generate — {generateReport.name}</DialogTitle>
                </DialogHeader>
                {!generating && !generated && (
                  <div className="space-y-3 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Date Range</Label>
                      <Select value={generateDateRange} onValueChange={setGenerateDateRange}>
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="last-7d">Last 7 days</SelectItem>
                          <SelectItem value="last-30d">Last 30 days</SelectItem>
                          <SelectItem value="last-90d">Last 90 days</SelectItem>
                          <SelectItem value="ytd">Year to date</SelectItem>
                          <SelectItem value="custom">Custom range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Format</Label>
                      <Select value={generateFormat} onValueChange={setGenerateFormat}>
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="xlsx">XLSX (Excel)</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {generating && (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-8 h-8 border-2 border-t-transparent animate-spin" style={{ borderColor: 'hsl(var(--brand))', borderTopColor: 'transparent', borderRadius: '50%' }} />
                    <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>Generating report...</p>
                  </div>
                )}
                {generated && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <Check size={32} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-ok-tx))' }}>Report Generated Successfully</p>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{generateReport.name}.{generateFormat} — ready for download</p>
                    <Button variant="outline" style={{ borderRadius: 0 }}>
                      <DownloadSimple size={14} className="mr-1" />Download {generateFormat.toUpperCase()}
                    </Button>
                  </div>
                )}
                {!generating && !generated && (
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setGenerateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
                    <Button onClick={handleGenerate} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                      <DownloadSimple size={14} className="mr-1" />Generate Report
                    </Button>
                  </DialogFooter>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Schedule Modal ───────────────────────────────────────────────── */}
        <Dialog open={scheduleOpen} onOpenChange={(o) => { setScheduleOpen(o); if (!o) setScheduleReport(null); }}>
          <DialogContent style={{ borderRadius: 0 }}>
            {scheduleReport && (
              <>
                <DialogHeader>
                  <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Schedule — {scheduleReport.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Frequency</Label>
                    <Select value={scheduleFreq} onValueChange={setScheduleFreq}>
                      <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Day</Label>
                      <Select value={scheduleDay} onValueChange={setScheduleDay}>
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(d => (
                            <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        style={{ borderRadius: 0 }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Recipients</Label>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      Sarah Chen (CISO), James Patel (VP Compliance)
                    </p>
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setScheduleOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
                  <Button
                    onClick={() => {
                      const newSch: ScheduledReport = {
                        id: `SCH-${String(scheduledReports.length + 1).padStart(3, '0')}`,
                        name: `${scheduleFreq.charAt(0).toUpperCase() + scheduleFreq.slice(1)} ${scheduleReport.name}`,
                        frequency: scheduleFreq.charAt(0).toUpperCase() + scheduleFreq.slice(1),
                        nextDelivery: '2026-04-14',
                        recipients: ['Sarah Chen', 'James Patel'],
                        paused: false,
                      };
                      setScheduledReports(prev => [...prev, newSch]);
                      setScheduleOpen(false);
                    }}
                    style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                  >
                    <Calendar size={14} className="mr-1" />Create Schedule
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
