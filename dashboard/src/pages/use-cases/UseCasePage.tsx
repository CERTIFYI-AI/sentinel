import { useState, useCallback } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, MagnifyingGlass, Briefcase,
  Warning, CheckCircle, Info, Clock, ArrowsClockwise, Prohibit,
  Upload, ShieldCheck, ListChecks, Gear, CalendarBlank, Tag, DownloadSimple, SquaresFour, Rows
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { StatCardRow } from '../../components/ui/StatCardRow';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { USE_CASES, MODELS, RISKS, formatDate } from '../../data/seed';


// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

type UCStatus = 'Not Started' | 'In Progress' | 'Under Review' | 'Completed' | 'On Hold' | 'Rejected';

interface UseCase {
  id: string; title: string; goal: string; owner: string; riskClass: string;
  geography: string; industry: string; status: string; frameworks: string[];
  linkedModels: string[]; createdDate: string; lastUpdated: string;
  description: string; stage: string;
  // Scope Fields
  role?: string;
  aiEnvironment?: string;
  technologyType?: string;
  novelTechnology?: boolean;
  personalData?: boolean;
  monitoring?: boolean;
  unintendedOutcomes?: string;
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

// ── MetricTile (Removed in favor of StatCardRow) ────────────────────────────

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
  const navigate = useNavigate();
  const [useCases, setUseCases] = useState<UseCase[]>(USE_CASES as UseCase[]);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<UseCase | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [regTagRows, setRegTagRows] = useState(REG_TAG_ROWS);
  const [editTagRow, setEditTagRow] = useState<(typeof REG_TAG_ROWS)[0] | null>(null);
  const [editTagInput, setEditTagInput] = useState('');

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

  const handleDelete = () => {
    if (!deleteTarget) return;
    setUseCases(prev => prev.filter(u => u.id !== deleteTarget.id));
    toast(`${deleteTarget.id} deleted`, 'info');
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Briefcase size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Use Case Management</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>Track AI use cases across the organization with risk classification and compliance mapping</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => toast('Exported to CSV', 'success')}>
            <DownloadSimple size={14} className="mr-2" />Export
          </Button>
          <Button variant="outline" style={{ borderRadius: 0 }}>
            <Upload size={14} className="mr-2" />Import
          </Button>
          <Button onClick={() => navigate('/use-cases/new')} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus size={14} className="mr-2" />New Use Case
          </Button>
        </div>
      </div>

      <StatCardRow cards={[
        { label: 'Total Use Cases', value: total, variant: 'default' },
        { label: 'In Progress', value: inProgress, variant: 'warn' },
        { label: 'Under Review', value: underReview, variant: 'info' },
        { label: 'Completed', value: completed, variant: 'ok' },
      ]} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0 }}>
          {STATUS_TABS.map(t => (
            <TabsTrigger key={t} value={t} style={{ borderRadius: 0 }}>{t}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
        <div className="w-px h-6 bg-[hsl(var(--border))] mx-1" />
        <Select defaultValue="none">
          <SelectTrigger className="w-[140px]" style={{ borderRadius: 0 }}>
            <div className="flex items-center gap-2"><Rows size={14} /> <SelectValue placeholder="Group By" /></div>
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="risk">Risk Level</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => toast('Column visibility updated', 'info')}>
          <SquaresFour size={14} className="mr-2" /> Columns
        </Button>
      </div>

      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['UC-ID', 'Title', 'Goal', 'Owner', 'Risk Class', 'Status', 'Stage', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(uc => (
                  <tr
                    key={uc.id}
                    className="group transition-colors hover:bg-[hsl(var(--bg-muted))] cursor-pointer"
                    onClick={() => navigate(`/use-cases/${uc.id}`)}
                    style={{ borderBottom: '1px solid hsl(var(--border))' }}
                  >
                    <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{uc.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{uc.title}</span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{uc.goal}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{uc.owner}</td>
                    <td className="px-4 py-3"><RiskBadge riskClass={uc.riskClass} /></td>
                    <td className="px-4 py-3"><StatusBadge status={uc.status} /></td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{uc.stage}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/use-cases/${uc.id}`); }} style={{ padding: '4px 8px', height: 'auto' }}>
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(uc); }} style={{ padding: '4px 8px', height: 'auto', color: 'hsl(var(--s-er-tx))' }}>
                          <Trash size={14} />
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Delete Use Case"
        message={<p>Delete <strong>{deleteTarget?.title}</strong> ({deleteTarget?.id})? This cannot be undone.</p>}
        confirmLabel="Delete"
      />
    </div>
  );
}
