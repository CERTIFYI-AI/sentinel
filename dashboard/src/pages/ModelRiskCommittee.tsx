import { Fragment, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { useNavigate } from 'react-router-dom';
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
  ArrowRight, Gavel, Calendar, Star, Minus, Trash, Plus, CaretDown, CaretRight,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useSettingsStore } from '../stores/settingsStore';
import { useChartTheme } from '../hooks/useChartTheme';
import { useAuthStore } from '../store/authStore';
import { StatCardRow } from '../components/ui/StatCardRow';
import { PageHeader } from '../components/ui/PageHeader';
import { USERS } from '../data/seed';
import { useMrc, useModelOptions } from '@/hooks/useAiiaData';
import { tallyVotes, type MrcAgendaItem, type MrcVote, type Decision } from '@/services/mrcService';

// ── MRC Members ────────────────────────────────────────────────────────────────
// Seed defaults for the committee-members table. The LIVE `members` value returned
// by useSupabaseTable is the single source of truth for quorum everywhere below —
// this const is only the initial payload, never read directly for quorum math.
const MRC_MEMBERS = [
  { id: 'M1', name: 'Sarah Chen', role: 'CISO', department: 'Security', chair: true, quorum: true },
  { id: 'M2', name: 'James Patel', role: 'VP Compliance', department: 'Compliance', chair: false, quorum: true },
  { id: 'M3', name: 'Raj Gupta', role: 'Model Risk Manager', department: 'AI/ML', chair: false, quorum: true },
  { id: 'M4', name: 'David Kim', role: 'Risk Analyst', department: 'Risk', chair: false, quorum: true },
  { id: 'M5', name: 'Emma Wilson', role: 'Internal Auditor', department: 'Audit', chair: false, quorum: false },
  { id: 'M6', name: 'Oliver Tran', role: 'Chief Data Officer', department: 'Data', chair: false, quorum: true },
  { id: 'M7', name: 'Priya Nair', role: 'General Counsel', department: 'Legal', chair: false, quorum: false },
];

const DECISION_META: Record<Decision, { bg: string; tx: string; label: string }> = {
  approved: { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', label: 'APPROVED' },
  rejected: { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))', label: 'REJECTED' },
  conditional: { bg: 'hsl(45 90% 50% / 0.1)', tx: 'hsl(var(--s-wn-tx))', label: 'APPROVED W/ CONDITIONS' },
  deferred: { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--text-3))', label: 'DEFERRED' },
  pending: { bg: 'hsl(var(--brand) / 0.1)', tx: 'hsl(var(--brand))', label: 'AWAITING VOTE' },
};

function tierStyle(t?: string) {
  if (t === 'high') return { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))' };
  if (t === 'limited') return { bg: 'hsl(var(--s-wn-bg))', tx: 'hsl(var(--s-wn-tx))' };
  if (t === 'minimal') return { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))' };
  return { bg: 'hsl(var(--bg-sunken))', tx: 'hsl(var(--text-3))' };
}

const initials = (name?: string | null) => (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const shortDate = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '—');

