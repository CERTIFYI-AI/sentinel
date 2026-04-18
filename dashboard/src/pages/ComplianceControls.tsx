// @ts-nocheck
import { useState, useMemo } from "react";
import { ShieldCheck, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const FRAMEWORKS_OPT = ["SOC 2","ISO 27001","ISO 42001","NIST AI RMF","EU AI Act","HIPAA","GDPR","CCPA","PCI DSS"];
const DOMAINS = ["Access Management","Data Protection","AI Safety","Fairness","Incident Management","Vendor Management","Transparency","Data Governance","Security","Operational Resilience"];
const CONTROL_TYPES = ["Preventive","Detective","Corrective","Compensating"];
const IMPL_STATUSES = ["Not Implemented","Planned","In Progress","Implemented","Partially Implemented","Deprecated"];
const TEST_FREQS = ["Continuous","Monthly","Quarterly","Semi-Annual","Annual","Ad Hoc"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson","Priya Nair"];

const SEED: any[] = [
  { id:"CTL-001", controlId:"CTL-001", name:"AI Model Access Control", framework:"ISO 27001", domain:"Access Management", type:"Preventive", status:"Implemented", testFreq:"Quarterly", owner:"Alex Kumar", dueDate:"2026-04-01", evidenceRequired:true, description:"Enforce least-privilege access controls for all AI model endpoints and training infrastructure.", implGuidance:"Implement role-based access control (RBAC) with MFA for all model API endpoints.", testProcedure:"Quarterly access review with automated deprovisioning of inactive accounts.", relatedRisks:["Unauthorized Access","Data Breach"], createdAt:"2025-06-01", updatedAt:"2026-01-10", createdBy:"admin" },
  { id:"CTL-002", controlId:"CTL-002", name:"Training Data Encryption", framework:"SOC 2", domain:"Data Protection", type:"Preventive", status:"Implemented", testFreq:"Annual", owner:"James Wilson", dueDate:"2026-06-01", evidenceRequired:true, description:"All training data must be encrypted at rest and in transit using AES-256.", implGuidance:"Deploy TLS 1.3 for data in transit. Use AWS KMS or equivalent for at-rest encryption.", testProcedure:"Annual penetration testing of data pipelines.", relatedRisks:["Data Breach","Regulatory Non-Compliance"], createdAt:"2025-06-01", updatedAt:"2026-01-08", createdBy:"admin" },
  { id:"CTL-003", controlId:"CTL-003", name:"Model Output Validation", framework:"EU AI Act", domain:"AI Safety", type:"Detective", status:"Partially Implemented", testFreq:"Continuous", owner:"Dr. Sarah Chen", dueDate:"2026-03-15", evidenceRequired:false, description:"Validate AI model outputs against defined quality and safety criteria before deployment.", implGuidance:"Implement automated output validation pipelines with human-in-the-loop escalation.", testProcedure:"Continuous automated testing plus monthly manual review of edge cases.", relatedRisks:["Model Failure","Regulatory Non-Compliance"], createdAt:"2025-07-01", updatedAt:"2026-01-05", createdBy:"schenai" },
  { id:"CTL-004", controlId:"CTL-004", name:"Bias Detection Pipeline", framework:"NIST AI RMF", domain:"Fairness", type:"Detective", status:"Implemented", testFreq:"Quarterly", owner:"Dr. Sarah Chen", dueDate:"2026-04-30", evidenceRequired:true, description:"Run automated bias detection on all high-risk AI models quarterly using approved fairness metrics.", implGuidance:"Integrate Fairlearn or AIF360 into CI/CD pipeline. Define fairness thresholds per regulation.", testProcedure:"Quarterly bias audit with documented results reviewed by Ethics Committee.", relatedRisks:["Algorithmic Bias","Regulatory Non-Compliance"], createdAt:"2025-07-01", updatedAt:"2025-12-20", createdBy:"admin" },
  { id:"CTL-005", controlId:"CTL-005", name:"Human Oversight for High-Risk AI", framework:"EU AI Act", domain:"Fairness", type:"Preventive", status:"Partially Implemented", testFreq:"Monthly", owner:"Lisa Park", dueDate:"2026-02-28", evidenceRequired:true, description:"Ensure human oversight is implemented for all high-risk AI decisions as defined by EU AI Act Annex III.", implGuidance:"Implement HITL workflow with mandatory review for all P1 decisions. Document override reasons.", testProcedure:"Monthly audit of HITL queue completion rates and override justification quality.", relatedRisks:["Regulatory Non-Compliance","Algorithmic Harm"], createdAt:"2025-08-01", updatedAt:"2025-12-15", createdBy:"lpark" },
  { id:"CTL-006", controlId:"CTL-006", name:"Vendor Security Assessment", framework:"SOC 2", domain:"Vendor Management", type:"Preventive", status:"Implemented", testFreq:"Annual", owner:"Mike Johnson", dueDate:"2026-12-01", evidenceRequired:true, description:"All AI vendors must complete security questionnaire and pass risk assessment before onboarding.", implGuidance:"Use standardized CAIQ questionnaire. Require SOC 2 Type II or ISO 27001 certification.", testProcedure:"Annual re-assessment of all active vendors. Spot checks for high-risk vendors quarterly.", relatedRisks:["Third-Party Risk","Supply Chain Attack"], createdAt:"2025-06-15", updatedAt:"2026-01-03", createdBy:"admin" },
];

const EMPTY: any = { name:"", controlId:"", framework:"", domain:"", type:"Preventive", status:"Not Implemented", testFreq:"Annual", owner:"", dueDate:"", evidenceRequired:false, description:"", implGuidance:"", testProcedure:"", relatedRisks:[] };

export default function ComplianceControls() {
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
    return (i.name.toLowerCase().includes(q) || i.controlId.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (frameworkFilter === "all" || i.framework === frameworkFilter);
  }), [items, search, statusFilter, frameworkFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Control name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Planned" : (form.status || "Not Implemented");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("Control updated");
      } else {
        const id = form.controlId || `CTL-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, controlId:id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Control created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => {
    setForm({ name:item.name, controlId:item.controlId, framework:item.framework, domain:item.domain, type:item.type, status:item.status, testFreq:item.testFreq, owner:item.owner, dueDate:item.dueDate, evidenceRequired:item.evidenceRequired, description:item.description, implGuidance:item.implGuidance, testProcedure:item.testProcedure, relatedRisks:item.relatedRisks||[] });
    setEditId(item.id); setModal("edit");
  };

  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Control deleted"); };

  const implPct = Math.round((items.filter(i=>i.status==="Implemented").length/Math.max(items.length,1))*100);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><ShieldCheck size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Compliance Controls</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Manage and track compliance control implementations across frameworks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />New Control</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Controls",items.length],["Implemented",items.filter(i=>i.status==="Implemented").length],["In Progress",items.filter(i=>i.status==="In Progress"||i.status==="Partially Implemented").length],["Coverage",`${implPct}%`]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search controls…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{IMPL_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={frameworkFilter} onChange={e=>setFrameworkFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Frameworks</option>{FRAMEWORKS_OPT.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted selected"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={32} className="text-[hsl(var(--brand))]" />} title="No controls found" description="Add compliance controls to start tracking your implementation." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />New Control</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="controlId" label="Control ID" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="name" label="Control Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="framework" label="Framework" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="domain" label="Domain" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="owner" label="Owner" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="dueDate" label="Due Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[hsl(var(--text-3))]">{item.controlId}</td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p></td>
                    <td className="px-3 py-2.5"><span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.framework}</span></td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))] text-xs">{item.domain}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.type}</td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))] text-xs">{item.owner}</td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-3))] text-xs whitespace-nowrap">{item.dueDate}</td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Control":"New Compliance Control"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Control Identity">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Control ID" value={form.controlId} onChange={setF("controlId")} placeholder="CTL-007 (auto-generated if blank)" />
              <TInput label="Control Name" required value={form.name} onChange={setF("name")} placeholder="AI Model Access Control" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS_OPT} />
              <TSelect label="Domain" value={form.domain} onChange={setF("domain")} options={DOMAINS} />
            </div>
          </FormSection>
          <FormSection title="Implementation Details">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Control Type" value={form.type} onChange={setF("type")} options={CONTROL_TYPES} />
              <TSelect label="Implementation Status" value={form.status} onChange={setF("status")} options={IMPL_STATUSES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Test Frequency" value={form.testFreq} onChange={setF("testFreq")} options={TEST_FREQS} />
              <TSelect label="Control Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
            </div>
            <TInput label="Due Date" type="date" value={form.dueDate} onChange={setF("dueDate")} />
            <TToggle label="Evidence Required" value={form.evidenceRequired} onChange={setF("evidenceRequired")} hint="Evidence artifacts must be attached for this control" />
          </FormSection>
          <FormSection title="Description & Guidance">
            <TTextarea label="Description" required value={form.description} onChange={setF("description")} placeholder="Describe the control objective…" rows={3} maxLength={1000} />
            <TTextarea label="Implementation Guidance" value={form.implGuidance} onChange={setF("implGuidance")} placeholder="Step-by-step implementation guidance…" rows={3} maxLength={2000} />
            <TTextarea label="Testing Procedure" value={form.testProcedure} onChange={setF("testProcedure")} placeholder="How will this control be tested…" rows={3} maxLength={2000} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Control":"Create Control"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.name??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap"><StatusBadge status={viewItem.status} /><span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.type}</span><span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.framework}</span></div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Control ID",viewItem.controlId],["Domain",viewItem.domain],["Test Frequency",viewItem.testFreq],["Owner",viewItem.owner],["Due Date",viewItem.dueDate],["Evidence Required",viewItem.evidenceRequired?"Yes":"No"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              {viewItem.description&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p></div>}
              {viewItem.implGuidance&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Implementation Guidance</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.implGuidance}</p></div>}
              {viewItem.testProcedure&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Testing Procedure</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.testProcedure}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"created this control"},{date:viewItem.updatedAt,actor:"system",action:"last updated record"}]} />
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
