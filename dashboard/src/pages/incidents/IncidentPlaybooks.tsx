// SPDX-License-Identifier: Apache-2.0
// Incident Response Playbooks — real org-scoped backend (incident_playbooks /
// playbook_runs via useRiskIncidents). No fabricated incidents: the active
// banner renders only for persisted runs with status 'active'.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Siren, Play, CheckCircle, Clock, ArrowRight, MagnifyingGlass, Export,
  ShieldWarning, Brain, Lock, ClipboardText, FlagCheckered,
  Plus, PencilSimple, Trash, X,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { formatDate } from '../../data/seed';
import { usePlaybooks, usePlaybookRuns, useIncidents, useTabletops } from '../../hooks/useRiskIncidents';
import type { PlaybookRecord, PlaybookRunRecord } from '../../services/incidentResponseService';
import { useModelsData } from '@/hooks/useModelsData';
import { InterlinkChip } from '@/components/ui/InterlinkChip';
import { exportJson } from '@/lib/exportUtils';
import PageSkeleton from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';

// Phase accent colors cycle by position — phase names are data, not code.
const PHASE_PALETTE = [
  'hsl(var(--brand))',
  'hsl(var(--s-wn-tx))',
  'hsl(var(--s-er-tx))',
  'hsl(var(--s-ok-tx))',
  'hsl(var(--tag-purple))',
];
const phaseColor = (i: number) => PHASE_PALETTE[i % PHASE_PALETTE.length];

function categoryIcon(category?: string) {
  const c = (category ?? '').toLowerCase();
  if (c.includes('model')) return Brain;
  if (c.includes('bias') || c.includes('fairness')) return ShieldWarning;
  if (c.includes('security') || c.includes('breach') || c.includes('data')) return Lock;
  return Siren;
}

const stepKey = (phaseName: string, idx: number) => `${phaseName}:${idx}`;

const PB_STATUS_OPTIONS = ['active', 'draft', 'archived'];

// Editor state — phases keep steps as text lines ("step text", optionally
// suffixed with " @Role"); escalation tiers are renumbered on save.
interface PhaseForm { name: string; slaMinutes: string; stepsText: string }
interface EscForm { role: string; channel: string }
interface PbForm {
  playbookRef: string;
  name: string;
  category: string;
  description: string;
  status: string;
  phases: PhaseForm[];
  escalation: EscForm[];
}

const EMPTY_PB_FORM: PbForm = {
  playbookRef: '', name: '', category: '', description: '', status: 'draft',
  phases: [], escalation: [],
};

const stepToLine = (s: { text: string; role?: string }) => (s.role ? `${s.text} @${s.role}` : s.text);
const lineToStep = (line: string): { text: string; role?: string } => {
  const at = line.lastIndexOf(' @');
  return at > 0
    ? { text: line.slice(0, at).trim(), role: line.slice(at + 2).trim() || undefined }
    : { text: line.trim() };
};

function playbookToForm(pb: PlaybookRecord): PbForm {
  return {
    playbookRef: pb.playbookRef ?? '',
    name: pb.name,
    category: pb.category ?? '',
    description: pb.description ?? '',
    status: pb.status,
    phases: pb.phases.map(p => ({
      name: p.name,
      slaMinutes: p.sla_minutes != null ? String(p.sla_minutes) : '',
      stepsText: p.steps.map(stepToLine).join('\n'),
    })),
    escalation: pb.escalationChain.map(t => ({ role: t.role, channel: t.contact_channel ?? '' })),
  };
}

