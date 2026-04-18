// @ts-nocheck
import { useState, useMemo } from "react";
import { Scales, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, FlaskConical } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const ATTRIBUTES = ["Gender","Race / Ethnicity","Age","Disability","Religion","National Origin","Socioeconomic Status","Geography"];
const METHODOLOGIES = ["Disparate Impact","Equal Opportunity","Demographic Parity","Calibration","Counterfactual Fairness","Custom"];
const FRAMEWORKS = ["EU AI Act","NIST AI RMF","ISO 42001","GDPR","US Executive Order on AI"];
const SEVERITIES = ["Critical","High","Medium","Low","Informational"];
const STATUSES = ["Draft","In Progress","Completed","Failed","Archived"];
const MODELS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Loan Approval AI"];

const SEED: any[] = [
  { id:"BA-001", name:"Q1 Bias Audit — HR Screening", model:"HR Screening Model", date:"2026-01-15", attributes:["Gender","Race / Ethnicity"], methodology:"Disparate Impact", dataset:"HR Dataset 2025", score:0.79, status:"Completed", severity:"High", auditor:"Dr. Sarah Chen", org:"Internal Audit", remediationRequired:true, framework:"EU AI Act", findings:"Disparate impact ratio of 0.79 detected on gender dimension. Hiring outcomes show 21% gap between protected and non-protected groups.", createdAt:"2026-01-02", updatedAt:"2026-01-15", createdBy:"admin" },
  { id:"BA-002", name:"Credit Bias Check — Q4 2025", model:"Credit Scoring Engine", date:"2025-12-20", attributes:["Race / Ethnicity","Age"], methodology:"Equal Opportunity", dataset:"Credit Dataset v4", score:0.92, status:"Completed", severity:"Medium", auditor:"Alex Kumar", org:"Deloitte", remediationRequired:false, framework:"NIST AI RMF", findings:"Model passes equal opportunity metric with score of 0.92. Minor age-related disparity noted but within acceptable threshold.", createdAt:"2025-12-01", updatedAt:"2025-12-20", createdBy:"akumar" },
  { id:"BA-003", name:"Fraud Detection Fairness Eval", model:"Fraud Detection v3", date:"2026-02-01", attributes:["Geography","Socioeconomic Status"], methodology:"Demographic Parity", dataset:"Transactions 2025", score:0.85, status:"In Progress", severity:"Medium", auditor:"Priya Nair", org:"EY", remediationRequired:false, framework:"ISO 42001", findings:"", createdAt:"2026-01-20", updatedAt:"2026-01-28", createdBy:"pnair" },
  { id:"BA-004", name:"Loan Approval Equity Audit", model:"Loan Approval AI", date:"2026-03-10", attributes:["Gender","Age","Disability"], methodology:"Counterfactual Fairness", dataset:"Loan Applications 2025", score:null, status:"Draft", severity:"High", auditor:"James Wilson", org:"Internal", remediationRequired:true, framework:"EU AI Act", findings:"", createdAt:"2026-02-15", updatedAt:"2026-02-15", createdBy:"jwilson" },
  { id:"BA-005", name:"NLP Classification Bias", model:"NLP Classifier", date:"2025-11-30", attributes:["Gender","National Origin"], methodology:"Calibration", dataset:"Text Corpus v2", score:0.61, status:"Failed", severity:"Critical", auditor:"Emma Rodriguez", org:"Internal Audit", remediationRequired:true, framework:"GDPR", findings:"Calibration error exceeds threshold. Gender and national origin show significant miscalibration. Immediate remediation required.", createdAt:"2025-11-01", updatedAt:"2025-12-01", createdBy:"erodriguez" },
];

const EMPTY: any = { name:"", model:"", date:"", attributes:[], methodology:"", dataset:"", periodFrom:"", periodTo:"", auditor:"", org:"", findings:"", severity:"Medium", remediationRequired:false, framework:"", status:"Draft" };

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-[hsl(var(--text-4))]">—</span>;
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? "#22c55e" : pct >= 75 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
        <div style={{ width:`${pct}%`, background:color, height:"100%" }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score.toFixed(2)}</span>
    </div>
  );
}

