// SPDX-License-Identifier: Apache-2.0
// Tabletop Exercises — real org-scoped backend (tabletop_exercises via
// useTabletops). Type/status values match the DB CHECK constraints; display
// labels are prettified at render time.
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Target, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, X, Users } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  StatusBadge, PaginationBar, CrudModal, CrudSlideOver, FormSection, FormFooter,
  MetaBar, useSortAndPage, Th, TInput, TSelect, TTextarea,
} from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { useTabletops, usePlaybooks } from "@/hooks/useRiskIncidents";
import type { TabletopRecord } from "@/services/incidentResponseService";
import { InterlinkChip } from "@/components/ui/InterlinkChip";
import { exportCsv } from "@/lib/exportUtils";
import PageSkeleton from "@/components/ui/PageSkeleton";

// DB CHECK constraint values, with display labels.
const TYPE_OPTIONS = [
  { value: "IR", label: "Incident Response (IR)" },
  { value: "BCP", label: "Business Continuity (BCP)" },
  { value: "DR", label: "Disaster Recovery (DR)" },
  { value: "Ransomware", label: "Ransomware" },
  { value: "AI-Incident", label: "AI Incident" },
  { value: "Regulatory", label: "Regulatory" },
  { value: "Custom", label: "Custom" },
];
const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const prettyStatus = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label ?? s;
const prettyType = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.label ?? t;

const SCORE_COLOR = (s: number) => s >= 80 ? "hsl(var(--s-ok-tx))" : s >= 50 ? "hsl(var(--s-wn-tx))" : "hsl(var(--s-er-tx))";

interface FormState {
  id?: string;
  completedAt?: string | null;   // preserved across edits
  exerciseRef: string;
  name: string;
  type: string;
  scenario: string;
  status: string;
  facilitator: string;
  participantsText: string;      // comma-separated → participantNames[]
  scheduledAt: string;           // datetime-local value
  durationMinutes: string;
  objectivesText: string;        // one per line → objectives[]
  readinessScore: string;
  findings: { finding: string; severity?: string }[];
  actionItems: { item: string; owner?: string }[];
  lessonsLearned: string;
  linkedPlaybookId: string;
}

const EMPTY_FORM: FormState = {
  exerciseRef: "", name: "", type: "AI-Incident", scenario: "", status: "planned",
  facilitator: "", participantsText: "", scheduledAt: "", durationMinutes: "",
  objectivesText: "", readinessScore: "", findings: [], actionItems: [],
  lessonsLearned: "", linkedPlaybookId: "",
};

function recordToForm(r: TabletopRecord): FormState {
  return {
    id: r.id,
    completedAt: r.completedAt,
    exerciseRef: r.exerciseRef ?? "",
    name: r.name,
    type: r.type,
    scenario: r.scenario ?? "",
    status: r.status,
    facilitator: r.facilitator ?? "",
    participantsText: r.participantNames.join(", "),
    scheduledAt: r.scheduledAt ? r.scheduledAt.slice(0, 16) : "",
    durationMinutes: r.durationMinutes != null ? String(r.durationMinutes) : "",
    objectivesText: r.objectives.join("\n"),
    readinessScore: r.readinessScore != null ? String(r.readinessScore) : "",
    findings: r.findings,
    actionItems: r.actionItems,
    lessonsLearned: r.lessonsLearned ?? "",
    linkedPlaybookId: r.linkedPlaybookId ?? "",
  };
}

