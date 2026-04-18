// @ts-nocheck
import { useState, useMemo } from "react";
import { BookOpen, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const CATEGORIES = ["Privacy","Security","AI Governance","ESG","Financial","Healthcare","Industry-Specific"];
const JURISDICTIONS = ["Global","EU","US","UK","APAC","India","Australia","Canada","LATAM"];
const ADOPTION_STATUSES = ["Active","Piloting","Planned","Deprecated"];
const REVIEW_CYCLES = ["Quarterly","Semi-Annual","Annual","Biennial","As Needed"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson"];

const SEED: any[] = [
  { id:"FW-001", name:"EU AI Act", version:"2024/1689", category:"AI Governance", jurisdictions:["EU"], adoptionStatus:"Active", controlsCount:47, coverage:82, lastReviewed:"2026-01-10", owner:"Dr. Sarah Chen", effectiveDate:"2024-08-01", reviewCycle:"Annual", scope:"Applies to all high-risk AI systems placed on EU market or used by EU subjects.", applicability:"Direct — all product lines deploying AI in EU.", externalUrl:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689", createdAt:"2024-08-01", updatedAt:"2026-01-10", createdBy:"admin" },
  { id:"FW-002", name:"NIST AI Risk Management Framework", version:"1.0", category:"AI Governance", jurisdictions:["US","Global"], adoptionStatus:"Active", controlsCount:34, coverage:75, lastReviewed:"2025-12-15", owner:"Alex Kumar", effectiveDate:"2023-01-26", reviewCycle:"Annual", scope:"Voluntary framework for managing AI risks across the AI lifecycle.", applicability:"Direct — adopted as internal standard.", externalUrl:"https://www.nist.gov/system/files/documents/2023/01/26/AI%20RMF%201.0.pdf", createdAt:"2023-06-01", updatedAt:"2025-12-15", createdBy:"akumar" },
  { id:"FW-003", name:"ISO 42001", version:"2023", category:"AI Governance", jurisdictions:["Global"], adoptionStatus:"Active", controlsCount:28, coverage:65, lastReviewed:"2025-11-20", owner:"James Wilson", effectiveDate:"2023-12-01", reviewCycle:"Annual", scope:"International standard for AI management systems.", applicability:"Direct — certification target for 2026.", externalUrl:"https://www.iso.org/standard/81230.html", createdAt:"2023-12-01", updatedAt:"2025-11-20", createdBy:"admin" },
  { id:"FW-004", name:"SOC 2 Type II", version:"2017", category:"Security", jurisdictions:["US"], adoptionStatus:"Active", controlsCount:61, coverage:91, lastReviewed:"2026-01-05", owner:"Mike Johnson", effectiveDate:"2017-05-01", reviewCycle:"Annual", scope:"AICPA trust services criteria for security, availability, processing integrity, confidentiality, privacy.", applicability:"Direct — annual audit required.", externalUrl:"https://www.aicpa.org/", createdAt:"2022-01-01", updatedAt:"2026-01-05", createdBy:"admin" },
  { id:"FW-005", name:"GDPR", version:"2018", category:"Privacy", jurisdictions:["EU"], adoptionStatus:"Active", controlsCount:52, coverage:88, lastReviewed:"2025-10-01", owner:"Emma Rodriguez", effectiveDate:"2018-05-25", reviewCycle:"Annual", scope:"General data protection regulation for personal data processing of EU data subjects.", applicability:"Direct — all data processing activities.", externalUrl:"https://gdpr.eu/", createdAt:"2018-05-25", updatedAt:"2025-10-01", createdBy:"erodriguez" },
  { id:"FW-006", name:"ISO 27001", version:"2022", category:"Security", jurisdictions:["Global"], adoptionStatus:"Piloting", controlsCount:93, coverage:58, lastReviewed:"2025-09-15", owner:"Mike Johnson", effectiveDate:"2022-10-25", reviewCycle:"Annual", scope:"Information security management system standard.", applicability:"Indirect — mapping to existing controls.", externalUrl:"https://www.iso.org/isoiec-27001-information-security.html", createdAt:"2023-01-01", updatedAt:"2025-09-15", createdBy:"mjohnson" },
];

const EMPTY: any = { name:"", version:"", category:"", jurisdictions:[], adoptionStatus:"Planned", controlsCount:0, coverage:0, lastReviewed:"", owner:"", effectiveDate:"", reviewCycle:"Annual", scope:"", applicability:"", externalUrl:"" };

export default function ComplianceFrameworks() {
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
    return (i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.adoptionStatus === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Framework name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const adoptionStatus = draft ? "Planned" : (form.adoptionStatus || "Planned");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, adoptionStatus, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Framework updated");
      } else {
        const id = `FW-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, adoptionStatus, id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Framework created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Framework deleted"); };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><BookOpen size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Compliance Frameworks</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Manage regulatory and industry frameworks adopted by the organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Add Framework</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Frameworks",items.length],["Active",items.filter(i=>i.adoptionStatus==="Active").length],["Avg Coverage",`${Math.round(items.reduce((a,i)=>a+i.coverage,0)/Math.max(items.length,1))}%`],["Total Controls",items.reduce((a,i)=>a+i.controlsCount,0)]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search frameworks…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{ADOPTION_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted selected"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<BookOpen size={32} className="text-[hsl(var(--brand))]" />} title="No frameworks found" description="Add a compliance framework to begin mapping controls." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />Add Framework</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="name" label="Framework Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="version" label="Version" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="category" label="Category" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="adoptionStatus" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="controlsCount" label="Controls" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Coverage</th>
                  <Th col="lastReviewed" label="Last Reviewed" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="owner" label="Owner" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p>
                      <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.version}</td>
                    <td className="px-3 py-2.5"><span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.category}</span></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.adoptionStatus} /></td>
                    <td className="px-3 py-2.5 text-center font-mono text-[hsl(var(--text-2))]">{item.controlsCount}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[hsl(var(--border))]"><div style={{ width:`${item.coverage}%`, background: item.coverage>=80?"#22c55e":item.coverage>=60?"#f59e0b":"#ef4444", height:"100%" }} /></div>
                        <span className="text-xs font-mono text-[hsl(var(--text-2))]">{item.coverage}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.lastReviewed}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.owner}</td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Framework":"Add Compliance Framework"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Framework Identity">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Framework Name" required value={form.name} onChange={setF("name")} placeholder="EU AI Act" />
              <TInput label="Version" required value={form.version} onChange={setF("version")} placeholder="2024/1689" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Category" value={form.category} onChange={setF("category")} options={CATEGORIES} />
              <TSelect label="Adoption Status" value={form.adoptionStatus} onChange={setF("adoptionStatus")} options={ADOPTION_STATUSES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Effective Date" type="date" value={form.effectiveDate} onChange={setF("effectiveDate")} />
              <TInput label="Last Reviewed" type="date" value={form.lastReviewed} onChange={setF("lastReviewed")} />
            </div>
          </FormSection>
          <FormSection title="Ownership & Review">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Framework Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
              <TSelect label="Review Cycle" value={form.reviewCycle} onChange={setF("reviewCycle")} options={REVIEW_CYCLES} />
            </div>
            <TInput label="External Reference URL" value={form.externalUrl} onChange={setF("externalUrl")} placeholder="https://eur-lex.europa.eu/…" />
          </FormSection>
          <FormSection title="Scope & Applicability">
            <TTextarea label="Scope Description" value={form.scope} onChange={setF("scope")} placeholder="Describe the scope of this framework…" rows={3} maxLength={1500} />
            <TTextarea label="Applicability Notes" value={form.applicability} onChange={setF("applicability")} placeholder="How does this framework apply to the organization…" rows={3} maxLength={1500} />
          </FormSection>
          <FormSection title="Metrics">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Controls Count" type="number" value={String(form.controlsCount)} onChange={v=>setF("controlsCount")(Number(v))} placeholder="0" />
              <TInput label="Coverage %" type="number" value={String(form.coverage)} onChange={v=>setF("coverage")(Number(v))} placeholder="0" />
            </div>
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Framework":"Add Framework"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.name??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.adoptionStatus} />
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.category}</span>
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">v{viewItem.version}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {[["Controls",viewItem.controlsCount],["Coverage",`${viewItem.coverage}%`],["Owner",viewItem.owner],["Review Cycle",viewItem.reviewCycle],["Effective Date",viewItem.effectiveDate],["Last Reviewed",viewItem.lastReviewed]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              {viewItem.scope&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Scope</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.scope}</p></div>}
              {viewItem.applicability&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Applicability</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.applicability}</p></div>}
              {viewItem.externalUrl&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">External Reference</p><a href={viewItem.externalUrl} target="_blank" rel="noreferrer" className="text-sm text-[hsl(var(--brand))] flex items-center gap-1 hover:underline">{viewItem.externalUrl}<ArrowSquareOut size={12}/></a></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"added this framework"},{date:viewItem.updatedAt,actor:"system",action:"last updated record"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`} message="This action cannot be undone. All control mappings will be removed." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
