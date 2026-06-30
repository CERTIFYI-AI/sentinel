import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { TooltipProvider } from '../components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Users, CheckCircle, XCircle, Warning, Clock, FileText, ChartBar,
  ArrowRight, Robot, ShieldCheck, Gavel, User, Calendar, Sparkle,
  CheckSquare, ArrowUp, Buildings, Star, Scales, Minus,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
import { StatCardRow } from '../components/ui/StatCardRow';
import type { StatCardRowItem } from '../components/ui/StatCardRow';
import { PageHeader } from '../components/ui/PageHeader';
import { MODELS, USERS } from '../data/seed';


// ── MRC Members ────────────────────────────────────────────────────────────────
const MRC_MEMBERS = [
  { id: 'M1', name: 'Sarah Chen', role: 'CISO', department: 'Security', chair: true, quorum: true },
  { id: 'M2', name: 'James Patel', role: 'VP Compliance', department: 'Compliance', chair: false, quorum: true },
  { id: 'M3', name: 'Raj Gupta', role: 'Model Risk Manager', department: 'AI/ML', chair: false, quorum: true },
  { id: 'M4', name: 'David Kim', role: 'Risk Analyst', department: 'Risk', chair: false, quorum: true },
  { id: 'M5', name: 'Emma Wilson', role: 'Internal Auditor', department: 'Audit', chair: false, quorum: false },
  { id: 'M6', name: 'Oliver Tran', role: 'Chief Data Officer', department: 'Data', chair: false, quorum: true },
  { id: 'M7', name: 'Priya Nair', role: 'General Counsel', department: 'Legal', chair: false, quorum: false },
];

// ── MRC Agenda Items ───────────────────────────────────────────────────────────
type VoteStatus = 'approved' | 'rejected' | 'conditional' | 'deferred' | 'pending';

interface AgendaItem {
  id: string;
  model: string;
  modelId: string;
  type: 'Initial Approval' | 'Periodic Review' | 'Material Change' | 'Emergency Review' | 'Retirement';
  riskTier: 'high' | 'limited' | 'minimal';
  presenter: string;
  status: VoteStatus;
  votes: { memberId: string; vote: 'approve' | 'reject' | 'abstain' | 'pending'; condition?: string; rationale?: string }[];
  conditions?: string[];
  nextReview?: string;
  regulatoryBasis: string;
}

const AGENDA_ITEMS: AgendaItem[] = [
  {
    id: 'MRC-2026-Q2-01',
    model: 'CreditRisk-XGB v3.2.1',
    modelId: 'MDL-001',
    type: 'Periodic Review',
    riskTier: 'high',
    presenter: 'Maria Santos',
    status: 'pending',
    regulatoryBasis: 'SR 11-7 · EU AI Act Art. 9 · ECOA Reg B',
    votes: [
      { memberId: 'M1', vote: 'pending' },
      { memberId: 'M2', vote: 'pending' },
      { memberId: 'M3', vote: 'pending' },
      { memberId: 'M4', vote: 'pending' },
      { memberId: 'M5', vote: 'pending' },
      { memberId: 'M6', vote: 'pending' },
    ],
    conditions: ['Resolve gender parity bias (DI < 0.85) within 30 days', 'Submit updated conformity assessment'],
  },
  {
    id: 'MRC-2026-Q2-02',
    model: 'FraudDetect-LSTM v1.8',
    modelId: 'MDL-002',
    type: 'Material Change',
    riskTier: 'high',
    presenter: 'Maria Santos',
    status: 'pending',
    regulatoryBasis: 'SR 11-7 · NIST AI RMF GOVERN 5',
    votes: [
      { memberId: 'M1', vote: 'pending' },
      { memberId: 'M2', vote: 'pending' },
      { memberId: 'M3', vote: 'pending' },
      { memberId: 'M4', vote: 'pending' },
      { memberId: 'M5', vote: 'pending' },
      { memberId: 'M6', vote: 'pending' },
    ],
  },
  {
    id: 'MRC-2026-Q1-03',
    model: 'ChurnPredict-RF v2.0',
    modelId: 'MDL-003',
    type: 'Initial Approval',
    riskTier: 'limited',
    presenter: 'Raj Gupta',
    status: 'approved',
    regulatoryBasis: 'NIST AI RMF · ISO 42001',
    nextReview: '2026-10-01',
    votes: [
      { memberId: 'M1', vote: 'approve', rationale: 'Strong validation results, low-risk use case' },
      { memberId: 'M2', vote: 'approve', rationale: 'Documentation complete' },
      { memberId: 'M3', vote: 'approve', rationale: 'Technical review passed' },
      { memberId: 'M4', vote: 'approve', rationale: 'Risk assessment acceptable' },
      { memberId: 'M5', vote: 'abstain', rationale: 'Conflict of interest declared' },
      { memberId: 'M6', vote: 'approve', rationale: 'Data governance satisfied' },
    ],
  },
  {
    id: 'MRC-2025-Q4-01',
    model: 'DocClassifier-BERT v1.5',
    modelId: 'MDL-006',
    type: 'Periodic Review',
    riskTier: 'limited',
    presenter: 'Raj Gupta',
    status: 'conditional',
    regulatoryBasis: 'ISO 42001 · NIST AI RMF',
    nextReview: '2026-07-01',
    conditions: ['Annual bias audit completion', 'Explainability report filed'],
    votes: [
      { memberId: 'M1', vote: 'approve', condition: 'Annual bias audit required' },
      { memberId: 'M2', vote: 'approve' },
      { memberId: 'M3', vote: 'approve', condition: 'Explainability docs needed' },
      { memberId: 'M4', vote: 'approve' },
      { memberId: 'M5', vote: 'approve' },
      { memberId: 'M6', vote: 'reject', rationale: 'Data lineage incomplete — overruled by majority' },
    ],
  },
];

