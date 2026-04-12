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
  CheckSquare, ArrowUp, Buildings, Star, Scales,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
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
  { name: 'Conditional', value: 3, color: '#f59e0b' },
  { name: 'Pending', value: 2, color: 'hsl(var(--brand))' },
  { name: 'Rejected', value: 1, color: 'hsl(var(--destructive))' },
];

function statusStyle(s: VoteStatus) {
  const map: Record<VoteStatus, { bg: string; tx: string; label: string }> = {
    approved: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', label: 'APPROVED' },
    rejected: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))', label: 'REJECTED' },
    conditional: { bg: 'hsl(45 90% 50% / 0.1)', tx: '#d97706', label: 'APPROVED W/ CONDITIONS' },
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
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Model Risk Committee</h1>
              <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
                SR 11-7 COMPLIANT
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Model approval governance, voting records, and committee oversight per SR 11-7 and EU AI Act Art. 9
            </p>
          </div>
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
            onClick={() => toast.success('Q2 MRC agenda package generating — will notify committee members')}>
            <Calendar size={13} className="mr-1.5" />Schedule MRC Meeting
          </Button>
        </div>

        {/* Status Strip */}
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Pending Votes', value: pendingItems.length, alert: pendingItems.length > 0 },
            { label: 'Quorum Status', value: quorumMet ? 'MET' : 'NOT MET', sub: `${MRC_MEMBERS.filter(m => m.quorum).length}/${MRC_MEMBERS.length} members`, ok: quorumMet },
            { label: 'Models Under Review', value: AGENDA_ITEMS.filter(a => a.status === 'pending').length, sub: 'Awaiting committee decision' },
            { label: 'Approvals (All Time)', value: APPROVAL_STATS.find(s => s.name === 'Approved')!.value, sub: 'Since platform inception' },
            { label: 'Next Meeting', value: 'Apr 25, 2026', sub: 'Q2 Quarterly Review' },
          ].map((tile, i) => (
            <div key={i} className="p-3" style={{ border: `1px solid ${tile.alert ? 'hsl(var(--s-wn-br))' : tile.ok === false ? 'hsl(var(--destructive) / 0.4)' : 'hsl(var(--border))'}`, background: tile.alert ? 'hsl(var(--s-wn-bg) / 0.5)' : 'hsl(var(--bg-surface))' }}>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{tile.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: tile.alert ? 'hsl(var(--s-wn-tx))' : tile.ok === false ? 'hsl(var(--destructive))' : tile.ok ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-1))' }}>{tile.value}</p>
              {tile.sub && <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{tile.sub}</p>}
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="agenda" style={{ borderRadius: 0 }}>
              Current Agenda
              {pendingItems.length > 0 && <span className="ml-1.5 text-[9px] font-bold px-1 py-0.5" style={{ background: 'hsl(var(--brand))', color: '#fff' }}>{pendingItems.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="history" style={{ borderRadius: 0 }}>Decision History</TabsTrigger>
            <TabsTrigger value="committee" style={{ borderRadius: 0 }}>Committee Members</TabsTrigger>
            <TabsTrigger value="analytics" style={{ borderRadius: 0 }}>Approval Analytics</TabsTrigger>
          </TabsList>

          {/* ── Agenda ── */}
          <TabsContent value="agenda" className="mt-4 space-y-4">
            {AGENDA_ITEMS.map(item => {
              const ss = statusStyle(item.status);
              const ts = tierStyle(item.riskTier);
              const approveVotes = item.votes.filter(v => v.vote === 'approve').length;
              const rejectVotes = item.votes.filter(v => v.vote === 'reject').length;
              const total = item.votes.filter(v => v.vote !== 'pending').length;
              return (
                <Card key={item.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: `1px solid ${item.status === 'pending' ? 'hsl(var(--brand) / 0.3)' : 'hsl(var(--border))'}` }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{item.id}</span>
                          <span className="text-[9px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</span>
                          <span className="text-[9px] px-1.5 py-0.5" style={{ background: ts.bg, color: ts.tx }}>{item.riskTier.toUpperCase()} RISK</span>
                          <span className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-3))' }}>{item.type}</span>
                        </div>
                        <p className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{item.model}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Presenter: {item.presenter} · Regulatory basis: {item.regulatoryBasis}</p>
                      </div>
                      {item.status === 'pending' && (
                        <Button size="sm" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
                          onClick={() => { setVoteDialog(item); setVote('approve'); }}>
                          <Gavel size={12} className="mr-1" />Cast Vote
                        </Button>
                      )}
                    </div>

                    {/* Vote Tally */}
                    {total > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <CheckCircle size={12} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                            <span style={{ color: 'hsl(var(--s-ok-tx))' }}>{approveVotes} Approve</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <XCircle size={12} style={{ color: 'hsl(var(--destructive))' }} />
                            <span style={{ color: 'hsl(var(--destructive))' }}>{rejectVotes} Reject</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Minus size={12} style={{ color: 'hsl(var(--text-4))' }} />
                            <span style={{ color: 'hsl(var(--text-4))' }}>{item.votes.filter(v => v.vote === 'abstain').length} Abstain</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock size={12} style={{ color: 'hsl(var(--brand))' }} />
                            <span style={{ color: 'hsl(var(--brand))' }}>{item.votes.filter(v => v.vote === 'pending').length} Pending</span>
                          </div>
                        </div>
                        <div className="h-2 w-full flex overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                          <div style={{ width: `${(approveVotes / item.votes.length) * 100}%`, background: 'hsl(var(--s-ok-tx))', height: '100%' }} />
                          <div style={{ width: `${(rejectVotes / item.votes.length) * 100}%`, background: 'hsl(var(--destructive))', height: '100%' }} />
                        </div>
                      </div>
                    )}

                    {/* Individual votes */}
                    <div className="flex flex-wrap gap-2">
                      {item.votes.map(v => {
                        const member = MRC_MEMBERS.find(m => m.id === v.memberId);
                        return (
                          <div key={v.memberId} className="flex items-center gap-1.5 px-2 py-1 text-[10px]"
                            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                            <div className="w-5 h-5 flex items-center justify-center text-[8px] font-bold" style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}>
                              {member?.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span style={{ color: 'hsl(var(--text-3))' }}>{member?.name.split(' ')[0]}</span>
                            <span className="font-semibold" style={{ color: v.vote === 'approve' ? 'hsl(var(--s-ok-tx))' : v.vote === 'reject' ? 'hsl(var(--destructive))' : v.vote === 'abstain' ? '#f59e0b' : 'hsl(var(--brand))' }}>
                              {v.vote === 'pending' ? '…' : v.vote.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {item.conditions && item.conditions.length > 0 && (
                      <div className="mt-3 p-2.5" style={{ background: 'hsl(45 90% 50% / 0.06)', border: '1px solid hsl(45 90% 50% / 0.2)' }}>
                        <p className="text-[10px] font-semibold mb-1" style={{ color: '#d97706' }}>Approval Conditions:</p>
                        {item.conditions.map((c, ci) => (
                          <p key={ci} className="text-[10px]" style={{ color: 'hsl(var(--text-3))' }}>• {c}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                      {['Meeting ID', 'Date', 'Type', 'Items', 'Outcome', 'Quorum'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MEETING_HISTORY.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => toast.info(`Meeting ${m.id} minutes — PDF available`)}>
                        <td className="px-4 py-3 font-mono text-[10px]" style={{ color: 'hsl(var(--brand))' }}>{m.id}</td>
                        <td className="px-4 py-3" style={{ color: 'hsl(var(--text-3))' }}>{m.date}</td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] px-1.5 py-0.5" style={{ background: m.type === 'Emergency' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-nt-bg))', color: m.type === 'Emergency' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>{m.type}</span>
                        </td>
                        <td className="px-4 py-3 font-bold" style={{ color: 'hsl(var(--text-1))' }}>{m.items}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {m.approved && <span className="text-[9px] px-1 py-0.5" style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>{m.approved} approved</span>}
                            {(m as any).conditional && <span className="text-[9px] px-1 py-0.5" style={{ background: 'hsl(45 90% 50% / 0.1)', color: '#d97706' }}>{(m as any).conditional} conditional</span>}
                            {(m as any).rejected && <span className="text-[9px] px-1 py-0.5" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }}>{(m as any).rejected} rejected</span>}
                            {m.pending && <span className="text-[9px] px-1 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))' }}>{m.pending} pending</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span style={{ color: m.quorum ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>{m.quorum ? '✓ Met' : '✗ Not Met'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Committee Members ── */}
          <TabsContent value="committee" className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              {MRC_MEMBERS.map(m => (
                <div key={m.id} className="p-4 flex items-start gap-3" style={{ border: `1px solid ${m.chair ? 'hsl(var(--brand) / 0.4)' : 'hsl(var(--border))'}`, background: m.chair ? 'hsl(var(--brand) / 0.04)' : 'hsl(var(--bg-surface))' }}>
                  <div className="w-10 h-10 flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}>
                    {m.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                      {m.chair && <Star size={11} weight="fill" style={{ color: 'hsl(var(--brand))' }} />}
                    </div>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{m.role}</p>
                    <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{m.department}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {m.chair && <span className="text-[9px] px-1.5 py-0.5" style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))' }}>CHAIR</span>}
                      <span className="text-[9px] px-1.5 py-0.5" style={{ background: m.quorum ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--s-nt-bg))', color: m.quorum ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }}>
                        {m.quorum ? 'QUORUM MEMBER' : 'NON-QUORUM'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 text-xs" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
              <p style={{ color: 'hsl(var(--text-3))' }}>
                <strong style={{ color: 'hsl(var(--text-1))' }}>Quorum requirement:</strong> {Math.ceil(MRC_MEMBERS.length * 0.6)} of {MRC_MEMBERS.length} members must be present ({quorumMet ? <span style={{ color: 'hsl(var(--s-ok-tx))' }}>Currently met</span> : <span style={{ color: 'hsl(var(--destructive))' }}>Not met</span>}).
                Per SR 11-7 guidance, model approval decisions require documented quorum and dissenting votes must be recorded.
              </p>
            </div>
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Approval Outcomes (All Time)</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={APPROVAL_STATS} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {APPROVAL_STATS.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Items Per Quarterly Meeting</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={MEETING_HISTORY.slice().reverse()} barCategoryGap={8}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                      <XAxis dataKey="id" tick={{ fill: ct.axis, fontSize: 9 }} />
                      <YAxis tick={{ fill: ct.axis, fontSize: 11 }} />
                      <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 11 }} />
                      <Bar dataKey="items" name="Agenda Items" fill="hsl(var(--brand))" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Vote Dialog */}
      <Dialog open={!!voteDialog} onOpenChange={() => setVoteDialog(null)}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 520, background: 'hsl(var(--bg-surface))' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>
              <div className="flex items-center gap-2">
                <Gavel size={16} style={{ color: 'hsl(var(--brand))' }} />
                Cast Vote — {voteDialog?.model}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 text-xs" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
              <p style={{ color: 'hsl(var(--text-4))' }}>{voteDialog?.id} · {voteDialog?.type} · Regulatory basis: {voteDialog?.regulatoryBasis}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['approve', 'reject', 'abstain'] as const).map(v => (
                <button key={v} className="p-3 text-xs font-semibold uppercase text-center border-2 transition-all"
                  style={{ borderColor: vote === v ? (v === 'approve' ? 'hsl(var(--s-ok-tx))' : v === 'reject' ? 'hsl(var(--destructive))' : '#f59e0b') : 'hsl(var(--border))', background: vote === v ? (v === 'approve' ? 'hsl(var(--s-ok-bg))' : v === 'reject' ? 'hsl(var(--s-er-bg))' : 'hsl(45 90% 50% / 0.1)') : 'hsl(var(--bg-raised))', color: vote === v ? (v === 'approve' ? 'hsl(var(--s-ok-tx))' : v === 'reject' ? 'hsl(var(--s-er-tx))' : '#d97706') : 'hsl(var(--text-3))' }}
                  onClick={() => setVote(v)}>
                  {v === 'approve' ? '✓ Approve' : v === 'reject' ? '✗ Reject' : '— Abstain'}
                </button>
              ))}
            </div>
            {vote === 'approve' && (
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-3))' }}>Conditions (optional)</label>
                <Textarea placeholder="Add any approval conditions…" value={condition} onChange={e => setCondition(e.target.value)} className="text-xs" style={{ borderRadius: 0, minHeight: 60 }} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--text-3))' }}>Rationale <span style={{ color: 'hsl(var(--destructive))' }}>*</span></label>
              <Textarea placeholder="Your documented rationale for this vote (required for audit trail)…" value={rationale} onChange={e => setRationale(e.target.value)} className="text-xs" style={{ borderRadius: 0, minHeight: 80 }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setVoteDialog(null)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: vote === 'approve' ? 'hsl(var(--s-ok-tx))' : vote === 'reject' ? 'hsl(var(--destructive))' : '#d97706', color: '#fff' }} onClick={castVote}>
              <Gavel size={12} className="mr-1.5" />Submit Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