export default function BiasAudits() {
  const [items, setItems] = useState(SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.model.toLowerCase().includes(q) || i.auditor.toLowerCase().includes(q)) && (statusFilter === "all" || i.status === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!draft && !form.name.trim()) { toast.error("Audit name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Draft" : (form.status || "Completed");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("Updated");
      } else {
        const id = `BA-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, score:null, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => {
    setForm({ name:item.name, model:item.model, date:item.date, attributes:item.attributes, methodology:item.methodology, dataset:item.dataset, periodFrom:"", periodTo:"", auditor:item.auditor, org:item.org, findings:item.findings, severity:item.severity, remediationRequired:item.remediationRequired, framework:item.framework, status:item.status });
    setEditId(item.id); setModal("edit");
  };

  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Deleted"); };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Scales size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Bias Audits</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Automated fairness auditing & bias detection for AI systems</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />New Audit</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Audits", items.length],["Completed", items.filter(i=>i.status==="Completed").length],["Critical / High", items.filter(i=>["Critical","High"].includes(i.severity)).length],["Needs Remediation", items.filter(i=>i.remediationRequired).length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search audits…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted selected"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<FlaskConical size={32} className="text-[hsl(var(--brand))]" />} title="No bias audits found" description="Create your first audit to track fairness metrics." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />New Audit</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="name" label="Audit Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="model" label="Model / System" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="date" label="Audit Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Attributes</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Bias Score</th>
                  <Th col="severity" label="Severity" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="auditor" label="Auditor" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p><p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id}</p></td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))]">{item.model}</td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-3))] whitespace-nowrap">{item.date}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {item.attributes.slice(0,2).map((a:string)=><span key={a} className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{a}</span>)}
                        {item.attributes.length>2&&<span className="text-xs text-[hsl(var(--text-4))]">+{item.attributes.length-2}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><ScoreBar score={item.score} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.severity} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))]">{item.auditor}</td>
                    <td className="px-3 py-2.5 text-right" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setViewItem(item); setModal("view"); }} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]"><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]"><PencilSimple size={14} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="p-1.5 hover:bg-red-50 text-[hsl(0_72%_51%)]"><Trash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent></Card>

      <PaginationBar total={sp.total} page={sp.page} perPage={sp.perPage} onPage={sp.setPage} onPerPage={sp.setPerPage} />

      {/* Create / Edit */}
      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Bias Audit":"New Bias Audit"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Audit Name" required value={form.name} onChange={setF("name")} placeholder="Q1 Fairness Audit — HR Screening" />
              <TInput label="Audit Date" type="date" value={form.date} onChange={setF("date")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Target Model" required value={form.model} onChange={setF("model")} options={MODELS} />
              <TSelect label="Dataset Used" value={form.dataset} onChange={setF("dataset")} options={["HR Dataset 2025","Credit Dataset v4","Transactions 2025","Loan Applications 2025","Text Corpus v2"]} />
            </div>
          </FormSection>
          <FormSection title="Audit Scope">
            <TCheckGroup label="Protected Attributes *" options={ATTRIBUTES} value={form.attributes} onChange={setF("attributes")} />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Methodology" value={form.methodology} onChange={setF("methodology")} options={METHODOLOGIES} />
              <TSelect label="Regulatory Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Period From" type="date" value={form.periodFrom} onChange={setF("periodFrom")} />
              <TInput label="Period To" type="date" value={form.periodTo} onChange={setF("periodTo")} />
            </div>
          </FormSection>
          <FormSection title="Auditor & Findings">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Auditor Name" required value={form.auditor} onChange={setF("auditor")} placeholder="Dr. Sarah Chen" />
              <TInput label="Auditor Organization" value={form.org} onChange={setF("org")} placeholder="Internal / Deloitte / EY" />
            </div>
            <TTextarea label="Findings Summary" value={form.findings} onChange={setF("findings")} placeholder="Summarise key findings…" rows={4} maxLength={2000} />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Severity" value={form.severity} onChange={setF("severity")} options={SEVERITIES} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <TToggle label="Remediation Required" value={form.remediationRequired} onChange={setF("remediationRequired")} hint="Enable if results require remediation actions" />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Audit":"Submit Audit"} />
      </CrudModal>

      {/* Detail */}
      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.name??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap"><StatusBadge status={viewItem.status} /><StatusBadge status={viewItem.severity} />{viewItem.remediationRequired&&<StatusBadge status="Remediation Required" />}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Model",viewItem.model],["Methodology",viewItem.methodology],["Dataset",viewItem.dataset],["Framework",viewItem.framework],["Auditor",viewItem.auditor],["Organization",viewItem.org],["Audit Date",viewItem.date]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              <div><p className="text-xs text-[hsl(var(--text-4))] mb-1.5">Protected Attributes</p>
                <div className="flex flex-wrap gap-1.5">{viewItem.attributes.map((a:string)=><span key={a} className="text-xs px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{a}</span>)}</div>
              </div>
              <div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Overall Bias Score</p><ScoreBar score={viewItem.score} /></div>
              {viewItem.findings&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Findings Summary</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.findings}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"created this audit"},{date:viewItem.updatedAt,actor:"system",action:"last updated record"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`} message="This action cannot be undone. All associated records will be unlinked." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
