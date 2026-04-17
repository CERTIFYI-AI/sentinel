import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, MagnifyingGlass, Briefcase,
  Warning, CheckCircle, Info, Clock, ArrowsClockwise, Prohibit,
  Upload, ShieldCheck, ListChecks, Gear, CalendarBlank, Tag,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { USE_CASES, MODELS, RISKS, formatDate } from '../../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

type UCStatus = 'Not Started' | 'In Progress' | 'Under Review' | 'Completed' | 'On Hold' | 'Rejected';

interface UseCase {
  id: string; title: string; goal: string; owner: string; riskClass: string;
  geography: string; industry: string; status: string; frameworks: string[];
  linkedModels: string[]; createdDate: string; lastUpdated: string;
  description: string; stage: string;
}

// ── CE Marking Data ──────────────────────────────────────────────────────────

const CE_CHECKLIST = [
  { id: 'ce-1', label: 'Technical documentation complete', status: 'Complete', date: '2026-02-15' },
  { id: 'ce-2', label: 'Conformity assessment done', status: 'Pending', date: '' },
  { id: 'ce-3', label: 'Quality management system in place', status: 'Complete', date: '2026-01-20' },
  { id: 'ce-4', label: 'Human oversight mechanisms implemented', status: 'Complete', date: '2026-03-01' },
  { id: 'ce-5', label: 'Post-market monitoring plan exists', status: 'Pending', date: '' },
];

// ── Activity Log Mock ────────────────────────────────────────────────────────

const ACTIVITY_LOG = [
  { date: '2026-03-20T14:30:00', action: 'Status changed to Under Review', actor: 'James Patel' },
  { date: '2026-03-15T10:00:00', action: 'Risk classification updated to High-Risk', actor: 'Maria Santos' },
  { date: '2026-03-01T09:15:00', action: 'Framework EU AI Act added', actor: 'Raj Gupta' },
  { date: '2026-02-20T16:45:00', action: 'Model MDL-001 linked', actor: 'Maria Santos' },
  { date: '2026-02-01T11:00:00', action: 'Use case created', actor: 'Sarah Chen' },
];

const ALL_FRAMEWORKS = ['EU AI Act', 'NIST AI RMF', 'ISO 42001', 'SOC 2', 'GDPR', 'EEOC'];
const STATUS_TABS: ('All' | UCStatus)[] = ['All', 'Not Started', 'In Progress', 'Under Review', 'Completed', 'On Hold', 'Rejected'];

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

// ── Risk Class Badge ─────────────────────────────────────────────────────────

