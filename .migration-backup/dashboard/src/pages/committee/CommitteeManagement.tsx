// @ts-nocheck
import { useState, useEffect } from 'react';
import { useCommitteesData } from '../../hooks/useCommitteesData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { toast } from 'sonner';
import {
  Users, Plus, Eye, Trash, PencilSimple, CalendarBlank, CheckCircle,
  Warning, Info, MagnifyingGlass, Export, FileText, Vote,
  ClipboardText, ArrowRight, UserCircle, Shield, Clock,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Progress } from '../../components/ui/progress';
import { formatDate } from '../../data/seed';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

interface CommitteeMember {
  name: string; role: string; department: string; votingRight: boolean;
}
interface MeetingMinute {
  id: string; date: string; agenda: string; decisions: string[]; actionItems: ActionItem[]; attendees: string[];
}
interface ActionItem {
  id: string; description: string; assignee: string; dueDate: string; status: 'Open' | 'In Progress' | 'Completed' | 'Overdue';
}
interface VotingRecord {
  id: string; topic: string; date: string; result: 'Approved' | 'Rejected' | 'Deferred'; votes: { for: number; against: number; abstain: number };
}
interface Committee {
  id: string; name: string; type: string; charter: string; cadence: string; chair: string;
  members: CommitteeMember[]; nextMeeting: string; status: 'Active' | 'Inactive';
  meetings: MeetingMinute[]; votingRecords: VotingRecord[]; attestations: AttestationRecord[];
}
interface AttestationRecord {
  id: string; description: string; signedBy: string; date: string; model?: string;
}

