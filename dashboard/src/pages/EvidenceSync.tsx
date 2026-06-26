import { useState, useMemo } from "react";
import { FileMagnifyingGlass, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const EVIDENCE_TYPES = ["Test Report","Audit Log","Policy Document","Screenshot","Code Review","Penetration Test","Bias Audit Report","Incident Report","Vendor Assessment","Training Record","System Log","Third-Party Certificate"];
const FRAMEWORKS = ["SOC 2","ISO 27001","ISO 42001","EU AI Act","NIST AI RMF","GDPR","HIPAA","PCI DSS"];
const CONTROL_IDS = ["CTL-001","CTL-002","CTL-003","CTL-004","CTL-005","CTL-006","CTL-007","CTL-008"];
const RETENTION_POLICIES = ["90 days","1 year","3 years","5 years","7 years","Indefinite"];
const UPLOAD_STATUSES = ["Pending","Uploaded","Verified","Rejected","Expired","Archived"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson"];
const CLASSIFICATIONS = ["Public","Internal","Confidential","Restricted"];

const SEED: any[] = [
  { id:"EV-001", title:"Q1 2026 Bias Audit Report — HR Screening", evidenceType:"Bias Audit Report", framework:"EU AI Act", controlId:"CTL-004", file:"BA-001_audit_report_Q1_2026.pdf", fileSize:"2.4 MB", uploadDate:"2026-01-16", expiryDate:"2027-01-16", owner:"Dr. Sarah Chen", classification:"Confidential", retentionPolicy:"3 years", verified:true, verifiedBy:"Alex Kumar", notes:"Signed audit report with methodology appendix attached.", status:"Verified", createdAt:"2026-01-16", updatedAt:"2026-01-17", createdBy:"schenai" },
  { id:"EV-002", title:"SOC 2 Type II — FY2025 Audit Certificate", evidenceType:"Third-Party Certificate", framework:"SOC 2", controlId:"CTL-002", file:"SOC2_TypeII_FY2025_Ernst_Young.pdf", fileSize:"8.1 MB", uploadDate:"2025-12-20", expiryDate:"2026-12-19", owner:"Mike Johnson", classification:"Confidential", retentionPolicy:"7 years", verified:true, verifiedBy:"Mike Johnson", notes:"Annual SOC 2 Type II report from EY. All criteria met.", status:"Verified", createdAt:"2025-12-20", updatedAt:"2025-12-22", createdBy:"mjohnson" },
  { id:"EV-003", title:"Penetration Test Report — AI API Endpoints", evidenceType:"Penetration Test", framework:"ISO 27001", controlId:"CTL-001", file:"pentest_Q4_2025_AI_APIs.pdf", fileSize:"5.7 MB", uploadDate:"2025-11-30", expiryDate:"2026-11-29", owner:"Alex Kumar", classification:"Restricted", retentionPolicy:"3 years", verified:true, verifiedBy:"Dr. Sarah Chen", notes:"3 medium-severity findings. All remediated by 2025-12-15.", status:"Verified", createdAt:"2025-11-30", updatedAt:"2025-12-15", createdBy:"akumar" },
  { id:"EV-004", title:"Human Oversight Policy v3.1", evidenceType:"Policy Document", framework:"EU AI Act", controlId:"CTL-005", file:"human_oversight_policy_v3.1.docx", fileSize:"340 KB", uploadDate:"2026-03-01", expiryDate:"2027-03-01", owner:"Lisa Park", classification:"Internal", retentionPolicy:"5 years", verified:false, verifiedBy:null, notes:"Updated policy pending final board approval.", status:"Pending", createdAt:"2026-03-01", updatedAt:"2026-03-01", createdBy:"lpark" },
  { id:"EV-005", title:"Vendor Assessment — DeepLearning Inc", evidenceType:"Vendor Assessment", framework:"SOC 2", controlId:"CTL-006", file:"vendor_deeplearning_inc_assessment.xlsx", fileSize:"1.2 MB", uploadDate:"2026-04-08", expiryDate:"2027-04-07", owner:"Mike Johnson", classification:"Confidential", retentionPolicy:"5 years", verified:false, verifiedBy:null, notes:"Assessment triggered rejected vendor approval. Filed for records.", status:"Uploaded", createdAt:"2026-04-08", updatedAt:"2026-04-10", createdBy:"mjohnson" },
];

const EMPTY: any = { title:"", evidenceType:"Test Report", framework:"SOC 2", controlId:"", file:"", fileSize:"", uploadDate:"", expiryDate:"", owner:"", classification:"Internal", retentionPolicy:"3 years", verified:false, verifiedBy:"", notes:"", status:"Pending" };

export default function EvidenceSync() {
  const [items, setItems] = useState(SEED);
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
    return (i.title.toLowerCase().includes(q) || i.evidenceType.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (frameworkFilter === "all" || i.framework === frameworkFilter);
  }), [items, search, statusFilter, frameworkFilter]);

  const sp = useSortAndPage<any>(filtered, "title");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.title.trim()) { toast.error("Evidence title is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Pending" : (form.status || "Uploaded");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Evidence updated");
      } else {
        const id = `EV-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Evidence uploaded");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Evidence deleted"); };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><FileMagnifyingGlass size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Evidence Sync</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Collect, verify and manage compliance evidence artifacts across frameworks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Upload Evidence</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Evidence",items.length],["Verified",items.filter(i=>i.status==="Verified").length],["Pending Review",items.filter(i=>["Pending","Uploaded"].includes(i.status)).length],["Expiring Soon",items.filter(i=>{ const d=new Date(i.expiryDate); const now=new Date(); return d>now && (d.getTime()-now.getTime())<90*24*60*60*1000; }).length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search evidence…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{UPLOAD_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={frameworkFilter} onChange={e=>setFrameworkFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Frameworks</option>{FRAMEWORKS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<FileMagnifyingGlass size={32} className="text-[hsl(var(--brand))]" />} title="No evidence found" description="Upload evidence artifacts to link to compliance controls." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />Upload Evidence</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="title" label="Evidence Title" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="evidenceType" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="framework" label="Framework" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="controlId" label="Control" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="uploadDate" label="Uploaded" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="expiryDate" label="Expires" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="classification" label="Classification" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{item.title}</p>
                      <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · {item.fileSize}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.evidenceType}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.framework}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-[hsl(var(--text-3))]">{item.controlId}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.uploadDate}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.expiryDate}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.classification}</td>
                    <td className="px-3 py-2.5"><div className="flex items-center gap-1.5"><StatusBadge status={item.status} />{item.verified&&<span className="text-xs text-green-600">✓</span>}</div></td>
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

      <PaginationBar total={sp.total} page={sp.currentPage} perPage={sp.perPage} onPage={sp.setPage} onPerPage={sp.setPerPage} />

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Evidence":"Upload Evidence"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Evidence Details">
            <TInput label="Evidence Title" required value={form.title} onChange={setF("title")} placeholder="Q1 2026 Bias Audit Report — HR Screening" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Evidence Type" value={form.evidenceType} onChange={setF("evidenceType")} options={EVIDENCE_TYPES} />
              <TSelect label="Linked Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Linked Control ID" value={form.controlId} onChange={setF("controlId")} options={CONTROL_IDS} />
              <TSelect label="Classification" value={form.classification} onChange={setF("classification")} options={CLASSIFICATIONS} />
            </div>
            <TInput label="File Name / Reference" value={form.file} onChange={setF("file")} placeholder="audit_report_Q1_2026.pdf" />
            <TInput label="File Size" value={form.fileSize} onChange={setF("fileSize")} placeholder="2.4 MB" />
          </FormSection>
          <FormSection title="Ownership & Retention">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
              <TSelect label="Retention Policy" value={form.retentionPolicy} onChange={setF("retentionPolicy")} options={RETENTION_POLICIES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Upload Date" type="date" value={form.uploadDate} onChange={setF("uploadDate")} />
              <TInput label="Expiry Date" type="date" value={form.expiryDate} onChange={setF("expiryDate")} />
            </div>
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={UPLOAD_STATUSES} />
            <TToggle label="Verified by Reviewer" value={form.verified} onChange={setF("verified")} hint="Toggle on once a reviewer has validated this evidence" />
            {form.verified && <TInput label="Verified By" value={form.verifiedBy} onChange={setF("verifiedBy")} placeholder="Reviewer name" />}
            <TTextarea label="Notes" value={form.notes} onChange={setF("notes")} placeholder="Additional notes about this evidence artifact…" rows={3} maxLength={1000} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Evidence":"Upload Evidence"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.title??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                {viewItem.verified&&<span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-200">Verified ✓</span>}
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.classification}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Evidence Type",viewItem.evidenceType],["Framework",viewItem.framework],["Linked Control",viewItem.controlId],["Owner",viewItem.owner],["File",viewItem.file],["File Size",viewItem.fileSize],["Upload Date",viewItem.uploadDate],["Expiry Date",viewItem.expiryDate],["Retention",viewItem.retentionPolicy],["Verified By",viewItem.verifiedBy||"—"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              {viewItem.notes&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Notes</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.notes}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"uploaded this evidence"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.title}"?`} message="This evidence artifact will be permanently removed." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
