import { useState, useMemo } from "react";
import { Target, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, X, Users, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, CrudSlideOver, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const SCENARIO_TYPES = ["AI Model Breach","Bias Incident","Data Exfiltration","Vendor Compromise","Adversarial Attack","Regulatory Investigation","Model Hallucination Crisis","Ransomware","Supply Chain Attack"];
const STATUSES = ["Planned","In Progress","Completed","Cancelled"];
const FACILITATORS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel"];
const DEPTS = ["Security","Compliance","Legal","HR","Finance","IT","Operations","Risk","Product"];

const SEED: any[] = [
  { id:"TTX-001", name:"Operation Shadow Model", scenarioType:"Adversarial Attack", date:"2026-02-14", duration:"4h", participants:["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel","Mike Johnson","Lisa Park","Tom Brown"], readinessScore:72, findings:5, status:"Completed", facilitator:"Dr. Sarah Chen", objectives:"Test team response to adversarial AI attack. Validate incident escalation procedures and regulatory notification timelines.", narrative:"A sophisticated adversary has gained access to the model serving infrastructure and is injecting adversarial inputs to manipulate credit scoring decisions. Initial detection via anomaly monitoring. The team must contain, investigate, and report.", injects:[ { time:"T+0h", desc:"Anomaly alert: credit scores showing +30% variance", expected:"Trigger incident response, page on-call engineer" }, { time:"T+1h", desc:"Adversarial pattern confirmed by ML team", expected:"Escalate to CISO, convene crisis team" }, { time:"T+2h", desc:"Regulator calls asking about suspicious activity", expected:"Activate comms plan, prepare Art.33 notification" }, { time:"T+3h", desc:"Attack vector identified: API key compromise", expected:"Revoke keys, patch, begin forensic analysis" } ], scoring:{ detection:65, communication:78, escalation:80, technicalResponse:70, regulatoryCompliance:60, recovery:74 }, createdAt:"2026-01-20", updatedAt:"2026-02-20", createdBy:"schen" },
  { id:"TTX-002", name:"Bias Storm", scenarioType:"Bias Incident", date:"2026-03-08", duration:"2h", participants:["Emma Rodriguez","Nina Patel","James Wilson","Mike Johnson"], readinessScore:58, findings:8, status:"Completed", facilitator:"Emma Rodriguez", objectives:"Test response to public disclosure of bias in AI hiring system. Validate media response and regulatory engagement protocol.", narrative:"A whistleblower leaks to media that the AI hiring tool discriminates against protected classes. News coverage intensifies. DPA opens investigation. HR and Legal must act within 24 hours.", injects:[ { time:"T+0h", desc:"Journalist contacts PR for comment on 'discriminatory AI'", expected:"Activate media response plan" }, { time:"T+30m", desc:"DPA tweets investigating the company", expected:"Engage DPO, prepare voluntary disclosure" }, { time:"T+1h", desc:"CEO asks for board presentation in 2 hours", expected:"Prepare executive brief with bias audit evidence" } ], scoring:{ detection:45, communication:62, escalation:55, technicalResponse:48, regulatoryCompliance:70, recovery:58 }, createdAt:"2026-02-10", updatedAt:"2026-03-10", createdBy:"erodriguez" },
  { id:"TTX-003", name:"Vendor Zero-Day", scenarioType:"Vendor Compromise", date:"2026-04-22", duration:"Full day", participants:["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel","Mike Johnson","Lisa Park","Tom Brown","Sam White","Jane Doe"], readinessScore:0, findings:0, status:"Planned", facilitator:"Alex Kumar", objectives:"Simulate a zero-day exploit in a critical AI vendor's API affecting production model inference. Test vendor risk response and supply chain isolation procedures.", narrative:"Pending exercise — scenario briefing to be distributed to participants 24h prior.", injects:[], scoring:{ detection:0, communication:0, escalation:0, technicalResponse:0, regulatoryCompliance:0, recovery:0 }, createdAt:"2026-03-15", updatedAt:"2026-04-01", createdBy:"akumar" },
  { id:"TTX-004", name:"Regulator Knock", scenarioType:"Regulatory Investigation", date:"2026-05-15", duration:"3h", participants:["Dr. Sarah Chen","James Wilson","Emma Rodriguez","Nina Patel","Mike Johnson"], readinessScore:0, findings:0, status:"Planned", facilitator:"James Wilson", objectives:"Simulate an unannounced supervisory inspection by the AI Office under EU AI Act. Test document readiness, staff briefing, and audit trail integrity.", narrative:"Pending exercise — document packs will be assembled prior to exercise date.", injects:[], scoring:{ detection:0, communication:0, escalation:0, technicalResponse:0, regulatoryCompliance:0, recovery:0 }, createdAt:"2026-04-01", updatedAt:"2026-04-10", createdBy:"jwilson" },
  { id:"TTX-005", name:"Hallucination Cascade", scenarioType:"Model Hallucination Crisis", date:"2026-01-20", duration:"2h", participants:["Dr. Sarah Chen","Alex Kumar","Lisa Park","Sam White"], readinessScore:84, findings:3, status:"Completed", facilitator:"Dr. Sarah Chen", objectives:"Test response to mass hallucination event in customer-facing GenAI system causing reputational and legal risk.", narrative:"GenAI customer chatbot begins generating false legal advice at scale. 5,000 interactions sent before detection. Social media amplification. Legal and compliance must coordinate rapid response.", injects:[ { time:"T+0h", desc:"Customer support flags 'chatbot giving wrong legal advice'", expected:"Escalate to AI team, initiate review" }, { time:"T+45m", desc:"Twitter thread goes viral with screenshots", expected:"Activate comms plan, disable feature" }, { time:"T+90m", desc:"Law firm contacts re: potential client claims", expected:"Engage legal, document all interactions" } ], scoring:{ detection:88, communication:82, escalation:90, technicalResponse:85, regulatoryCompliance:78, recovery:82 }, createdAt:"2025-12-10", updatedAt:"2026-01-25", createdBy:"schen" },
];

const EMPTY: any = { name:"", scenarioType:"AI Model Breach", date:"", duration:"2h", participants:[], readinessScore:"", findings:0, status:"Planned", facilitator:"", objectives:"", narrative:"", injects:[], scoring:{ detection:0, communication:0, escalation:0, technicalResponse:0, regulatoryCompliance:0, recovery:0 } };

const SCORE_COLOR = (s: number) => s >= 80 ? "#22c55e" : s >= 50 ? "#f59e0b" : s > 0 ? "#ef4444" : "#888";

export default function TabletopExercises() {
  const [items, setItems] = useState(SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);
  const [partInput, setPartInput] = useState("");

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.scenarioType.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage(filtered, "date");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Exercise name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Planned" : (form.status || "Planned");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("Exercise updated");
      } else {
        const id = `TTX-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Exercise created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Exercise deleted"); };
  const toggleBulk = (id: string) => setBulk(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = sp.page.length > 0 && sp.page.every(i => bulk.includes(i.id));

  const conducted = items.filter(i => i.status === "Completed").length;
  const avgScore = Math.round(items.filter(i => i.readinessScore > 0).reduce((a, b) => a + b.readinessScore, 0) / (items.filter(i => i.readinessScore > 0).length || 1));
  const nextExercise = items.filter(i => i.status === "Planned" && i.date).sort((a, b) => a.date.localeCompare(b.date))[0]?.date || "—";
  const totalParticipants = new Set(items.flatMap(i => i.participants || [])).size;

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
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> Plan Exercise
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Exercises Conducted (YTD)", value: conducted, color:"hsl(var(--text-1))" },
          { label:"Avg Readiness Score", value: `${avgScore}/100`, color: SCORE_COLOR(avgScore) },
          { label:"Next Scheduled", value: nextExercise, color:"hsl(var(--brand))" },
          { label:"Participants Trained", value: totalParticipants, color:"#22c55e" },
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
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto gap-1"><Export size={14} />Export</Button>
      </div>

      {bulk.length > 0 && (
        <BulkActionToolbar count={bulk.length} onClear={() => setBulk([])}
          actions={[
            { label:"Cancel", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, status:"Cancelled" } : i)); setBulk([]); toast.success("Cancelled"); } },
            { label:"Delete", variant:"destructive", onClick: () => { setItems(p => p.filter(i => !bulk.includes(i.id))); setBulk([]); toast.success("Deleted"); } },
          ]}
        />
      )}

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={e => setBulk(e.target.checked ? sp.page.map(i => i.id) : [])} className="rounded" /></th>
              <Th label="Ref" col="id" sp={sp} />
              <Th label="Exercise Name" col="name" sp={sp} />
              <Th label="Scenario Type" col="scenarioType" sp={sp} />
              <Th label="Date" col="date" sp={sp} />
              <Th label="Duration" col="duration" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))]">Participants</th>
              <Th label="Readiness" col="readinessScore" sp={sp} />
              <Th label="Findings" col="findings" sp={sp} />
              <Th label="Status" col="status" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sp.page.length === 0 && (
              <tr><td colSpan={11}><EmptyState icon={<Target size={32} />} title="No exercises found" description="Plan your first tabletop exercise" action={<Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>Plan Exercise</Button>} /></td></tr>
            )}
            {sp.page.map(item => (
              <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={bulk.includes(item.id)} onChange={() => toggleBulk(item.id)} className="rounded" /></td>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{item.id}</td>
                <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[160px] truncate">{item.name}</td>
                <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]">{item.scenarioType}</span></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.date}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.duration}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">
                  <span className="flex items-center gap-1"><Users size={12} />{(item.participants || []).length}</span>
                </td>
                <td className="px-4 py-3">
                  {item.readinessScore > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width:`${item.readinessScore}%`, background: SCORE_COLOR(item.readinessScore) }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: SCORE_COLOR(item.readinessScore) }}>{item.readinessScore}</span>
                    </div>
                  ) : <span className="text-xs text-[hsl(var(--text-3))]">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.findings > 0 ? <span className="text-amber-600 font-semibold">{item.findings} issues</span> : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewItem(item); setModal("view"); }}><Eye size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><PencilSimple size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-red-500"><Trash size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar sp={sp} />

      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY); setEditId(null); }} title={editId ? "Edit Exercise" : "Plan Tabletop Exercise"} size="lg">
        <FormSection title="Exercise Overview">
          <TInput label="Exercise Name *" value={form.name} onChange={setF("name")} placeholder="e.g. Operation Shadow Model" />
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Scenario Type" value={form.scenarioType} onChange={setF("scenarioType")} options={SCENARIO_TYPES} />
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Date" value={form.date} onChange={setF("date")} type="date" />
            <TInput label="Duration" value={form.duration} onChange={setF("duration")} placeholder="e.g. 2h, 4h, Full day" />
          </div>
          <TSelect label="Facilitator" value={form.facilitator} onChange={setF("facilitator")} options={FACILITATORS} />
          <TTextarea label="Objectives" value={form.objectives} onChange={setF("objectives")} rows={2} placeholder="What are the goals of this exercise?" />
          <TTextarea label="Scenario Narrative" value={form.narrative} onChange={setF("narrative")} rows={4} placeholder="Describe the scenario in detail" />
        </FormSection>
        <FormSection title="Participants">
          <div className="flex gap-2 mb-2">
            <Input value={partInput} onChange={e => setPartInput(e.target.value)} placeholder="Add participant name" className="h-8 text-sm flex-1" onKeyDown={e => { if (e.key === "Enter" && partInput.trim()) { setForm((f: any) => ({ ...f, participants: [...(f.participants||[]), partInput.trim()] })); setPartInput(""); } }} />
            <Button size="sm" variant="outline" onClick={() => { if (partInput.trim()) { setForm((f: any) => ({ ...f, participants: [...(f.participants||[]), partInput.trim()] })); setPartInput(""); } }}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(form.participants||[]).map((p: string, idx: number) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]">
                {p}<button onClick={() => setForm((f: any) => ({ ...f, participants: f.participants.filter((_: any, i: number) => i !== idx) }))} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
              </span>
            ))}
          </div>
        </FormSection>
        <FormSection title="Readiness Scoring (post-exercise)">
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Overall Readiness Score (0-100)" value={form.readinessScore} onChange={setF("readinessScore")} type="number" placeholder="0-100" />
            <TInput label="Findings Count" value={form.findings} onChange={setF("findings")} type="number" placeholder="0" />
          </div>
        </FormSection>
        <FormFooter saving={saving} onDraft={() => save(true)} onSubmit={() => save(false)} submitLabel={form.status === "Completed" ? "Generate Report" : "Save Exercise"} onCancel={() => { setModal(null); setForm(EMPTY); setEditId(null); }} />
      </CrudModal>

      <CrudSlideOver open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.name || ""}>
        {viewItem && <>
          <MetaBar items={[
            { label:"Ref", value: viewItem.id },
            { label:"Type", value: viewItem.scenarioType },
            { label:"Date", value: viewItem.date },
            { label:"Duration", value: viewItem.duration },
            { label:"Status", value: <StatusBadge status={viewItem.status} /> },
            { label:"Facilitator", value: viewItem.facilitator },
          ]} />
          <FormSection title="Scenario Narrative">
            <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.narrative || "—"}</p>
            <p className="text-sm text-[hsl(var(--text-3))] mt-2">{viewItem.objectives}</p>
          </FormSection>
          {viewItem.injects?.length > 0 && (
            <FormSection title="Scenario Injects">
              <div className="space-y-3">
                {viewItem.injects.map((inj: any, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-[hsl(var(--brand))] flex items-center justify-center text-xs font-bold text-white">{idx+1}</div>
                      {idx < viewItem.injects.length-1 && <div className="w-0.5 flex-1 bg-[hsl(var(--border))] mt-1" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono text-[hsl(var(--brand))] font-semibold">{inj.time}</span>
                      </div>
                      <div className="text-sm font-medium text-[hsl(var(--text-1))]">{inj.desc}</div>
                      <div className="text-xs text-[hsl(var(--text-3))] mt-0.5">Expected: {inj.expected}</div>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
          <FormSection title="Participants">
            <div className="flex flex-wrap gap-1">
              {(viewItem.participants || []).map((p: string) => (
                <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]"><Users size={10} />{p}</span>
              ))}
            </div>
          </FormSection>
          {viewItem.readinessScore > 0 && (
            <FormSection title="Readiness Scoring">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width:`${viewItem.readinessScore}%`, background: SCORE_COLOR(viewItem.readinessScore) }} />
                </div>
                <span className="font-bold text-sm" style={{ color: SCORE_COLOR(viewItem.readinessScore) }}>{viewItem.readinessScore}/100</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(viewItem.scoring||{}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-sm">
                    <div className="w-16 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${v}%`, background: SCORE_COLOR(v as number) }} />
                    </div>
                    <span className="text-xs text-[hsl(var(--text-2))]">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                    <span className="text-xs font-semibold ml-auto" style={{ color: SCORE_COLOR(v as number) }}>{v as number}</span>
                  </div>
                ))}
              </div>
              {viewItem.findings > 0 && <p className="text-sm text-amber-600 mt-2 font-medium">{viewItem.findings} findings identified during exercise</p>}
            </FormSection>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => openEdit(viewItem)} variant="outline" size="sm"><PencilSimple size={14} className="mr-1" />Edit</Button>
            <Button onClick={() => { setModal(null); setDeleteTarget(viewItem); }} variant="destructive" size="sm"><Trash size={14} className="mr-1" />Delete</Button>
          </div>
        </>}
      </CrudSlideOver>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete Exercise" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
