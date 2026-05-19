// @ts-nocheck
import { useState, useMemo } from "react";
import { Cpu, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { useModelsData } from '@/hooks/useModelsData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { useChartTheme } from '@/hooks/useChartTheme'

const MODEL_TYPES = ["Large Language Model","Classical ML","Deep Learning","Rule-Based","Ensemble","Generative AI","Recommendation","Computer Vision","NLP","Time Series"];
const RISK_CLASSES = ["Unacceptable Risk","High Risk","Limited Risk","Minimal Risk"];
const DEPLOYMENT_ENVS = ["Production","Staging","Development","Archived","Retired"];
const FRAMEWORKS_USED = ["PyTorch","TensorFlow","scikit-learn","Hugging Face","OpenAI API","Anthropic API","ONNX","Keras","XGBoost","LightGBM"];
const DOMAINS = ["Financial Services","Human Resources","Customer Service","Healthcare","Legal","Security","Operations","Marketing","Compliance","Product"];
const STATUSES = ["Active","Deprecated","Retired","Under Review","Suspended","Draft"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson","Data Science Team"];
const REVIEW_CYCLES = ["Monthly","Quarterly","Semi-Annual","Annual","Event-Driven"];

const EMPTY: any = { name:"", version:"1.0.0", type:"Classical ML", domain:"Financial Services", riskClass:"Minimal Risk", status:"Draft", environment:"Development", owner:"", framework:[], trainingDataset:"", deployedDate:"", lastEvalDate:"", nextReviewDate:"", reviewCycle:"Annual", biasAuditPassed:false, explainabilityScore:0, robustnessScore:0, driftMonitored:false, humanOversight:false, description:"", intendedUse:"", limitations:"" };

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

function ScoreChip({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
  return <span className="text-xs px-1.5 py-0.5 border font-mono" style={{ color, borderColor:`${color}40`, background:`${color}12` }}>{label}: {score}</span>;
}

export default function ModelInventory() {
  const { models: items, isLoading, saveModel, deleteModel: removeModel } = useModelsData()
  const chartTheme = useChartTheme()
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.domain.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (riskFilter === "all" || i.riskClass === riskFilter);
  }), [items, search, statusFilter, riskFilter]);

  const sp = useSortAndPage(filtered, "name");

  if (isLoading) return <PageSkeleton />
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (draft = false) => {
    if (!form.name.trim()) { toast.error("Model name is required"); return; }
    setSaving(true);
    try {
      const status = draft ? "Draft" : (form.status || "Draft");
      const payload = editId
        ? { ...form, status, id: editId }
        : { ...form, status };
      await saveModel(payload);
      setModal(null); setForm(EMPTY); setEditId(null);
    } catch { /* toast handled by hook */ }
    setSaving(false);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = async () => {
    if (!deleteTarget) return;
    await removeModel(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Cpu size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Model Inventory</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Comprehensive registry of all AI models across the organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(items, 'model-inventory.csv')}><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />Register Model</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Models",items.length],["Active",items.filter(i=>i.status==="Active").length],["High Risk",items.filter(i=>i.riskClass==="High Risk").length],["Suspended",items.filter(i=>i.status==="Suspended").length]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search models…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={riskFilter} onChange={e=>setRiskFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Risk Classes</option>{RISK_CLASSES.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={async () => { for (const id of sp.selectedIds) { await removeModel(id); } sp.clearSelected(); }} onExport={() => exportCsv(sp.paged.filter((i:any)=>sp.selectedIds.has(i.id)), 'models-selected.csv')} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Cpu size={32} className="text-[hsl(var(--brand))]" />} title="No models registered" description="Register your first AI model to begin tracking it." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />Register Model</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="name" label="Model Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="domain" label="Domain" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="riskClass" label="EU AI Act Risk" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Scores</th>
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="environment" label="Env" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="nextReviewDate" label="Next Review" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p><p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id} · {item.version}</p></td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.type}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.domain}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.riskClass} /></td>
                    <td className="px-3 py-2.5"><div className="flex flex-col gap-0.5"><ScoreChip label="XAI" score={item.explainabilityScore} /><ScoreChip label="Rob" score={item.robustnessScore} /></div></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.environment}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.nextReviewDate||"—"}</td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Model":"Register New Model"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Model Identity">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Model Name" required value={form.name} onChange={setF("name")} placeholder="Fraud Detection" />
              <TInput label="Version" required value={form.version} onChange={setF("version")} placeholder="v3.0.8" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Model Type" value={form.type} onChange={setF("type")} options={MODEL_TYPES} />
              <TSelect label="Business Domain" value={form.domain} onChange={setF("domain")} options={DOMAINS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="EU AI Act Risk Class" value={form.riskClass} onChange={setF("riskClass")} options={RISK_CLASSES} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <TSelect label="Deployment Environment" value={form.environment} onChange={setF("environment")} options={DEPLOYMENT_ENVS} />
            <TCheckGroup label="Frameworks / Libraries Used" options={FRAMEWORKS_USED} value={form.framework} onChange={setF("framework")} />
          </FormSection>
          <FormSection title="Documentation">
            <TTextarea label="Description" required value={form.description} onChange={setF("description")} placeholder="Describe the model's purpose, architecture and capabilities…" rows={3} maxLength={1500} />
            <TTextarea label="Intended Use" value={form.intendedUse} onChange={setF("intendedUse")} placeholder="Specific use cases and user populations…" rows={2} maxLength={500} />
            <TTextarea label="Known Limitations" value={form.limitations} onChange={setF("limitations")} placeholder="Documented limitations, failure modes, and out-of-scope uses…" rows={2} maxLength={500} />
            <TInput label="Training Dataset" value={form.trainingDataset} onChange={setF("trainingDataset")} placeholder="Transaction Records 2024" />
          </FormSection>
          <FormSection title="Governance & Evaluation">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Model Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
              <TSelect label="Review Cycle" value={form.reviewCycle} onChange={setF("reviewCycle")} options={REVIEW_CYCLES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Deployed Date" type="date" value={form.deployedDate} onChange={setF("deployedDate")} />
              <TInput label="Last Eval Date" type="date" value={form.lastEvalDate} onChange={setF("lastEvalDate")} />
            </div>
            <TInput label="Next Review Date" type="date" value={form.nextReviewDate} onChange={setF("nextReviewDate")} />
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Explainability Score (0–100)" type="number" value={String(form.explainabilityScore)} onChange={v=>setF("explainabilityScore")(Number(v))} placeholder="78" />
              <TInput label="Robustness Score (0–100)" type="number" value={String(form.robustnessScore)} onChange={v=>setF("robustnessScore")(Number(v))} placeholder="85" />
            </div>
            <TToggle label="Bias Audit Passed" value={form.biasAuditPassed} onChange={setF("biasAuditPassed")} hint="Model has passed most recent bias/fairness audit" />
            <TToggle label="Drift Monitoring Enabled" value={form.driftMonitored} onChange={setF("driftMonitored")} hint="PSI / data drift monitoring active" />
            <TToggle label="Human Oversight Required" value={form.humanOversight} onChange={setF("humanOversight")} hint="Decisions require human-in-the-loop review" />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Model":"Register Model"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={`${viewItem?.name??""} — Model Record`} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <StatusBadge status={viewItem.riskClass} />
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.type}</span>
                {viewItem.biasAuditPassed?<span className="text-xs text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5">Bias Audit ✓</span>:<span className="text-xs text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5">Bias Audit ✗</span>}
                {viewItem.humanOversight&&<span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5">HITL Required</span>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {[["Version",viewItem.version],["Domain",viewItem.domain],["Environment",viewItem.environment],["Owner",viewItem.owner],["Review Cycle",viewItem.reviewCycle],["Next Review",viewItem.nextReviewDate||"—"],["Explainability",`${viewItem.explainabilityScore}/100`],["Robustness",`${viewItem.robustnessScore}/100`],["Drift Monitoring",viewItem.driftMonitored?"Yes":"No"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v}</p></div>
                ))}
              </div>
              {viewItem.framework?.length>0&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1.5">Frameworks</p><div className="flex flex-wrap gap-1.5">{viewItem.framework.map((f:string)=><span key={f} className="text-xs px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{f}</span>)}</div></div>}
              {viewItem.description&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p></div>}
              {viewItem.intendedUse&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Intended Use</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.intendedUse}</p></div>}
              {viewItem.limitations&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Known Limitations</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.limitations}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"registered this model"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`} message="This model record will be permanently removed from the inventory." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
