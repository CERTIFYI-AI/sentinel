// @ts-nocheck
import { useState, useMemo } from "react";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { ChartLine, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, CrudSlideOver, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const CRITICALITIES = ["Mission Critical","High","Medium","Low"];
const DEPTS = ["IT","Finance","Operations","Compliance","HR","Risk","Data Science","Product","Legal","Customer Experience"];
const STATUSES = ["Active","Under Review","Draft","Archived"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel","Mike Johnson","Lisa Park"];

const CRIT_COLORS: Record<string,string> = {
  "Mission Critical": "hsl(var(--s-er-tx))",
  "High": "hsl(var(--r-hi-tx))",
  "Medium": "hsl(var(--s-wn-tx))",
  "Low": "#22c55e",
};

const SEED: any[] = [
  { id:"BIA-001", name:"AI Credit Scoring Pipeline", department:"Finance", criticality:"Mission Critical", rto:"1h", rpo:"0 — no data loss", mtpd:"2h", financialImpact24h:2400000, status:"Active", owner:"Dr. Sarah Chen", lastAssessed:"2026-02-01", description:"Core credit decisioning engine processing 8,000 applications/day. Directly impacts revenue and regulatory compliance.", impactDimensions:{ financial:5, operational:5, reputational:5, regulatory:5 }, dependencies:{ assets:["AST-001","AST-002","AST-003"], vendors:["AWS","TransUnion"], aiModels:[{ model:"GPT-4o Risk Scorer v2", purpose:"Credit risk scoring", fallback:"Manual underwriting team", manualOverride:"Yes" }] }, continuityStrategy:"Activate manual underwriting within 30 min. Failover to DR region (EU-West-2) for model serving. Max 2h RTO before regulatory breach.", createdAt:"2025-06-01", updatedAt:"2026-02-01", createdBy:"schen", likelihood:2 },
  { id:"BIA-002", name:"Customer Support AI Chatbot", department:"Customer Experience", criticality:"High", rto:"4h", rpo:"1h", mtpd:"8h", financialImpact24h:480000, status:"Active", owner:"Lisa Park", lastAssessed:"2026-01-15", description:"LLM-powered customer support handling 15,000 queries/day. Outage escalates to human agents but causes significant CX degradation.", impactDimensions:{ financial:3, operational:4, reputational:4, regulatory:2 }, dependencies:{ assets:["AST-009","AST-003"], vendors:["GCP","Intercom"], aiModels:[{ model:"Customer Support Orchestrator", purpose:"Multi-intent query handling", fallback:"Human agent queue", manualOverride:"Yes" }] }, continuityStrategy:"Route to human agents via ticketing system. Scale support team on call. Notify customers of delays via status page.", createdAt:"2025-08-01", updatedAt:"2026-01-15", createdBy:"lpark", likelihood:3 },
  { id:"BIA-003", name:"Model Training Infrastructure", department:"Data Science", criticality:"Medium", rto:"48h", rpo:"24h", mtpd:"5d", financialImpact24h:85000, status:"Active", owner:"Alex Kumar", lastAssessed:"2026-03-10", description:"GPU training cluster running continuous model retraining pipelines. Outage delays model updates but doesn't impact production inference.", impactDimensions:{ financial:2, operational:3, reputational:2, regulatory:1 }, dependencies:{ assets:["AST-004"], vendors:["NVIDIA","MLflow"], aiModels:[] }, continuityStrategy:"Pause non-critical training jobs. Route priority jobs to AWS SageMaker backup environment.", createdAt:"2025-07-01", updatedAt:"2026-03-10", createdBy:"akumar", likelihood:2 },
  { id:"BIA-004", name:"Fraud Detection System", department:"Finance", criticality:"Mission Critical", rto:"0.5h", rpo:"0 — no data loss", mtpd:"1h", financialImpact24h:5200000, status:"Active", owner:"Dr. Sarah Chen", lastAssessed:"2026-02-20", description:"Real-time fraud prevention processing 250,000 transactions/hour. Outage exposes company to direct fraud losses and PSD2 regulatory risk.", impactDimensions:{ financial:5, operational:5, reputational:5, regulatory:5 }, dependencies:{ assets:["AST-007","AST-002","AST-003"], vendors:["AWS","NICE Actimize"], aiModels:[{ model:"Fraud Detection v3", purpose:"Real-time transaction fraud scoring", fallback:"Rule-based fallback engine v1", manualOverride:"Partial — high-value transactions only" }] }, continuityStrategy:"Automated failover to rule-based engine within 30s. DR site in EU-Central-1. Regulatory notification required if downtime > 1h.", createdAt:"2025-03-01", updatedAt:"2026-02-20", createdBy:"schen", likelihood:1 },
  { id:"BIA-005", name:"HR Onboarding Process", department:"HR", criticality:"Low", rto:"72h", rpo:"24h", mtpd:"14d", financialImpact24h:12000, status:"Active", owner:"Emma Rodriguez", lastAssessed:"2026-01-10", description:"AI-assisted HR onboarding workflow for new employee provisioning. Outage delays onboarding but no critical operational impact.", impactDimensions:{ financial:1, operational:2, reputational:1, regulatory:1 }, dependencies:{ assets:["AST-006"], vendors:["Workday","DocuSign"], aiModels:[{ model:"HR Screening Model", purpose:"Automated screening", fallback:"Manual HR review", manualOverride:"Yes" }] }, continuityStrategy:"Manual onboarding process via paper forms. HR team to handle provisioning manually.", createdAt:"2025-05-01", updatedAt:"2026-01-10", createdBy:"erodriguez", likelihood:4 },
  { id:"BIA-006", name:"Regulatory Reporting Pipeline", department:"Compliance", criticality:"High", rto:"24h", rpo:"4h", mtpd:"48h", financialImpact24h:320000, status:"Active", owner:"James Wilson", lastAssessed:"2026-03-01", description:"Automated pipeline generating regulatory reports for GDPR, EU AI Act, and PSD2 requirements. Late filing incurs regulatory fines.", impactDimensions:{ financial:3, operational:3, reputational:4, regulatory:5 }, dependencies:{ assets:["AST-005","AST-001"], vendors:["Azure","Tableau"], aiModels:[{ model:"NLP Classifier", purpose:"Document classification for filings", fallback:"Manual document review", manualOverride:"Yes" }] }, continuityStrategy:"Manual report generation using archived templates. Engage regulatory team to request deadline extension.", createdAt:"2025-04-01", updatedAt:"2026-03-01", createdBy:"jwilson", likelihood:2 },
  { id:"BIA-007", name:"Vendor Risk Assessment Platform", department:"Risk", criticality:"Medium", rto:"48h", rpo:"24h", mtpd:"7d", financialImpact24h:65000, status:"Under Review", owner:"Nina Patel", lastAssessed:"2026-02-15", description:"Automated third-party risk scoring and continuous vendor monitoring. Outage delays vendor onboarding and risk reviews.", impactDimensions:{ financial:2, operational:3, reputational:2, regulatory:3 }, dependencies:{ assets:["AST-003"], vendors:["Azure","BitSight","Coupa"], aiModels:[] }, continuityStrategy:"Manual vendor questionnaire process. Prioritize critical vendor reviews only.", createdAt:"2025-06-15", updatedAt:"2026-02-15", createdBy:"npatel", likelihood:3 },
  { id:"BIA-008", name:"Enterprise Data Warehouse", department:"IT", criticality:"High", rto:"12h", rpo:"4h", mtpd:"24h", financialImpact24h:750000, status:"Active", owner:"Alex Kumar", lastAssessed:"2026-03-15", description:"Central Snowflake data warehouse feeding BI, AI model training, and regulatory reporting. Downstream impact across multiple critical processes.", impactDimensions:{ financial:4, operational:4, reputational:3, regulatory:4 }, dependencies:{ assets:["AST-002","AST-005"], vendors:["Snowflake","AWS","dbt Labs"], aiModels:[{ model:"NLP Classifier", purpose:"Data categorization", fallback:"Manual tagging", manualOverride:"Yes" }] }, continuityStrategy:"Activate read replica for BI. Pause non-critical ETL jobs. Contact Snowflake support for recovery SLA.", createdAt:"2025-02-01", updatedAt:"2026-03-15", createdBy:"akumar", likelihood:2 },
];

const EMPTY: any = { name:"", department:"", criticality:"Medium", rto:"", rpo:"", mtpd:"", financialImpact24h:"", status:"Draft", owner:"", lastAssessed:"", description:"", impactDimensions:{ financial:3, operational:3, reputational:3, regulatory:3 }, dependencies:{ assets:[], vendors:[], aiModels:[] }, continuityStrategy:"", likelihood:3 };

export default function BIA() {
  const { data: items, setData: setItems } = useSupabaseTable('bia_table', SEED);
  const [search, setSearch] = useState("");
  const [critFilter, setCritFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"list"|"matrix">("list");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);
  const [matrixFilter, setMatrixFilter] = useState<{l:number,i:number}|null>(null);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = i.name.toLowerCase().includes(q) || i.department.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
    const matchCrit = critFilter === "all" || i.criticality === critFilter;
    const matchMatrix = !matrixFilter || (i.likelihood === matrixFilter.l && i.impactDimensions && Math.round(Object.values(i.impactDimensions).reduce((a:number,b:any) => a + b, 0) / 4) === matrixFilter.i);
    return matchSearch && matchCrit && matchMatrix;
  }), [items, search, critFilter, matrixFilter]);

  const sp = useSortAndPage(filtered, "criticality");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setDim = (k: string) => (v: any) => setForm((f: any) => ({ ...f, impactDimensions: { ...f.impactDimensions, [k]: Number(v) } }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Process name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Draft" : (form.status || "Draft");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("BIA updated");
      } else {
        const id = `BIA-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy:"admin", likelihood: Number(form.likelihood)||3 }]);
        toast.success("BIA record created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("BIA record deleted"); };
  const toggleBulk = (id: string) => setBulk(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = sp.page.length > 0 && sp.page.every(i => bulk.includes(i.id));

  const criticalCount = items.filter(i => i.criticality === "Mission Critical").length;
  const avgRto = Math.round(items.map(i => { const n = parseFloat(i.rto); return isNaN(n) ? 24 : n; }).reduce((a,b) => a+b, 0) / items.length);
  const dueForAssessment = items.filter(i => { if (!i.lastAssessed) return true; const diff = Date.now() - new Date(i.lastAssessed).getTime(); return diff > 90 * 24 * 3600 * 1000; }).length;

  // Build impact matrix data
  const matrixData: Record<string, number> = {};
  items.forEach(item => {
    const impact = item.impactDimensions ? Math.round(Object.values(item.impactDimensions).reduce((a: number, b: any) => a + Number(b), 0) / 4) : 3;
    const key = `${item.likelihood}-${impact}`;
    matrixData[key] = (matrixData[key]||0) + 1;
  });

  const cellColor = (l: number, i: number) => {
    const score = l * i;
    if (score >= 16) return "#fecaca";
    if (score >= 9) return "#fde68a";
    if (score >= 4) return "#d1fae5";
    return "#f0fdf4";
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
            <ChartLine size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Business Impact Analysis
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">ISO 22301 / SOC 2 A1.2 — assess AI disruption impact on business operations, define RTOs and RPOs</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> Add Process
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Processes Assessed", value: items.length, color:"hsl(var(--text-1))" },
          { label:"Mission Critical", value: criticalCount, color:"hsl(var(--s-er-tx))" },
          { label:"Avg RTO", value: `${avgRto}h`, color:"hsl(var(--brand))" },
          { label:"Assessments Due", value: dueForAssessment, color: dueForAssessment > 0 ? "hsl(var(--s-wn-tx))" : "#22c55e" },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[hsl(var(--border))]">
        {(["list","matrix"] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "list") setMatrixFilter(null); }} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))]" : "border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-2))]"}`}>{tab === "list" ? "Process List" : "Impact Matrix"}</button>
        ))}
      </div>

      {activeTab === "matrix" && (
        <div className="space-y-4">
          <p className="text-sm text-[hsl(var(--text-3))]">Click a cell to filter the process list. X-axis = Likelihood of Disruption (1=Rare → 5=Almost Certain), Y-axis = Business Impact (1=Minimal → 5=Catastrophic).</p>
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-24 text-xs text-[hsl(var(--text-3))] p-2 text-right">Impact ↓ / Likelihood →</th>
                  {[1,2,3,4,5].map(l => <th key={l} className="w-16 text-xs text-[hsl(var(--text-3))] p-2 text-center">{l}</th>)}
                </tr>
              </thead>
              <tbody>
                {[5,4,3,2,1].map(impact => (
                  <tr key={impact}>
                    <td className="text-xs text-[hsl(var(--text-3))] p-2 text-right font-medium">{impact}</td>
                    {[1,2,3,4,5].map(likelihood => {
                      const count = matrixData[`${likelihood}-${impact}`]||0;
                      const isSelected = matrixFilter?.l === likelihood && matrixFilter?.i === impact;
                      return (
                        <td key={likelihood} onClick={() => { setMatrixFilter(isSelected ? null : { l: likelihood, i: impact }); setActiveTab("list"); }} className={`w-16 h-16 text-center border border-white cursor-pointer hover:opacity-80 transition-opacity rounded ${isSelected ? "ring-2 ring-[hsl(var(--brand))]" : ""}`} style={{ background: cellColor(likelihood, impact) }}>
                          {count > 0 && <span className="text-sm font-bold text-[hsl(var(--text-2))]">{count}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 text-xs text-[hsl(var(--text-3))]">
            {[["#d1fae5","Low risk"],["#fde68a","Medium risk"],["#fecaca","High risk"]].map(([color, label]) => (
              <div key={label as string} className="flex items-center gap-1.5"><div className="w-4 h-4 rounded" style={{ background: color as string }} />{label as string}</div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "list" && <>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" size={15} />
            <Input placeholder="Search processes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <select value={critFilter} onChange={e => setCritFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
            <option value="all">All Criticalities</option>
            {CRITICALITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          {(search || critFilter !== "all" || matrixFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCritFilter("all"); setMatrixFilter(null); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
          )}
          {matrixFilter && <span className="text-xs text-[hsl(var(--brand))] font-medium">Filtered by matrix cell (L={matrixFilter.l}, I={matrixFilter.i})</span>}
          <Button variant="outline" size="sm" className="ml-auto gap-1"><Export size={14} />Export</Button>
        </div>

        {bulk.length > 0 && (
          <BulkActionToolbar count={bulk.length} onClear={() => setBulk([])}
            actions={[
              { label:"Submit for Review", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, status:"Under Review" } : i)); setBulk([]); toast.success("Submitted for review"); } },
              { label:"Delete", variant:"destructive", onClick: () => { setItems(p => p.filter(i => !bulk.includes(i.id))); setBulk([]); toast.success("Deleted"); } },
            ]}
          />
        )}

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={e => setBulk(e.target.checked ? sp.page.map(i => i.id) : [])} className="rounded" /></th>
                <Th label="Ref" col="id" sp={sp} />
                <Th label="Business Process" col="name" sp={sp} />
                <Th label="Department" col="department" sp={sp} />
                <Th label="Criticality" col="criticality" sp={sp} />
                <Th label="RTO" col="rto" sp={sp} />
                <Th label="RPO" col="rpo" sp={sp} />
                <Th label="MTPD" col="mtpd" sp={sp} />
                <Th label="Financial Impact (24h)" col="financialImpact24h" sp={sp} />
                <Th label="Status" col="status" sp={sp} />
                <Th label="Owner" col="owner" sp={sp} />
                <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sp.page.length === 0 && (
                <tr><td colSpan={12}><EmptyState icon={<ChartLine size={32} />} title="No processes found" description="Add a business process assessment" action={<Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>Add Process</Button>} /></td></tr>
              )}
              {sp.page.map(item => (
                <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={bulk.includes(item.id)} onChange={() => toggleBulk(item.id)} className="rounded" /></td>
                  <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{item.id}</td>
                  <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[200px] truncate">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.department}</td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold text-[hsl(var(--bg-surface))]" style={{ background: CRIT_COLORS[item.criticality]||"#888" }}>{item.criticality}</span></td>
                  <td className="px-4 py-3 text-xs font-mono text-[hsl(var(--text-1))]">{item.rto}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[hsl(var(--text-2))]">{item.rpo}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.mtpd}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-1))]">${(item.financialImpact24h||0).toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.owner}</td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewItem(item); setModal("view"); }}><Eye size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><PencilSimple size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-[hsl(var(--s-er-tx))]"><Trash size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar sp={sp} />
      </>}

      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY); setEditId(null); }} title={editId ? "Edit BIA Record" : "New Business Impact Analysis"} size="lg">
        <FormSection title="Process Details">
          <TInput label="Business Process Name *" value={form.name} onChange={setF("name")} placeholder="e.g. AI Credit Scoring Pipeline" />
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Department" value={form.department} onChange={setF("department")} options={DEPTS} />
            <TSelect label="Criticality" value={form.criticality} onChange={setF("criticality")} options={CRITICALITIES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
          </div>
          <TInput label="Last Assessed" value={form.lastAssessed} onChange={setF("lastAssessed")} type="date" />
          <TTextarea label="Description" value={form.description} onChange={setF("description")} rows={3} placeholder="Describe the business process and its importance" />
        </FormSection>
        <FormSection title="Impact Assessment (1=Minimal → 5=Catastrophic)">
          <div className="grid grid-cols-2 gap-3">
            {[["financial","Financial"],["operational","Operational"],["reputational","Reputational"],["regulatory","Regulatory"]].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-semibold text-[hsl(var(--text-2))] mb-1 block">{label}</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setDim(key)(n)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${form.impactDimensions?.[key] === n ? "bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--muted))]"}`}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FormSection>
        <FormSection title="Recovery Objectives">
          <div className="grid grid-cols-3 gap-3">
            <TInput label="RTO (Recovery Time Objective)" value={form.rto} onChange={setF("rto")} placeholder="e.g. 4h, 24h" />
            <TInput label="RPO (Recovery Point Objective)" value={form.rpo} onChange={setF("rpo")} placeholder="e.g. 1h, No data loss" />
            <TInput label="MTPD (Max Tolerable Disruption)" value={form.mtpd} onChange={setF("mtpd")} placeholder="e.g. 8h, 5d" />
          </div>
          <TInput label="Financial Impact per 24h ($)" value={form.financialImpact24h} onChange={setF("financialImpact24h")} type="number" placeholder="e.g. 500000" />
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--text-2))] mb-1 block">Likelihood of Disruption (1=Rare → 5=Almost Certain)</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setF("likelihood")(n)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${form.likelihood === n ? "bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]"}`}>{n}</button>
              ))}
            </div>
          </div>
        </FormSection>
        <FormSection title="Continuity Strategy">
          <TTextarea label="Recovery Procedures" value={form.continuityStrategy} onChange={setF("continuityStrategy")} rows={4} placeholder="Document recovery procedures, fallback processes, and escalation steps" />
        </FormSection>
        <FormFooter saving={saving} onDraft={() => save(true)} onSubmit={() => save(false)} submitLabel="Submit for Review" onCancel={() => { setModal(null); setForm(EMPTY); setEditId(null); }} />
      </CrudModal>

      <CrudSlideOver open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.name || ""}>
        {viewItem && <>
          <MetaBar items={[
            { label:"Ref", value: viewItem.id },
            { label:"Department", value: viewItem.department },
            { label:"Criticality", value: <span className="font-bold text-sm" style={{ color: CRIT_COLORS[viewItem.criticality] }}>{viewItem.criticality}</span> },
            { label:"Status", value: <StatusBadge status={viewItem.status} /> },
            { label:"Owner", value: viewItem.owner },
            { label:"Last Assessed", value: viewItem.lastAssessed },
          ]} />
          <FormSection title="Process Description">
            <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p>
          </FormSection>
          <FormSection title="Impact Assessment">
            <div className="space-y-2">
              {Object.entries(viewItem.impactDimensions||{}).map(([dim, score]) => (
                <div key={dim} className="flex items-center gap-3">
                  <span className="text-xs text-[hsl(var(--text-2))] capitalize w-24">{dim}</span>
                  <div className="flex-1 h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                    <div className="h-full rounded-full bg-[hsl(var(--brand))]" style={{ width:`${(Number(score)/5)*100}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-[hsl(var(--text-1))] w-8">{score as number}/5</span>
                </div>
              ))}
            </div>
          </FormSection>
          <FormSection title="Recovery Objectives">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[["RTO", viewItem.rto], ["RPO", viewItem.rpo], ["MTPD", viewItem.mtpd]].map(([label, val]) => (
                <div key={label as string} className="border border-[hsl(var(--border))] rounded-xl p-3">
                  <div className="text-xs text-[hsl(var(--text-3))] mb-1">{label as string}</div>
                  <div className="text-lg font-bold text-[hsl(var(--text-1))]">{val as string}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm">
              <span className="text-[hsl(var(--text-3))]">Financial Impact (24h):</span>
              <span className="font-bold text-[hsl(var(--text-1))] ml-2">${(viewItem.financialImpact24h||0).toLocaleString()}</span>
            </div>
          </FormSection>
          {viewItem.dependencies?.aiModels?.length > 0 && (
            <FormSection title="AI System Dependencies">
              <div className="space-y-2">
                {viewItem.dependencies.aiModels.map((m: any, idx: number) => (
                  <div key={idx} className="border border-[hsl(var(--border))] rounded-lg p-3 text-sm">
                    <div className="font-medium text-[hsl(var(--text-1))]">{m.model}</div>
                    <div className="text-xs text-[hsl(var(--text-3))] mt-0.5">Purpose: {m.purpose}</div>
                    <div className="text-xs text-[hsl(var(--text-2))] mt-0.5">Fallback: {m.fallback}</div>
                    <div className="text-xs mt-0.5"><span className="text-[hsl(var(--text-3))]">Manual Override:</span> <span className={`font-semibold ${m.manualOverride === "Yes" ? "text-[hsl(var(--s-ok-tx))]" : "text-[hsl(var(--s-wn-tx))]"}`}>{m.manualOverride}</span></div>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
          <FormSection title="Continuity Strategy">
            <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.continuityStrategy}</p>
          </FormSection>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => openEdit(viewItem)} variant="outline" size="sm"><PencilSimple size={14} />Edit</Button>
            <Button onClick={() => toast.success("BIA report generated")} variant="outline" size="sm">Generate Report</Button>
            <Button onClick={() => { setModal(null); setDeleteTarget(viewItem); }} variant="destructive" size="sm"><Trash size={14} />Delete</Button>
          </div>
        </>}
      </CrudSlideOver>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete BIA Record" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
