// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { Database, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { useDatasetData } from '@/hooks/useDatasetData';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

const DATA_TYPES = ["Training","Validation","Test","Production","Synthetic","Reference"];
const SOURCES = ["Internal Data Warehouse","External Vendor","Public Dataset","Synthetic Generator","API Feed","Manual Upload","Third-Party License"];
const FORMATS = ["CSV","JSON","Parquet","SQL","API","HDF5","XML","Avro","Delta Lake"];
const SENSITIVITY = ["Public","Internal","Confidential","Restricted","Top Secret"];
const RETENTION = ["30 days","90 days","1 year","3 years","5 years","7 years","Indefinite"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Data Governance Team"];
const JURISDICTIONS = ["Global","EU","US","UK","APAC","India","Canada"];
const PII_TYPES = ["Name","Email","Phone","SSN","Date of Birth","Address","IP Address","Credit Card","Health Data","Biometrics"];
const STATUSES = ["Active","Archived","Deprecated","Under Review","Pending Approval"];
const QUALITY_NOTES = ["High Quality","Validated","Unvalidated","Partially Validated","Quality Unknown"];



const EMPTY: any = { name:"", version:"1.0", dataType:"Training", source:"", format:"CSV", sensitivity:"Internal", size:"", piiPresence:false, piiTypes:[], retention:"1 year", owner:"", steward:"", jurisdiction:"Global", qualityScore:80, lineageStatus:"Undocumented", status:"Active", description:"", usageTerms:"" };

export default function Datasets() {
  const { items: liveItems, isLoading, save: saveItem, remove: removeItem } = useDatasetData();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [sensitFilter, setSensitFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (liveItems.length > 0) setItems(liveItems); }, [liveItems]);
  if (isLoading) return <PageSkeleton />;

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q) || i.dataType.toLowerCase().includes(q))
      && (sensitFilter === "all" || i.sensitivity === sensitFilter);
  }), [items, search, sensitFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (draft = false) => {
    if (!form.name.trim()) { toast.error("Dataset name is required"); return; }
    setSaving(true);
    const status = draft ? "Pending Approval" : (form.status || "Active");
    try {
      if (editId) {
        const updated = { ...form, status, updatedAt: new Date().toISOString().slice(0,10) };
        setItems(p => p.map(i => i.id === editId ? { ...i, ...updated } : i));
        await saveItem({ ...updated, id: editId });
        toast.success("Dataset updated");
      } else {
        const id = `DS-${String(items.length+1).padStart(3,"0")}`;
        const newItem = { ...form, status, id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" };
        setItems(p => [...p, newItem]);
        await saveItem(newItem);
        toast.success("Dataset registered");
      }
    } catch { toast.error("Failed to save dataset"); }
    setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = async () => {
    setItems(p => p.filter(i => i.id !== deleteTarget?.id));
    setDeleteTarget(null);
    toast.success("Dataset removed");
    try { if (deleteTarget?.id) await removeItem(deleteTarget.id); } catch {}
  };

  const sensColors: Record<string, string> = { Public:"#22c55e", Internal:"#3b82f6", Confidential:"#f59e0b", Restricted:"#ef4444", "Top Secret":"#7c3aed" };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Database size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Datasets</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Manage training, validation and production datasets for AI models</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Register Dataset</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Datasets",items.length],["Contains PII",items.filter(i=>i.piiPresence).length],["Confidential+",items.filter(i=>["Confidential","Restricted","Top Secret"].includes(i.sensitivity)).length],["Under Review",items.filter(i=>i.status==="Under Review").length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search datasets…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={sensitFilter} onChange={e=>setSensitFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Sensitivity Levels</option>{SENSITIVITY.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Database size={32} className="text-[hsl(var(--brand))]" />} title="No datasets found" description="Register your first dataset to begin tracking data lineage and compliance." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />Register Dataset</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="name" label="Dataset Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="dataType" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="source" label="Source" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="format" label="Format" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="size" label="Size" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="sensitivity" label="Sensitivity" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Lineage</th>
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="owner" label="Owner" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p><p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · v{item.version}</p></td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.dataType}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.source}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-[hsl(var(--text-3))]">{item.format}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.size}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 border" style={{ color:sensColors[item.sensitivity], borderColor:`${sensColors[item.sensitivity]}40`, background:`${sensColors[item.sensitivity]}15` }}>{item.sensitivity}</span>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.lineageStatus} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Dataset":"Register New Dataset"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Dataset Name" required value={form.name} onChange={setF("name")} placeholder="HR Candidate Dataset 2025" />
              <TInput label="Version" required value={form.version} onChange={setF("version")} placeholder="1.0" />
            </div>
            <TTextarea label="Description" value={form.description} onChange={setF("description")} placeholder="Describe the dataset contents and purpose…" rows={3} maxLength={1500} />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Data Type" value={form.dataType} onChange={setF("dataType")} options={DATA_TYPES} />
              <TSelect label="Source System" value={form.source} onChange={setF("source")} options={SOURCES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Data Format" value={form.format} onChange={setF("format")} options={FORMATS} />
              <TInput label="Size (approx.)" value={form.size} onChange={setF("size")} placeholder="4.2 GB" />
            </div>
          </FormSection>
          <FormSection title="Sensitivity & Compliance">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Sensitivity Level" value={form.sensitivity} onChange={setF("sensitivity")} options={SENSITIVITY} />
              <TSelect label="Jurisdiction" value={form.jurisdiction} onChange={setF("jurisdiction")} options={JURISDICTIONS} />
            </div>
            <TToggle label="Contains PII" value={form.piiPresence} onChange={setF("piiPresence")} hint="Enable if this dataset contains personally identifiable information" />
            {form.piiPresence && <TCheckGroup label="PII Types Present" options={PII_TYPES} value={form.piiTypes} onChange={setF("piiTypes")} />}
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Retention Policy" value={form.retention} onChange={setF("retention")} options={RETENTION} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <TTextarea label="License / Usage Terms" value={form.usageTerms} onChange={setF("usageTerms")} placeholder="Describe usage terms and license…" rows={2} maxLength={500} />
          </FormSection>
          <FormSection title="Ownership">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Data Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
              <TSelect label="Data Steward" value={form.steward} onChange={setF("steward")} options={OWNERS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Quality Score (0–100)" type="number" value={String(form.qualityScore)} onChange={v=>setF("qualityScore")(Number(v))} placeholder="80" />
              <TSelect label="Lineage Status" value={form.lineageStatus} onChange={setF("lineageStatus")} options={["Documented","Auto-Generated","Undocumented","Partial"]} />
            </div>
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Dataset":"Register Dataset"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.name??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 border" style={{ color:sensColors[viewItem.sensitivity], borderColor:`${sensColors[viewItem.sensitivity]}40`, background:`${sensColors[viewItem.sensitivity]}15` }}>{viewItem.sensitivity}</span>
                {viewItem.piiPresence&&<span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200">Contains PII</span>}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Data Type",viewItem.dataType],["Format",viewItem.format],["Size",viewItem.size],["Source",viewItem.source],["Owner",viewItem.owner],["Steward",viewItem.steward],["Jurisdiction",viewItem.jurisdiction],["Retention",viewItem.retention],["Quality Score",`${viewItem.qualityScore}/100`],["Lineage",viewItem.lineageStatus]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              {viewItem.piiPresence&&viewItem.piiTypes.length>0&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1.5">PII Types</p><div className="flex flex-wrap gap-1.5">{viewItem.piiTypes.map((t:string)=><span key={t} className="text-xs px-2 py-0.5 bg-red-50 border border-red-200 text-red-600">{t}</span>)}</div></div>}
              {viewItem.description&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p></div>}
              {viewItem.usageTerms&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Usage Terms</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.usageTerms}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"registered this dataset"},{date:viewItem.updatedAt,actor:"system",action:"last updated record"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`} message="This action cannot be undone. All model linkages to this dataset will be removed." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