export default function IncidentPlaybooks() {
  const { items: playbooks, isLoading, error, save: savePlaybook, remove: removePlaybook, isSaving: isSavingPlaybook } = usePlaybooks();
  const { runs, saveRun, isSaving } = usePlaybookRuns();
  const { items: incidents } = useIncidents();
  const { items: tabletops } = useTabletops();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const openParam = searchParams.get('open');

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PlaybookRecord | null>(null);
  const [tab, setTab] = useState('steps');
  const [activateOpen, setActivateOpen] = useState(false);
  const [actPlaybookId, setActPlaybookId] = useState('');
  const [actIncidentId, setActIncidentId] = useState('');
  const [actSeverity, setActSeverity] = useState('');
  const [actCommander, setActCommander] = useState('');

  // Create/edit dialog — editBase carries the fields the dialog doesn't touch
  // (version, regulatory templates, linked models) through the round-trip.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editBase, setEditBase] = useState<PlaybookRecord | null>(null);
  const [pbForm, setPbForm] = useState<PbForm>(EMPTY_PB_FORM);
  const [deleteTarget, setDeleteTarget] = useState<PlaybookRecord | null>(null);

  // Deep link: ?open=<uuid or playbookRef> opens that playbook's detail.
  useEffect(() => {
    if (!openParam || playbooks.length === 0) return;
    const match = playbooks.find(p => p.id === openParam || p.playbookRef === openParam);
    if (match) { setSelected(match); setTab('steps'); }
  }, [openParam, playbooks]);

  const closeDetail = () => {
    setSelected(null);
    if (openParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
  };

  // "Last tested" derives from real completed tabletop exercises linked to
  // the playbook; the manually recorded date is a labelled fallback.
  const lastTestedInfo = (pb: PlaybookRecord): { date: string; source: 'tabletop' | 'recorded' } | null => {
    const completed = tabletops
      .filter(t => t.linkedPlaybookId === pb.id && t.completedAt)
      .map(t => t.completedAt as string)
      .sort();
    if (completed.length) return { date: completed[completed.length - 1], source: 'tabletop' };
    if (pb.lastTestedDate) return { date: pb.lastTestedDate, source: 'recorded' };
    return null;
  };

  const openCreate = () => { setEditBase(null); setPbForm(EMPTY_PB_FORM); setEditorOpen(true); };
  const openEdit = (pb: PlaybookRecord) => { setEditBase(pb); setPbForm(playbookToForm(pb)); setEditorOpen(true); };

  const handleSavePlaybook = async () => {
    if (!pbForm.name.trim()) { toast.error('Playbook name is required'); return; }
    const record: PlaybookRecord = {
      ...(editBase ?? { phases: [], escalationChain: [], regulatoryTemplates: [], status: 'draft', name: '' }),
      id: editBase?.id,
      playbookRef: pbForm.playbookRef.trim() || undefined,
      name: pbForm.name.trim(),
      category: pbForm.category.trim() || undefined,
      description: pbForm.description.trim() || undefined,
      status: pbForm.status,
      phases: pbForm.phases
        .filter(p => p.name.trim())
        .map(p => ({
          name: p.name.trim(),
          sla_minutes: p.slaMinutes.trim() !== '' && !Number.isNaN(Number(p.slaMinutes)) ? Number(p.slaMinutes) : undefined,
          steps: p.stepsText.split('\n').map(s => s.trim()).filter(Boolean).map(lineToStep),
        })),
      escalationChain: pbForm.escalation
        .filter(t => t.role.trim())
        .map((t, i) => ({ tier: i + 1, role: t.role.trim(), contact_channel: t.channel.trim() || undefined })),
    };
    try {
      const saved = await savePlaybook(record); // hook toasts success; throws on failure
      if (selected?.id && selected.id === saved.id) setSelected(saved);
      setEditorOpen(false);
      setEditBase(null);
      setPbForm(EMPTY_PB_FORM);
    } catch { /* hook surfaces the error toast */ }
  };

  const handleDeletePlaybook = async () => {
    if (!deleteTarget?.id) return;
    try {
      await removePlaybook(deleteTarget.id); // hook toasts success; throws on failure
      if (selected?.id === deleteTarget.id) closeDetail();
      setDeleteTarget(null);
    } catch { /* hook surfaces the error toast */ }
  };

  const setPhase = (idx: number, patch: Partial<PhaseForm>) =>
    setPbForm(f => ({ ...f, phases: f.phases.map((p, i) => (i === idx ? { ...p, ...patch } : p)) }));
  const setEsc = (idx: number, patch: Partial<EscForm>) =>
    setPbForm(f => ({ ...f, escalation: f.escalation.map((t, i) => (i === idx ? { ...t, ...patch } : t)) }));

  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';
  const playbookName = (id: string) => playbooks.find(p => p.id === id)?.name ?? 'Unavailable';

  const activeRuns = runs.filter(r => r.status === 'active');
  const activeRunFor = (playbookId?: string): PlaybookRunRecord | undefined =>
    activeRuns.find(r => r.playbookId === playbookId);

  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating');

  const incidentLabel = (id?: string | null) => {
    if (!id) return null;
    const inc = incidents.find(i => i.id === id);
    return inc ? `${inc.incidentId ? `${inc.incidentId} — ` : ''}${inc.title}` : 'Unavailable';
  };

  if (isLoading) return <PageSkeleton title="Incident Response Playbooks" showStats rows={4} />;

  const filtered = playbooks.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // Derived across playbooks: completed linked tabletop exercises first,
  // recorded dates as fallback (per-card labels say which one it is).
  const testedDates = playbooks.map(pb => lastTestedInfo(pb)?.date).filter(Boolean) as string[];
  const lastTested = testedDates.length
    ? formatDate(testedDates.sort().slice(-1)[0])
    : '—';

  const openActivate = (playbookId?: string) => {
    setActPlaybookId(playbookId ?? '');
    setActIncidentId('');
    setActSeverity('');
    setActCommander('');
    setActivateOpen(true);
  };

  const handleActivate = async () => {
    const pb = playbooks.find(p => p.id === actPlaybookId);
    if (!pb?.id) { toast.error('Select a playbook'); return; }
    if (!actSeverity) { toast.error('Select a severity'); return; }
    try {
      await saveRun({
        playbookId: pb.id,
        incidentId: actIncidentId || null,
        status: 'active',
        currentPhase: pb.phases[0]?.name ?? null,
        commander: actCommander.trim() || null,
        severity: actSeverity,
        completedSteps: [],
      });
      // Dialog closes only after the write resolved.
      setActivateOpen(false);
    } catch { /* hook surfaces the error toast */ }
  };

  const toggleStep = async (run: PlaybookRunRecord, phaseName: string, idx: number) => {
    const key = stepKey(phaseName, idx);
    const completedSteps = run.completedSteps.includes(key)
      ? run.completedSteps.filter(s => s !== key)
      : [...run.completedSteps, key];
    try { await saveRun({ ...run, completedSteps }); } catch { /* hook toasts */ }
  };

  const advancePhase = async (run: PlaybookRunRecord, pb: PlaybookRecord) => {
    const names = pb.phases.map(p => p.name);
    const i = names.indexOf(run.currentPhase ?? '');
    const next = names[i + 1];
    if (!next) return;
    try { await saveRun({ ...run, currentPhase: next }); } catch { /* hook toasts */ }
  };

  const completeRun = async (run: PlaybookRunRecord) => {
    try {
      await saveRun({ ...run, status: 'completed', completedAt: new Date().toISOString() });
    } catch { /* hook toasts */ }
  };

  const copyTemplate = (n: { authority: string; regulation?: string; deadline_hours?: number }) => {
    const text = [
      `Authority: ${n.authority}`,
      n.regulation ? `Regulation: ${n.regulation}` : null,
      n.deadline_hours != null ? `Notification deadline: ${n.deadline_hours} hours` : null,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`Notification template for ${n.authority} copied to clipboard`))
      .catch(() => toast.error('Could not copy to clipboard'));
  };

  const handleExport = () => {
    if (!playbooks.length) { toast.error('No playbooks to export'); return; }
    exportJson(playbooks, `incident-playbooks-${new Date().toISOString().split('T')[0]}.json`);
  };

  const selectedRun = selected ? activeRunFor(selected.id) : undefined;

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageHeader
        title="Incident Response Playbooks"
        subtitle="Playbooks · escalation chains · regulatory notification templates"
        icon={Siren}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={handleExport}>
              <Export size={14} /> Export JSON
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-none" onClick={openCreate}>
              <Plus size={14} /> New Playbook
            </Button>
            <Button size="sm" className="gap-1.5 rounded-none bg-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.9)]" onClick={() => openActivate()}>
              <Play size={14} /> Activate Playbook
            </Button>
          </>
        }
      />

      {/* Real query error state */}
      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load playbooks</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Active run banners — only persisted runs with status 'active'. */}
      {activeRuns.map(run => {
        const pb = playbooks.find(p => p.id === run.playbookId);
        const phaseNames = pb?.phases.map(p => p.name) ?? [];
        const currentIdx = phaseNames.indexOf(run.currentPhase ?? '');
        return (
          <div key={run.id} className="border border-[hsl(var(--destructive)/0.5)] bg-[hsl(var(--destructive)/0.08)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Siren size={18} className="text-[hsl(var(--destructive))]" weight="fill" />
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--destructive))]">
                    ACTIVE RUN — {pb?.name ?? playbookName(run.playbookId)}
                  </p>
                  <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">
                    {run.commander ? `Commander: ${run.commander} · ` : ''}
                    {run.currentPhase ? `Phase: ${run.currentPhase} · ` : ''}
                    {run.severity ? `Severity: ${run.severity} · ` : ''}
                    {run.startedAt ? `Started: ${formatDate(run.startedAt)}` : ''}
                  </p>
                  {run.incidentId && (
                    <div className="mt-1">
                      <InterlinkChip label={incidentLabel(run.incidentId) ?? 'Unavailable'} to={`/risk/incidents?open=${run.incidentId}`} />
                    </div>
                  )}
                </div>
              </div>
              {pb && (
                <Button size="sm" variant="outline" className="rounded-none border-[hsl(var(--destructive))] text-[hsl(var(--destructive))]"
                  onClick={() => { setSelected(pb); setTab('steps'); }}>
                  Open War Room <ArrowRight size={13} />
                </Button>
              )}
            </div>
            {phaseNames.length > 0 && (
              <div className="flex items-center gap-1 mt-3 flex-wrap">
                {phaseNames.map((phase, i) => {
                  const isComplete = currentIdx > i;
                  const isCurrent = currentIdx === i;
                  const color = phaseColor(i);
                  return (
                    <div key={phase} className="flex items-center gap-1">
                      <div className="flex items-center gap-1 px-2 py-1 text-xs"
                        style={{
                          background: isCurrent ? `${color.slice(0, -1)} / 0.12)` : isComplete ? 'hsl(var(--s-ok-bg))' : 'transparent',
                          color: isCurrent ? color : isComplete ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                          border: `1px solid ${isCurrent ? color : isComplete ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--border))'}`,
                        }}>
                        {isComplete && <CheckCircle size={10} className="mr-1" />}
                        {phase}
                      </div>
                      {i < phaseNames.length - 1 && <ArrowRight size={10} className="text-[hsl(var(--text-4))]" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Playbooks', value: String(playbooks.length), color: 'hsl(var(--brand))' },
          { label: 'Active Runs', value: String(activeRuns.length), color: activeRuns.length > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' },
          { label: 'Completed Runs', value: String(runs.filter(r => r.status === 'completed').length), color: 'hsl(var(--s-ok-tx))' },
          { label: 'Last Tested', value: lastTested, color: 'hsl(var(--s-wn-tx))' },
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
      <div className="relative max-w-sm">
        <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-[hsl(var(--text-4))]" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playbooks..." className="pl-8 rounded-none h-8 text-sm" />
      </div>

      {/* Playbook Cards */}
      {playbooks.length === 0 && !error ? (
        <Card style={{ borderRadius: 0 }}>
          <CardContent className="py-12 text-center">
            <Siren size={28} className="mx-auto text-[hsl(var(--text-4))]" />
            <p className="text-sm font-medium text-[hsl(var(--text-2))] mt-2">No playbooks defined yet</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1">Playbooks created for this organization will appear here.</p>
            <Button size="sm" variant="outline" className="mt-3 rounded-none gap-1.5" onClick={openCreate}>
              <Plus size={13} /> Create the first playbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(pb => {
            const Icon = categoryIcon(pb.category);
            const running = activeRunFor(pb.id);
            const totalSteps = pb.phases.reduce((s, ph) => s + ph.steps.length, 0);
            return (
              <Card key={pb.id} style={{ borderRadius: 0, cursor: 'pointer' }} onClick={() => { setSelected(pb); setTab('steps'); }}
                className="hover:border-[hsl(var(--brand))] transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className="text-[hsl(var(--brand))]" weight="duotone" />
                      <div>
                        <p className="font-medium text-sm text-[hsl(var(--text-1))]">{pb.name}</p>
                        <p className="text-xs text-[hsl(var(--text-3))]">{pb.category ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {running && (
                        <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>RUNNING</Badge>
                      )}
                      <Badge style={{ background: pb.status === 'active' ? 'hsl(var(--s-ok-bg))' : 'hsl(220 14% 60% / 0.15)', color: pb.status === 'active' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>
                        {pb.status}
                      </Badge>
                    </div>
                  </div>
                  {pb.description && <p className="text-xs text-[hsl(var(--text-3))] line-clamp-2">{pb.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[hsl(var(--text-4))]">Phases</span>
                      <p className="font-medium text-[hsl(var(--text-2))]">{pb.phases.length} ({totalSteps} steps)</p>
                    </div>
                    <div>
                      <span className="text-[hsl(var(--text-4))]">Escalation Tiers</span>
                      <p className="font-medium text-[hsl(var(--text-2))]">{pb.escalationChain.length}</p>
                    </div>
                  </div>
                  {(pb.linkedModelIds?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
                      {pb.linkedModelIds!.map(id => (
                        <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-2">
                    {(() => {
                      const tested = lastTestedInfo(pb);
                      return (
                        <span className="text-xs text-[hsl(var(--text-4))]">
                          {pb.version ?? '—'} · {tested
                            ? `Tested ${formatDate(tested.date)} (${tested.source === 'tabletop' ? 'tabletop exercise' : 'recorded date'})`
                            : 'Not tested yet'}
                        </span>
                      );
                    })()}
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-none" aria-label={`Edit ${pb.name}`}
                        onClick={e => { e.stopPropagation(); openEdit(pb); }}>
                        <PencilSimple size={12} className="text-[hsl(var(--brand))]" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 rounded-none" aria-label={`Delete ${pb.name}`}
                        onClick={e => { e.stopPropagation(); setDeleteTarget(pb); }}>
                        <Trash size={12} className="text-[hsl(var(--destructive))]" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-xs rounded-none gap-1"
                        onClick={e => { e.stopPropagation(); openActivate(pb.id); }}>
                        <Play size={10} /> Activate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && playbooks.length > 0 && (
            <p className="text-xs text-[hsl(var(--text-4))] col-span-full py-6 text-center">No playbooks match the current search.</p>
          )}
        </div>
      )}

      {/* Playbook Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={v => !v && closeDetail()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-base">{selected.name}</SheetTitle>
                    <p className="text-xs text-[hsl(var(--text-3))] mt-1">
                      {selected.category ?? '—'}{selected.version ? ` · ${selected.version}` : ''}
                      {selected.owner ? ` · Owner: ${selected.owner}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-6 text-xs rounded-none gap-1" onClick={() => openEdit(selected)}>
                      <PencilSimple size={11} /> Edit
                    </Button>
                    <Badge style={{ background: selected.status === 'active' ? 'hsl(var(--s-ok-bg))' : 'hsl(220 14% 60% / 0.15)', color: selected.status === 'active' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-3))', borderRadius: 0, fontSize: 10 }}>
                      {selected.status}
                    </Badge>
                  </div>
                </div>
                {(() => {
                  const tested = lastTestedInfo(selected);
                  return (
                    <p className="text-xs text-[hsl(var(--text-4))]">
                      {tested
                        ? `Last tested ${formatDate(tested.date)} — ${tested.source === 'tabletop' ? 'derived from a completed tabletop exercise' : 'manually recorded date'}`
                        : 'Not tested yet — no completed tabletop exercise is linked to this playbook.'}
                    </p>
                  );
                })()}
                {selected.description && (
                  <p className="text-xs text-[hsl(var(--text-3))] border-l-2 border-[hsl(var(--brand))] pl-3 py-1">{selected.description}</p>
                )}
                {(selected.linkedModelIds?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selected.linkedModelIds!.map(id => (
                      <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                    ))}
                  </div>
                )}
              </SheetHeader>

              {selectedRun && (
                <div className="mb-4 p-3 border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] space-y-2">
                  <p className="text-xs font-semibold text-[hsl(var(--destructive))]">WAR ROOM — ACTIVE RUN</p>
                  <p className="text-xs text-[hsl(var(--text-3))]">
                    {selectedRun.commander ? `Commander: ${selectedRun.commander} · ` : ''}
                    {selectedRun.severity ? `Severity: ${selectedRun.severity} · ` : ''}
                    {selectedRun.startedAt ? `Started: ${formatDate(selectedRun.startedAt)}` : ''}
                  </p>
                  {selectedRun.incidentId && (
                    <InterlinkChip label={incidentLabel(selectedRun.incidentId) ?? 'Unavailable'} to={`/risk/incidents?open=${selectedRun.incidentId}`} />
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {(() => {
                      const names = selected.phases.map(p => p.name);
                      const next = names[names.indexOf(selectedRun.currentPhase ?? '') + 1];
                      return next ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs rounded-none gap-1" disabled={isSaving}
                          onClick={() => advancePhase(selectedRun, selected)}>
                          <ArrowRight size={11} /> Advance to {next}
                        </Button>
                      ) : null;
                    })()}
                    <Button size="sm" className="h-7 text-xs rounded-none gap-1 bg-[hsl(var(--s-ok-tx))] hover:opacity-90" disabled={isSaving}
                      onClick={() => completeRun(selectedRun)}>
                      <FlagCheckered size={11} /> Complete Run
                    </Button>
                  </div>
                </div>
              )}

              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="rounded-none w-full">
                  <TabsTrigger value="steps" className="rounded-none flex-1 text-xs">Phases & Steps</TabsTrigger>
                  <TabsTrigger value="escalation" className="rounded-none flex-1 text-xs">Escalation Chain</TabsTrigger>
                  <TabsTrigger value="notifications" className="rounded-none flex-1 text-xs">Regulatory Notices</TabsTrigger>
                </TabsList>

                <TabsContent value="steps" className="mt-4 space-y-3">
                  {selected.phases.length === 0 && (
                    <p className="text-xs text-[hsl(var(--text-4))] py-6 text-center">No phases defined for this playbook.</p>
                  )}
                  {selected.phases.map((phase, pi) => {
                    const color = phaseColor(pi);
                    const isCurrent = selectedRun?.currentPhase === phase.name;
                    return (
                      <div key={phase.name} className="border border-[hsl(var(--border))] p-3 space-y-2"
                        style={{ borderLeft: `3px solid ${color}` }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge style={{ background: `${color.slice(0, -1)} / 0.12)`, color, borderRadius: 0, fontSize: 10 }}>{phase.name}</Badge>
                            {isCurrent && <span className="text-xs text-[hsl(var(--s-wn-tx))] font-medium">● CURRENT</span>}
                          </div>
                          {phase.sla_minutes != null && (
                            <span className="text-xs text-[hsl(var(--text-3))] flex-shrink-0">
                              <Clock size={10} className="inline mr-1" />{phase.sla_minutes}m SLA
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {phase.steps.map((step, si) => {
                            const done = selectedRun?.completedSteps.includes(stepKey(phase.name, si)) ?? false;
                            return (
                              <div key={si} className="flex items-start gap-2 text-xs text-[hsl(var(--text-2))]">
                                {selectedRun ? (
                                  <input
                                    type="checkbox"
                                    className="mt-0.5 flex-shrink-0"
                                    checked={done}
                                    disabled={isSaving}
                                    onChange={() => toggleStep(selectedRun, phase.name, si)}
                                    aria-label={`Mark step done: ${step.text}`}
                                  />
                                ) : (
                                  <div className="w-3 h-3 border border-[hsl(var(--border))] flex-shrink-0 mt-0.5" />
                                )}
                                <span className={done ? 'line-through text-[hsl(var(--text-4))]' : ''}>
                                  {step.text}
                                  {step.role && <span className="text-[hsl(var(--text-4))]"> — {step.role}</span>}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="escalation" className="mt-4 space-y-3">
                  {selected.escalationChain.length === 0 && (
                    <p className="text-xs text-[hsl(var(--text-4))] py-6 text-center">No escalation chain defined for this playbook.</p>
                  )}
                  {selected.escalationChain.map((tier, i) => (
                    <div key={tier.tier} className="flex items-center gap-3 p-3 border border-[hsl(var(--border))]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[hsl(var(--bg-surface))] text-xs font-bold flex-shrink-0"
                        style={{ background: `hsl(${220 + i * 30} 70% 50%)` }}>
                        T{tier.tier}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[hsl(var(--text-1))]">{tier.role}</p>
                        {tier.contact_channel && (
                          <p className="text-xs font-mono text-[hsl(var(--text-4))]">{tier.contact_channel}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="notifications" className="mt-4 space-y-3">
                  {selected.regulatoryTemplates.length === 0 && (
                    <p className="text-xs text-[hsl(var(--text-4))] py-6 text-center">No regulatory notification templates defined for this playbook.</p>
                  )}
                  {selected.regulatoryTemplates.map((n, i) => (
                    <div key={i} className="border border-[hsl(var(--border))] p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{n.authority}</p>
                        {n.deadline_hours != null && (
                          <Badge style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>
                            <Clock size={10} className="mr-1" />{n.deadline_hours}h deadline
                          </Badge>
                        )}
                      </div>
                      {n.regulation && (
                        <p className="text-xs text-[hsl(var(--text-3))]"><strong>Regulation:</strong> {n.regulation}</p>
                      )}
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-none h-7 text-xs" onClick={() => copyTemplate(n)}>
                        <ClipboardText size={12} /> Copy Template
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Activate Dialog */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="sm:max-w-md" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[hsl(var(--destructive))]">
              <Siren size={16} /> Activate Incident Playbook
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Playbook</Label>
              <Select value={actPlaybookId} onValueChange={setActPlaybookId}>
                <SelectTrigger className="rounded-none mt-1 text-sm"><SelectValue placeholder="Select playbook" /></SelectTrigger>
                <SelectContent>
                  {playbooks.filter(p => p.id).map(p => <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Linked Incident</Label>
              <Select value={actIncidentId} onValueChange={setActIncidentId}>
                <SelectTrigger className="rounded-none mt-1 text-sm">
                  <SelectValue placeholder={openIncidents.length ? 'Select open incident (optional)' : 'No open incidents'} />
                </SelectTrigger>
                <SelectContent>
                  {openIncidents.filter(i => i.id).map(i => (
                    <SelectItem key={i.id} value={i.id!}>
                      {i.incidentId ? `${i.incidentId} — ` : ''}{i.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Incident Severity</Label>
              <Select value={actSeverity} onValueChange={setActSeverity}>
                <SelectTrigger className="rounded-none mt-1 text-sm"><SelectValue placeholder="Select severity" /></SelectTrigger>
                <SelectContent>
                  {['critical', 'high', 'medium', 'low'].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Incident Commander</Label>
              <Input value={actCommander} onChange={e => setActCommander(e.target.value)}
                placeholder="Name of the commander" className="rounded-none mt-1 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => setActivateOpen(false)}>Cancel</Button>
            <Button size="sm" className="rounded-none bg-[hsl(var(--destructive))]" disabled={isSaving} onClick={handleActivate}>
              {isSaving ? 'Activating…' : 'Activate & Open War Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Playbook Dialog — closes only after the write persists */}
      <Dialog open={editorOpen} onOpenChange={v => { if (!v) { setEditorOpen(false); setEditBase(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>{editBase ? `Edit Playbook — ${editBase.name}` : 'New Incident Response Playbook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={pbForm.name} onChange={e => setPbForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Model Failure Response" className="rounded-none mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input value={pbForm.playbookRef} onChange={e => setPbForm(f => ({ ...f, playbookRef: e.target.value }))}
                  placeholder="e.g. PB-001 (optional)" className="rounded-none mt-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Input value={pbForm.category} onChange={e => setPbForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Model Behavior, Security, Bias" className="rounded-none mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={pbForm.status} onValueChange={v => setPbForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="rounded-none mt-1 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PB_STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={pbForm.description} onChange={e => setPbForm(f => ({ ...f, description: e.target.value }))}
                placeholder="When to use this playbook and what it covers" className="rounded-none mt-1 text-sm" />
            </div>

            {/* Phases editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Phases</Label>
                <Button type="button" size="sm" variant="outline" className="h-6 text-xs rounded-none gap-1"
                  onClick={() => setPbForm(f => ({ ...f, phases: [...f.phases, { name: '', slaMinutes: '', stepsText: '' }] }))}>
                  <Plus size={11} /> Add Phase
                </Button>
              </div>
              {pbForm.phases.length === 0 && (
                <p className="text-xs text-[hsl(var(--text-4))]">No phases yet — add the response phases in order (e.g. Detect, Contain, Remediate).</p>
              )}
              {pbForm.phases.map((phase, pi) => (
                <div key={pi} className="border border-[hsl(var(--border))] p-3 space-y-2" style={{ borderLeft: `3px solid ${phaseColor(pi)}` }}>
                  <div className="flex items-center gap-2">
                    <Input value={phase.name} onChange={e => setPhase(pi, { name: e.target.value })}
                      placeholder={`Phase ${pi + 1} name`} className="rounded-none h-8 text-sm flex-1" />
                    <Input value={phase.slaMinutes} onChange={e => setPhase(pi, { slaMinutes: e.target.value })}
                      type="number" min={0} placeholder="SLA (min)" className="rounded-none h-8 text-sm w-28" />
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-none" aria-label={`Remove phase ${phase.name || pi + 1}`}
                      onClick={() => setPbForm(f => ({ ...f, phases: f.phases.filter((_, i) => i !== pi) }))}>
                      <X size={12} className="text-[hsl(var(--destructive))]" />
                    </Button>
                  </div>
                  <Textarea rows={3} value={phase.stepsText} onChange={e => setPhase(pi, { stepsText: e.target.value })}
                    placeholder={'One step per line. Append "@Role" to assign a role, e.g.\nFreeze model rollout @ML Ops'}
                    className="rounded-none text-xs font-mono" />
                </div>
              ))}
            </div>

            {/* Escalation chain editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Escalation Chain</Label>
                <Button type="button" size="sm" variant="outline" className="h-6 text-xs rounded-none gap-1"
                  onClick={() => setPbForm(f => ({ ...f, escalation: [...f.escalation, { role: '', channel: '' }] }))}>
                  <Plus size={11} /> Add Tier
                </Button>
              </div>
              {pbForm.escalation.length === 0 && (
                <p className="text-xs text-[hsl(var(--text-4))]">No escalation tiers yet — tiers are numbered in the order listed.</p>
              )}
              {pbForm.escalation.map((tier, ti) => (
                <div key={ti} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[hsl(var(--text-4))] w-7 flex-shrink-0">T{ti + 1}</span>
                  <Input value={tier.role} onChange={e => setEsc(ti, { role: e.target.value })}
                    placeholder="Role (e.g. Incident Commander)" className="rounded-none h-8 text-sm flex-1" />
                  <Input value={tier.channel} onChange={e => setEsc(ti, { channel: e.target.value })}
                    placeholder="Contact channel (e.g. #ai-incidents)" className="rounded-none h-8 text-sm flex-1" />
                  <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-none" aria-label={`Remove tier ${ti + 1}`}
                    onClick={() => setPbForm(f => ({ ...f, escalation: f.escalation.filter((_, i) => i !== ti) }))}>
                    <X size={12} className="text-[hsl(var(--destructive))]" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="rounded-none" onClick={() => { setEditorOpen(false); setEditBase(null); }}>Cancel</Button>
            <Button size="sm" className="rounded-none" disabled={isSavingPlaybook || !pbForm.name.trim()} onClick={handleSavePlaybook}>
              {isSavingPlaybook ? 'Saving…' : 'Save Playbook'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeletePlaybook}
        type="danger"
        title="Delete Playbook"
        message={<p>Delete <strong>{deleteTarget?.name}</strong>? Past runs keep their history, but the playbook can no longer be activated. This cannot be undone.</p>}
        confirmLabel="Delete"
      />
    </div>
  );
}