function RiskBadge({ riskClass }: { riskClass: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'High-Risk': { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
    'Limited': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
    'Minimal': { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
    'Prohibited': { bg: 'hsl(0 72% 51% / 0.25)', color: 'hsl(var(--destructive))' },
  };
  const style = map[riskClass] || map['Minimal'];
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{riskClass}</Badge>;
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Completed': { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
    'In Progress': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
    'Under Review': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
    'Not Started': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
    'On Hold': { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' },
    'Rejected': { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  };
  const style = map[status] || map['Not Started'];
  return <Badge style={{ background: style.bg, color: style.color, borderRadius: 0, fontSize: 10 }}>{status}</Badge>;
}

// ── Regulatory Tagging Rows ──────────────────────────────────────────────────

const REG_TAG_ROWS = [
  { uc: 'UC-001', title: 'Loan Scoring Automation', risk: 'High-Risk', geo: 'US + EU', regs: ['EU AI Act Art.6', 'ECOA', 'CFPB', 'GDPR Art.22'], confidence: 97 },
  { uc: 'UC-002', title: 'Fraud Detection Engine', risk: 'High-Risk', geo: 'Global', regs: ['EU AI Act Art.6', 'PSD2', 'GDPR', 'Basel IV'], confidence: 94 },
  { uc: 'UC-003', title: 'HR Resume Screening', risk: 'High-Risk', geo: 'EU + UK', regs: ['EU AI Act Annex III', 'GDPR', 'UK Equality Act', 'EEOC'], confidence: 99 },
  { uc: 'UC-004', title: 'Supply Chain Optimizer', risk: 'Minimal', geo: 'US', regs: ['NIST AI RMF', 'ISO 42001'], confidence: 82 },
  { uc: 'UC-005', title: 'Medical Risk Score', risk: 'High-Risk', geo: 'US + EU', regs: ['EU AI Act Annex III §5', 'FDA AI/ML', 'HIPAA', 'MDR 2017/745'], confidence: 98 },
];

// ── Main Component ───────────────────────────────────────────────────────────

export default function UseCasePage() {
  const [useCases, setUseCases] = useState<UseCase[]>(USE_CASES as UseCase[]);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [selectedUC, setSelectedUC] = useState<UseCase | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState('overview');
  const [deleteTarget, setDeleteTarget] = useState<UseCase | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [ceItems, setCeItems] = useState(CE_CHECKLIST.map(c => ({ ...c, checked: c.status === 'Complete' })));
  const [regTagRows, setRegTagRows] = useState(REG_TAG_ROWS);
  const [editTagRow, setEditTagRow] = useState<(typeof REG_TAG_ROWS)[0] | null>(null);
  const [editTagInput, setEditTagInput] = useState('');

  // Create form state
  const [newUC, setNewUC] = useState({
    title: '', goal: '', owner: '', riskClass: 'High-Risk', geography: '', industry: '',
    description: '', frameworks: [] as string[], linkedModels: [] as string[],
  });

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Computed
  const owners = [...new Set(useCases.map(u => u.owner))];
  const total = useCases.length;
  const inProgress = useCases.filter(u => u.status === 'In Progress').length;
  const underReview = useCases.filter(u => u.status === 'Under Review').length;
  const completed = useCases.filter(u => u.status === 'Completed').length;

  // Filtered
  const filtered = useCases.filter(uc => {
    if (activeTab !== 'All' && uc.status !== activeTab) return false;
    if (riskFilter !== 'all' && uc.riskClass !== riskFilter) return false;
    if (ownerFilter !== 'all' && uc.owner !== ownerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return uc.title.toLowerCase().includes(q) || uc.id.toLowerCase().includes(q) || uc.goal.toLowerCase().includes(q);
    }
    return true;
  });

  // Actions
  const handleDelete = () => {
    if (!deleteTarget) return;
    setUseCases(prev => prev.filter(u => u.id !== deleteTarget.id));
    toast(`${deleteTarget.id} deleted`, 'info');
    setDeleteTarget(null);
  };

  const handleCreate = () => {
    const id = `UC-${String(useCases.length + 1).padStart(3, '0')}`;
    const uc: UseCase = {
      id, title: newUC.title || 'New Use Case', goal: newUC.goal, owner: newUC.owner || 'USR-001',
      riskClass: newUC.riskClass, geography: newUC.geography, industry: newUC.industry || 'Financial Services',
      status: 'Not Started', frameworks: newUC.frameworks, linkedModels: newUC.linkedModels,
      createdDate: new Date().toISOString().split('T')[0], lastUpdated: new Date().toISOString().split('T')[0],
      description: newUC.description, stage: 'Planning',
    };
    setUseCases(prev => [...prev, uc]);
    setCreateOpen(false);
    setNewUC({ title: '', goal: '', owner: '', riskClass: 'High-Risk', geography: '', industry: '', description: '', frameworks: [], linkedModels: [] });
    toast(`Use case "${uc.title}" created`, 'success');
  };

  const openDetail = (uc: UseCase, tab = 'overview') => {
    setSelectedUC(uc);
    setSheetTab(tab);
    setSheetOpen(true);
  };

  // Get linked risks for a use case
  const getLinkedRisks = (uc: UseCase) => {
    return RISKS.filter(r => uc.linkedModels.includes(r.linkedModel));
  };

  // Get linked models for a use case
  const getLinkedModels = (uc: UseCase) => {
    return MODELS.filter(m => uc.linkedModels.includes(m.id));
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
            <Briefcase size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Use Case Management</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>Track AI use cases across the organization with risk classification and compliance mapping</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" style={{ borderRadius: 0 }}>
            <Upload size={14} className="mr-2" />Import
          </Button>
          <Button onClick={() => setCreateOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <Plus size={14} className="mr-2" />New Use Case
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Use Cases" value={String(total)} variant="info" icon={<Briefcase size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="In Progress" value={String(inProgress)} variant="warn" icon={<ArrowsClockwise size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} />
        <MetricTile label="Under Review" value={String(underReview)} variant="info" icon={<Info size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Completed" value={String(completed)} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />} />
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0 }}>
          {STATUS_TABS.map(t => (
            <TabsTrigger key={t} value={t} style={{ borderRadius: 0 }}>{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search use cases..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[180px]" style={{ borderRadius: 0 }}><SelectValue placeholder="Risk Classification" /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Risk Classes</SelectItem>
            <SelectItem value="High-Risk">High-Risk</SelectItem>
            <SelectItem value="Limited">Limited</SelectItem>
            <SelectItem value="Minimal">Minimal</SelectItem>
            <SelectItem value="Prohibited">Prohibited</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter}>
          <SelectTrigger className="w-[180px]" style={{ borderRadius: 0 }}><SelectValue placeholder="Owner" /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['UC-ID', 'Title', 'Goal', 'Owner', 'Risk Class', 'Geography', 'Status', 'Stage', 'Frameworks', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(uc => (
                  <tr key={uc.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{uc.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{uc.title}</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{uc.goal}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{uc.owner}</td>
                    <td className="px-4 py-3"><RiskBadge riskClass={uc.riskClass} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{uc.geography}</td>
                    <td className="px-4 py-3"><StatusBadge status={uc.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{uc.stage}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {uc.frameworks.map(f => (
                          <Badge key={f} style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 9 }}>{f}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(uc)}>
                          <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(uc, 'settings')}>
                          <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(uc)}>
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

      {/* ── RACI Matrix ───────────────────────────────────────────────────── */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>RACI Matrix — Use Case Accountability</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Responsible, Accountable, Consulted, Informed per use case activity</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))', minWidth: 200 }}>Activity / Role</th>
                  {['Data Scientist', 'Risk Officer', 'Compliance Lead', 'Legal Counsel', 'CISO', 'Business Owner', 'Board'].map(r => (
                    <th key={r} className="px-3 py-2 text-center font-medium" style={{ color: 'hsl(var(--text-4))', minWidth: 90 }}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { activity: 'Use Case Registration', roles: ['R', 'C', 'C', '-', '-', 'A', '-'] },
                  { activity: 'Risk Classification', roles: ['C', 'R', 'R', 'C', 'C', 'A', 'I'] },
                  { activity: 'Bias Audit Execution', roles: ['R', 'A', 'C', '-', 'C', 'I', '-'] },
                  { activity: 'Regulatory Impact Assessment', roles: ['C', 'C', 'R', 'A', 'C', 'I', 'I'] },
                  { activity: 'Model Approval / Sign-off', roles: ['C', 'R', 'R', 'C', 'C', 'A', 'I'] },
                  { activity: 'Production Deployment', roles: ['R', 'C', 'I', '-', 'A', 'C', '-'] },
                  { activity: 'Ongoing Monitoring', roles: ['R', 'C', 'C', '-', 'A', 'I', '-'] },
                  { activity: 'Incident Escalation', roles: ['C', 'R', 'C', 'C', 'A', 'I', 'I'] },
                  { activity: 'Board Reporting', roles: ['-', 'C', 'R', 'C', 'C', 'A', 'I'] },
                  { activity: 'Decommissioning Decision', roles: ['C', 'R', 'C', 'C', 'C', 'A', 'I'] },
                ].map((row, i) => (
                  <tr key={row.activity} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'hsl(var(--text-2))' }}>{row.activity}</td>
                    {row.roles.map((role, j) => {
                      const colors: Record<string, { bg: string; color: string }> = {
                        'R': { bg: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' },
                        'A': { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
                        'C': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
                        'I': { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
                        '-': { bg: 'transparent', color: 'hsl(var(--text-4))' },
                      };
                      const c = colors[role] || colors['-'];
                      return (
                        <td key={j} className="px-3 py-2 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5" style={{ background: c.bg, color: c.color }}>{role}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
            {[['R', 'hsl(var(--brand))', 'Responsible'], ['A', 'hsl(var(--destructive))', 'Accountable'], ['C', 'hsl(var(--s-wn-tx))', 'Consulted'], ['I', 'hsl(var(--s-ok-tx))', 'Informed'], ['-', 'hsl(var(--text-4))', 'Not Involved']].map(([k, c, l]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="font-bold text-xs" style={{ color: c as string }}>{k}</span> {l}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Business Value vs Risk Scatter ────────────────────────────────── */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Business Value vs. Risk Matrix</p>
          <p className="text-xs mb-4" style={{ color: 'hsl(var(--text-4))' }}>Strategic prioritization of use cases by potential business value and AI risk level</p>
          <div className="relative" style={{ height: 320, border: '1px solid hsl(var(--border))' }}>
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {[
                { label: 'Explore Carefully', color: 'hsl(45 93% 47% / 0.06)', pos: 'top-2 right-2' },
                { label: 'Strategic Priority', color: 'hsl(142 71% 45% / 0.06)', pos: 'top-2 left-2' },
                { label: 'Deprioritize', color: 'hsl(var(--border) / 0.3)', pos: 'bottom-2 right-2' },
                { label: 'Quick Wins', color: 'hsl(220 90% 56% / 0.06)', pos: 'bottom-2 left-2' },
              ].map((q, i) => (
                <div key={q.label} className="relative flex" style={{ background: q.color }}>
                  <span className="absolute text-[9px] font-medium p-1" style={{
                    top: i < 2 ? 6 : 'auto', bottom: i >= 2 ? 6 : 'auto',
                    left: i % 2 === 0 ? 6 : 'auto', right: i % 2 !== 0 ? 6 : 'auto',
                    color: 'hsl(var(--text-4))',
                  }}>{q.label}</span>
                </div>
              ))}
            </div>
            <div className="absolute left-0 bottom-0 right-0 flex justify-between px-4 pb-1 text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>
              <span>Low Risk</span><span className="font-medium">← Risk Level →</span><span>High Risk</span>
            </div>
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-4 pl-1 text-[9px]" style={{ color: 'hsl(var(--text-4))', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              <span>High Value</span><span className="font-medium">Business Value</span><span>Low Value</span>
            </div>
            {[
              { id: 'UC-001', title: 'Loan Scoring Auto', risk: 0.82, value: 0.88, color: 'hsl(var(--destructive))' },
              { id: 'UC-002', title: 'Fraud Detection', risk: 0.45, value: 0.91, color: 'hsl(var(--brand))' },
              { id: 'UC-003', title: 'HR Resume Screen', risk: 0.78, value: 0.54, color: 'hsl(45 93% 47%)' },
              { id: 'UC-004', title: 'Supply Chain Opt.', risk: 0.25, value: 0.72, color: 'hsl(var(--brand))' },
              { id: 'UC-005', title: 'Medical Risk Score', risk: 0.89, value: 0.76, color: 'hsl(var(--destructive))' },
              { id: 'UC-006', title: 'Customer Churn', risk: 0.22, value: 0.63, color: 'hsl(142 71% 45%)' },
              { id: 'UC-007', title: 'Content Moderation', risk: 0.65, value: 0.42, color: 'hsl(45 93% 47%)' },
              { id: 'UC-008', title: 'Predictive Maint.', risk: 0.18, value: 0.55, color: 'hsl(var(--brand))' },
            ].map(uc => (
              <div key={uc.id} className="absolute flex flex-col items-center cursor-pointer group"
                style={{
                  left: `${8 + uc.risk * 84}%`,
                  top: `${8 + (1 - uc.value) * 80}%`,
                  transform: 'translate(-50%, -50%)',
                }}>
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: uc.color }} />
                <span className="text-[9px] font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap px-1" style={{ background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))', border: '1px solid hsl(var(--border))' }}>
                  {uc.id}: {uc.title}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'hsl(var(--text-4))' }}>Hover over dots to see use case details. Bubble position derived from risk score and estimated business value metrics.</p>
        </CardContent>
      </Card>

      {/* ── Regulatory Auto-Tagging ───────────────────────────────────────── */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Regulatory Applicability Auto-Tagging</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>AI-determined regulatory framework applicability per use case based on risk class, geography, industry, and data types</p>
            </div>
            <button className="px-3 py-1.5 text-xs text-white" style={{ background: 'hsl(var(--brand))' }}
              onClick={() => {
                setRegTagRows(prev => prev.map(r => ({ ...r, confidence: Math.min(100, r.confidence + Math.floor(Math.random() * 3 - 1)) })));
                toast('Regulatory auto-tag complete — 5 use cases re-processed', 'success');
              }}>Re-run Auto-Tag</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Use Case', 'Risk Class', 'Geography', 'Applicable Regulations', 'Auto-Tagged', 'Override'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regTagRows.map(r => (
                  <tr key={r.uc} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td className="px-3 py-2">
                      <span className="font-mono font-medium" style={{ color: 'hsl(var(--brand))' }}>{r.uc}</span>
                      <span className="text-[10px] ml-1.5" style={{ color: 'hsl(var(--text-3))' }}>{r.title}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] px-1.5 py-0.5" style={{
                        background: r.risk === 'High-Risk' ? 'hsl(0 72% 51% / 0.12)' : 'hsl(142 71% 45% / 0.12)',
                        color: r.risk === 'High-Risk' ? 'hsl(var(--destructive))' : 'hsl(var(--s-ok-tx))',
                      }}>{r.risk}</span>
                    </td>
                    <td className="px-3 py-2" style={{ color: 'hsl(var(--text-3))' }}>{r.geo}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.regs.map(reg => (
                          <span key={reg} className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', border: '1px solid hsl(220 90% 56% / 0.2)' }}>{reg}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-mono font-bold" style={{ color: r.confidence >= 95 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>{r.confidence}% confidence</span>
                    </td>
                    <td className="px-3 py-2">
                      <button className="text-[10px] px-2 py-0.5 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}
                        onClick={() => {}}>Edit Tags</button>
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
        title="Delete Use Case"
        message={<p>Delete <strong>{deleteTarget?.title}</strong> ({deleteTarget?.id})? This cannot be undone.</p>}
        confirmLabel="Delete"
      />

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedUC && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Briefcase size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
                  {selectedUC.id} — {selectedUC.title}
                </SheetTitle>
              </SheetHeader>
              <Tabs value={sheetTab} onValueChange={setSheetTab} className="mt-4">
                <TabsList className="flex flex-wrap" style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="risks" style={{ borderRadius: 0 }}>Risks</TabsTrigger>
                  <TabsTrigger value="models" style={{ borderRadius: 0 }}>Linked Models</TabsTrigger>
                  <TabsTrigger value="frameworks" style={{ borderRadius: 0 }}>Frameworks</TabsTrigger>
                  <TabsTrigger value="ce-marking" style={{ borderRadius: 0 }}>CE Marking</TabsTrigger>
                  <TabsTrigger value="activity" style={{ borderRadius: 0 }}>Activity Log</TabsTrigger>
                  <TabsTrigger value="settings" style={{ borderRadius: 0 }}>Settings</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Title', value: selectedUC.title },
                      { label: 'Goal', value: selectedUC.goal },
                      { label: 'Owner', value: selectedUC.owner },
                      { label: 'Risk Classification', value: selectedUC.riskClass },
                      { label: 'Geography', value: selectedUC.geography },
                      { label: 'Industry', value: selectedUC.industry },
                      { label: 'Stage', value: selectedUC.stage },
                      { label: 'Created', value: formatDate(selectedUC.createdDate) },
                    ].map(f => (
                      <div key={f.label} className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{f.label}</span>
                        <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selectedUC.description}</p>
                  </div>
                </TabsContent>

                {/* Risks Tab */}
                <TabsContent value="risks" className="mt-4">
                  {(() => {
                    const risks = getLinkedRisks(selectedUC);
                    if (!risks.length) return <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No linked risks found.</p>;
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                              {['Risk ID', 'Title', 'Severity', 'Status', 'Score'].map(h => (
                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {risks.map(r => (
                              <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                                <td className="px-3 py-2 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{r.id}</td>
                                <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{r.title}</td>
                                <td className="px-3 py-2">
                                  <Badge style={{
                                    background: r.severity === 'critical' ? 'hsl(0 72% 51% / 0.12)' : r.severity === 'high' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(var(--s-nt-bg))',
                                    color: r.severity === 'critical' ? 'hsl(var(--destructive))' : r.severity === 'high' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-nt-tx))',
                                    borderRadius: 0, fontSize: 10,
                                  }}>{r.severity}</Badge>
                                </td>
                                <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{r.status}</td>
                                <td className="px-3 py-2 text-xs font-bold" style={{ color: r.score >= 15 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>{r.score}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Linked Models Tab */}
                <TabsContent value="models" className="mt-4">
                  {(() => {
                    const models = getLinkedModels(selectedUC);
                    if (!models.length) return <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No linked models.</p>;
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                              {['Model ID', 'Name', 'Version', 'Status', 'Risk Tier', 'Accuracy'].map(h => (
                                <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {models.map(m => (
                              <tr key={m.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                                <td className="px-3 py-2 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{m.id}</td>
                                <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</td>
                                <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{m.version}</td>
                                <td className="px-3 py-2">
                                  <Badge style={{
                                    background: m.status === 'production' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(220 90% 56% / 0.12)',
                                    color: m.status === 'production' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-in-tx))',
                                    borderRadius: 0, fontSize: 10,
                                  }}>{m.status}</Badge>
                                </td>
                                <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{m.riskTier}</td>
                                <td className="px-3 py-2 text-xs font-bold" style={{ color: 'hsl(var(--text-1))' }}>{m.accuracy}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Frameworks Tab */}
                <TabsContent value="frameworks" className="mt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          {['Framework', 'Compliance Status', 'Last Assessed'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUC.frameworks.map(fw => {
                          const isCompliant = selectedUC.status === 'Completed';
                          return (
                            <tr key={fw} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                              <td className="px-3 py-2 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{fw}</td>
                              <td className="px-3 py-2">
                                <Badge style={{
                                  background: isCompliant ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                                  color: isCompliant ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                                  borderRadius: 0, fontSize: 10,
                                }}>{isCompliant ? 'Compliant' : 'In Review'}</Badge>
                              </td>
                              <td className="px-3 py-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(selectedUC.lastUpdated)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                {/* CE Marking Tab */}
                <TabsContent value="ce-marking" className="mt-4 space-y-3">
                  <div className="p-3" style={{ background: 'hsl(220 90% 56% / 0.06)', border: '1px solid hsl(220 90% 56% / 0.2)', borderRadius: 0 }}>
                    <p className="text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>
                      <ShieldCheck size={12} className="inline mr-1" />
                      <strong>EU AI Act CE Marking Readiness</strong> — Complete all items below before applying CE marking.
                    </p>
                  </div>
                  {ceItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) => {
                            setCeItems(prev => prev.map((c, i) => i === idx ? { ...c, checked: !!checked, status: checked ? 'Complete' : 'Pending', date: checked ? new Date().toISOString().split('T')[0] : '' } : c));
                          }}
                          style={{ borderRadius: 0 }}
                        />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge style={{
                          background: item.checked ? 'hsl(142 71% 45% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                          color: item.checked ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))',
                          borderRadius: 0, fontSize: 10,
                        }}>{item.status}</Badge>
                        {item.date && <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{item.date}</span>}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Activity Log Tab */}
                <TabsContent value="activity" className="mt-4 space-y-2">
                  {ACTIVITY_LOG.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <Clock size={14} style={{ color: 'hsl(var(--text-4))', marginTop: 2 }} />
                      <div>
                        <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{entry.action}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                          {entry.actor} · {new Date(entry.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-4 space-y-4">
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <Label className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Visibility</Label>
                    <Select defaultValue="team">
                      <SelectTrigger className="mt-1" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        <SelectItem value="public">Organization-wide</SelectItem>
                        <SelectItem value="team">Team only</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <Label className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Email Notifications</Label>
                    <Select defaultValue="all">
                      <SelectTrigger className="mt-1" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        <SelectItem value="all">All changes</SelectItem>
                        <SelectItem value="status">Status changes only</SelectItem>
                        <SelectItem value="none">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <Label className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Auto-archive after completion</Label>
                    <Select defaultValue="90">
                      <SelectTrigger className="mt-1" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                      <SelectContent style={{ borderRadius: 0 }}>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }} onClick={() => toast('Settings saved')}>
                    Save Settings
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Use Case Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" style={{ borderRadius: 0, maxWidth: 560 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Create Use Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Title *</Label>
              <Input value={newUC.title} onChange={e => setNewUC({ ...newUC, title: e.target.value })} placeholder="e.g., Credit Scoring Automation" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Goal *</Label>
              <Input value={newUC.goal} onChange={e => setNewUC({ ...newUC, goal: e.target.value })} placeholder="e.g., Automate loan decisions" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Owner *</Label>
              <Input value={newUC.owner} onChange={e => setNewUC({ ...newUC, owner: e.target.value })} placeholder="e.g., USR-001" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Risk Classification *</Label>
              <Select value={newUC.riskClass} onValueChange={v => setNewUC({ ...newUC, riskClass: v })}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {['High-Risk', 'Limited', 'Minimal', 'Prohibited'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Geography</Label>
              <Input value={newUC.geography} onChange={e => setNewUC({ ...newUC, geography: e.target.value })} placeholder="e.g., US + EU" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Industry</Label>
              <Input value={newUC.industry} onChange={e => setNewUC({ ...newUC, industry: e.target.value })} placeholder="e.g., Financial Services" style={{ borderRadius: 0 }} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Description</Label>
              <Textarea value={newUC.description} onChange={e => setNewUC({ ...newUC, description: e.target.value })} placeholder="Describe the use case..." style={{ borderRadius: 0 }} rows={3} />
            </div>
            <div>
              <Label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--text-4))' }}>Frameworks</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_FRAMEWORKS.map(fw => (
                  <div key={fw} className="flex items-center gap-2">
                    <Checkbox
                      checked={newUC.frameworks.includes(fw)}
                      onCheckedChange={(checked) => {
                        setNewUC(prev => ({
                          ...prev,
                          frameworks: checked ? [...prev.frameworks, fw] : prev.frameworks.filter(f => f !== fw),
                        }));
                      }}
                      style={{ borderRadius: 0 }}
                    />
                    <Label className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{fw}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium mb-2 block" style={{ color: 'hsl(var(--text-4))' }}>Linked Models</Label>
              <div className="space-y-2">
                {MODELS.map(m => (
                  <div key={m.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={newUC.linkedModels.includes(m.id)}
                      onCheckedChange={(checked) => {
                        setNewUC(prev => ({
                          ...prev,
                          linkedModels: checked ? [...prev.linkedModels, m.id] : prev.linkedModels.filter(id => id !== m.id),
                        }));
                      }}
                      style={{ borderRadius: 0 }}
                    />
                    <Label className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{m.id} — {m.name} {m.version}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newUC.title || !newUC.goal || !newUC.owner} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Create Use Case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
