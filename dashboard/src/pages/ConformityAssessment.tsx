// @ts-nocheck
import { useState, useMemo } from "react";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { ClipboardText, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const FRAMEWORKS = ["EU AI Act","ISO 42001","NIST AI RMF","SOC 2 Type II","ISO 27001","GDPR","HIPAA","PCI DSS","BS 8611","IEEE 7000"];
const ASSESSMENT_TYPES = ["Self-Assessment","Internal Audit","Third-Party Audit","Certification Audit","Gap Assessment","Surveillance Audit","Recertification"];
const OUTCOMES = ["Conformant","Non-Conformant","Partially Conformant","Conditional","Under Review","Not Yet Assessed"];
const AI_SYSTEMS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Customer Support Orchestrator","All AI Systems","Platform-Wide"];
const AUDITORS_LIST = ["Internal AI Ethics Board","Deloitte","EY","PwC","KPMG","Bureau Veritas","BSI Group","Internal Audit Team","External Consultant"];
const STATUSES = ["Planned","In Progress","Completed","Overdue","Cancelled","Awaiting Report"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson"];

const SEED: any[] = [
  { id:"CA-001", title:"EU AI Act — Annual Conformity Assessment 2026", framework:"EU AI Act", assessmentType:"Internal Audit", outcome:"Partially Conformant", systemScope:"All AI Systems", startDate:"2026-01-15", dueDate:"2026-04-30", completedDate:null, owner:"Dr. Sarah Chen", auditor:"Internal AI Ethics Board", completion:72, criticalFindings:2, majorFindings:5, minorFindings:8, status:"In Progress", certificationRequired:true, nextAssessmentDate:"2027-01-15", description:"Annual conformity assessment against EU AI Act requirements for all in-scope AI systems.", summary:"Current scope covers 5 of 6 AI systems. HR Screening Model suspended. 72% of controls conformant. Critical findings in Annex III classification and logging requirements.", actionPlan:"1. Complete HITL implementation for Credit Scoring by 2026-05-31. 2. Remediate HR Model bias issues. 3. Implement audit logging for GPT-4o by 2026-06-30.", createdAt:"2026-01-15", updatedAt:"2026-04-10", createdBy:"admin" },
  { id:"CA-002", title:"ISO 42001 — Certification Audit Q1 2026", framework:"ISO 42001", assessmentType:"Certification Audit", outcome:"Conformant", systemScope:"Platform-Wide", startDate:"2025-12-01", dueDate:"2026-02-28", completedDate:"2026-02-20", owner:"James Wilson", auditor:"Bureau Veritas", completion:100, criticalFindings:0, majorFindings:1, minorFindings:4, status:"Completed", certificationRequired:true, nextAssessmentDate:"2027-02-01", description:"ISO 42001 AI Management System certification audit. Scope: entire AI platform.", summary:"Certified with 1 Major NC (data lineage documentation gap) corrected within audit window. Certificate valid until 2027-02-19.", actionPlan:"Data lineage improvements implemented. Process added to management review agenda.", createdAt:"2025-11-15", updatedAt:"2026-02-20", createdBy:"jwilson" },
  { id:"CA-003", title:"NIST AI RMF — Gap Assessment", framework:"NIST AI RMF", assessmentType:"Gap Assessment", outcome:"Partially Conformant", systemScope:"All AI Systems", startDate:"2025-11-01", dueDate:"2025-12-31", completedDate:"2025-12-15", owner:"Alex Kumar", auditor:"Internal Audit Team", completion:100, criticalFindings:1, majorFindings:8, minorFindings:12, status:"Completed", certificationRequired:false, nextAssessmentDate:"2026-11-01", description:"Gap assessment to establish baseline against NIST AI RMF 1.0 GOVERN/MAP/MEASURE/MANAGE.", summary:"GOVERN function at 85%. MAP at 78%. MEASURE at 71%. MANAGE at 62%. Key gaps in incident response and third-party AI monitoring.", actionPlan:"Roadmap created for Q1-Q2 2026 to close critical gaps. Incident response playbook deployed.", createdAt:"2025-10-15", updatedAt:"2025-12-15", createdBy:"akumar" },
  { id:"CA-004", title:"SOC 2 Type II — Annual Audit FY2026", framework:"SOC 2 Type II", assessmentType:"Certification Audit", outcome:"Under Review", systemScope:"Platform-Wide", startDate:"2026-04-01", dueDate:"2026-10-31", completedDate:null, owner:"Mike Johnson", auditor:"EY", completion:15, criticalFindings:0, majorFindings:0, minorFindings:0, status:"In Progress", certificationRequired:true, nextAssessmentDate:"2027-04-01", description:"Annual SOC 2 Type II audit covering all five trust services criteria for the Sentinel AI GRC platform.", summary:"Audit initiated. EY kick-off meeting completed. Evidence collection begins Q2 2026.", actionPlan:"Evidence collection schedule agreed with EY. First deliverable: access control matrix by 2026-04-30.", createdAt:"2026-04-01", updatedAt:"2026-04-05", createdBy:"mjohnson" },
  { id:"CA-005", title:"GDPR DPA Compliance Review", framework:"GDPR", assessmentType:"Self-Assessment", outcome:"Conformant", systemScope:"All AI Systems", startDate:"2025-10-01", dueDate:"2025-10-31", completedDate:"2025-10-28", owner:"Emma Rodriguez", auditor:"Internal Audit Team", completion:100, criticalFindings:0, majorFindings:2, minorFindings:3, status:"Completed", certificationRequired:false, nextAssessmentDate:"2026-10-01", description:"Annual GDPR self-assessment covering AI training data, inference data and automated decision-making.", summary:"Fully conformant with 2 minor observations on consent refresh cadence and DPIA update frequency.", actionPlan:"Consent refresh process updated. DPIA review moved to semi-annual cycle.", createdAt:"2025-09-15", updatedAt:"2025-10-28", createdBy:"erodriguez" },
];

const EMPTY: any = { title:"", framework:"EU AI Act", assessmentType:"Self-Assessment", outcome:"Not Yet Assessed", systemScope:"All AI Systems", startDate:"", dueDate:"", completedDate:"", owner:"", auditor:"", completion:0, criticalFindings:0, majorFindings:0, minorFindings:0, status:"Planned", certificationRequired:false, nextAssessmentDate:"", description:"", summary:"", actionPlan:"" };

function ProgressBar({ pct }: { pct: number }) {
  const color = pct === 100 ? "#22c55e" : pct >= 60 ? "#3b82f6" : "hsl(var(--s-wn-tx))";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[hsl(var(--border))]"><div style={{ width:`${pct}%`, background:color, height:"100%" }} /></div>
      <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function ConformityAssessment() {
  const { data: items, setData: setItems } = useSupabaseTable('conformityassessment_table', SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.title.toLowerCase().includes(q) || i.framework.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (frameworkFilter === "all" || i.framework === frameworkFilter);
  }), [items, search, statusFilter, frameworkFilter]);

  const sp = useSortAndPage<any>(filtered, "title");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.title.trim()) { toast.error("Assessment title is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Planned" : (form.status || "Planned");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Assessment updated");
      } else {
        const id = `CA-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Assessment created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Assessment deleted"); };

  const uniqueFrameworks = [...new Set(items.map(i=>i.framework))];

  const outcomeColors: Record<string, string> = { Conformant:"#22c55e","Non-Conformant":"hsl(var(--s-er-tx))","Partially Conformant":"hsl(var(--s-wn-tx))","Conditional":"#3b82f6","Under Review":"hsl(var(--tag-purple))","Not Yet Assessed":"#9ca3af" };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><ClipboardText size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Conformity Assessments</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Track certification audits and conformity assessments across frameworks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />New Assessment</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Assessments",items.length],["Completed",items.filter(i=>i.status==="Completed").length],["In Progress",items.filter(i=>i.status==="In Progress").length],["Conformant",items.filter(i=>i.outcome==="Conformant").length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search assessments…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={frameworkFilter} onChange={e=>setFrameworkFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Frameworks</option>{uniqueFrameworks.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<ClipboardText size={32} className="text-[hsl(var(--brand))]" />} title="No assessments found" description="Create a conformity assessment to start tracking certification readiness." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} />New Assessment</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="title" label="Assessment Title" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="framework" label="Framework" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="assessmentType" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Progress</th>
                  <Th col="outcome" label="Outcome" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Findings</th>
                  <Th col="dueDate" label="Due Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{item.title}</p>
                      <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · {item.auditor}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{item.framework}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.assessmentType}</td>
                    <td className="px-3 py-2.5"><ProgressBar pct={item.completion} /></td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 border font-medium" style={{ color:outcomeColors[item.outcome], borderColor:`${outcomeColors[item.outcome]}40`, background:`${outcomeColors[item.outcome]}12` }}>{item.outcome}</span>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        {item.criticalFindings>0&&<span className="px-1 py-0.5 bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border border-[hsl(var(--s-er-br))]">{item.criticalFindings}C</span>}
                        {item.majorFindings>0&&<span className="px-1 py-0.5 bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border border-[hsl(var(--s-wn-br))]">{item.majorFindings}M</span>}
                        {item.minorFindings>0&&<span className="px-1 py-0.5 bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))] border border-[hsl(var(--s-in-br))]">{item.minorFindings}m</span>}
                        {!item.criticalFindings&&!item.majorFindings&&!item.minorFindings&&<span className="text-[hsl(var(--text-4))]">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.dueDate}</td>
                    <td className="px-3 py-2.5 text-right" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setViewItem(item); setModal("view"); }} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><PencilSimple size={14} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="p-1.5 hover:bg-[hsl(var(--s-er-bg))] text-[hsl(0_72%_51%)]"><Trash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      <PaginationBar total={sp.total} page={sp.currentPage} perPage={sp.perPage} onPage={sp.setPage} onPerPage={sp.setPerPage} />

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Assessment":"New Conformity Assessment"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Assessment Identity">
            <TInput label="Assessment Title" required value={form.title} onChange={setF("title")} placeholder="EU AI Act — Annual Conformity Assessment 2026" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS} />
              <TSelect label="Assessment Type" value={form.assessmentType} onChange={setF("assessmentType")} options={ASSESSMENT_TYPES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="System Scope" value={form.systemScope} onChange={setF("systemScope")} options={AI_SYSTEMS} />
              <TSelect label="Auditor / Body" value={form.auditor} onChange={setF("auditor")} options={AUDITORS_LIST} />
            </div>
            <TTextarea label="Description" value={form.description} onChange={setF("description")} placeholder="Describe the scope and objectives of this assessment…" rows={3} maxLength={1000} />
          </FormSection>
          <FormSection title="Schedule & Status">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Start Date" type="date" value={form.startDate} onChange={setF("startDate")} />
              <TInput label="Due Date" type="date" value={form.dueDate} onChange={setF("dueDate")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Completed Date" type="date" value={form.completedDate} onChange={setF("completedDate")} />
              <TInput label="Next Assessment Date" type="date" value={form.nextAssessmentDate} onChange={setF("nextAssessmentDate")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
              <TSelect label="Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
            </div>
            <TInput label="Completion %" type="number" value={String(form.completion)} onChange={v=>setF("completion")(Number(v))} placeholder="0–100" />
            <TToggle label="Certification Required" value={form.certificationRequired} onChange={setF("certificationRequired")} hint="Enable if this assessment targets formal certification" />
          </FormSection>
          <FormSection title="Findings & Results">
            <TSelect label="Overall Outcome" value={form.outcome} onChange={setF("outcome")} options={OUTCOMES} />
            <div className="grid grid-cols-3 gap-4">
              <TInput label="Critical Findings" type="number" value={String(form.criticalFindings)} onChange={v=>setF("criticalFindings")(Number(v))} placeholder="0" />
              <TInput label="Major Findings" type="number" value={String(form.majorFindings)} onChange={v=>setF("majorFindings")(Number(v))} placeholder="0" />
              <TInput label="Minor Findings" type="number" value={String(form.minorFindings)} onChange={v=>setF("minorFindings")(Number(v))} placeholder="0" />
            </div>
            <TTextarea label="Assessment Summary" value={form.summary} onChange={setF("summary")} placeholder="Summarize the assessment findings and conclusions…" rows={4} maxLength={2000} />
            <TTextarea label="Action Plan" value={form.actionPlan} onChange={setF("actionPlan")} placeholder="Actions required to achieve or maintain conformity…" rows={4} maxLength={2000} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Assessment":"Create Assessment"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.title??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 border font-medium" style={{ color:outcomeColors[viewItem.outcome], borderColor:`${outcomeColors[viewItem.outcome]}40`, background:`${outcomeColors[viewItem.outcome]}12` }}>{viewItem.outcome}</span>
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.assessmentType}</span>
                {viewItem.certificationRequired&&<span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))] border border-[hsl(var(--s-in-br))]">Certification Required</span>}
              </div>
              <div className="p-3 bg-raised border border-[hsl(var(--border))]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[hsl(var(--text-4))]">Assessment Progress</span>
                  <span className="text-sm font-bold text-[hsl(var(--text-1))]">{viewItem.completion}%</span>
                </div>
                <div className="w-full h-2 bg-[hsl(var(--border))]"><div style={{ width:`${viewItem.completion}%`, background:viewItem.completion===100?"#22c55e":"#3b82f6", height:"100%" }} /></div>
              </div>
              <div className="flex items-center gap-6">
                {[["Critical",viewItem.criticalFindings,"hsl(var(--s-er-tx))"],["Major",viewItem.majorFindings,"hsl(var(--r-hi-tx))"],["Minor",viewItem.minorFindings,"hsl(var(--s-wn-tx))"]].map(([k,v,c])=>(
                  <div key={k} className="text-center">
                    <p className="text-2xl font-bold" style={{ color:c as string }}>{v}</p>
                    <p className="text-xs text-[hsl(var(--text-4))]">{k} Findings</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Framework",viewItem.framework],["System Scope",viewItem.systemScope],["Auditor",viewItem.auditor],["Owner",viewItem.owner],["Start Date",viewItem.startDate],["Due Date",viewItem.dueDate],["Completed Date",viewItem.completedDate||"—"],["Next Assessment",viewItem.nextAssessmentDate||"—"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              {viewItem.summary&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Assessment Summary</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.summary}</p></div>}
              {viewItem.actionPlan&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Action Plan</p><p className="text-sm text-[hsl(var(--text-2))] whitespace-pre-line">{viewItem.actionPlan}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"created this assessment"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.title}"?`} message="This assessment record will be permanently deleted." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