const MEETING_HISTORY = [
  { id: 'MRC-2026-Q2', date: '2026-04-12', type: 'Quarterly', items: 2, approved: 0, pending: 2, quorum: true },
  { id: 'MRC-2026-Q1', date: '2026-01-15', type: 'Quarterly', items: 3, approved: 2, conditional: 1, quorum: true },
  { id: 'MRC-2025-Q4', date: '2025-10-18', type: 'Quarterly', items: 4, approved: 3, rejected: 1, quorum: true },
  { id: 'MRC-2025-Q3', date: '2025-07-20', type: 'Quarterly', items: 2, approved: 2, quorum: true },
  { id: 'MRC-2025-Q2', date: '2025-04-22', type: 'Emergency', items: 1, rejected: 1, quorum: false },
];

const APPROVAL_STATS = [
  { name: 'Approved', value: 8, color: 'hsl(var(--s-ok-tx))' },
  { name: 'Conditional', value: 3, color: 'hsl(var(--s-wn-tx))' },
  { name: 'Pending', value: 2, color: 'hsl(var(--brand))' },
  { name: 'Rejected', value: 1, color: 'hsl(var(--destructive))' },
];

function statusStyle(s: VoteStatus) {
  const map: Record<VoteStatus, { bg: string; tx: string; label: string }> = {
    approved: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', label: 'APPROVED' },
    rejected: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))', label: 'REJECTED' },
    conditional: { bg: 'hsl(45 90% 50% / 0.1)', tx: 'hsl(var(--s-wn-tx))', label: 'APPROVED W/ CONDITIONS' },
    deferred: { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--text-3))', label: 'DEFERRED' },
    pending: { bg: 'hsl(var(--brand) / 0.1)', tx: 'hsl(var(--brand))', label: 'AWAITING VOTE' },
  };
  return map[s];
}

