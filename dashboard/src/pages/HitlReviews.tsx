// @ts-nocheck
import { useState, useMemo } from "react";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { UserCheck, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const OUTCOMES = ["Approved","Rejected","Escalated","Deferred","Withdrawn"];
const ITEM_TYPES = ["Model Decision","Risk Assessment","Policy Exception","Vendor Approval","Incident Classification","Bias Audit Finding","Data Usage Request"];
const AI_SYSTEMS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Customer Support Orchestrator"];
const REVIEWERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson","Priya Nair"];
const STATUSES = ["Pending","In Review","Completed","Escalated","Withdrawn"];

const SEED: any[] = [
  { id:"REV-001", itemType:"Risk Assessment", aiOutputSummary:"Model assessed loan application RK-9812 as HIGH risk (score: 0.87). Recommended rejection. Applicant has strong income history but recent address change flagged.", reviewer:"Dr. Sarah Chen", reviewDate:"2026-01-12", outcome:"Approved", overrideReason:"Income trajectory and employment tenure override algorithmic risk flag. Manual review of address change — legitimate relocation.", timeToReview:"3h 22m", status:"Completed", aiSystem:"Credit Scoring Engine", createdAt:"2026-01-12", updatedAt:"2026-01-12", createdBy:"system" },
  { id:"REV-002", itemType:"Model Decision", aiOutputSummary:"HR model recommended REJECT for candidate CND-4421 (confidence: 0.91). Candidate is female, age 42, with 18 years experience in relevant field.", reviewer:"Emma Rodriguez", reviewDate:"2026-02-03", outcome:"Rejected", overrideReason:"System was suspended. This review conducted manually. AI decision under investigation for bias. Model suspended post review.", timeToReview:"1h 05m", status:"Completed", aiSystem:"HR Screening Model", createdAt:"2026-02-03", updatedAt:"2026-02-03", createdBy:"system" },
  { id:"REV-003", itemType:"Policy Exception", aiOutputSummary:"AI advisor flagged request for exception to data retention policy as NON-COMPLIANT. Business unit requesting 6-month extension for research purposes.", reviewer:"Alex Kumar", reviewDate:"2026-03-01", outcome:"Deferred", overrideReason:"Requested additional legal opinion before decision. Escalated to DPO for guidance on GDPR implications.", timeToReview:"4h 48m", status:"Completed", aiSystem:"GPT-4o Risk Scorer v2", createdAt:"2026-02-28", updatedAt:"2026-03-01", createdBy:"lpark" },
  { id:"REV-004", itemType:"Incident Classification", aiOutputSummary:"Automated detection classified network anomaly as ADVERSARIAL ATTACK (confidence: 0.78). Recommends immediate quarantine of 12 endpoints.", reviewer:"Mike Johnson", reviewDate:null, outcome:null, overrideReason:"", timeToReview:null, status:"Pending", aiSystem:"Fraud Detection v3", createdAt:"2026-04-18", updatedAt:"2026-04-18", createdBy:"auto-detect" },
  { id:"REV-005", itemType:"Vendor Approval", aiOutputSummary:"AI risk engine assessed new AI vendor DeepMind subsidiary as MEDIUM risk (score: 62). DPA not yet signed. No SOC 2. ISO 27001 in progress.", reviewer:"Lisa Park", reviewDate:"2026-04-10", outcome:"Rejected", overrideReason:"Rejected pending DPA signature and ISO 27001 certification. Re-submit in Q3 2026.", timeToReview:"6h 15m", status:"Completed", aiSystem:"GPT-4o Risk Scorer v2", createdAt:"2026-04-08", updatedAt:"2026-04-10", createdBy:"system" },
];

const EMPTY: any = { itemType:"Model Decision", aiOutputSummary:"", reviewer:"", reviewDate:"", outcome:"", overrideReason:"", timeToReview:"", status:"Pending", aiSystem:"" };

export default function HitlReviews() {
  const { data: items, setData: setItems } = useSupabaseTable('hitlreviews_table', SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.itemType.toLowerCase().includes(q) || (i.reviewer||"").toLowerCase().includes(q) || (i.outcome||"").toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (outcomeFilter === "all" || i.outcome === outcomeFilter);
  }), [items, search, statusFilter, outcomeFilter]);

  const sp = useSortAndPage<any>(filtered, "itemType");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.aiOutputSummary.trim()) { toast.error("AI Output Summary is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Pending" : (form.status || "Pending");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Review updated");
      } else {
        const id = `REV-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Review created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Review deleted"); };

  const outcomeColors: Record<string, { tx: string; bg: string; br: string }> = {
    Approved:  { tx:"hsl(var(--s-ok-tx))", bg:"hsl(var(--s-ok-bg))", br:"hsl(var(--s-ok-br))" },
    Rejected:  { tx:"hsl(var(--s-er-tx))", bg:"hsl(var(--s-er-bg))", br:"hsl(var(--s-er-br))" },
    Escalated: { tx:"hsl(var(--s-wn-tx))", bg:"hsl(var(--s-wn-bg))", br:"hsl(var(--s-wn-br))" },
    Deferred:  { tx:"hsl(var(--s-in-tx))", bg:"hsl(var(--s-in-bg))", br:"hsl(var(--s-in-br))" },
    Withdrawn: { tx:"hsl(var(--s-nt-tx))", bg:"hsl(var(--s-nt-bg))", br:"hsl(var(--s-nt-br))" },
  };

  return (
    <div className="p-3 space-y-3 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><UserCheck size={24} weight="duotone" className="text-[hsl(var(--brand))]" />HITL Reviews</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Human-in-the-loop review outcomes and override audit trail</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />New Review</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Reviews",items.length],["Approved",items.filter(i=>i.outcome==="Approved").length],["Rejected",items.filter(i=>i.outcome==="Rejected").length],["Pending",items.filter(i=>i.status==="Pending").length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reviews…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={outcomeFilter} onChange={e=>setOutcomeFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Outcomes</option>{OUTCOMES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<UserCheck size={32} className="text-[hsl(var(--brand))]" />} title="No reviews found" description="Human review records will appear here once decisions are made." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} />New Review</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="id" label="Review ID" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="itemType" label="Item Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">AI Output Summary</th>
                  <Th col="reviewer" label="Reviewer" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="reviewDate" label="Review Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="outcome" label="Outcome" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="timeToReview" label="Time to Review" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[hsl(var(--text-3))]">{item.id}</td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{item.itemType}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))] max-w-[240px] line-clamp-2">{item.aiOutputSummary}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.reviewer||"—"}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.reviewDate||"—"}</td>
                    <td className="px-3 py-2.5">
                      {item.outcome ? (
                        <span className="text-xs px-1.5 py-0.5 border font-medium" style={{ color:outcomeColors[item.outcome]?.tx, borderColor:outcomeColors[item.outcome]?.br, background:outcomeColors[item.outcome]?.bg }}>{item.outcome}</span>
                      ) : <span className="text-xs text-[hsl(var(--text-4))]">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.timeToReview||"—"}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-right" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setViewItem(item); setModal("view"); }} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><PencilSimple size={14} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="p-1.5 hover:bg-[hsl(var(--s-er-bg))] text-[hsl(var(--destructive))]"><Trash size={14} /></button>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Review":"Record HITL Review"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Review Details">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Item Type" value={form.itemType} onChange={setF("itemType")} options={ITEM_TYPES} />
              <TSelect label="AI System" value={form.aiSystem} onChange={setF("aiSystem")} options={AI_SYSTEMS} />
            </div>
            <TTextarea label="AI Output Summary" required value={form.aiOutputSummary} onChange={setF("aiOutputSummary")} placeholder="Describe the AI system's recommendation or output that requires review…" rows={4} maxLength={2000} />
          </FormSection>
          <FormSection title="Human Decision">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Reviewer" value={form.reviewer} onChange={setF("reviewer")} options={REVIEWERS} />
              <TInput label="Review Date" type="date" value={form.reviewDate} onChange={setF("reviewDate")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Outcome" value={form.outcome} onChange={setF("outcome")} options={OUTCOMES} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <TTextarea label="Override / Decision Justification" value={form.overrideReason} onChange={setF("overrideReason")} placeholder="Explain the basis for the human decision and any override of the AI recommendation…" rows={4} maxLength={2000} />
            <TInput label="Time to Review" value={form.timeToReview} onChange={setF("timeToReview")} placeholder="3h 22m" />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Review":"Submit Review"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={`Review ${viewItem?.id??""}`} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                {viewItem.outcome&&<span className="text-xs px-1.5 py-0.5 border font-medium" style={{ color:outcomeColors[viewItem.outcome], borderColor:`${outcomeColors[viewItem.outcome]}40`, background:`${outcomeColors[viewItem.outcome]}12` }}>{viewItem.outcome}</span>}
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.itemType}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["AI System",viewItem.aiSystem],["Reviewer",viewItem.reviewer||"—"],["Review Date",viewItem.reviewDate||"—"],["Time to Review",viewItem.timeToReview||"—"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v}</p></div>
                ))}
              </div>
              <div><p className="text-xs text-[hsl(var(--text-4))] mb-1">AI Output Summary</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-raised border border-[hsl(var(--border))]">{viewItem.aiOutputSummary}</p></div>
              {viewItem.overrideReason&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Override / Justification</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.overrideReason}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"created this review item"},{date:viewItem.updatedAt,actor:viewItem.reviewer||"system",action:"submitted decision"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete review "${deleteTarget?.id}"?`} message="This action cannot be undone." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
