// @ts-nocheck
import { useState, useMemo } from "react";
import { FileText, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, X, Warning, Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const FILING_TYPES = ["GDPR Breach (Art.33)","GDPR Data Subject (Art.34)","EU AI Act Serious Incident","Voluntary Disclosure","Annual Report","Registration","Other"];
const REGULATORS = ["ICO (UK)","CNIL (France)","BfDI (Germany)","DPC (Ireland)","AI Office (EU)","AEPD (Spain)","Garante (Italy)","UODO (Poland)","NAIH (Hungary)"];
const JURISDICTIONS = ["EU","UK","DE","FR","IE","IT","PL","HU","ES"];
const STATUSES = ["Draft","Ready to File","Filed","Acknowledged","Under Review","Closed","Overdue"];
const FILERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel"];

const SEED: any[] = [
  { id:"RF-001", type:"GDPR Breach (Art.33)", regulator:"ICO (UK)", relatedIncident:"INC-004", deadline:"2026-03-20T08:15:00Z", filedAt:"2026-03-20T16:30:00Z", status:"Filed", jurisdiction:"UK", filer:"Dr. Sarah Chen", title:"Data Breach Notification — Customer Support Logging", summary:"PII exposure via S3 logging misconfiguration. 8,740 data subjects affected. Names and emails exposed for 47 minutes.", affectedSubjects:8740, dataCategories:"Names, Email addresses", subjectNotified:true, attachments:["breach_report.pdf","technical_analysis.pdf"], commLog:["2026-03-20: Initial submission via ICO portal","2026-03-22: ICO acknowledged receipt. Case ref: ICO-2026-1234"], createdAt:"2026-03-18", updatedAt:"2026-03-22", createdBy:"schen" },
  { id:"RF-002", type:"EU AI Act Serious Incident", regulator:"AI Office (EU)", relatedIncident:"INC-003", deadline:"2026-03-15T00:00:00Z", filedAt:"2026-03-14T11:00:00Z", status:"Acknowledged", jurisdiction:"EU", filer:"Alex Kumar", title:"Serious Incident — AI Hallucination in Compliance Report", summary:"GPT-4o generated fabricated EU AI Act citations submitted to board. High-risk AI system incident under EU AI Act Art.73.", affectedSubjects:12, dataCategories:"N/A", subjectNotified:false, attachments:["incident_report.pdf"], commLog:["2026-03-14: Filed via AI Office portal","2026-03-16: Acknowledgement received. Ref: EUAI-2026-0892"], createdAt:"2026-03-01", updatedAt:"2026-03-16", createdBy:"akumar" },
  { id:"RF-003", type:"Voluntary Disclosure", regulator:"CNIL (France)", relatedIncident:"INC-001", deadline:"2026-02-28T00:00:00Z", filedAt:"2026-02-25T14:00:00Z", status:"Under Review", jurisdiction:"FR", filer:"Emma Rodriguez", title:"Voluntary Disclosure — Algorithmic Bias in HR Screening", summary:"Voluntary disclosure of gender bias in AI-powered HR screening tool affecting candidate assessment outcomes in France.", affectedSubjects:450, dataCategories:"Name, Email, Assessment scores", subjectNotified:true, attachments:["bias_audit_report.pdf","remediation_plan.pdf"], commLog:["2026-02-25: Voluntary disclosure submitted","2026-03-01: CNIL confirmed receipt, assigned to reviewer"], createdAt:"2026-01-15", updatedAt:"2026-03-01", createdBy:"erodriguez" },
  { id:"RF-004", type:"Annual Report", regulator:"BfDI (Germany)", relatedIncident:"", deadline:"2026-06-30T00:00:00Z", filedAt:"", status:"Draft", jurisdiction:"DE", filer:"James Wilson", title:"Annual DPO Activity Report 2025", summary:"Annual report of DPO activities, data processing activities register, DPIA summary, and breach statistics for FY2025.", affectedSubjects:0, dataCategories:"N/A", subjectNotified:false, attachments:[], commLog:[], createdAt:"2026-01-01", updatedAt:"2026-04-01", createdBy:"jwilson" },
  { id:"RF-005", type:"Registration", regulator:"ICO (UK)", relatedIncident:"", deadline:"2026-05-01T00:00:00Z", filedAt:"", status:"Ready to File", jurisdiction:"UK", filer:"Nina Patel", title:"ICO Annual Registration Renewal FY2026", summary:"Annual renewal of ICO data protection registration as required by UK GDPR / Data Protection Act 2018.", affectedSubjects:0, dataCategories:"N/A", subjectNotified:false, attachments:["renewal_form.pdf"], commLog:[], createdAt:"2026-03-15", updatedAt:"2026-04-10", createdBy:"npatel" },
  { id:"RF-006", type:"GDPR Breach (Art.33)", regulator:"DPC (Ireland)", relatedIncident:"INC-005", deadline:"2026-04-05T16:45:00Z", filedAt:"", status:"Overdue", jurisdiction:"IE", filer:"Dr. Sarah Chen", title:"Breach Notification — NLP Classifier Data Exposure", summary:"OVERDUE: 72-hour breach notification window elapsed. Exposure via NLP classifier concept drift enabling unintended data access.", affectedSubjects:320, dataCategories:"Legal document contents, PII", subjectNotified:false, attachments:[], commLog:[], createdAt:"2026-04-02", updatedAt:"2026-04-08", createdBy:"schen" },
];

const EMPTY: any = { title:"", type:"GDPR Breach (Art.33)", regulator:"ICO (UK)", relatedIncident:"", deadline:"", filedAt:"", status:"Draft", jurisdiction:"EU", filer:"", summary:"", affectedSubjects:"", dataCategories:"", subjectNotified:false, attachments:[], commLog:[] };

const isOverdueSoon = (item: any) => {
  if (!item.deadline || item.status === "Filed" || item.status === "Acknowledged" || item.status === "Closed") return null;
  const diff = new Date(item.deadline).getTime() - Date.now();
  if (diff < 0) return "OVERDUE";
  if (diff < 24 * 3600 * 1000) {
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000);
    return `${h}h ${m}m remaining`;
  }
  return null;
};