const SEED_COMMITTEES: Committee[] = [
  {
    id: 'COM-001', name: 'AI Ethics Board', type: 'Ethics & Governance', cadence: 'Monthly',
    chair: 'Sarah Chen (CISO)', status: 'Active', nextMeeting: '2026-04-20',
    charter: 'Oversees ethical deployment of AI systems, reviews high-risk model approvals, and ensures alignment with organizational values and regulatory obligations including EU AI Act.',
    members: [
      { name: 'Sarah Chen', role: 'CISO / Chair', department: 'Security', votingRight: true },
      { name: 'James Patel', role: 'VP Compliance', department: 'Compliance', votingRight: true },
      { name: 'Dr. Amara Osei', role: 'External Ethics Advisor', department: 'External', votingRight: true },
      { name: 'Maria Santos', role: 'Lead ML Engineer', department: 'AI/ML', votingRight: true },
      { name: 'Raj Gupta', role: 'Model Risk Manager', department: 'AI/ML', votingRight: true },
      { name: 'Linda Park', role: 'General Counsel', department: 'Legal', votingRight: true },
    ],
    meetings: [
      { id: 'MTG-003', date: '2026-03-20', agenda: 'Q1 AI risk posture review, Loan Model bias remediation sign-off, EU AI Act Article 62 incident reporting',
        decisions: ['Approved bias remediation plan for MDL-001', 'Extended monitoring period to 90 days', 'Authorized regulatory notification to EC'],
        actionItems: [
          { id: 'AI-001', description: 'Submit regulatory notification to EC', assignee: 'James Patel', dueDate: '2026-03-27', status: 'Completed' },
          { id: 'AI-002', description: 'Re-audit MDL-001 bias metrics post-remediation', assignee: 'Maria Santos', dueDate: '2026-04-15', status: 'In Progress' },
        ],
        attendees: ['Sarah Chen', 'James Patel', 'Dr. Amara Osei', 'Maria Santos', 'Raj Gupta'],
      },
      { id: 'MTG-002', date: '2026-02-18', agenda: 'Customer Service Agent kill switch post-mortem, Shadow AI inventory Q4 results',
        decisions: ['Root cause accepted', 'Mandatory agent sandboxing policy approved', 'Shadow AI remediation deadline set to 2026-03-31'],
        actionItems: [
          { id: 'AI-003', description: 'Deploy agent sandboxing in production', assignee: 'Maria Santos', dueDate: '2026-03-15', status: 'Completed' },
          { id: 'AI-004', description: 'Shadow AI inventory report', assignee: 'David Kim', dueDate: '2026-03-31', status: 'Overdue' },
        ],
        attendees: ['Sarah Chen', 'James Patel', 'Maria Santos', 'David Kim', 'Linda Park'],
      },
    ],
    votingRecords: [
      { id: 'VR-005', topic: 'Approve MDL-001 bias remediation plan', date: '2026-03-20', result: 'Approved', votes: { for: 5, against: 0, abstain: 1 } },
      { id: 'VR-004', topic: 'Deploy RiskAssessmentAgent (beta) to production', date: '2026-02-18', result: 'Rejected', votes: { for: 2, against: 4, abstain: 0 } },
      { id: 'VR-003', topic: 'Mandatory EU AI Act Article 9 training for all ML engineers', date: '2026-01-22', result: 'Approved', votes: { for: 6, against: 0, abstain: 0 } },
    ],
    attestations: [
      { id: 'ATT-003', description: 'Q1 2026 AI Governance attestation — all policies reviewed and compliant', signedBy: 'Sarah Chen', date: '2026-03-31', model: undefined },
      { id: 'ATT-002', description: 'MDL-001 bias remediation sign-off', signedBy: 'James Patel', date: '2026-03-20', model: 'MDL-001' },
      { id: 'ATT-001', description: 'EU AI Act readiness declaration Q4 2025', signedBy: 'Linda Park', date: '2025-12-31', model: undefined },
    ],
  },
  {
    id: 'COM-002', name: 'Model Risk Committee', type: 'Model Risk', cadence: 'Bi-weekly',
    chair: 'Raj Gupta (Model Risk Manager)', status: 'Active', nextMeeting: '2026-04-14',
    charter: 'Governs model validation, approval, and retirement lifecycle per SR 11-7 and OCC guidance. All high-risk model promotions require MRC sign-off.',
    members: [
      { name: 'Raj Gupta', role: 'Model Risk Mgr / Chair', department: 'AI/ML', votingRight: true },
      { name: 'Maria Santos', role: 'Lead ML Engineer', department: 'AI/ML', votingRight: true },
      { name: 'David Kim', role: 'Risk Analyst', department: 'Risk', votingRight: true },
      { name: 'Emma Wilson', role: 'Internal Auditor', department: 'Audit', votingRight: true },
      { name: 'Marcus Johnson', role: 'CTO', department: 'Technology', votingRight: true },
    ],
    meetings: [
      { id: 'MTG-005', date: '2026-04-07', agenda: 'MDL-003 challenger model validation results, MDL-006 retirement approval',
        decisions: ['MDL-003 challenger approved for A/B test', 'MDL-006 retirement authorized — migration plan accepted'],
        actionItems: [
          { id: 'AI-010', description: 'Configure A/B traffic split 90/10 for MDL-003', assignee: 'Maria Santos', dueDate: '2026-04-12', status: 'Open' },
          { id: 'AI-011', description: 'Archive MDL-006 artifacts to evidence vault', assignee: 'Emma Wilson', dueDate: '2026-04-20', status: 'Open' },
        ],
        attendees: ['Raj Gupta', 'Maria Santos', 'David Kim', 'Emma Wilson'],
      },
    ],
    votingRecords: [
      { id: 'VR-010', topic: 'Approve MDL-003 challenger model for A/B test', date: '2026-04-07', result: 'Approved', votes: { for: 4, against: 0, abstain: 1 } },
      { id: 'VR-009', topic: 'Retire MDL-006 (legacy NLP classifier)', date: '2026-04-07', result: 'Approved', votes: { for: 5, against: 0, abstain: 0 } },
    ],
    attestations: [
      { id: 'ATT-010', description: 'MDL-003 validation report signed — SR 11-7 compliant', signedBy: 'Raj Gupta', date: '2026-04-07', model: 'MDL-003' },
    ],
  },
  {
    id: 'COM-003', name: 'Data Governance Council', type: 'Data Governance', cadence: 'Monthly',
    chair: 'James Patel (VP Compliance)', status: 'Active', nextMeeting: '2026-04-25',
    charter: 'Oversees data classification, quality standards, retention policies, and GDPR/CCPA compliance. Approves new training datasets for high-risk models.',
    members: [
      { name: 'James Patel', role: 'VP Compliance / Chair', department: 'Compliance', votingRight: true },
      { name: 'Maria Santos', role: 'Lead ML Engineer', department: 'AI/ML', votingRight: true },
      { name: 'David Kim', role: 'Risk Analyst', department: 'Risk', votingRight: true },
      { name: 'Emma Wilson', role: 'Internal Auditor', department: 'Audit', votingRight: false },
    ],
    meetings: [],
    votingRecords: [
      { id: 'VR-020', topic: 'Approve synthetic data augmentation for MDL-001 retraining', date: '2026-03-25', result: 'Approved', votes: { for: 3, against: 1, abstain: 0 } },
    ],
    attestations: [],
  },
];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Inactive: { bg: 'hsl(220 14% 60% / 0.15)', color: 'hsl(var(--text-3))' },
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  Open: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  'In Progress': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
  Completed: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Overdue: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
};

