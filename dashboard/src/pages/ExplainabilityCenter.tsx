// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { fetchExplainabilityReports, upsertExplainabilityReport, deleteExplainability } from "@/services/explainabilityService";
import { Brain, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const METHODS = ["SHAP","LIME","Anchors","Attention Maps","Integrated Gradients","TCAV","Grad-CAM","Counterfactual Explanations","ICE Plots","Partial Dependence","Decision Trees","Custom"];
const AI_SYSTEMS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Customer Support Orchestrator"];
const SCOPES = ["Global","Local","Both"];
const EXPLANATION_TYPES = ["Feature Importance","Decision Path","Counterfactual","Prototype","Sensitivity Analysis","Fairness Explanation"];
const AUDIENCES = ["Technical","Non-Technical","Regulatory","Customer","Internal Audit","Mixed"];
const STATUSES = ["Queued","Running","Completed","Failed","Review Required","Archived"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson"];

const SEED: any[] = [
  { id:"EXP-001", runName:"Q1 2026 — Credit Scoring Global Explanation", model:"Credit Scoring Engine", version:"v3.2.1", method:"SHAP", scope:"Global", type:"Feature Importance", fidelityScore:0.92, stabilityScore:0.88, runDate:"2026-01-14", status:"Completed", owner:"Dr. Sarah Chen", audience:"Regulatory", topFeatures:["income_to_debt_ratio","payment_history_12m","employment_years","credit_utilization","recent_hard_inquiries"], findings:"Income-to-debt ratio (23.1%) and payment history (21.4%) are dominant features. Age was not in top-10 features confirming fairness.", actionItems:"Share with DPO for GDPR Right to Explanation documentation. Include in annual model card.", createdAt:"2026-01-14", updatedAt:"2026-01-14", createdBy:"schenai" },
  { id:"EXP-002", runName:"HR Bias Root-Cause — Local Explanations", model:"HR Screening Model", version:"v2.0.0", method:"LIME", scope:"Local", type:"Counterfactual", fidelityScore:0.78, stabilityScore:0.61, runDate:"2026-01-11", status:"Completed", owner:"Emma Rodriguez", audience:"Internal Audit", topFeatures:["gender_feature_proxy","years_experience","education_level","profile_completeness","referral_source"], findings:"LIME identified 'profile_completeness' as a proxy for gender bias. Candidates with LinkedIn profiles advanced 34% more than those without.", actionItems:"Feature 'profile_completeness' flagged for removal. Retraining required without proxy features.", createdAt:"2026-01-11", updatedAt:"2026-01-12", createdBy:"erodriguez" },
  { id:"EXP-003", runName:"Fraud Model — Attention Map Analysis", model:"Fraud Detection v3", version:"v3.0.8", method:"Integrated Gradients", scope:"Global", type:"Sensitivity Analysis", fidelityScore:0.96, stabilityScore:0.94, runDate:"2026-02-10", status:"Completed", owner:"Alex Kumar", audience:"Technical", topFeatures:["transaction_velocity_1h","merchant_category","geo_mismatch_score","device_fingerprint","ip_reputation"], findings:"Model predominantly uses transaction velocity and geo-mismatch. High stability across test batches confirms robustness.", actionItems:"Document in model card. Present at Q1 Model Review Committee.", createdAt:"2026-02-10", updatedAt:"2026-02-10", createdBy:"akumar" },
  { id:"EXP-004", runName:"GPT-4o Hallucination Sensitivity Test", model:"GPT-4o Risk Scorer v2", version:"v2.1.0", method:"Counterfactual Explanations", scope:"Local", type:"Fairness Explanation", fidelityScore:0.65, stabilityScore:0.52, runDate:"2026-03-05", status:"Review Required", owner:"Lisa Park", audience:"Regulatory", topFeatures:["prompt_structure","context_window_used","temperature_setting","regulatory_term_frequency","source_citation_density"], findings:"Low stability score (0.52) indicates model explanations are not consistent across similar prompts. Concern for regulatory use.", actionItems:"Escalate to Model Risk Committee. Consider temperature reduction and structured output enforcement.", createdAt:"2026-03-05", updatedAt:"2026-03-06", createdBy:"lpark" },
  { id:"EXP-005", runName:"NLP Classifier — SHAP Feature Importance", model:"NLP Classifier", version:"v1.4.2", method:"SHAP", scope:"Both", type:"Feature Importance", fidelityScore:null, stabilityScore:null, runDate:null, status:"Queued", owner:"James Wilson", audience:"Mixed", topFeatures:[], findings:"", actionItems:"", createdAt:"2026-04-15", updatedAt:"2026-04-15", createdBy:"jwilson" },
];

const EMPTY: any = { runName:"", model:"", version:"", method:"SHAP", scope:"Global", type:"Feature Importance", fidelityScore:"", stabilityScore:"", runDate:"", status:"Queued", owner:"", audience:"Technical", topFeatures:[], findings:"", actionItems:"" };

export default function ExplainabilityCenter() {
  const [items, setItems] = useState(SEED);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false
    fetchExplainabilityReports().then(rows => {
      if (cancelled) return
      if (Array.isArray(rows) && rows.length > 0) setItems(rows.map((r: any) => ({
        id: r.id ?? '',
        system: r.system ?? r.ai_system ?? '',
        method: r.method ?? '',
        scope: r.scope ?? 'Global',
        status: r.status ?? 'Queued',
        owner: r.owner ?? '',
        createdAt: r.created_at?.slice(0,10) ?? r.createdAt ?? '',
        updatedAt: r.updated_at?.slice(0,10) ?? r.updatedAt ?? '',
        topFeatures: Array.isArray(r.top_features) ? r.top_features : (Array.isArray(r.topFeatures) ? r.topFeatures : []),
        fidelityScore: r.fidelity_score ?? r.fidelityScore ?? '',
        stabilityScore: r.stability_score ?? r.stabilityScore ?? '',
        explanationType: r.explanation_type ?? r.explanationType ?? '',
        audience: r.audience ?? '',
        createdBy: r.created_by ?? r.createdBy ?? 'admin',
      })))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [topFeaturesInput, setTopFeaturesInput] = useState("");

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.runName.toLowerCase().includes(q) || i.model.toLowerCase().includes(q) || i.method.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (methodFilter === "all" || i.method === methodFilter);
  }), [items, search, statusFilter, methodFilter]);

  const sp = useSortAndPage(filtered, "runName");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.runName.trim()) { toast.error("Run name is required"); return; }
    setSaving(true);
    const features = topFeaturesInput ? topFeaturesInput.split(",").map(s=>s.trim()).filter(Boolean) : form.topFeatures;
    setTimeout(() => {
      const status = draft ? "Queued" : (form.status || "Queued");
      if (editId) {
        const updated = { ...form, status, topFeatures:features, updatedAt:new Date().toISOString().slice(0,10) }
        setItems(p => p.map(i => i.id === editId ? { ...i, ...updated } : i));
        toast.success("Run updated");
        upsertExplainabilityReport({ id: editId, ...updated, top_features: features, explanation_type: form.explanationType, fidelity_score: form.fidelityScore, stability_score: form.stabilityScore, updated_at: updated.updatedAt }).catch(() => {});
      } else {
        const id = `EXP-${String(items.length+1).padStart(3,"0")}`;
        const newItem = { ...form, status, id, topFeatures:features, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }
        setItems(p => [...p, newItem]);
        toast.success("Explanation run created");
        upsertExplainabilityReport({ ...newItem, top_features: features, explanation_type: form.explanationType, created_by: 'admin', created_at: newItem.createdAt }).catch(() => {});
      }
      setSaving(false); setModal(null); setForm(EMPTY); setTopFeaturesInput(""); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => {
    setForm({ ...item, fidelityScore: item.fidelityScore ?? "", stabilityScore: item.stabilityScore ?? "" });
    setTopFeaturesInput(item.topFeatures?.join(", ") || "");
    setEditId(item.id); setModal("edit");
  };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); deleteExplainability(deleteTarget?.id).catch(() => {}); setDeleteTarget(null); toast.success("Run deleted"); };

  function FidelityBar({ score }: { score: number | null }) {
    if (score === null || score === "") return <span className="text-xs text-[hsl(var(--text-4))]">—</span>;
    const pct = Math.round(score * 100);
    const color = pct >= 85 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
    return (
      <div className="flex items-center gap-2">
        <div className="w-12 h-1.5 bg-[hsl(var(--border))]"><div style={{ width:`${pct}%`, background:color, height:"100%" }} /></div>
        <span className="text-xs font-mono" style={{ color }}>{score}</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2"><Brain size={24} weight="duotone" className="text-[hsl(var(--brand))]" />Explainability Center</h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Model decision transparency, interpretability and explanation auditing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setTopFeaturesInput(""); setEditId(null); setModal("create"); }}><Plus size={14} />New Explanation Run</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Runs",items.length],["Completed",items.filter(i=>i.status==="Completed").length],["Review Required",items.filter(i=>i.status==="Review Required").length],["Avg Fidelity",`${((items.filter(i=>i.fidelityScore).reduce((a,i)=>a+i.fidelityScore,0)/Math.max(items.filter(i=>i.fidelityScore).length,1))).toFixed(2)}`]].map(([l,v])=>(
          <Card key={l as string}><CardContent className="p-4"><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{v}</p><p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{l}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search runs…" className="pl-8 h-8 text-sm" />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={methodFilter} onChange={e=>setMethodFilter(e.target.value)} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-sm px-2 py-1.5 text-[hsl(var(--text-1))]">
          <option value="all">All Methods</option>{METHODS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Brain size={32} className="text-[hsl(var(--brand))]" />} title="No explanation runs found" description="Create an explanation run to start analyzing model decisions." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />New Run</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="runName" label="Run Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="model" label="AI System" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="method" label="Method" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="scope" label="Scope" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Fidelity</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Stability</th>
                  <Th col="runDate" label="Run Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{item.runName}</p>
                      <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.model}</td>
                    <td className="px-3 py-2.5 text-xs"><span className="px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.method}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.scope}</td>
                    <td className="px-3 py-2.5"><FidelityBar score={item.fidelityScore} /></td>
                    <td className="px-3 py-2.5"><FidelityBar score={item.stabilityScore} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.runDate||"—"}</td>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Explanation Run":"New Explanation Run"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Run Configuration">
            <TInput label="Run Name" required value={form.runName} onChange={setF("runName")} placeholder="Q1 2026 — Credit Scoring SHAP Analysis" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="AI System" required value={form.model} onChange={setF("model")} options={AI_SYSTEMS} />
              <TInput label="Model Version" value={form.version} onChange={setF("version")} placeholder="v3.2.1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="XAI Method" value={form.method} onChange={setF("method")} options={METHODS} />
              <TSelect label="Explanation Scope" value={form.scope} onChange={setF("scope")} options={SCOPES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Explanation Type" value={form.type} onChange={setF("type")} options={EXPLANATION_TYPES} />
              <TSelect label="Target Audience" value={form.audience} onChange={setF("audience")} options={AUDIENCES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Run Date" type="date" value={form.runDate} onChange={setF("runDate")} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <TSelect label="Owner / Run By" value={form.owner} onChange={setF("owner")} options={OWNERS} />
          </FormSection>
          <FormSection title="Results">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Fidelity Score (0–1)" type="number" value={String(form.fidelityScore)} onChange={setF("fidelityScore")} placeholder="0.92" />
              <TInput label="Stability Score (0–1)" type="number" value={String(form.stabilityScore)} onChange={setF("stabilityScore")} placeholder="0.88" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[hsl(var(--text-2))]">Top Features (comma-separated)</label>
              <input value={topFeaturesInput} onChange={e=>setTopFeaturesInput(e.target.value)} placeholder="income_to_debt_ratio, payment_history_12m, …" className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--text-1))] outline-none focus:border-[hsl(var(--brand))] placeholder:text-[hsl(var(--text-4))]" />
            </div>
            <TTextarea label="Key Findings" value={form.findings} onChange={setF("findings")} placeholder="What did the explanation reveal about the model's decision-making…" rows={4} maxLength={2000} />
            <TTextarea label="Action Items" value={form.actionItems} onChange={setF("actionItems")} placeholder="What actions should be taken based on these findings…" rows={3} maxLength={1000} />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Run":"Create Run"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.runName??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.method}</span>
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.scope}</span>
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">Audience: {viewItem.audience}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Model",viewItem.model],["Version",viewItem.version],["Explanation Type",viewItem.type],["Owner",viewItem.owner],["Run Date",viewItem.runDate||"—"],["Fidelity",viewItem.fidelityScore||"—"],["Stability",viewItem.stabilityScore||"—"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v}</p></div>
                ))}
              </div>
              {viewItem.topFeatures?.length>0&&(
                <div><p className="text-xs text-[hsl(var(--text-4))] mb-1.5">Top Features (ranked)</p>
                  <div className="space-y-1">
                    {viewItem.topFeatures.map((f:string,i:number)=>(
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <span className="w-5 text-xs text-[hsl(var(--text-4))] text-right flex-shrink-0">{i+1}.</span>
                        <div className="flex-1 h-1.5 bg-[hsl(var(--border))]"><div style={{ width:`${100 - i * 15}%`, background:"hsl(var(--brand))", height:"100%" }} /></div>
                        <span className="text-xs text-[hsl(var(--text-2))] font-mono">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewItem.findings&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Key Findings</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.findings}</p></div>}
              {viewItem.actionItems&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Action Items</p><p className="text-sm text-[hsl(var(--text-2))] whitespace-pre-line">{viewItem.actionItems}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"created this explanation run"},{date:viewItem.updatedAt,actor:"system",action:"last updated"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.runName}"?`} message="This explanation run will be permanently deleted." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