export default function RegulatorFilings() {
  const [items, setItems] = useState(SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.title.toLowerCase().includes(q) || i.regulator.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (typeFilter === "all" || i.type === typeFilter);
  }), [items, search, statusFilter, typeFilter]);

  const sp = useSortAndPage(filtered, "deadline");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Draft" : (form.status || "Draft");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("Filing updated");
      } else {
        const id = `RF-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Filing created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Filing deleted"); };
  const toggleBulk = (id: string) => setBulk(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = sp.page.length > 0 && sp.page.every(i => bulk.includes(i.id));

  const openFilings = items.filter(i => i.status === "Draft" || i.status === "Ready to File" || i.status === "In Progress").length;
  const overdue = items.filter(i => i.status === "Overdue").length;
  const filedThisQ = items.filter(i => i.status === "Filed" || i.status === "Acknowledged").length;

  const urgentBanner = items.filter(i => {
    const warn = isOverdueSoon(i);
    return warn !== null;
  });

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />

      {urgentBanner.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3">
          <Warning size={20} className="text-red-600 mt-0.5 shrink-0" weight="fill" />
          <div className="text-sm text-red-800">
            {urgentBanner.map(item => {
              const warn = isOverdueSoon(item);
              return <div key={item.id}>⚠ <strong>{item.type}</strong> requires notification. <strong>[{item.id}]</strong> — {warn === "OVERDUE" ? <span className="font-bold text-red-900">OVERDUE — deadline passed</span> : <span>deadline in <strong>{warn}</strong></span>}.</div>;
            })}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
            <FileText size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Regulator Filings
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Track mandatory regulatory notifications — GDPR Art.33, EU AI Act, and voluntary disclosures</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> New Filing
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label:"Total Filings", value: items.length, color:"hsl(var(--text-1))" },
          { label:"Open / In Progress", value: openFilings, color:"#f59e0b" },
          { label:"Overdue", value: overdue, color:"#ef4444" },
          { label:"Filed This Quarter", value: filedThisQ, color:"#22c55e" },
          { label:"Avg Time to File", value: "38h", color:"hsl(var(--brand))" },
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
          <Input placeholder="Search filings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Types</option>
          {FILING_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        {(search || statusFilter !== "all" || typeFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto gap-1"><Export size={14} />Export</Button>
      </div>

      {bulk.length > 0 && (
        <BulkActionToolbar count={bulk.length} onClear={() => setBulk([])}
          actions={[
            { label:"Mark as Filed", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, status:"Filed", filedAt: new Date().toISOString() } : i)); setBulk([]); toast.success("Marked as filed"); } },
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
              <Th label="Title" col="title" sp={sp} />
              <Th label="Type" col="type" sp={sp} />
              <Th label="Regulator" col="regulator" sp={sp} />
              <Th label="Deadline" col="deadline" sp={sp} />
              <Th label="Status" col="status" sp={sp} />
              <Th label="Jurisdiction" col="jurisdiction" sp={sp} />
              <Th label="Filer" col="filer" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sp.page.length === 0 && (
              <tr><td colSpan={10}><EmptyState icon={<FileText size={32} />} title="No filings found" description="Create a new regulator filing" action={<Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>New Filing</Button>} /></td></tr>
            )}
            {sp.page.map(item => {
              const warn = isOverdueSoon(item);
              return (
                <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={bulk.includes(item.id)} onChange={() => toggleBulk(item.id)} className="rounded" /></td>
                  <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[200px] truncate">{item.title}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]">{item.type}</span></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.regulator}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{item.deadline ? new Date(item.deadline).toLocaleDateString() : "—"}</div>
                    {warn && <span className={`text-xs font-semibold ${warn === "OVERDUE" ? "text-red-600" : "text-amber-600"}`}>{warn}</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.jurisdiction}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.filer}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewItem(item); setModal("view"); }}><Eye size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><PencilSimple size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-red-500"><Trash size={14} /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar sp={sp} />

      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY); setEditId(null); }} title={editId ? "Edit Filing" : "New Regulator Filing"} size="lg">
        <FormSection title="Filing Details">
          <TInput label="Title *" value={form.title} onChange={setF("title")} placeholder="e.g. Data Breach Notification — Customer Logging" />
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Filing Type" value={form.type} onChange={setF("type")} options={FILING_TYPES} />
            <TSelect label="Regulator" value={form.regulator} onChange={setF("regulator")} options={REGULATORS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Jurisdiction" value={form.jurisdiction} onChange={setF("jurisdiction")} options={JURISDICTIONS} />
            <TInput label="Related Incident Ref" value={form.relatedIncident} onChange={setF("relatedIncident")} placeholder="e.g. INC-004" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Deadline" value={form.deadline} onChange={setF("deadline")} type="datetime-local" />
            <TInput label="Filed At" value={form.filedAt} onChange={setF("filedAt")} type="datetime-local" />
          </div>
          <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
          <TSelect label="Filer" value={form.filer} onChange={setF("filer")} options={FILERS} />
        </FormSection>
        <FormSection title="Incident Summary & Affected Data Subjects">
          <TTextarea label="Summary" value={form.summary} onChange={setF("summary")} rows={3} placeholder="Brief description of the filing subject" />
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Affected Data Subjects" value={form.affectedSubjects} onChange={setF("affectedSubjects")} type="number" placeholder="0" />
            <TInput label="Data Categories" value={form.dataCategories} onChange={setF("dataCategories")} placeholder="e.g. Name, Email" />
          </div>
        </FormSection>
        <FormFooter saving={saving} onDraft={() => save(true)} onSubmit={() => save(false)} submitLabel="Submit for DPO Approval" onCancel={() => { setModal(null); setForm(EMPTY); setEditId(null); }} />
      </CrudModal>

      <CrudModal open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.title || ""} size="lg">
        {viewItem && <>
          <MetaBar items={[
            { label:"Ref", value: viewItem.id },
            { label:"Type", value: viewItem.type },
            { label:"Regulator", value: viewItem.regulator },
            { label:"Jurisdiction", value: viewItem.jurisdiction },
            { label:"Status", value: <StatusBadge status={viewItem.status} /> },
            { label:"Filer", value: viewItem.filer },
          ]} />
          <FormSection title="Timeline">
            <div className="relative">
              {[
                { node:"Incident Detected", date: viewItem.createdAt, done: true },
                { node:"Filing Drafted", date: viewItem.createdAt, done: !!viewItem.title },
                { node:"DPO Approved", date:"—", done: viewItem.status !== "Draft" },
                { node:"Filed", date: viewItem.filedAt ? new Date(viewItem.filedAt).toLocaleDateString() : "—", done: !!viewItem.filedAt },
                { node:"Regulator Acknowledged", date:"—", done: viewItem.status === "Acknowledged" || viewItem.status === "Under Review" || viewItem.status === "Closed" },
                { node:"Closed", date:"—", done: viewItem.status === "Closed" },
              ].map((step, idx, arr) => (
                <div key={step.node} className="flex gap-3 mb-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step.done ? "bg-green-500 text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--text-3))]"}`}>{idx+1}</div>
                    {idx < arr.length-1 && <div className="w-0.5 flex-1 bg-[hsl(var(--border))] mt-1" />}
                  </div>
                  <div className="pb-3">
                    <div className="text-sm font-medium text-[hsl(var(--text-1))]">{step.node}</div>
                    <div className="text-xs text-[hsl(var(--text-3))]">{step.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
          <FormSection title="Incident Summary & Affected Data Subjects">
            <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.summary}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <div><span className="text-[hsl(var(--text-3))]">Affected:</span> <span className="font-semibold text-[hsl(var(--text-1))]">{viewItem.affectedSubjects?.toLocaleString()}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Categories:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.dataCategories}</span></div>
            </div>
          </FormSection>
          {viewItem.commLog?.length > 0 && (
            <FormSection title="Communication Log">
              <div className="space-y-2">
                {viewItem.commLog.map((log: string, i: number) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <Clock size={14} className="text-[hsl(var(--text-3))] mt-0.5 shrink-0" />
                    <span className="text-[hsl(var(--text-2))]">{log}</span>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => openEdit(viewItem)} variant="outline" size="sm"><PencilSimple size={14} className="mr-1" />Edit</Button>
            <Button onClick={() => { toast.success("Marked as Filed"); setItems(p => p.map(i => i.id === viewItem.id ? { ...i, status:"Filed", filedAt: new Date().toISOString() } : i)); setModal(null); }} variant="default" size="sm">Mark as Filed</Button>
            <Button onClick={() => { setModal(null); setDeleteTarget(viewItem); }} variant="destructive" size="sm"><Trash size={14} className="mr-1" />Delete</Button>
          </div>
        </>}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete Filing" description={`Delete "${deleteTarget?.title}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