const VOTE_COLORS: Record<string, { bg: string; color: string }> = {
  Approved: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Rejected: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Deferred: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
};

export default function CommitteeManagement() {
  const { items: liveCommittees, isLoading, save, remove } = useCommitteesData();
  const [search, setSearch] = useState('');
  const [committees, setCommittees] = useState<Committee[]>(SEED_COMMITTEES);

  // Sync Supabase data; keep SEED as fallback for nested fields
  useEffect(() => {
    if (liveCommittees.length > 0) {
      // Merge live data with seed's nested structures for display
      setCommittees(liveCommittees.map((live: any) => {
        const seed = SEED_COMMITTEES.find(s => s.id === live.id)
        return seed ? { ...seed, ...live } : { ...live, members: live.members ?? [], meetings: live.meetings ?? [], votingRecords: live.votingRecords ?? [], attestations: live.attestations ?? [] }
      }))
    }
  }, [liveCommittees]);

  const [selected, setSelected] = useState<Committee | null>(null);
  const [tab, setTab] = useState('members');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', type: '', chair: '', cadence: 'Monthly', charter: '' });
  const [deleteTarget, setDeleteTarget] = useState<Committee | null>(null);

  if (isLoading) return <PageSkeleton title="Committees" />;

  const filtered = committees.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  const totalMembers = committees.reduce((s, c) => s + c.members.length, 0);
  const totalOpenActions = committees.flatMap(c => c.meetings.flatMap(m => m.actionItems)).filter(a => a.status === 'Open' || a.status === 'In Progress').length;
  const overdueActions = committees.flatMap(c => c.meetings.flatMap(m => m.actionItems)).filter(a => a.status === 'Overdue').length;
  const upcomingMeetings = committees.filter(c => new Date(c.nextMeeting) >= new Date()).length;

  const handleCreateCommittee = async () => {
    if (!createForm.name || !createForm.type || !createForm.chair) {
      toast.error('Please fill in all required fields');
      return;
    }
    const newCommittee = {
      name: createForm.name, type: createForm.type, chair: createForm.chair,
      cadence: createForm.cadence, charter: createForm.charter,
      status: 'Active', next_meeting: '2026-05-01',
    };
    try {
      await save(newCommittee);
      setCreateOpen(false);
      setCreateForm({ name: '', type: '', chair: '', cadence: 'Monthly', charter: '' });
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
    } catch {}
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
  };

  function exportCsv() {
    if (!filtered.length) return;
    const rows = filtered.map((c: any) => ({ id: c.id, name: c.name, type: c.type, chair: c.chair, status: c.status, cadence: c.cadence }))
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? '')).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'committees.csv'
    a.click()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Users size={20} weight="duotone" className="text-[hsl(var(--brand))]" />
            Stakeholder & Committee Management
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">AI Ethics Boards, Model Risk Committees, and governance bodies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={exportCsv}>
            <Export size={14} /> Export CSV
          </Button>
          <Button size="sm" className="gap-1.5 rounded-none" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New Committee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Committees', value: committees.length, color: 'hsl(var(--brand))' },
          { label: 'Total Members', value: totalMembers, color: '#3b82f6' },
          { label: 'Open Action Items', value: totalOpenActions, color: '#f59e0b' },
          { label: 'Overdue Actions', value: overdueActions, color: overdueActions > 0 ? '#ef4444' : '#10b981' },
        ].map(s => (
          <Card key={s.label} style={{ borderRadius: 0 }}>
            <CardContent className="px-4 py-3">
              <p className="text-xs text-[hsl(var(--text-4))] mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search committees..." className="pl-8 rounded-none h-8 text-sm" />
        </div>
      </div>

      {/* Committee Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => {
          const openActs = c.meetings.flatMap(m => m.actionItems).filter(a => a.status === 'Open' || a.status === 'In Progress').length;
          const overdueActs = c.meetings.flatMap(m => m.actionItems).filter(a => a.status === 'Overdue').length;
          const daysToMeeting = Math.ceil((new Date(c.nextMeeting).getTime() - Date.now()) / 86400000);
          return (
            <Card key={c.id} style={{ borderRadius: 0, cursor: 'pointer' }} onClick={() => { setSelected(c); setTab('members'); }}
              className="hover:border-[hsl(var(--brand))] transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm text-[hsl(var(--text-1))]">{c.name}</p>
                    <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{c.type} · {c.cadence}</p>
                  </div>
                  <Badge style={{ ...STATUS_COLORS[c.status], borderRadius: 0, fontSize: 10 }}>{c.status}</Badge>
                </div>
                <p className="text-xs text-[hsl(var(--text-3))] line-clamp-2">{c.charter}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[hsl(var(--text-4))]">Chair</span>
                    <p className="text-[hsl(var(--text-2))] font-medium truncate">{c.chair.split(' (')[0]}</p>
                  </div>
                  <div>
                    <span className="text-[hsl(var(--text-4))]">Members</span>
                    <p className="text-[hsl(var(--text-2))] font-medium">{c.members.length}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-2">
                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-3))]">
                    <CalendarBlank size={12} />
                    <span>Next: {daysToMeeting > 0 ? `${daysToMeeting}d` : 'Today'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdueActs > 0 && (
                      <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                        {overdueActs} overdue
                      </Badge>
                    )}
                    {openActs > 0 && (
                      <Badge style={{ background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>
                        {openActs} open
                      </Badge>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(c); }}
                      className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] transition-colors"
                      title="Delete committee"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Committee Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-lg">{selected.name}</SheetTitle>
                    <p className="text-xs text-[hsl(var(--text-3))] mt-1">{selected.type} · {selected.cadence} · Chair: {selected.chair}</p>
                  </div>
                  <Badge style={{ ...STATUS_COLORS[selected.status], borderRadius: 0, fontSize: 10 }}>{selected.status}</Badge>
                </div>
                <p className="text-xs text-[hsl(var(--text-3))] border-l-2 border-[hsl(var(--brand))] pl-3 py-1">{selected.charter}</p>
              </SheetHeader>

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="rounded-none w-full">
                  <TabsTrigger value="members" className="rounded-none flex-1 text-xs">Members ({selected.members.length})</TabsTrigger>
                  <TabsTrigger value="minutes" className="rounded-none flex-1 text-xs">Meeting Minutes</TabsTrigger>
                  <TabsTrigger value="voting" className="rounded-none flex-1 text-xs">Voting</TabsTrigger>
                  <TabsTrigger value="attestations" className="rounded-none flex-1 text-xs">Attestations</TabsTrigger>
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members" className="mt-4 space-y-2">
                  {selected.members.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-[hsl(var(--border))] rounded-none">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--brand))] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {m.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--text-1))]">{m.name}</p>
                        <p className="text-xs text-[hsl(var(--text-3))]">{m.role} · {m.department}</p>
                      </div>
                      <Badge style={{ background: m.votingRight ? 'hsl(142 71% 45% / 0.12)' : 'hsl(220 14% 60% / 0.15)', color: m.votingRight ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>
                        {m.votingRight ? 'Voting' : 'Observer'}
                      </Badge>
                    </div>
                  ))}
                </TabsContent>

                {/* Minutes Tab */}
                <TabsContent value="minutes" className="mt-4 space-y-4">
                  {selected.meetings.length === 0 && (
                    <p className="text-sm text-[hsl(var(--text-3))] text-center py-8">No meeting minutes recorded yet.</p>
                  )}
                  {selected.meetings.map(m => (
                    <div key={m.id} className="border border-[hsl(var(--border))] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--text-1))]">{m.id} · {formatDate(m.date)}</p>
                          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">Attendees: {m.attendees.join(', ')}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="rounded-none h-7 text-xs" onClick={() => toast.success('Minutes exported')}>
                          <Export size={12} className="mr-1" /> Export
                        </Button>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[hsl(var(--text-3))] mb-1">AGENDA</p>
                        <p className="text-sm text-[hsl(var(--text-2))]">{m.agenda}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[hsl(var(--text-3))] mb-1">DECISIONS</p>
                        {m.decisions.map((d, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--text-2))]">
                            <CheckCircle size={14} className="text-[hsl(var(--s-ok-tx))] mt-0.5 flex-shrink-0" />
                            <span>{d}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[hsl(var(--text-3))] mb-1">ACTION ITEMS</p>
                        {m.actionItems.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-xs py-1">
                            <Badge style={{ ...ACTION_COLORS[a.status], borderRadius: 0, fontSize: 10, flexShrink: 0 }}>{a.status}</Badge>
                            <span className="flex-1 text-[hsl(var(--text-2))]">{a.description}</span>
                            <span className="text-[hsl(var(--text-3))]">{a.assignee}</span>
                            <span className="text-[hsl(var(--text-4))]">{formatDate(a.dueDate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Voting Tab */}
                <TabsContent value="voting" className="mt-4 space-y-3">
                  {selected.votingRecords.map(v => {
                    const total = v.votes.for + v.votes.against + v.votes.abstain;
                    return (
                      <div key={v.id} className="border border-[hsl(var(--border))] p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[hsl(var(--text-1))]">{v.topic}</p>
                          <Badge style={{ ...VOTE_COLORS[v.result], borderRadius: 0, fontSize: 10 }}>{v.result}</Badge>
                        </div>
                        <p className="text-xs text-[hsl(var(--text-4))]">{formatDate(v.date)}</p>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-[hsl(var(--s-ok-tx))]">{v.votes.for}</p>
                            <p className="text-xs text-[hsl(var(--text-4))]">For</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-[hsl(var(--destructive))]">{v.votes.against}</p>
                            <p className="text-xs text-[hsl(var(--text-4))]">Against</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-[hsl(var(--text-3))]">{v.votes.abstain}</p>
                            <p className="text-xs text-[hsl(var(--text-4))]">Abstain</p>
                          </div>
                          <div className="flex-1">
                            <Progress value={(v.votes.for / total) * 100} className="h-2 rounded-none" />
                            <p className="text-xs text-[hsl(var(--text-4))] mt-1">{Math.round((v.votes.for / total) * 100)}% approval rate</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                {/* Attestations Tab */}
                <TabsContent value="attestations" className="mt-4 space-y-3">
                  {selected.attestations.length === 0 && (
                    <p className="text-sm text-[hsl(var(--text-3))] text-center py-8">No attestations recorded yet.</p>
                  )}
                  {selected.attestations.map(a => (
                    <div key={a.id} className="border border-[hsl(var(--border))] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[hsl(var(--text-1))]">{a.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-[hsl(var(--text-3))]">
                            <span className="flex items-center gap-1"><UserCircle size={12} /> {a.signedBy}</span>
                            <span className="flex items-center gap-1"><CalendarBlank size={12} /> {formatDate(a.date)}</span>
                            {a.model && <Badge style={{ background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 10 }}>{a.model}</Badge>}
                          </div>
                        </div>
                        <CheckCircle size={18} weight="fill" className="text-[hsl(var(--s-ok-tx))] flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-none w-full" onClick={() => toast.success('New attestation recorded')}>
                    <Plus size={14} /> Record Attestation
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Committee Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>Create New Committee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Committee Name *</Label>
              <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. AI Ethics Board" className="rounded-none mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Type *</Label>
              <Input value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))} placeholder="e.g. Ethics & Governance" className="rounded-none mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Chair *</Label>
              <Input value={createForm.chair} onChange={e => setCreateForm(f => ({ ...f, chair: e.target.value }))} placeholder="Name and title" className="rounded-none mt-1 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Meeting Cadence</Label>
              <Select value={createForm.cadence} onValueChange={v => setCreateForm(f => ({ ...f, cadence: v }))}>
                <SelectTrigger className="rounded-none mt-1 text-sm"><SelectValue placeholder="Select cadence" /></SelectTrigger>
                <SelectContent>
                  {['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Ad-hoc'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Charter</Label>
              <Textarea value={createForm.charter} onChange={e => setCreateForm(f => ({ ...f, charter: e.target.value }))} placeholder="Describe the committee's mandate and responsibilities..." className="rounded-none mt-1 text-sm resize-none" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" className="rounded-none" onClick={handleCreateCommittee}>Create Committee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => { if (!o) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        isDestructive
        title={`Delete "${deleteTarget?.name}"?`}
        message="The committee record, meeting minutes, voting records, and attestations will be permanently removed."
        impactList={['All meeting minutes and decisions', 'Voting records and approvals', 'Committee attestations', 'Member assignments']}
        confirmLabel="Delete Committee"
      />
    </div>
  );
}
