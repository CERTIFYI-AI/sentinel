import { useState, useMemo } from "react";
import { FileText, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}
import { usePolicyData } from "@/hooks/usePolicyData";

const POLICY_TYPES = ["AI Governance","Data Privacy","Information Security","Acceptable Use","Ethics","Risk Management","Incident Response","Vendor Management","Human Oversight","Transparency"];
const FRAMEWORKS_OPT = ["EU AI Act","NIST AI RMF","ISO 42001","GDPR","SOC 2","ISO 27001","OECD AI Principles"];
const REVIEW_CYCLES = ["Monthly","Quarterly","Semi-Annual","Annual","Event-Driven","As Needed"];
const STATUSES = ["Draft","In Review","Approved","Active","Deprecated","Archived"];
const APPROVAL_LEVELS = ["Team Lead","Department Head","CISO","CTO","Board","DPO","Legal Counsel"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson","Legal & Compliance"];
const CLASSIFICATIONS = ["Public","Internal","Confidential","Restricted"];
const IMPACT_AUDIENCES = ["All Staff","Data Scientists","Engineers","Risk Team","Executives","Vendors","Customers"];

// SEED data removed — using Supabase hook

const EMPTY: any = { title:"", version:"1.0", type:"AI Governance", framework:"EU AI Act", status:"Draft", owner:"", approver:"", approvalLevel:"Department Head", effectiveDate:"", nextReviewDate:"", reviewCycle:"Annual", classification:"Internal", applicableTo:[], summary:"", purpose:"", scope:"", exceptions:"" };

export default function PolicyManagement() {
  const { policies: sbItems, isLoading, save: savePolicy, remove: removePolicy } = usePolicyData()
  const [localItems, setLocalItems] = useState<any[]>([])
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const items = [...localItems, ...sbItems.filter((i:any) => !localItems.find((l:any) => l.id === i.id))].filter((i:any) => !deletedIds.has(i.id))
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (typeFilter === "all" || i.type === typeFilter);
  }), [items, search, statusFilter, typeFilter]);

  const sp = useSortAndPage<any>(filtered, "title");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (draft = false) => {
    if (!form.title.trim()) { toast.error("Policy title is required"); return; }
    const status = draft ? "Draft" : (form.status || "Draft");
    try {
      if (editId) {
        const updated = { ...form, status, id: editId, updatedAt: new Date().toISOString().slice(0,10) }
        await savePolicy(updated)
        setLocalItems(p => p.map(i => i.id === editId ? { ...i, ...form, status } : i))
      } else {
        const result = await savePolicy({ ...form, status, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy: "admin" })
        if (result) setLocalItems(p => [result, ...p])
      }
    } catch {}
    setModal(null); setForm(EMPTY); setEditId(null);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = async () => {
    if (deleteTarget) {
      setDeletedIds(p => new Set([...p, deleteTarget.id]))
      try { await removePolicy(deleteTarget.id) } catch {}
      setDeleteTarget(null)
      toast.success("Policy deleted")
    }
  };

  const uniqueTypes = [...new Set(items.map(i=>i.type))];

  if (isLoading) return <PageSkeleton />;
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><FileText size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Policy Management</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Create, manage and track all AI governance and compliance policies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(items, 'policies.csv')}><Export size={14} />Export CSV</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />New Policy</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Policies",items.length],["Active",items.filter(i=>i.status==="Active").length],["In Review",items.filter(i=>i.status==="In Review").length],["Due for Review",items.filter(i=>{ const d=new Date(i.nextReviewDate); const now=new Date(); return d>now && (d.getTime()-now.getTime())<90*24*60*60*1000; }).length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search policies…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Types</option>{uniqueTypes.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={async () => { for (const id of sp.selectedIds) { setDeletedIds(p => new Set([...p, id])); try { await removePolicy(id) } catch {} }; sp.clearSelected(); toast.success("Deleted"); }} onExport={() => exportCsv(items, "policies.csv")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<FileText size={32} className="text-[hsl(var(--brand))]" />} title="No policies found" description="Create your first policy to start governing AI usage." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />New Policy</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="title" label="Policy Title" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="framework" label="Framework" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="owner" label="Owner" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="approvalLevel" label="Approval Level" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="effectiveDate" label="Effective" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="nextReviewDate" label="Next Review" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{item.title}</p>
                      <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · v{item.version}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{item.type}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.framework}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.owner}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.approvalLevel}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.effectiveDate||"—"}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.nextReviewDate||"—"}</td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Policy":"New Policy"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Policy Identity">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Policy Title" required value={form.title} onChange={setF("title")} placeholder="AI Governance & Ethics Policy" />
              <TInput label="Version" required value={form.version} onChange={setF("version")} placeholder="1.0" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Policy Type" value={form.type} onChange={setF("type")} options={POLICY_TYPES} />
              <TSelect label="Linked Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS_OPT} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
              <TSelect label="Classification" value={form.classification} onChange={setF("classification")} options={CLASSIFICATIONS} />
            </div>
          </FormSection>
          <FormSection title="Ownership & Approval">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Policy Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
              <TSelect label="Approval Level Required" value={form.approvalLevel} onChange={setF("approvalLevel")} options={APPROVAL_LEVELS} />
            </div>
            <TInput label="Approved By" value={form.approver} onChange={setF("approver")} placeholder="Board / CISO / DPO" />
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Effective Date" type="date" value={form.effectiveDate} onChange={setF("effectiveDate")} />
              <TInput label="Next Review Date" type="date" value={form.nextReviewDate} onChange={setF("nextReviewDate")} />
            </div>
            <TSelect label="Review Cycle" value={form.reviewCycle} onChange={setF("reviewCycle")} options={REVIEW_CYCLES} />
          </FormSection>
          <FormSection title="Policy Content">
            <TTextarea label="Executive Summary" required value={form.summary} onChange={setF("summary")} placeholder="One-paragraph summary of the policy…" rows={3} maxLength={800} />
            <TTextarea label="Purpose & Objectives" value={form.purpose} onChange={setF("purpose")} placeholder="What problem does this policy solve…" rows={3} maxLength={1000} />
            <TTextarea label="Scope" value={form.scope} onChange={setF("scope")} placeholder="Who and what does this policy apply to…" rows={3} maxLength={1000} />
            <TTextarea label="Exceptions Process" value={form.exceptions} onChange={setF("exceptions")} placeholder="How to request exceptions to this policy…" rows={2} maxLength={500} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Policy":"Create Policy"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.title??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.type}</span>
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">v{viewItem.version}</span>
                <span className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{viewItem.classification}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Framework",viewItem.framework],["Owner",viewItem.owner],["Approval Level",viewItem.approvalLevel],["Approved By",viewItem.approver||"—"],["Effective Date",viewItem.effectiveDate||"—"],["Next Review",viewItem.nextReviewDate||"—"],["Review Cycle",viewItem.reviewCycle]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v}</p></div>
                ))}
              </div>
              {viewItem.summary&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Executive Summary</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.summary}</p></div>}
              {viewItem.purpose&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Purpose</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.purpose}</p></div>}
              {viewItem.scope&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Scope</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.scope}</p></div>}
              {viewItem.exceptions&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Exceptions</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.exceptions}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"created this policy"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.title}"?`} message="This policy will be permanently removed. All control links will be severed." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
