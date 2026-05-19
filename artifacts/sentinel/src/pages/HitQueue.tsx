// @ts-nocheck
import { useState, useMemo } from "react";
import { Queue, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, Clock } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea } from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { useHitlItemData } from '@/hooks/useHitlItemData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

const QUEUES = ["Bias Review Queue","Risk Assessment Queue","Vendor Approval Queue","Incident Triage Queue","Policy Exception Queue"];
const PRIORITIES = ["Urgent","High","Normal","Low"];
const ITEM_TYPES = ["Model Decision","Risk Alert","Bias Finding","Vendor Request","Incident","Policy Exception","Data Access Request"];
const AI_SYSTEMS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Customer Support Orchestrator"];
const ASSIGNEES = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson","Priya Nair","Unassigned"];
const STATUSES = ["Queued","Assigned","In Review","Pending Info","Resolved","Escalated","Archived"];

const EMPTY: any = { title:"", queue:"Risk Assessment Queue", itemType:"Risk Alert", priority:"Normal", aiSystem:"", assignee:"Unassigned", dueDate:"", slaHours:72, description:"", requester:"", status:"Queued" };

export default function HitQueue() {
  const { items, isLoading, save: saveItem, remove: removeItem } = useHitlItemData()
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.title.toLowerCase().includes(q) || i.assignee.toLowerCase().includes(q) || i.queue.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (priorityFilter === "all" || i.priority === priorityFilter);
  }), [items, search, statusFilter, priorityFilter]);

  const sp = useSortAndPage(filtered, "title");

  if (isLoading) return <PageSkeleton />
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (draft = false) => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const status = draft ? "Queued" : (form.status || "Queued");
      const payload = editId
        ? { ...form, status, id: editId }
        : { ...form, status };
      await saveItem(payload);
      setModal(null); setForm(EMPTY); setEditId(null);
    } catch { /* toast handled by hook */ }
    setSaving(false);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = async () => {
    if (!deleteTarget) return;
    await removeItem(deleteTarget.id);
    setDeleteTarget(null);
  };

  const priColors: Record<string, string> = { Urgent:"#ef4444", High:"#f97316", Normal:"#3b82f6", Low:"#22c55e" };

  function SLAIndicator({ sla, elapsed }: { sla: number; elapsed: number }) {
    const pct = Math.min((elapsed / sla) * 100, 100);
    const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#22c55e";
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-[hsl(var(--border))]"><div style={{ width:`${pct}%`, background:color, height:"100%" }} /></div>
        <span className="text-xs" style={{ color }}>{elapsed}h/{sla}h</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Queue size={24} weight="duotone" className="text-[hsl(var(--brand))]" />HITL Queue</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Manage human review queue for AI decisions requiring manual intervention</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(items, 'hitl-queue.csv')}><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Add to Queue</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Items",items.length],["Urgent / High",items.filter(i=>["Urgent","High"].includes(i.priority)).length],["SLA Breaching",items.filter(i=>(i.elapsedHours/i.slaHours)>=0.9).length],["Unassigned",items.filter(i=>i.assignee==="Unassigned").length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search queue…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Priorities</option>{PRIORITIES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={async () => { for (const id of sp.selectedIds) { await removeItem(id); } sp.clearSelected(); }} onExport={() => exportCsv(sp.paged.filter((i:any)=>sp.selectedIds.has(i.id)), 'hitl-queue-selected.csv')} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Queue size={32} className="text-[hsl(var(--brand))]" />} title="Queue is empty" description="No items pending human review." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />Add to Queue</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="title" label="Item Title" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="queue" label="Queue" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="priority" label="Priority" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="assignee" label="Assignee" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="dueDate" label="Due" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">SLA</th>
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 max-w-[220px]">
                      <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{item.title}</p>
                      <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · {item.itemType}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.queue}</td>
                    <td className="px-3 py-2.5"><span className="text-xs px-1.5 py-0.5 font-medium border" style={{ color:priColors[item.priority], borderColor:`${priColors[item.priority]}40`, background:`${priColors[item.priority]}12` }}>{item.priority}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.assignee}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.dueDate}</td>
                    <td className="px-3 py-2.5"><SLAIndicator sla={item.slaHours} elapsed={item.elapsedHours} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Queue Item":"Add to HITL Queue"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Queue Item Details">
            <TInput label="Title" required value={form.title} onChange={setF("title")} placeholder="Brief description of the item requiring review" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Queue" value={form.queue} onChange={setF("queue")} options={QUEUES} />
              <TSelect label="Item Type" value={form.itemType} onChange={setF("itemType")} options={ITEM_TYPES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Priority" value={form.priority} onChange={setF("priority")} options={PRIORITIES} />
              <TSelect label="AI System" value={form.aiSystem} onChange={setF("aiSystem")} options={AI_SYSTEMS} />
            </div>
            <TTextarea label="Description" required value={form.description} onChange={setF("description")} placeholder="Describe what needs to be reviewed and why…" rows={4} maxLength={2000} />
          </FormSection>
          <FormSection title="Assignment & SLA">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Assignee" value={form.assignee} onChange={setF("assignee")} options={ASSIGNEES} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Due Date" type="date" value={form.dueDate} onChange={setF("dueDate")} />
              <TInput label="SLA (hours)" type="number" value={String(form.slaHours)} onChange={v=>setF("slaHours")(Number(v))} placeholder="72" />
            </div>
            <TInput label="Requester" value={form.requester} onChange={setF("requester")} placeholder="Name or team requesting review" />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Item":"Add to Queue"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.title??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-1.5 py-0.5 font-medium border" style={{ color:priColors[viewItem.priority], borderColor:`${priColors[viewItem.priority]}40`, background:`${priColors[viewItem.priority]}12` }}>{viewItem.priority}</span>
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.itemType}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Queue",viewItem.queue],["AI System",viewItem.aiSystem],["Assignee",viewItem.assignee],["Requester",viewItem.requester||"—"],["Due Date",viewItem.dueDate],["SLA",`${viewItem.slaHours}h`]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              <div>
                <p className="text-xs text-[hsl(var(--text-4))] mb-1">SLA Progress</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[hsl(var(--border))]">
                    <div style={{ width:`${Math.min((viewItem.elapsedHours/viewItem.slaHours)*100,100)}%`, background:(viewItem.elapsedHours/viewItem.slaHours)>=0.9?"#ef4444":"#22c55e", height:"100%" }} />
                  </div>
                  <span className="text-xs">{viewItem.elapsedHours}h elapsed / {viewItem.slaHours}h SLA</span>
                </div>
              </div>
              {viewItem.description&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"added to queue"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Remove</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Remove "${deleteTarget?.title}"?`} message="This item will be removed from the queue." type="danger" confirmLabel="Remove" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