export default function ModelRiskCommittee() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const voterId = authUser?.id || 'anonymous';
  const voterName = authUser?.name || authUser?.email || 'Committee Member';

  const { meetings, agenda, votes, isLoading, vote, addMeeting, addAgenda, decide } = useMrc();
  const { models } = useModelOptions();

  const [tab, setTab] = useState('agenda');
  const [voteDialog, setVoteDialog] = useState<MrcAgendaItem | null>(null);
  const [choice, setChoice] = useState<'approve' | 'reject' | 'abstain'>('approve');
  const [rationale, setRationale] = useState('');
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);

  // Schedule-meeting form
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mtgTitle, setMtgTitle] = useState('');
  const [mtgDate, setMtgDate] = useState('');
  const [mtgTime, setMtgTime] = useState('10:00');
  const [mtgType, setMtgType] = useState('Quarterly Review');
  const [mtgQuorum, setMtgQuorum] = useState(4);
  const [mtgAttendees, setMtgAttendees] = useState('');

  // Add-agenda form
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agTitle, setAgTitle] = useState('');
  const [agModelId, setAgModelId] = useState('');
  const [agReviewType, setAgReviewType] = useState('Periodic Review');
  const [agPresenter, setAgPresenter] = useState('');
  const [agSummary, setAgSummary] = useState('');
  const [agMeetingId, setAgMeetingId] = useState('');

  // Committee members (kept exactly as before)
  const { data: members, setData: setMembers } = useSupabaseTable('modelriskcommittee_table', MRC_MEMBERS);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Committee Member');
  const [newMemberQuorum, setNewMemberQuorum] = useState(true);

  const addMember = () => {
    const user = USERS.find(u => u.id === newMemberId);
    if (!user) { toast.error('Select a user from the organization'); return; }
    if (members.some(m => m.name === user.name)) { toast.error(`${user.name} is already on the committee`); return; }
    setMembers(prev => [...prev, { id: `M${prev.length + 1}`, name: user.name, role: newMemberRole, department: user.department ?? '—', chair: false, quorum: newMemberQuorum }]);
    toast.success(`${user.name} added to the committee`);
    setNewMemberId(''); setNewMemberRole('Committee Member'); setNewMemberQuorum(true); setShowAddMember(false);
  };
  const removeMember = (mid: string, name: string) => { setMembers(prev => prev.filter(m => m.id !== mid)); toast.success(`${name} removed from the committee`); };
  const availableUsers = USERS.filter(u => !members.some(m => m.name === u.name));

  // ── Derived data (all from real tables) ───────────────────────────────────
  const votesByItem = useMemo(() => {
    const map = new Map<string, MrcVote[]>();
    for (const v of votes) {
      const arr = map.get(v.agendaItemId) ?? [];
      arr.push(v);
      map.set(v.agendaItemId, arr);
    }
    return map;
  }, [votes]);

  const modelById = useMemo(() => new Map(models.map(m => [m.id, m])), [models]);
  const pendingItems = agenda.filter(a => a.decision === 'pending');
  const approvedCount = agenda.filter(a => a.decision === 'approved').length;

  // ── Quorum — single source of truth ───────────────────────────────────────
  // Eligible = live committee members flagged as counting toward quorum. The
  // reference meeting is the next upcoming one (else most recent). The badge,
  // the note, the stat delta, and the schedule dialog all read `quorum` below.
  const eligibleMembers = members.filter(m => m.quorum).length;
  const now = Date.now();
  const refMeeting = useMemo(() => {
    const upcoming = meetings
      .filter(m => new Date(m.scheduledAt).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return upcoming[0] ?? meetings[0] ?? null;
  }, [meetings, now]);

  const quorum = useMemo(() => {
    const required = refMeeting?.quorumRequired ?? Math.ceil(members.length * 0.6);
    const present = refMeeting && refMeeting.attendees.length > 0 ? refMeeting.attendees.length : eligibleMembers;
    return { required, present, met: present >= required };
  }, [refMeeting, eligibleMembers, members.length]);

  // ── Approval analytics from real decisions ────────────────────────────────
  const approvalStats = useMemo(() => {
    const c: Record<Decision, number> = { approved: 0, rejected: 0, conditional: 0, deferred: 0, pending: 0 };
    for (const a of agenda) c[a.decision]++;
    return [
      { name: 'Approved', value: c.approved, color: 'hsl(var(--s-ok-tx))' },
      { name: 'Conditional', value: c.conditional, color: 'hsl(var(--s-wn-tx))' },
      { name: 'Pending', value: c.pending, color: 'hsl(var(--brand))' },
      { name: 'Deferred', value: c.deferred, color: 'hsl(var(--text-4))' },
      { name: 'Rejected', value: c.rejected, color: 'hsl(var(--destructive))' },
    ].filter(s => s.value > 0);
  }, [agenda]);

  const itemsPerMeeting = useMemo(() =>
    meetings
      .map(m => ({ id: m.title.length > 18 ? m.title.slice(0, 16) + '…' : m.title, items: agenda.filter(a => a.meetingId === m.id).length }))
      .reverse(),
  [meetings, agenda]);

  // ── Vote ───────────────────────────────────────────────────────────────────
  function submitVote() {
    if (!voteDialog) return;
    if (!rationale.trim()) { toast.error('Rationale is required for the audit trail'); return; }
    const item = voteDialog;
    vote.mutate(
      { agendaItemId: item.id, agendaItemTitle: item.title, modelId: item.modelId ?? undefined, voterId, voterName, vote: choice, rationale: rationale.trim() },
      {
        onSuccess: () => {
          toast.success(`Vote recorded: ${choice.toUpperCase()} — ${item.title}`);
          setVoteDialog(null); setRationale(''); setChoice('approve');
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  // ── Record decision ─────────────────────────────────────────────────────────
  function recordDecision(item: MrcAgendaItem, decision: Decision) {
    decide.mutate(
      { id: item.id, decision },
      {
        onSuccess: () => toast.success(`Decision recorded: ${DECISION_META[decision].label} — ${item.title}`),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  // ── Schedule meeting ─────────────────────────────────────────────────────────
  function scheduleMeeting() {
    if (!mtgTitle.trim()) { toast.error('Meeting title is required'); return; }
    if (!mtgDate) { toast.error('Meeting date is required'); return; }
    const scheduledAt = new Date(`${mtgDate}T${mtgTime || '00:00'}`);
    if (isNaN(scheduledAt.getTime())) { toast.error('Invalid meeting date/time'); return; }
    const attendees = mtgAttendees.split(',').map(s => s.trim()).filter(Boolean);
    addMeeting.mutate(
      { title: mtgTitle.trim(), meetingType: mtgType, scheduledAt: scheduledAt.toISOString(), quorumRequired: mtgQuorum, attendees },
      {
        onSuccess: () => {
          toast.success(`MRC meeting "${mtgTitle.trim()}" scheduled for ${mtgDate}`);
          setScheduleOpen(false);
          setMtgTitle(''); setMtgDate(''); setMtgTime('10:00'); setMtgAttendees('');
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  // ── Add agenda item ──────────────────────────────────────────────────────────
  function addAgendaItem() {
    if (!agTitle.trim()) { toast.error('Agenda item title is required'); return; }
    const model = agModelId ? modelById.get(agModelId) : undefined;
    addAgenda.mutate(
      {
        title: agTitle.trim(),
        modelId: model?.id,
        modelName: model?.name,
        reviewType: agReviewType,
        presenter: agPresenter.trim() || undefined,
        summary: agSummary.trim() || undefined,
        meetingId: agMeetingId || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Model review "${agTitle.trim()}" added to the agenda`);
          setAgendaOpen(false);
          setAgTitle(''); setAgModelId(''); setAgReviewType('Periodic Review'); setAgPresenter(''); setAgSummary(''); setAgMeetingId('');
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  const openSchedule = () => { setMtgQuorum(Math.max(1, Math.ceil(eligibleMembers * 0.6))); setMtgAttendees(members.filter(m => m.quorum).map(m => m.name).join(', ')); setScheduleOpen(true); };

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
              <Button className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={openSchedule}>
                <Calendar size={16} />Schedule MRC Meeting
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
            value: quorum.met ? 'MET' : 'NOT MET',
            delta: `${quorum.present}/${quorum.required} required`,
            deltaDir: quorum.met ? 'up' : 'down',
            isPositiveUp: true,
            icon: <Users size={18} style={{ color: quorum.met ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }} />
          },
          {
            label: 'Models Under Review',
            value: pendingItems.length,
            delta: 'Awaiting decision',
            icon: <ChartBar size={18} style={{ color: 'hsl(var(--text-4))' }} />
          },
          {
            label: 'Total Approvals',
            value: approvedCount,
            delta: 'Recorded decisions',
            icon: <CheckCircle size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />
          }
        ]} />

        {/* Quorum Progress Bar */}
        <div className="p-5 bg-surface border border-[hsl(var(--border))] rounded-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">Meeting Quorum Members</h3>
            <Badge className={`rounded-none uppercase text-[10px] ${quorum.met ? 'bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))] border border-[hsl(var(--s-ok-br))]' : 'bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))] border border-[hsl(var(--s-er-br))]'}`}>
              {quorum.met ? 'QUORUM ACHIEVED' : 'QUORUM NOT MET'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            {members.map(member => (
              <div key={member.id} className={`flex items-center gap-2 px-3 py-2 border rounded-none ${member.quorum ? 'bg-[hsl(var(--brand-subtle))] border-[hsl(var(--brand)/30)]' : 'bg-raised border-[hsl(var(--border))] opacity-60'}`}>
                <div className={`w-2 h-2 rounded-full ${member.quorum ? 'bg-[hsl(var(--brand))]' : 'bg-[hsl(var(--text-4))]'}`} />
                <span className="text-sm font-medium text-[hsl(var(--text-1))]">{member.name}</span>
                {member.chair && <Star size={12} weight="fill" className="text-[hsl(var(--s-wn-tx))]" />}
                <span className="text-xs text-[hsl(var(--text-3))] ml-2">{member.role}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[hsl(var(--text-3))] mt-4">
            * {quorum.present} of {quorum.required} required members present{refMeeting ? ` for "${refMeeting.title}" (${shortDate(refMeeting.scheduledAt)})` : ''}. Binding votes require documented quorum per SR 11-7 §IV.C.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="border-b border-[hsl(var(--border))]">
            <TabsList className="bg-transparent space-x-6 h-12 p-0">
              <TabsTrigger value="agenda" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">
                Current Agenda
                {pendingItems.length > 0 && <Badge className="ml-2 bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))] border-0 rounded-none h-5 px-1.5 text-[10px]">{pendingItems.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="history" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Decision History</TabsTrigger>
              <TabsTrigger value="committee" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Committee Members</TabsTrigger>
              <TabsTrigger value="analytics" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">Approval Analytics</TabsTrigger>
              <TabsTrigger value="policy" className="h-full border-b-2 border-transparent data-[state=active]:border-[hsl(var(--brand))] data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 text-sm">SR 11-7 Policy Library</TabsTrigger>
            </TabsList>
          </div>

          {/* ── Agenda ── */}
          <TabsContent value="agenda" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[hsl(var(--text-3))]">Model reviews before the committee. Votes and decisions persist to the record.</p>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => setAgendaOpen(true)}>
                <Plus size={14} />Add Model Review
              </Button>
            </div>

            {isLoading ? (
              <div className="p-10 text-center text-sm text-[hsl(var(--text-3))]">Loading agenda…</div>
            ) : agenda.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-[hsl(var(--border))] rounded-none">
                <FileText size={28} className="mx-auto mb-2 text-[hsl(var(--text-4))]" />
                <p className="text-sm text-[hsl(var(--text-2))]">No agenda items yet.</p>
                <p className="text-xs text-[hsl(var(--text-4))] mt-1">Add a model review to bring it before the committee.</p>
              </div>
            ) : agenda.map(item => {
              const ss = DECISION_META[item.decision];
              const mo = item.modelId ? modelById.get(item.modelId) : undefined;
              const ts = tierStyle(mo?.riskTier);
              const t = tallyVotes(votesByItem.get(item.id) ?? []);
              const itemVotes = votesByItem.get(item.id) ?? [];
              return (
                <Card key={item.id} className={`rounded-none border bg-surface ${item.decision === 'pending' ? 'border-[hsl(var(--brand))/30]' : 'border-[hsl(var(--border))]'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className="border-0 rounded-none uppercase text-[10px]" style={{ background: ss.bg, color: ss.tx }}>{ss.label}</Badge>
                          {mo?.riskTier && <Badge className="border-0 rounded-none uppercase text-[10px]" style={{ background: ts.bg, color: ts.tx }}>{mo.riskTier} RISK</Badge>}
                          <Badge className="border-0 rounded-none uppercase text-[10px] bg-sunken text-[hsl(var(--text-2))]">{item.reviewType}</Badge>
                        </div>
                        <p className="text-lg font-bold text-[hsl(var(--text-1))]">{item.title}</p>
                        {item.modelId && (
                          <button
                            onClick={() => navigate(`/models/${item.modelId}`)}
                            className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-[hsl(var(--brand))] hover:underline">
                            {item.modelName || 'Linked model'} <ArrowRight size={12} />
                          </button>
                        )}
                        <p className="text-xs text-[hsl(var(--text-3))] mt-1">
                          {item.presenter && <>Presenter: <strong className="text-[hsl(var(--text-2))]">{item.presenter}</strong></>}
                          {item.summary && <> · {item.summary}</>}
                        </p>
                      </div>
                      {item.decision === 'pending' && (
                        <Button size="sm" className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))] shrink-0"
                          onClick={() => { setVoteDialog(item); setChoice('approve'); setRationale(''); }}>
                          <Gavel size={16} />Cast Vote
                        </Button>
                      )}
                    </div>

                    {/* Vote Tally */}
                    {t.total > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-4 mb-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--s-ok-tx))]"><CheckCircle size={14} /> <span>{t.approve} Approve</span></div>
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--s-er-tx))]"><XCircle size={14} /> <span>{t.reject} Reject</span></div>
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-3))]"><Minus size={14} /> <span>{t.abstain} Abstain</span></div>
                          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-3))]"><Users size={14} /> <span>{t.total} Total</span></div>
                        </div>
                        <div className="h-2 w-full flex overflow-hidden bg-sunken">
                          <div style={{ width: `${(t.approve / t.total) * 100}%` }} className="bg-[hsl(var(--s-ok-tx))] h-full" />
                          <div style={{ width: `${(t.reject / t.total) * 100}%` }} className="bg-[hsl(var(--s-er-tx))] h-full" />
                          <div style={{ width: `${(t.abstain / t.total) * 100}%` }} className="bg-[hsl(var(--s-wn-tx))] h-full" />
                        </div>
                      </div>
                    )}

                    {/* Individual votes */}
                    {itemVotes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {itemVotes.map(v => (
                          <div key={v.id} title={v.rationale || undefined} className="flex items-center gap-2 px-2.5 py-1.5 text-xs border border-[hsl(var(--border))] bg-raised">
                            <div className="w-5 h-5 flex items-center justify-center text-[10px] font-bold bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]">
                              {initials(v.voterName)}
                            </div>
                            <span className="text-[hsl(var(--text-2))]">{(v.voterName || 'Member').split(' ')[0]}</span>
                            <span className={`font-bold ${v.vote === 'approve' ? 'text-[hsl(var(--s-ok-tx))]' : v.vote === 'reject' ? 'text-[hsl(var(--s-er-tx))]' : 'text-[hsl(var(--s-wn-tx))]'}`}>
                              {v.vote.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Record Decision */}
                    <div className="mt-4 pt-4 border-t border-[hsl(var(--border))] flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-4))] mr-1">Record committee decision:</span>
                      {([
                        ['approved', 'Approve'], ['conditional', 'Conditional'], ['rejected', 'Reject'], ['deferred', 'Defer'], ['pending', 'Reset'],
                      ] as [Decision, string][]).map(([d, label]) => (
                        <Button key={d} size="sm" variant="outline"
                          disabled={item.decision === d || decide.isPending}
                          className="rounded-none h-7 text-[11px]"
                          onClick={() => recordDecision(item, d)}>
                          {label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── History ── */}
          <TabsContent value="history" className="mt-4">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-[hsl(var(--text-3))]">Loading meetings…</div>
            ) : meetings.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-[hsl(var(--border))] rounded-none">
                <Calendar size={28} className="mx-auto mb-2 text-[hsl(var(--text-4))]" />
                <p className="text-sm text-[hsl(var(--text-2))]">No meetings on record.</p>
                <p className="text-xs text-[hsl(var(--text-4))] mt-1">Schedule an MRC meeting to begin the record.</p>
              </div>
            ) : (
              <Card className="rounded-none border-[hsl(var(--border))] bg-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-[hsl(var(--text-2))] uppercase bg-raised border-b border-[hsl(var(--border))]">
                      <tr>
                        {['', 'Meeting', 'Date', 'Type', 'Items', 'Outcome', 'Quorum'].map((h, i) => (
                          <th key={i} className="px-4 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.map(m => {
                        const items = agenda.filter(a => a.meetingId === m.id);
                        const c = { approved: 0, rejected: 0, conditional: 0, deferred: 0, pending: 0 } as Record<Decision, number>;
                        items.forEach(a => c[a.decision]++);
                        const qMet = m.attendees.length >= m.quorumRequired;
                        const expanded = expandedMeeting === m.id;
                        return (
                          <Fragment key={m.id}>
                            <tr className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer transition-colors"
                              onClick={() => setExpandedMeeting(expanded ? null : m.id)}>
                              <td className="px-4 py-3 text-[hsl(var(--text-3))]">{expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}</td>
                              <td className="px-4 py-3 font-semibold text-[hsl(var(--text-1))]">{m.title}</td>
                              <td className="px-4 py-3 text-[hsl(var(--text-3))] font-mono text-xs">{shortDate(m.scheduledAt)}</td>
                              <td className="px-4 py-3">
                                <Badge className={`border-0 rounded-none uppercase text-[10px] ${/emergency/i.test(m.meetingType) ? 'bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))]' : 'bg-sunken text-[hsl(var(--text-2))]'}`}>{m.meetingType}</Badge>
                              </td>
                              <td className="px-4 py-3 font-bold text-[hsl(var(--text-1))]">{items.length}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 flex-wrap">
                                  {c.approved > 0 && <Badge className="bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))] border-0 rounded-none uppercase text-[10px]">{c.approved} approved</Badge>}
                                  {c.conditional > 0 && <Badge className="bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))] border-0 rounded-none uppercase text-[10px]">{c.conditional} conditional</Badge>}
                                  {c.rejected > 0 && <Badge className="bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))] border-0 rounded-none uppercase text-[10px]">{c.rejected} rejected</Badge>}
                                  {c.deferred > 0 && <Badge className="bg-sunken text-[hsl(var(--text-2))] border-0 rounded-none uppercase text-[10px]">{c.deferred} deferred</Badge>}
                                  {c.pending > 0 && <Badge className="bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-0 rounded-none uppercase text-[10px]">{c.pending} pending</Badge>}
                                  {items.length === 0 && <span className="text-xs text-[hsl(var(--text-4))]">—</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`font-semibold ${qMet ? 'text-[hsl(var(--s-ok-tx))]' : 'text-[hsl(var(--s-er-tx))]'}`}>{qMet ? '✓ Met' : '✗ Not Met'}</span>
                                <span className="text-[10px] text-[hsl(var(--text-4))] ml-1">({m.attendees.length}/{m.quorumRequired})</span>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="border-b border-[hsl(var(--border))] bg-raised">
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-4))] mb-1">Attendees</p>
                                      <p className="text-sm text-[hsl(var(--text-2))]">{m.attendees.length > 0 ? m.attendees.join(', ') : 'None recorded'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--text-4))] mb-1">Minutes</p>
                                      {m.minutes ? (
                                        <p className="text-sm text-[hsl(var(--text-2))] whitespace-pre-wrap">{m.minutes}</p>
                                      ) : (
                                        <p className="text-sm text-[hsl(var(--text-4))] italic">No minutes recorded for this meeting.</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Committee ── */}
          <TabsContent value="committee" className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">Committee Members ({members.length})</h3>
                <p className="text-xs text-[hsl(var(--text-4))]">Members are drawn from the Organization directory. Roles &amp; permissions are governed in Access Control.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => navigate('/access-control')}>Manage in IAM &amp; Roles</Button>
                <Button size="sm" style={{ borderRadius: 0 }} onClick={() => setShowAddMember(true)}>Add Member</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map(m => (
                <div key={m.id} className={`p-5 flex items-start gap-4 border rounded-none group relative ${m.chair ? 'bg-[hsl(var(--brand-subtle))] border-[hsl(var(--brand)/40)]' : 'bg-surface border-[hsl(var(--border))]'}`}>
                  <div className="w-12 h-12 flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]">
                    {m.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-[hsl(var(--text-1))]">{m.name}</p>
                      {m.chair && <Star size={14} weight="fill" className="text-[hsl(var(--s-wn-tx))]" />}
                    </div>
                    <p className="text-xs text-[hsl(var(--text-3))] mb-0.5">{m.role}</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase tracking-wider">{m.department}</p>
                    <div className="flex items-center gap-2 mt-3">
                      {m.chair && <Badge className="border-0 rounded-none uppercase text-[9px]" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>CHAIR</Badge>}
                      <Badge className="border-0 rounded-none uppercase text-[9px]" style={{ background: m.quorum ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-sunken))', color: m.quorum ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))' }}>
                        {m.quorum ? 'QUORUM MEMBER' : 'NON-QUORUM'}
                      </Badge>
                    </div>
                  </div>
                  {!m.chair && (
                    <button onClick={() => removeMember(m.id, m.name)} title="Remove from committee"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1" style={{ color: 'hsl(var(--s-er-tx))' }}>
                      <Trash size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 text-sm border border-[hsl(var(--border))] bg-raised rounded-none">
              <p className="text-[hsl(var(--text-2))]">
                <strong className="text-[hsl(var(--text-1))]">Quorum requirement:</strong> {quorum.required} members required, {quorum.present} present ({quorum.met ? <span className="text-[hsl(var(--s-ok-tx))] font-medium">Currently met</span> : <span className="text-[hsl(var(--s-er-tx))] font-medium">Not met</span>}).
                Per SR 11-7 guidance, model approval decisions require documented quorum and dissenting votes must be recorded.
              </p>
            </div>
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="rounded-none bg-surface border-[hsl(var(--border))]">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-4 text-[hsl(var(--text-1))]">Approval Outcomes (Recorded Decisions)</p>
                  {approvalStats.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-sm text-[hsl(var(--text-4))]">No decisions recorded yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={approvalStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {approvalStats.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-none bg-surface border-[hsl(var(--border))]">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold mb-4 text-[hsl(var(--text-1))]">Agenda Items Per Meeting</p>
                  {itemsPerMeeting.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-sm text-[hsl(var(--text-4))]">No meetings recorded yet.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={itemsPerMeeting} barCategoryGap={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                        <XAxis dataKey="id" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: ct.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 0, color: ct.tooltipText, fontSize: 12 }} />
                        <Bar dataKey="items" name="Agenda Items" fill="hsl(var(--brand))" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
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
                { section: 'SR 11-7 §I', title: 'Model Definition and Scope', summary: 'Defines what constitutes a model under supervisory guidance — quantitative methods, assumptions, and systems that produce outputs used in decision-making.', mrcRole: 'Approve model classifications and scope decisions' },
                { section: 'SR 11-7 §II', title: 'Model Risk', summary: 'Establishes that model risk arises from models that produce inaccurate outputs and from inappropriate use of model outputs. Banks must apply model risk management commensurate with model risk.', mrcRole: 'Review and approve model risk ratings; oversee material change thresholds' },
                { section: 'SR 11-7 §III', title: 'Model Development, Implementation, and Use', summary: 'Addresses the complete model development lifecycle including data quality, documentation, testing, and implementation controls.', mrcRole: 'Approve initial deployment; review quarterly for material changes' },
                { section: 'SR 11-7 §IV', title: 'Model Validation', summary: 'Requires effective challenge — robust validation activities including conceptual soundness review, ongoing monitoring, outcomes analysis, and back-testing.', mrcRole: 'Receive and evaluate validation findings; require remediation with timelines' },
                { section: 'SR 11-7 §V', title: 'Governance, Policies, and Controls', summary: 'Describes requirements for strong governance including board-level oversight, policies defining model risk tolerance, and comprehensive model inventory.', mrcRole: 'Primary owner of model governance policy; quorum requirements; documentation of votes' },
                { section: 'SR 11-7 §VI', title: 'Examiner Guidance', summary: 'Provides examination procedures for assessing model risk management programs, including review of governance, validation, and model inventory.', mrcRole: 'Produce documentation for examination; respond to examiner findings within MRC scope' },
              ].map((item, i) => (
                <Card key={i} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 font-bold" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))' }}>{item.section}</span>
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{item.title}</p>
                      </div>
                      <p className="text-xs mb-2" style={{ color: 'hsl(var(--text-3))' }}>{item.summary}</p>
                      <div className="p-2 text-xs" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}>
                        <span className="font-semibold" style={{ color: 'hsl(var(--text-3))' }}>MRC Responsibility: </span>
                        <span style={{ color: 'hsl(var(--text-4))' }}>{item.mrcRole}</span>
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
              Cast Vote — {voteDialog?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="p-4 text-sm bg-raised border border-[hsl(var(--border))] rounded-none">
              <p className="text-[hsl(var(--text-1))] font-bold mb-1">{voteDialog?.reviewType}</p>
              <p className="text-[hsl(var(--text-3))]">
                {voteDialog?.modelName ? <>Model: {voteDialog.modelName} · </> : null}
                Voting as <strong className="text-[hsl(var(--text-2))]">{voterName}</strong>
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(['approve', 'reject', 'abstain'] as const).map(v => (
                <button key={v} onClick={() => setChoice(v)}
                  className={`p-3 text-sm font-semibold uppercase tracking-wide text-center border-2 rounded-none transition-all ${
                    choice === v
                      ? v === 'approve'
                        ? 'border-[hsl(var(--s-ok-br))] bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))]'
                        : v === 'reject'
                          ? 'border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))]'
                          : 'border-[hsl(var(--s-wn-br))] bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))]'
                      : 'border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-3))] hover:border-[hsl(var(--text-4))]'
                  }`}>
                  {v === 'approve' ? '✓ Approve' : v === 'reject' ? '✗ Reject' : '— Abstain'}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[hsl(var(--text-2))] uppercase tracking-wide">Rationale <span className="text-[hsl(var(--s-er-tx))]">*</span></label>
              <Textarea placeholder="Your documented rationale for this vote (required for audit trail)…" value={rationale} onChange={e => setRationale(e.target.value)} className="text-sm bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none focus-visible:ring-[hsl(var(--brand))] min-h-[80px]" />
            </div>
          </div>
          <DialogFooter className="border-t border-[hsl(var(--border))] pt-5">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised" onClick={() => setVoteDialog(null)}>Cancel</Button>
            <Button disabled={vote.isPending} className={`rounded-none text-[hsl(var(--bg-surface))] ${
              choice === 'approve' ? 'bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))]' :
              choice === 'reject' ? 'bg-[hsl(var(--s-er-tx))] hover:bg-[hsl(var(--s-er-tx))]' :
              'bg-[hsl(var(--s-wn-tx))] hover:bg-[hsl(var(--s-wn-tx))]'
            }`} onClick={submitVote}>
              <Gavel size={16} />{vote.isPending ? 'Submitting…' : 'Submit Vote'}
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
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Title *</label>
              <input type="text" value={mtgTitle} onChange={e => setMtgTitle(e.target.value)} placeholder="e.g. Q3 2026 Quarterly Review" className="w-full h-10 rounded-none border border-[hsl(var(--border))] bg-raised px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] text-[hsl(var(--text-1))]" />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Meeting Type</label>
                <Select value={mtgType} onValueChange={setMtgType}>
                  <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Quarterly Review', 'Emergency Session', 'Model Approval', 'Annual Review', 'Ad Hoc'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Quorum Required</label>
                <input type="number" min={1} value={mtgQuorum} onChange={e => setMtgQuorum(Math.max(1, Number(e.target.value) || 1))} className="w-full h-10 rounded-none border border-[hsl(var(--border))] bg-raised px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] text-[hsl(var(--text-1))]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Attendees (comma-separated)</label>
              <Textarea value={mtgAttendees} onChange={e => setMtgAttendees(e.target.value)} className="text-sm bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none min-h-[60px]" />
            </div>
            <div className="p-4 text-sm bg-[hsl(var(--s-wn-tx))] border-l-4 border-[hsl(var(--s-wn-br))]">
              <p className="font-bold mb-1 text-[hsl(var(--s-wn-tx))] uppercase tracking-wide">Quorum requirement</p>
              <p className="text-[hsl(var(--text-2))]">This meeting requires {mtgQuorum} attendee{mtgQuorum === 1 ? '' : 's'} present for binding votes per SR 11-7 §IV.C.</p>
            </div>
          </div>
          <DialogFooter className="border-t border-[hsl(var(--border))] pt-5">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button disabled={addMeeting.isPending} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={scheduleMeeting}>
              <Calendar size={16} />{addMeeting.isPending ? 'Scheduling…' : 'Schedule Meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Agenda Item Dialog */}
      <Dialog open={agendaOpen} onOpenChange={setAgendaOpen}>
        <DialogContent className="rounded-none max-w-[600px] bg-surface border-[hsl(var(--border))] shadow-2xl">
          <DialogHeader className="border-b border-[hsl(var(--border))] pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl text-[hsl(var(--text-1))]">
              <Plus size={20} className="text-[hsl(var(--brand))]" />Add Model Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Title *</label>
              <input type="text" value={agTitle} onChange={e => setAgTitle(e.target.value)} placeholder="e.g. Credit Risk Scorer — periodic review" className="w-full h-10 rounded-none border border-[hsl(var(--border))] bg-raised px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] text-[hsl(var(--text-1))]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Model</label>
                <Select value={agModelId || undefined} onValueChange={setAgModelId}>
                  <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue placeholder="Link a registry model…" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Review Type</label>
                <Select value={agReviewType} onValueChange={setAgReviewType}>
                  <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Initial Approval', 'Periodic Review', 'Material Change', 'Emergency Review', 'Retirement'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Presenter</label>
                <input type="text" value={agPresenter} onChange={e => setAgPresenter(e.target.value)} placeholder="e.g. Maria Santos" className="w-full h-10 rounded-none border border-[hsl(var(--border))] bg-raised px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] text-[hsl(var(--text-1))]" />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Meeting</label>
                <Select value={agMeetingId || undefined} onValueChange={setAgMeetingId}>
                  <SelectTrigger className="w-full h-10" style={{ borderRadius: 0 }}><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {meetings.map(m => <SelectItem key={m.id} value={m.id}>{m.title} · {shortDate(m.scheduledAt)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block uppercase tracking-wide text-[hsl(var(--text-2))]">Summary</label>
              <Textarea value={agSummary} onChange={e => setAgSummary(e.target.value)} placeholder="Brief context for the committee…" className="text-sm bg-raised border-[hsl(var(--border))] text-[hsl(var(--text-1))] rounded-none min-h-[70px]" />
            </div>
          </div>
          <DialogFooter className="border-t border-[hsl(var(--border))] pt-5">
            <Button variant="outline" className="rounded-none border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:text-[hsl(var(--text-1))] hover:bg-raised" onClick={() => setAgendaOpen(false)}>Cancel</Button>
            <Button disabled={addAgenda.isPending} className="rounded-none bg-[hsl(var(--brand))] hover:bg-[hsl(var(--brand-hover))]" onClick={addAgendaItem}>
              <Plus size={16} />{addAgenda.isPending ? 'Adding…' : 'Add to Agenda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Committee Member — from the Organization directory */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 460 }}>
          <DialogHeader><DialogTitle>Add Committee Member</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[11px] px-2 py-1.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' }}>
              Members are selected from the Organization directory. Assign the committee role here; account permissions remain governed in <button className="underline" onClick={() => navigate('/access-control')}>Access Control (IAM &amp; Roles)</button>.
            </p>
            <div>
              <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Organization user *</label>
              <Select value={newMemberId || undefined} onValueChange={setNewMemberId}>
                <SelectTrigger className="mt-1 w-full h-9" style={{ borderRadius: 0 }}><SelectValue placeholder="Select a user…" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {availableUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name} — {u.role} · {u.department}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Committee role</label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger className="mt-1 w-full h-9" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {['Committee Member', 'Model Risk Manager', 'Risk Analyst', 'Internal Auditor', 'Voting Member', 'Observer', 'Secretary'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newMemberQuorum} onChange={e => setNewMemberQuorum(e.target.checked)} className="h-4 w-4" style={{ borderRadius: 0 }} />
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Counts toward quorum</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button size="sm" disabled={!newMemberId} onClick={addMember}>Add Member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
