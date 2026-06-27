// @ts-nocheck
import { useState, useMemo } from "react";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { Broadcast, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const REG_TYPES = ["Regulation","Directive","Standard","Guidance","Proposed Rule","Executive Order","Industry Code","Court Ruling"];
const JURISDICTIONS = ["EU","US","UK","APAC","India","Australia","Canada","Global","Germany","France","China"];
const IMPACT_LEVELS = ["Critical","High","Medium","Low","Informational"];
const CHANGE_STATUSES = ["Monitoring","Proposed","Approved","Enacted","Effective","Withdrawn","Superseded"];
const AFFECTED_DOMAINS = ["AI Governance","Data Privacy","Financial Services","Healthcare","Employment","Transportation","Education","Cybersecurity"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Legal & Compliance Team"];
const TIMELINES = ["Immediate","0–3 months","3–6 months","6–12 months","12–24 months",">24 months","Unknown"];

const SEED: any[] = [
  { id:"RR-001", title:"EU AI Act — Article 6 High-Risk Classification Guidance", type:"Guidance", jurisdiction:"EU", impactLevel:"Critical", status:"Effective", effectiveDate:"2025-08-02", relevance:95, owner:"Dr. Sarah Chen", businessImpact:["AI Governance","Data Privacy"], prepTimeline:"Immediate", actionRequired:true, watchKeywords:["high-risk","GPAI","conformity","CE marking"], summary:"Official guidance on Article 6 classification criteria for high-risk AI systems. Affects all AI systems in Annex III categories including hiring, credit scoring, and critical infrastructure.", actionPlan:"1. Complete high-risk classification mapping for all AI systems. 2. Initiate conformity assessment for confirmed high-risk systems. 3. Register in EU AI database by 2026-08-01.", createdAt:"2025-06-01", updatedAt:"2026-04-01", createdBy:"admin" },
  { id:"RR-002", title:"NIST AI RMF 2.0 — Updated Risk Profiles", type:"Standard", jurisdiction:"US", impactLevel:"High", status:"Proposed", effectiveDate:"2026-06-01", relevance:82, owner:"Alex Kumar", businessImpact:["AI Governance","Cybersecurity"], prepTimeline:"3–6 months", actionRequired:true, watchKeywords:["risk profile","GOVERN","MAP","MEASURE","MANAGE"], summary:"NIST releases proposed updates to AI RMF 1.0 adding new profiles for generative AI and frontier AI systems. Public comment period open until Q2 2026.", actionPlan:"1. Review proposed changes against current implementation. 2. Submit public comment on sections 3.4 and 3.7. 3. Update internal framework mapping before effective date.", createdAt:"2025-12-01", updatedAt:"2026-03-15", createdBy:"akumar" },
  { id:"RR-003", title:"UK AI Regulation Bill — Parliament Reading 2", type:"Proposed Rule", jurisdiction:"UK", impactLevel:"High", status:"Monitoring", effectiveDate:"2027-01-01", relevance:70, owner:"James Wilson", businessImpact:["AI Governance","Data Privacy"], prepTimeline:"12–24 months", actionRequired:false, watchKeywords:["foundation model","frontier AI","liability","accountability"], summary:"UK Parliament second reading of AI Regulation Bill. Focuses on frontier AI safety, accountability, and liability. Expected enactment H1 2027.", actionPlan:"Monitor parliamentary progress. Engage legal counsel by Q3 2026 if bill passes second reading.", createdAt:"2026-01-15", updatedAt:"2026-04-10", createdBy:"jwilson" },
  { id:"RR-004", title:"Colorado SB 205 — AI Consumer Protections", type:"Regulation", jurisdiction:"US", impactLevel:"Medium", status:"Enacted", effectiveDate:"2026-02-01", relevance:60, owner:"Emma Rodriguez", businessImpact:["AI Governance","Employment","Financial Services"], prepTimeline:"0–3 months", actionRequired:true, watchKeywords:["high-risk AI","algorithmic decision","consumer protection","insurance"], summary:"Colorado Senate Bill 205 enacted. Requires algorithmic impact assessments for high-risk AI decisions in insurance and employment. Effective February 2026.", actionPlan:"1. Identify Colorado-nexus AI decisions. 2. Conduct algorithmic impact assessment for 3 in-scope systems. 3. Update consumer disclosure notices.", createdAt:"2025-10-01", updatedAt:"2026-02-05", createdBy:"erodriguez" },
  { id:"RR-005", title:"GDPR — Updated AI Processing Guidelines (EDPB)", type:"Guidance", jurisdiction:"EU", impactLevel:"High", status:"Effective", effectiveDate:"2026-01-15", relevance:88, owner:"Dr. Sarah Chen", businessImpact:["Data Privacy","AI Governance"], prepTimeline:"Immediate", actionRequired:true, watchKeywords:["automated decision","Article 22","profiling","legitimate interest","consent"], summary:"European Data Protection Board issued updated guidelines on AI processing under GDPR. Key changes to Article 22 automated decision-making scope and safeguards.", actionPlan:"1. DPO review of updated Article 22 interpretation. 2. Update DPIA templates for AI systems. 3. Review consent mechanisms for profiling use cases.", createdAt:"2025-11-01", updatedAt:"2026-01-20", createdBy:"admin" },
];

const EMPTY: any = { title:"", type:"Regulation", jurisdiction:"EU", impactLevel:"Medium", status:"Monitoring", effectiveDate:"", relevance:50, owner:"", businessImpact:[], prepTimeline:"6–12 months", actionRequired:false, watchKeywords:[], summary:"", actionPlan:"" };

export default function RegRadar() {
  const { data: items, setData: setItems } = useSupabaseTable('regradar_table', SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [impactFilter, setImpactFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.title.toLowerCase().includes(q) || i.jurisdiction.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (impactFilter === "all" || i.impactLevel === impactFilter);
  }), [items, search, statusFilter, impactFilter]);

  const sp = useSortAndPage<any>(filtered, "title");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.title.trim()) { toast.error("Regulatory title is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Monitoring" : (form.status || "Monitoring");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Regulatory item updated");
      } else {
        const id = `RR-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Regulatory item added");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Removed from radar"); };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Broadcast size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Regulatory Radar</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Track emerging regulations and assess their impact on your AI governance posture</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Track Regulation</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Tracking",items.length],["Action Required",items.filter(i=>i.actionRequired).length],["Critical Impact",items.filter(i=>i.impactLevel==="Critical").length],["Effective / Enacted",items.filter(i=>["Effective","Enacted"].includes(i.status)).length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search regulations…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{CHANGE_STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={impactFilter} onChange={e=>setImpactFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Impact Levels</option>{IMPACT_LEVELS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Removed"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Broadcast size={32} className="text-[hsl(var(--brand))]" />} title="No regulations tracked" description="Add regulations to your radar to track their impact." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />Track Regulation</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="title" label="Regulation / Guidance" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="jurisdiction" label="Jurisdiction" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="impactLevel" label="Impact" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="effectiveDate" label="Effective Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Relevance</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Action</th>
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-medium text-[hsl(var(--text-1))] line-clamp-2">{item.title}</p>
                      <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{item.type}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.jurisdiction}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.impactLevel} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.effectiveDate}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-[hsl(var(--border))]"><div style={{ width:`${item.relevance}%`, background:"hsl(var(--brand))", height:"100%" }} /></div>
                        <span className="text-xs font-mono text-[hsl(var(--text-3))]">{item.relevance}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{item.actionRequired?<span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200">Required</span>:<span className="text-xs text-[hsl(var(--text-4))]">—</span>}</td>
                    <td className="px-3 py-2.5 text-right" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setViewItem(item); setModal("view"); }} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><PencilSimple size={14} /></button>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Regulatory Item":"Track New Regulation"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Regulation Details">
            <TInput label="Title / Name" required value={form.title} onChange={setF("title")} placeholder="EU AI Act — Article 6 Guidance" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Type" value={form.type} onChange={setF("type")} options={REG_TYPES} />
              <TSelect label="Jurisdiction" value={form.jurisdiction} onChange={setF("jurisdiction")} options={JURISDICTIONS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Impact Level" value={form.impactLevel} onChange={setF("impactLevel")} options={IMPACT_LEVELS} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={CHANGE_STATUSES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Effective Date" type="date" value={form.effectiveDate} onChange={setF("effectiveDate")} />
              <TInput label="Relevance Score (0–100)" type="number" value={String(form.relevance)} onChange={v=>setF("relevance")(Number(v))} placeholder="75" />
            </div>
            <TTextarea label="Summary" required value={form.summary} onChange={setF("summary")} placeholder="Brief description of the regulation and its requirements…" rows={4} maxLength={2000} />
          </FormSection>
          <FormSection title="Impact & Response">
            <TCheckGroup label="Affected Business Domains" options={AFFECTED_DOMAINS} value={form.businessImpact} onChange={setF("businessImpact")} />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
              <TSelect label="Preparation Timeline" value={form.prepTimeline} onChange={setF("prepTimeline")} options={TIMELINES} />
            </div>
            <TToggle label="Action Required" value={form.actionRequired} onChange={setF("actionRequired")} hint="Enable if active compliance actions are required" />
            <TTextarea label="Action Plan" value={form.actionPlan} onChange={setF("actionPlan")} placeholder="Steps to achieve compliance…" rows={4} maxLength={2000} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update":"Add to Radar"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.title??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.impactLevel} />
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.type}</span>
                {viewItem.actionRequired&&<span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200">Action Required</span>}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Jurisdiction",viewItem.jurisdiction],["Effective Date",viewItem.effectiveDate],["Owner",viewItem.owner],["Prep Timeline",viewItem.prepTimeline],["Relevance Score",`${viewItem.relevance}%`]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              {viewItem.businessImpact?.length>0&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1.5">Affected Domains</p><div className="flex flex-wrap gap-1.5">{viewItem.businessImpact.map((d:string)=><span key={d} className="text-xs px-2 py-0.5 bg-raised border border-[hsl(var(--border))]">{d}</span>)}</div></div>}
              {viewItem.summary&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Summary</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.summary}</p></div>}
              {viewItem.actionPlan&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Action Plan</p><p className="text-sm text-[hsl(var(--text-2))] whitespace-pre-line">{viewItem.actionPlan}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"added to regulatory radar"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Remove "${deleteTarget?.title}"?`} message="This regulation will be removed from your radar." type="danger" confirmLabel="Remove" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