function tierStyle(t: string) {
  if (t === 'high') return { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))' };
  if (t === 'limited') return { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' };
  return { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' };
}

export default function ModelRiskCommittee() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [tab, setTab] = useState('agenda');
  const [voteDialog, setVoteDialog] = useState<AgendaItem | null>(null);
  const [vote, setVote] = useState<'approve' | 'reject' | 'abstain'>('approve');
  const [rationale, setRationale] = useState('');
  const [condition, setCondition] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mtgDate, setMtgDate] = useState('');
  const [mtgTime, setMtgTime] = useState('10:00');
  const [mtgType, setMtgType] = useState('Quarterly Review');
  const [mtgAttendees, setMtgAttendees] = useState(MRC_MEMBERS.filter(m => m.quorum).map(m => m.name).join(', '));
  const [mtgAgenda, setMtgAgenda] = useState('');

  const pendingItems = AGENDA_ITEMS.filter(a => a.status === 'pending');
  const quorumMet = MRC_MEMBERS.filter(m => m.quorum).length >= Math.ceil(MRC_MEMBERS.length * 0.6);

  function castVote() {
    if (!rationale.trim()) { toast.error('Rationale is required'); return; }
    toast.success(`Vote recorded: ${vote.toUpperCase()} — ${voteDialog?.model}`);
    setVoteDialog(null);
    setRationale('');
    setCondition('');
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader 
          title="Model Risk Committee" 
          description={`${orgName} · Model approval governance, voting records, and committee oversight per SR 11-7 and EU AI Act Art. 9`}
          actions={
            <div className="flex items-center gap-3">
              <Badge className="rounded-none bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border border-[hsl(var(--brand))/30] uppercase text-[10px]">
                SR 11-7 COMPLIANT
              </Badge>
              <Button className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={() => setScheduleOpen(true)}>
                <Calendar size={16} className="mr-2" />Schedule MRC Meeting
              </Button>
            </div>
          }
        />

        {/* Status Strip */}
        <StatCardRow cards={[
          {
            label: 'Pending Votes',
            value: pendingItems.length,
            delta: pendingItems.length > 0 ? 'Action Required' : 'All Clear',
            deltaDir: pendingItems.length > 0 ? 'down' : 'up',
            isPositiveUp: false,
            icon: <Warning size={18} weight="fill" style={{ color: pendingItems.length > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }} />
          },
          {
            label: 'Quorum Status',
            value: quorumMet ? 'MET' : 'NOT MET',
            delta: `${MRC_MEMBERS.filter(m => m.quorum).length}/${MRC_MEMBERS.length} members`,
            deltaDir: quorumMet ? 'up' : 'down',
            isPositiveUp: true,
            icon: <Users size={18} style={{ color: quorumMet ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }} />
          },
          {
            label: 'Models Under Review',
            value: AGENDA_ITEMS.filter(a => a.status === 'pending').length,
            delta: 'Awaiting decision',
            icon: <ChartBar size={18} style={{ color: 'hsl(var(--text-4))' }} />
          },
          {
            label: 'Total Approvals',
            value: APPROVAL_STATS.find(s => s.name === 'Approved')?.value || 0,
            delta: 'Since inception',
            icon: <CheckCircle size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />
          }
        ]} />

        {/* Quorum Progress Bar */}
        <div className="p-5 bg-surface border border-[hsl(var(--border))] rounded-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">Meeting Quorum Members</h3>
            <Badge className={`rounded-none uppercase text-[10px] ${quorumMet ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
              {quorumMet ? 'QUORUM ACHIEVED' : 'QUORUM NOT MET'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            {MRC_MEMBERS.map(member => (
              <div key={member.id} className={`flex items-center gap-2 px-3 py-2 border rounded-none ${member.quorum ? 'bg-[hsl(var(--brand-subtle))] border-[hsl(var(--brand)/30)]' : 'bg-raised border-[hsl(var(--border))] opacity-60'}`}>
                <div className={`w-2 h-2 rounded-full ${member.quorum ? 'bg-[hsl(var(--brand))]' : 'bg-[hsl(var(--text-4))]'}`} />
                <span className="text-sm font-medium text-[hsl(var(--text-1))]">{member.name}</span>
                {member.chair && <Star size={12} weight="fill" className="text-yellow-500" />}
                <span className="text-xs text-[hsl(var(--text-3))] ml-2">{member.role}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[hsl(var(--text-3))] mt-4">
            * Minimum of {Math.ceil(MRC_MEMBERS.length * 0.6)} members required for binding votes per SR 11-7 §IV.C.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="border-b border-[hsl(var(--border))]">
            <TabsList className="bg-transparent space-x-6 h-12 p-0">
              <TabsTrigger value="agenda" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">
                Current Agenda
                {pendingItems.length > 0 && <Badge className="ml-2 bg-[hsl(var(--brand))] text-white border-0 rounded-none h-5 px-1.5 text-[10px]">{pendingItems.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="history" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Decision History</TabsTrigger>
              <TabsTrigger value="committee" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Committee Members</TabsTrigger>
              <TabsTrigger value="analytics" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Approval Analytics</TabsTrigger>
              <TabsTrigger value="policy" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">SR 11-7 Policy Library</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Agenda ── */}
          <TabsContent value="agenda" className="mt-4 space-y-4">
            {AGENDA_ITEMS.map(item => {
              const ss = statusStyle(item.status);
              const ts = tierStyle(item.riskTier);
              const approveVotes = item.votes.filter(v => v.vote === 'approve').length;
              const rejectVotes = item.votes.filter(v => v.vote === 'reject').length;
              const total = item.votes.filter(v => v.vote !== 'pending').length;
              return (
                <Card key={item.id} className={`rounded-none border bg-surface ${item.status === 'pending' ? 'border-[hsl(var(--brand))/30]' : 'border-[hsl(var(--border))]'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-[hsl(var(--text-3))]">{item.id}</span>
                          <Badge className="border-0 rounded-none uppercase text-[10px]" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</Badge>
                          <Badge className="border-0 rounded-none uppercase text-[10px]" style={{ background: ts.bg, color: ts.tx }}>{item.riskTier} RISK</Badge>
                          <Badge className="border-0 rounded-none uppercase text-[10px] bg-sunken text-[hsl(var(--text-2))]">{item.type}</Badge>
                        </div>
                        <p className="text-lg font-bold text-[hsl(var(--text-1))]">{item.model}</p>
                        <p className="text-xs text-[hsl(var(--text-3))] mt-1">Presenter: <strong className="text-[hsl(var(--text-2))]">{item.presenter}</strong> · Regulatory basis: {item.regulatoryBasis}</p>
                      </div>
                      {item.status === 'pending' && (
                        <Button size="sm" className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]"
                          onClick={() => { setVoteDialog(item); setVote('approve'); }}>
                          <Gavel size={16} className="mr-2" />Cast Vote
                        </Button>
                      )}
                    </div>

                    {/* Vote Tally */}
                    {total > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                            <CheckCircle size={14} /> <span>{approveVotes} Approve</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-red-500">
                            <XCircle size={14} /> <span>{rejectVotes} Reject</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-3))]">
                            <Minus size={14} /> <span>{item.votes.filter(v => v.vote === 'abstain').length} Abstain</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--brand))]">
                            <Clock size={14} /> <span>{item.votes.filter(v => v.vote === 'pending').length} Pending</span>
                          </div>
                        </div>
                        <div className="h-2 w-full flex overflow-hidden bg-sunken">
                          <div style={{ width: `${(approveVotes / item.votes.length) * 100}%` }} className="bg-emerald-500 h-full" />
                          <div style={{ width: `${(rejectVotes / item.votes.length) * 100}%` }} className="bg-red-500 h-full" />
                        </div>
                      </div>
                    )}

                    {/* Individual votes */}
                    <div className="flex flex-wrap gap-2">
                      {item.votes.map(v => {
                        const member = MRC_MEMBERS.find(m => m.id === v.memberId);
                        return (
                          <div key={v.memberId} className="flex items-center gap-2 px-2.5 py-1.5 text-xs border border-[hsl(var(--border))] bg-raised">
                            <div className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]">
                              {member?.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-[hsl(var(--text-2))]">{member?.name.split(' ')[0]}</span>
                            <span className={`font-bold ${v.vote === 'approve' ? 'text-emerald-500' : v.vote === 'reject' ? 'text-red-500' : v.vote === 'abstain' ? 'text-yellow-500' : 'text-[hsl(var(--brand))]'}`}>
                              {v.vote === 'pending' ? '…' : v.vote.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {item.conditions && item.conditions.length > 0 && (
                      <div className="mt-4 p-4 bg-yellow-500/10 border-l-4 border-yellow-500">
                        <p className="text-xs font-bold text-yellow-600 uppercase tracking-wide mb-2">Approval Conditions:</p>
                        <div className="space-y-1">
                          {item.conditions.map((c, ci) => (
                            <p key={ci} className="text-sm text-[hsl(var(--text-2))]">• {c}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history" className="mt-4">
            <Card className="rounded-none border-[hsl(var(--border))] bg-surface overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-raised border-b border-[hsl(var(--border))]">
                    <tr>
                      {['Meeting ID', 'Date', 'Type', 'Items', 'Outcome', 'Quorum'].map(h => (
                        <th key={h} className="px-4 py-3 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MEETING_HISTORY.map((m, i) => (
                      <tr key={i} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer transition-colors"
                        onClick={() => toast.info(`Meeting ${m.id} minutes — PDF available`)}>
                        <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{m.id}</td>
                        <td className="px-4 py-3 text-[hsl(var(--text-3))] font-mono text-xs">{m.date}</td>
                        <td className="px-4 py-3">
                          <Badge className={`border-0 rounded-none uppercase text-[10px] ${m.type === 'Emergency' ? 'bg-red-500/10 text-red-500' : 'bg-sunken text-[hsl(var(--text-2))]'}`}>{m.type}</Badge>
                        </td>
                        <td className="px-4 py-3 font-bold text-[hsl(var(--text-1))]">{m.items}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            {m.approved && <Badge className="bg-emerald-500/10 text-emerald-500 border-0 rounded-none uppercase text-[10px]">{m.approved} approved</Badge>}
                            {(m as any).conditional && <Badge className="bg-yellow-500/10 text-yellow-500 border-0 rounded-none uppercase text-[10px]">{(m as any).conditional} conditional</Badge>}
                            {(m as any).rejected && <Badge className="bg-red-500/10 text-red-500 border-0 rounded-none uppercase text-[10px]">{(m as any).rejected} rejected</Badge>}
                            {m.pending && <Badge className="bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-0 rounded-none uppercase text-[10px]">{m.pending} pending</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${m.quorum ? 'text-emerald-500' : 'text-red-500'}`}>{m.quorum ? '✓ Met' : '✗ Not Met'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="committee" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MRC_MEMBERS.map(m => (
                <div key={m.id} className={`p-5 flex items-start gap-4 border rounded-none ${m.chair ? 'bg-[hsl(var(--brand-subtle))] border-[hsl(var(--brand)/40)]' : 'bg-surface border-[hsl(var(--border))]'}`}>
                  <div className="w-12 h-12 flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]">
                    {m.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-[hsl(var(--text-1))]">{m.name}</p>
                      {m.chair && <Star size={14} weight="fill" className="text-yellow-500" />}
                    </div>
                    <p className="text-xs text-[hsl(var(--text-3))] mb-0.5">{m.role}</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wider">{m.department}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {m.chair && <Badge className="bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-0 rounded-none uppercase text-[9px]">CHAIR</Badge>}
                      <Badge className={`border-0 rounded-none uppercase text-[9px] ${m.quorum ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sunken text-[hsl(var(--text-3))]'}`}>
                        {m.quorum ? 'QUORUM MEMBER' : 'NON-QUORUM'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 text-sm border border-[hsl(var(--border))] bg-raised rounded-none">
              <p className="text-[hsl(var(--text-2))]">
                <strong className="text-[hsl(var(--text-1))]">Quorum requirement:</strong> {Math.ceil(MRC_MEMBERS.length * 0.6)} of {MRC_MEMBERS.length} members must be present ({quorumMet ? <span className="text-emerald-500 font-medium">Currently met</span> : <span className="text-red-500 font-medium">Not met</span>}).
                Per SR 11-7 guidance, model approval decisions require documented quorum and dissenting votes must be recorded.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="rounded-none bg-surface border-[hsl(var(--border))]">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-4 text-[hsl(var(--text-1))]">Approval Outcomes (All Time)</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={APPROVAL_STATS} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {APPROVAL_STATS.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="rounded-none bg-surface border-[hsl(var(--border))]">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-4 text-[hsl(var(--text-1))]">Items Per Quarterly Meeting</p>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={MEETING_HISTORY.slice().reverse()} barCategoryGap={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                      <XAxis dataKey="id" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: ct.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                      <Bar dataKey="items" name="Agenda Items" fill="hsl(var(--brand))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* ── SR 11-7 Policy Library ── */}
          <TabsContent value="policy" className="mt-4">
            <div className="space-y-4">
              <div className="p-3 text-xs" style={{ border: '1px solid hsl(var(--brand) / 0.3)', background: 'hsl(var(--brand) / 0.04)' }}>
                <p style={{ color: 'hsl(var(--text-3))' }}>
                  <strong style={{ color: 'hsl(var(--brand))' }}>SR 11-7 Model Risk Management</strong> — Federal Reserve supervisory guidance governing model development, implementation, use, validation, and governance at financial institutions.
                  The MRC is the primary governance body responsible for ensuring adherence to this guidance across all AI/ML models.
                </p>
              </div>
              {[
                { section: 'SR 11-7 §I', title: 'Model Definition and Scope', summary: 'Defines what constitutes a model under supervisory guidance — quantitative methods, assumptions, and systems that produce outputs used in decision-making.', mrcRole: 'Approve model classifications and scope decisions', status: 'compliant', docs: ['Model Inventory Policy v2.3', 'Classification Framework'] },
                { section: 'SR 11-7 §II', title: 'Model Risk', summary: 'Establishes that model risk arises from models that produce inaccurate outputs and from inappropriate use of model outputs. Banks must apply model risk management commensurate with model risk.', mrcRole: 'Review and approve model risk ratings; oversee material change thresholds', status: 'compliant', docs: ['Risk Tiering Policy v1.8', 'Material Change SOP'] },
                { section: 'SR 11-7 §III', title: 'Model Development, Implementation, and Use', summary: 'Addresses the complete model development lifecycle including data quality, documentation, testing, and implementation controls.', mrcRole: 'Approve initial deployment; review quarterly for material changes', status: 'amber', docs: ['Development Lifecycle Standard', 'Data Governance Policy'] },
                { section: 'SR 11-7 §IV', title: 'Model Validation', summary: 'Requires effective challenge — robust validation activities including conceptual soundness review, ongoing monitoring, outcomes analysis, and back-testing.', mrcRole: 'Receive and evaluate validation findings; require remediation with timelines', status: 'compliant', docs: ['Validation Framework v3.1', 'Independent Validation SOP'] },
                { section: 'SR 11-7 §V', title: 'Governance, Policies, and Controls', summary: 'Describes requirements for strong governance including board-level oversight, policies defining model risk tolerance, and comprehensive model inventory.', mrcRole: 'Primary owner of model governance policy; quorum requirements; documentation of votes', status: 'compliant', docs: ['MRC Charter v2.0', 'Model Inventory Policy', 'Quorum & Voting Procedures'] },
                { section: 'SR 11-7 §VI', title: 'Examiner Guidance', summary: 'Provides examination procedures for assessing model risk management programs, including review of governance, validation, and model inventory.', mrcRole: 'Produce documentation for examination; respond to examiner findings within MRC scope', status: 'amber', docs: ['Exam Response Playbook', 'MRC Meeting Minutes Archive'] },
              ].map((item, i) => (
                <Card key={i} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${item.status === 'amber' ? 'hsl(var(--s-wn-br))' : 'hsl(var(--border))'}` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 font-bold" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))' }}>{item.section}</span>
                          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{item.title}</p>
                          <span className="text-[9px] px-1.5 py-0.5 font-semibold" style={{ background: item.status === 'compliant' ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-wn-bg))', color: item.status === 'compliant' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }}>
                            {item.status === 'compliant' ? 'COMPLIANT' : 'REVIEW NEEDED'}
                          </span>
                        </div>
                        <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{item.summary}</p>
                        <div className="p-2 text-xs mb-2" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                          <span className="font-semibold" style={{ color: 'hsl(var(--text-3))' }}>MRC Responsibility: </span>
                          <span style={{ color: 'hsl(var(--text-4))' }}>{item.mrcRole}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.docs.map((d, di) => (
                            <button key={di} className="text-[9px] px-2 py-1 flex items-center gap-1" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))', color: 'hsl(var(--brand))' }}
                              onClick={() => toast.info(`Opening: ${d}`)}>
                              <FileText size={9} />
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Vote Dialog */}
      <Dialog open={!!voteDialog} onOpenChange={() => setVoteDialog(null)}>
        <DialogContent className="max-w-[600px] bg-surface border-[hsl(var(--border))] rounded-none shadow-2xl">
          <DialogHeader className="border-b border-[hsl(var(--border))] pb-4">
            <DialogTitle className="text-[hsl(var(--text-1))] flex items-center gap-2 text-xl">
              <Gavel size={20} className="text-[hsl(var(--brand))]" />
              Cast Vote — {voteDialog?.model}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="p-4 text-sm bg-raised border border-[hsl(var(--border))] rounded-none">
              <p className="text-[hsl(var(--text-1))] font-bold mb-1">{voteDialog?.type} Review</p>
              <p className="text-[hsl(var(--text-3))]">ID: {voteDialog?.id} · Regulatory basis: {voteDialog?.regulatoryBasis}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['approve', 'reject', 'abstain'] as const).map(v => (
                <button key={v} onClick={() => setVote(v)}
                  className={`p-3 text-sm font-semibold uppercase tracking-wide text-center border-2 rounded-none transition-all ${
                    vote === v
                      ? v === 'approve'
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                        : v === 'reject'
                          ? 'border-red-500/50 bg-red-500/10 text-red-500'
                          : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-600'
                      : 'border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-3))] hover:border-[hsl(var(--text-4))]'
                  }`}>
                  {v === 'approve' ? '✓ Approve' : v === 'reject' ? '✗ Reject' : '— Abstain'}
                </button>
              ))}
            </div>
            {vote === 'approve' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Conditions (optional)</label>
                <Textarea placeholder="Add any approval conditions…" value={condition} onChange={e => setCondition(e.target.value)} className="text-sm bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none focus-visible:ring-[hsl(var(--brand))] min-h-[60px]" />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Rationale <span className="text-red-500">*</span></label>
              <Textarea placeholder="Your documented rationale for this vote (required for audit trail)…" value={rationale} onChange={e => setRationale(e.target.value)} className="text-sm bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none focus-visible:ring-[hsl(var(--brand))] min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="border-t border-[hsl(var(--border))] pt-5">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised" onClick={() => setVoteDialog(null)}>Cancel</Button>
            <Button className={`rounded-none text-white ${
              vote === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
              vote === 'reject' ? 'bg-red-600 hover:bg-red-700' :
              'bg-yellow-600 hover:bg-yellow-700'
            }`} onClick={castVote}>
              <Gavel size={16} className="mr-2" />Submit Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule MRC Meeting Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="rounded-none max-w-[600px] bg-surface border-[hsl(var(--border))] shadow-2xl">
          <DialogHeader className="border-b border-[hsl(var(--border))] pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl text-[hsl(var(--text-1))]">
              <Calendar size={20} className="text-[hsl(var(--brand))]" />Schedule MRC Meeting
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Date *</label>
                <input type="date" value={mtgDate} onChange={e => setMtgDate(e.target.value)} className="w-full h-10 rounded-none border border-[hsl(var(--border))] bg-raised px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] text-[hsl(var(--text-1))]" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Time</label>
                <input type="time" value={mtgTime} onChange={e => setMtgTime(e.target.value)} className="w-full h-10 rounded-none border border-[hsl(var(--border))] bg-raised px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] text-[hsl(var(--text-1))]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Meeting Type</label>
              <select value={mtgType} onChange={e => setMtgType(e.target.value)} className="w-full h-10 rounded-none border border-[hsl(var(--border))] bg-raised px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] text-[hsl(var(--text-1))]">
                {['Quarterly Review', 'Emergency Session', 'Model Approval', 'Annual Review', 'Ad Hoc'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Attendees</label>
              <Textarea value={mtgAttendees} onChange={e => setMtgAttendees(e.target.value)} className="text-sm bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none min-h-[60px]" />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Agenda Items</label>
              <Textarea value={mtgAgenda} onChange={e => setMtgAgenda(e.target.value)} placeholder={`e.g.\n1. Review ${AGENDA_ITEMS.filter(a => a.status === 'pending').length} pending model approvals\n2. Q2 risk posture update\n3. SR 11-7 compliance review`} className="text-sm bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none min-h-[80px]" />
            </div>
            <div className="p-4 text-sm bg-yellow-500/10 border-l-4 border-yellow-500">
              <p className="font-bold mb-1 text-yellow-600 uppercase tracking-wide">Quorum requirement</p>
              <p className="text-[hsl(var(--text-2))]">A minimum of {Math.ceil(MRC_MEMBERS.length * 0.6)} of {MRC_MEMBERS.length} members must attend for binding votes per SR 11-7 §IV.C.</p>
            </div>
          </div>
          <DialogFooter className="border-t border-[hsl(var(--border))] pt-5">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={() => {
              if (!mtgDate) { toast.error('Meeting date is required'); return; }
              toast.success(`MRC ${mtgType} scheduled for ${mtgDate} at ${mtgTime} — calendar invites sending to ${MRC_MEMBERS.filter(m => m.quorum).length} quorum members`);
              setScheduleOpen(false);
            }}>
              <Calendar size={16} className="mr-2" />Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