export default function TabletopExercises() {
  const { items, isLoading, error, save, remove, isSaving } = useTabletops();
  const { items: playbooks } = usePlaybooks();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"create" | "edit" | "view" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewItem, setViewItem] = useState<TabletopRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TabletopRecord | null>(null);
  const [findingInput, setFindingInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [actionOwnerInput, setActionOwnerInput] = useState("");

  const playbookName = (id?: string | null) =>
    id ? (playbooks.find(p => p.id === id)?.name ?? "Unavailable") : null;

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage(filtered, "scheduledAt" as keyof TabletopRecord);
  const setF = (k: keyof FormState) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Exercise name is required"); return; }
    const score = form.readinessScore.trim() === "" ? null : Number(form.readinessScore);
    if (score != null && (Number.isNaN(score) || score < 0 || score > 100)) {
      toast.error("Readiness score must be between 0 and 100"); return;
    }
    const record: TabletopRecord = {
      id: form.id,
      exerciseRef: form.exerciseRef.trim() || undefined,
      name: form.name.trim(),
      type: form.type,
      scenario: form.scenario.trim() || undefined,
      status: form.status,
      facilitator: form.facilitator.trim() || null,
      participantNames: form.participantsText.split(",").map(s => s.trim()).filter(Boolean),
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      completedAt: form.status === "completed" ? (form.completedAt ?? new Date().toISOString()) : null,
      durationMinutes: form.durationMinutes.trim() === "" ? null : Number(form.durationMinutes),
      objectives: form.objectivesText.split("\n").map(s => s.trim()).filter(Boolean),
      readinessScore: form.status === "completed" ? score : null,
      findings: form.findings,
      actionItems: form.actionItems,
      lessonsLearned: form.lessonsLearned.trim() || null,
      linkedPlaybookId: form.linkedPlaybookId || null,
    };
    try {
      await save(record); // hook toasts success; throws on failure
      setModal(null);
      setForm(EMPTY_FORM);
    } catch { /* hook surfaces the error toast */ }
  };

  const openEdit = (item: TabletopRecord) => { setForm(recordToForm(item)); setModal("edit"); };

  const doDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await remove(deleteTarget.id);
      if (viewItem?.id === deleteTarget.id) { setModal(null); setViewItem(null); }
      setDeleteTarget(null);
    } catch { /* hook surfaces the error toast */ }
  };

  const handleExport = () => {
    if (!filtered.length) { toast.error("No exercises to export"); return; }
    exportCsv(
      filtered.map(i => ({
        ref: i.exerciseRef ?? "",
        name: i.name,
        type: i.type,
        status: i.status,
        facilitator: i.facilitator ?? "",
        scheduled_at: i.scheduledAt ?? "",
        duration_minutes: i.durationMinutes ?? "",
        participants: i.participantNames.join("; "),
        readiness_score: i.readinessScore ?? "",
        findings: i.findings.length,
        action_items: i.actionItems.length,
        linked_playbook: playbookName(i.linkedPlaybookId) ?? "",
      })),
      `tabletop-exercises-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  // Honest stats: YTD really means the current year; averages only over scored records.
  const year = new Date().getFullYear();
  const conductedYtd = items.filter(i =>
    i.status === "completed" &&
    (i.completedAt ?? i.scheduledAt ?? i.createdAt ?? "").startsWith(String(year)),
  ).length;
  const scored = items.filter(i => i.readinessScore != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((a, b) => a + (b.readinessScore ?? 0), 0) / scored.length)
    : null;
  const nextExercise = items
    .filter(i => i.status === "planned" && i.scheduledAt)
    .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""))[0]?.scheduledAt;
  const totalParticipants = new Set(items.flatMap(i => i.participantNames)).size;

  if (isLoading) return <PageSkeleton title="Tabletop Exercises" showStats rows={5} />;

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Target size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Tabletop Exercises
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Plan and track AI incident response simulations for team readiness</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> Plan Exercise
        </Button>
      </div>

      {error != null && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load exercises</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: `Exercises Conducted (${year})`, value: String(conductedYtd), color: "hsl(var(--text-1))" },
          { label: "Avg Readiness Score", value: avgScore != null ? `${avgScore}/100` : "—", color: avgScore != null ? SCORE_COLOR(avgScore) : "hsl(var(--text-3))" },
          { label: "Next Scheduled", value: nextExercise ? nextExercise.split("T")[0] : "—", color: "hsl(var(--brand))" },
          { label: "Participants Trained", value: String(totalParticipants), color: "hsl(var(--s-ok-tx))" },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" size={15} />
          <Input placeholder="Search exercises..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={handleExport}><Export size={14} />Export CSV</Button>
      </div>

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <Th label="Ref" col="exerciseRef" sp={sp} />
              <Th label="Exercise Name" col="name" sp={sp} />
              <Th label="Type" col="type" sp={sp} />
              <Th label="Scheduled" col="scheduledAt" sp={sp} />
              <Th label="Duration" col="durationMinutes" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))]">Participants</th>
              <Th label="Readiness" col="readinessScore" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))]">Playbook</th>
              <Th label="Status" col="status" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sp.page.length === 0 && (
              <tr><td colSpan={10}>
                <EmptyState icon={<Target size={32} />}
                  title={items.length === 0 ? "No exercises yet" : "No exercises match the filters"}
                  description={items.length === 0 ? "Plan your first tabletop exercise" : "Adjust the search or status filter"}
                  action={items.length === 0 ? <Button onClick={() => { setForm(EMPTY_FORM); setModal("create"); }}>Plan Exercise</Button> : undefined} />
              </td></tr>
            )}
            {sp.page.map(item => (
              <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{item.exerciseRef ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[180px] truncate">{item.name}</td>
                <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]">{prettyType(item.type)}</span></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.scheduledAt ? item.scheduledAt.split("T")[0] : "—"}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.durationMinutes != null ? `${item.durationMinutes}m` : "—"}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">
                  <span className="flex items-center gap-1"><Users size={12} />{item.participantNames.length}</span>
                </td>
                <td className="px-4 py-3">
                  {item.readinessScore != null ? (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.readinessScore}%`, background: SCORE_COLOR(item.readinessScore) }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: SCORE_COLOR(item.readinessScore) }}>{item.readinessScore}</span>
                    </div>
                  ) : <span className="text-xs text-[hsl(var(--text-3))]">—</span>}
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  {item.linkedPlaybookId
                    ? <InterlinkChip label={playbookName(item.linkedPlaybookId) ?? "Unavailable"} to="/incidents/playbooks" />
                    : <span className="text-xs text-[hsl(var(--text-3))]">—</span>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={prettyStatus(item.status)} /></td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewItem(item); setModal("view"); }}><Eye size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><PencilSimple size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-[hsl(var(--s-er-tx))]"><Trash size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar sp={sp} />

      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY_FORM); }} title={form.id ? "Edit Exercise" : "Plan Tabletop Exercise"} size="lg">
        <FormSection title="Exercise Overview">
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Exercise Name *" value={form.name} onChange={setF("name")} placeholder="e.g. Q3 AI incident simulation" />
            <TInput label="Reference" value={form.exerciseRef} onChange={setF("exerciseRef")} placeholder="e.g. TTX-2026-01 (optional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Type" value={form.type} onChange={setF("type")} options={TYPE_OPTIONS} />
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUS_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Scheduled At" value={form.scheduledAt} onChange={setF("scheduledAt")} type="datetime-local" />
            <TInput label="Duration (minutes)" value={form.durationMinutes} onChange={setF("durationMinutes")} type="number" placeholder="e.g. 120" />
          </div>
          <TInput label="Facilitator" value={form.facilitator} onChange={setF("facilitator")} placeholder="Facilitator name" />
          <TSelect label="Linked Playbook" value={form.linkedPlaybookId} onChange={setF("linkedPlaybookId")}
            options={playbooks.filter(p => p.id).map(p => ({ value: p.id!, label: p.name }))} />
          <TTextarea label="Scenario" value={form.scenario} onChange={setF("scenario")} rows={4} placeholder="Describe the scenario in detail" />
          <TTextarea label="Objectives (one per line)" value={form.objectivesText} onChange={setF("objectivesText")} rows={3} placeholder={"Validate escalation procedures\nTest regulatory notification timeline"} />
        </FormSection>
        <FormSection title="Participants">
          <TInput label="Participant names (comma-separated)" value={form.participantsText} onChange={setF("participantsText")} placeholder="e.g. A. Facilitator, B. Analyst" />
        </FormSection>
        <FormSection title="Outcome (post-exercise)">
          {form.status === "completed" ? (
            <TInput label="Readiness Score (0-100)" value={form.readinessScore} onChange={setF("readinessScore")} type="number" placeholder="0-100" />
          ) : (
            <p className="text-xs text-[hsl(var(--text-4))]">A readiness score can be recorded once the exercise is marked completed.</p>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium text-[hsl(var(--text-2))]">Findings</label>
            <div className="flex gap-2">
              <Input value={findingInput} onChange={e => setFindingInput(e.target.value)} placeholder="Add a finding" className="h-8 text-sm flex-1"
                onKeyDown={e => { if (e.key === "Enter" && findingInput.trim()) { e.preventDefault(); setForm(f => ({ ...f, findings: [...f.findings, { finding: findingInput.trim() }] })); setFindingInput(""); } }} />
              <Button size="sm" variant="outline" type="button" onClick={() => { if (findingInput.trim()) { setForm(f => ({ ...f, findings: [...f.findings, { finding: findingInput.trim() }] })); setFindingInput(""); } }}>Add</Button>
            </div>
            {form.findings.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-[hsl(var(--text-2))] px-2 py-1 bg-[hsl(var(--muted))]">
                <span>{f.finding}</span>
                <button type="button" onClick={() => setForm(fm => ({ ...fm, findings: fm.findings.filter((_, i) => i !== idx) }))} className="hover:text-[hsl(var(--s-er-tx))]"><X size={11} /></button>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-[hsl(var(--text-2))]">Action Items</label>
            <div className="flex gap-2">
              <Input value={actionInput} onChange={e => setActionInput(e.target.value)} placeholder="Action item" className="h-8 text-sm flex-1" />
              <Input value={actionOwnerInput} onChange={e => setActionOwnerInput(e.target.value)} placeholder="Owner" className="h-8 text-sm w-32" />
              <Button size="sm" variant="outline" type="button" onClick={() => { if (actionInput.trim()) { setForm(f => ({ ...f, actionItems: [...f.actionItems, { item: actionInput.trim(), owner: actionOwnerInput.trim() || undefined }] })); setActionInput(""); setActionOwnerInput(""); } }}>Add</Button>
            </div>
            {form.actionItems.map((a, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-[hsl(var(--text-2))] px-2 py-1 bg-[hsl(var(--muted))]">
                <span>{a.item}{a.owner ? ` — ${a.owner}` : ""}</span>
                <button type="button" onClick={() => setForm(fm => ({ ...fm, actionItems: fm.actionItems.filter((_, i) => i !== idx) }))} className="hover:text-[hsl(var(--s-er-tx))]"><X size={11} /></button>
              </div>
            ))}
          </div>
          <TTextarea label="Lessons Learned" value={form.lessonsLearned} onChange={setF("lessonsLearned")} rows={2} placeholder="Key takeaways from the exercise" />
        </FormSection>
        <FormFooter saving={isSaving} onSubmit={handleSave} submitLabel="Save Exercise" onCancel={() => { setModal(null); setForm(EMPTY_FORM); }} />
      </CrudModal>

      <CrudSlideOver open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.name || ""}>
        {viewItem && <>
          <MetaBar items={[
            { label: "Ref", value: viewItem.exerciseRef ?? "—" },
            { label: "Type", value: prettyType(viewItem.type) },
            { label: "Scheduled", value: viewItem.scheduledAt ? viewItem.scheduledAt.split("T")[0] : "—" },
            { label: "Duration", value: viewItem.durationMinutes != null ? `${viewItem.durationMinutes}m` : "—" },
            { label: "Status", value: <StatusBadge status={prettyStatus(viewItem.status)} /> },
            { label: "Facilitator", value: viewItem.facilitator ?? "—" },
          ]} />
          {viewItem.linkedPlaybookId && (
            <FormSection title="Linked Playbook">
              <InterlinkChip label={playbookName(viewItem.linkedPlaybookId) ?? "Unavailable"} to="/incidents/playbooks" />
            </FormSection>
          )}
          <FormSection title="Scenario">
            <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.scenario || "—"}</p>
          </FormSection>
          {viewItem.objectives.length > 0 && (
            <FormSection title="Objectives">
              <ul className="list-disc pl-4 space-y-1">
                {viewItem.objectives.map((o, i) => <li key={i} className="text-sm text-[hsl(var(--text-2))]">{o}</li>)}
              </ul>
            </FormSection>
          )}
          <FormSection title="Participants">
            {viewItem.participantNames.length === 0
              ? <p className="text-xs text-[hsl(var(--text-4))]">No participants recorded.</p>
              : <div className="flex flex-wrap gap-1">
                  {viewItem.participantNames.map(p => (
                    <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]"><Users size={10} />{p}</span>
                  ))}
                </div>}
          </FormSection>
          {viewItem.readinessScore != null && (
            <FormSection title="Readiness Score">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${viewItem.readinessScore}%`, background: SCORE_COLOR(viewItem.readinessScore) }} />
                </div>
                <span className="font-bold text-sm" style={{ color: SCORE_COLOR(viewItem.readinessScore) }}>{viewItem.readinessScore}/100</span>
              </div>
            </FormSection>
          )}
          {viewItem.findings.length > 0 && (
            <FormSection title="Findings">
              <ul className="list-disc pl-4 space-y-1">
                {viewItem.findings.map((f, i) => (
                  <li key={i} className="text-sm text-[hsl(var(--text-2))]">{f.finding}{f.severity ? ` (${f.severity})` : ""}</li>
                ))}
              </ul>
            </FormSection>
          )}
          {viewItem.actionItems.length > 0 && (
            <FormSection title="Action Items">
              <ul className="list-disc pl-4 space-y-1">
                {viewItem.actionItems.map((a, i) => (
                  <li key={i} className="text-sm text-[hsl(var(--text-2))]">{a.item}{a.owner ? ` — ${a.owner}` : ""}</li>
                ))}
              </ul>
            </FormSection>
          )}
          {viewItem.lessonsLearned && (
            <FormSection title="Lessons Learned">
              <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.lessonsLearned}</p>
            </FormSection>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => openEdit(viewItem)} variant="outline" size="sm"><PencilSimple size={14} />Edit</Button>
            <Button onClick={() => setDeleteTarget(viewItem)} variant="danger" size="sm"><Trash size={14} />Delete</Button>
          </div>
        </>}
      </CrudSlideOver>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete Exercise" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
