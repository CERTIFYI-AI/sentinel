// @ts-nocheck
import { useState, useMemo } from "react";
import { Database, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, X, Link } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const ASSET_TYPES = ["AI Model","Dataset","API Endpoint","Server","Database","Application","Network Device","Cloud Service","Physical Device"];
const CLASSIFICATIONS = ["Public","Internal","Confidential","Restricted","Top Secret"];
const LOCATIONS = ["On-premise","AWS","Azure","GCP","Hybrid","Multi-cloud"];
const RISK_LEVELS = ["Critical","High","Medium","Low"];
const STATUSES = ["Active","Maintenance","Decommissioning","Retired"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel","Mike Johnson","Lisa Park"];
const DEPTS = ["IT","Security","Data Science","Compliance","Finance","Operations","HR","Product"];

const CLASS_COLORS: Record<string, string> = {
  "Public": "bg-green-100 text-green-700",
  "Internal": "bg-blue-100 text-blue-700",
  "Confidential": "bg-amber-100 text-amber-700",
  "Restricted": "bg-orange-100 text-orange-700",
  "Top Secret": "bg-red-100 text-red-700",
};
const RISK_COLORS: Record<string, string> = { Critical:"#ef4444", High:"#f97316", Medium:"#f59e0b", Low:"#22c55e" };

const SEED: any[] = [
  { id:"AST-001", name:"GPT-4o Risk Scorer v2", type:"AI Model", classification:"Confidential", owner:"Dr. Sarah Chen", department:"Data Science", location:"AWS", linkedModels:["AST-001"], riskLevel:"Critical", status:"Active", lastAudited:"2026-02-10", description:"Production credit risk scoring model deployed in underwriting pipeline. High-risk AI system under EU AI Act.", controls:["Encryption at rest","Role-based access","Audit logging","Bias monitoring"], frameworks:["EU AI Act","ISO 42001","SOC 2"], auditHistory:[{ date:"2026-02-10", auditor:"James Wilson", result:"Pass — 2 minor findings" },{ date:"2025-08-01", auditor:"Emma Rodriguez", result:"Pass" }], createdAt:"2025-03-01", updatedAt:"2026-02-10", createdBy:"schen" },
  { id:"AST-002", name:"Customer PII Dataset — EU Customers", type:"Dataset", classification:"Restricted", owner:"Nina Patel", department:"Data Science", location:"AWS", linkedModels:["AST-001","AST-007"], riskLevel:"Critical", status:"Active", lastAudited:"2026-01-20", description:"Training and inference dataset containing EU customer PII. Subject to GDPR and EU AI Act data governance requirements.", controls:["Encryption at rest","Pseudonymization","Access audit trail","Data minimization"], frameworks:["GDPR","EU AI Act","ISO 27001"], auditHistory:[{ date:"2026-01-20", auditor:"Dr. Sarah Chen", result:"Pass — encryption validated" }], createdAt:"2025-01-15", updatedAt:"2026-01-20", createdBy:"npatel" },
  { id:"AST-003", name:"Model Serving API Gateway", type:"API Endpoint", classification:"Confidential", owner:"Alex Kumar", department:"IT", location:"AWS", linkedModels:["AST-001","AST-007","AST-009"], riskLevel:"High", status:"Active", lastAudited:"2026-03-01", description:"Kong API gateway routing inference requests to AI models in production. Handles auth, rate limiting and logging.", controls:["mTLS","API key rotation","Rate limiting","Request logging"], frameworks:["SOC 2","ISO 27001"], auditHistory:[{ date:"2026-03-01", auditor:"Alex Kumar", result:"Pass" }], createdAt:"2025-05-01", updatedAt:"2026-03-01", createdBy:"akumar" },
  { id:"AST-004", name:"ML Training Cluster (GPU)", type:"Server", classification:"Internal", owner:"Alex Kumar", department:"IT", location:"On-premise", linkedModels:[], riskLevel:"High", status:"Active", lastAudited:"2026-01-10", description:"On-premise GPU cluster used for model training and fine-tuning. 8x A100 GPUs.", controls:["Physical access control","Network isolation","Encryption at rest"], frameworks:["ISO 27001"], auditHistory:[{ date:"2026-01-10", auditor:"Mike Johnson", result:"Pass" }], createdAt:"2024-11-01", updatedAt:"2026-01-10", createdBy:"akumar" },
  { id:"AST-005", name:"Compliance Document Store", type:"Database", classification:"Confidential", owner:"James Wilson", department:"Compliance", location:"Azure", linkedModels:[], riskLevel:"Medium", status:"Active", lastAudited:"2026-02-25", description:"Azure Blob Storage containing audit reports, DPIA documents, compliance evidence. Encrypted with CMK.", controls:["Customer-managed keys","Access logging","Geo-redundancy"], frameworks:["ISO 27001","SOC 2","GDPR"], auditHistory:[{ date:"2026-02-25", auditor:"James Wilson", result:"Pass" }], createdAt:"2025-02-01", updatedAt:"2026-02-25", createdBy:"jwilson" },
  { id:"AST-006", name:"HR Screening AI Application", type:"Application", classification:"Confidential", owner:"Emma Rodriguez", department:"HR", location:"AWS", linkedModels:["AST-010"], riskLevel:"Critical", status:"Maintenance", lastAudited:"2026-01-15", description:"AI-powered HR screening tool. Suspended for bias remediation following INC-001 gender bias incident.", controls:["Encryption","Access controls","Bias monitoring","HITL review"], frameworks:["EU AI Act","GDPR","ISO 42001"], auditHistory:[{ date:"2026-01-15", auditor:"Emma Rodriguez", result:"Fail — bias detected (INC-001)" }], createdAt:"2025-04-15", updatedAt:"2026-01-15", createdBy:"erodriguez" },
  { id:"AST-007", name:"Fraud Detection Model v3", type:"AI Model", classification:"Confidential", owner:"Dr. Sarah Chen", department:"Data Science", location:"AWS", linkedModels:["AST-002"], riskLevel:"Critical", status:"Active", lastAudited:"2026-03-10", description:"Real-time fraud detection model processing 10k transactions/min. PSD2-regulated environment.", controls:["Encryption","RBAC","Real-time monitoring","Model versioning"], frameworks:["EU AI Act","PSD2","SOC 2"], auditHistory:[{ date:"2026-03-10", auditor:"Dr. Sarah Chen", result:"Pass" }], createdAt:"2025-02-20", updatedAt:"2026-03-10", createdBy:"schen" },
  { id:"AST-008", name:"Legacy On-Prem Auth Server", type:"Server", classification:"Internal", owner:"Mike Johnson", department:"IT", location:"On-premise", linkedModels:[], riskLevel:"High", status:"Decommissioning", lastAudited:"2025-12-01", description:"Legacy authentication server scheduled for decommission Q2 2026. Being migrated to Azure AD.", controls:["Network segmentation","Patching schedule"], frameworks:["ISO 27001"], auditHistory:[{ date:"2025-12-01", auditor:"Mike Johnson", result:"Pass — decommission approved" }], createdAt:"2019-01-01", updatedAt:"2025-12-01", createdBy:"mjohnson" },
  { id:"AST-009", name:"Customer Support LLM Orchestrator", type:"AI Model", classification:"Confidential", owner:"Lisa Park", department:"Product", location:"GCP", linkedModels:["AST-002","AST-003"], riskLevel:"High", status:"Active", lastAudited:"2026-03-20", description:"LangChain-based multi-agent orchestrator powering customer support chatbot. Processes customer PII in context.", controls:["PII redaction","Rate limiting","Output filtering","Audit logging"], frameworks:["EU AI Act","GDPR","SOC 2"], auditHistory:[{ date:"2026-03-20", auditor:"Lisa Park", result:"Pass — 1 minor finding" }], createdAt:"2025-08-01", updatedAt:"2026-03-20", createdBy:"lpark" },
  { id:"AST-010", name:"HR Dataset — Applicant Pool 2024", type:"Dataset", classification:"Restricted", owner:"Emma Rodriguez", department:"HR", location:"AWS", linkedModels:["AST-006"], riskLevel:"High", status:"Maintenance", lastAudited:"2026-01-16", description:"Dataset of 45,000 job applications used to train HR screening model. Contains protected characteristics — under remediation.", controls:["Encryption","Pseudonymization","Restricted access"], frameworks:["GDPR","EU AI Act"], auditHistory:[{ date:"2026-01-16", auditor:"Emma Rodriguez", result:"Fail — bias data identified" }], createdAt:"2024-09-01", updatedAt:"2026-01-16", createdBy:"erodriguez" },
];

const EMPTY: any = { name:"", type:"AI Model", classification:"Internal", owner:"", department:"", location:"AWS", linkedModels:[], riskLevel:"Medium", status:"Active", lastAudited:"", description:"", controls:[], frameworks:[], auditHistory:[] };

export default function AssetManagement() {
  const [items, setItems] = useState(SEED);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);
  const [controlInput, setControlInput] = useState("");

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      && (typeFilter === "all" || i.type === typeFilter)
      && (classFilter === "all" || i.classification === classFilter)
      && (riskFilter === "all" || i.riskLevel === riskFilter);
  }), [items, search, typeFilter, classFilter, riskFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Asset name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Active" : (form.status || "Active");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("Asset updated");
      } else {
        const id = `AST-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Asset registered");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Asset deleted"); };
  const toggleBulk = (id: string) => setBulk(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = sp.page.length > 0 && sp.page.every(i => bulk.includes(i.id));

  const unclassified = items.filter(i => !i.classification || i.classification === "Public").length;
  const highValue = items.filter(i => i.riskLevel === "Critical" || i.riskLevel === "High").length;
  const noOwner = items.filter(i => !i.owner).length;

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Database size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Asset Registry
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">ISO 27001 Annex A.5.9 — inventory of AI systems, datasets, infrastructure and endpoints</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> Register Asset
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Total Assets", value: items.length, color:"hsl(var(--text-1))" },
          { label:"Unclassified Assets", value: unclassified, color:"#f59e0b" },
          { label:"High-Value Assets", value: highValue, color:"#f97316" },
          { label:"Assets Without Owner", value: noOwner, color: noOwner > 0 ? "#ef4444" : "#22c55e" },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" size={15} />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Types</option>
          {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Classifications</option>
          {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Risk Levels</option>
          {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
        </select>
        {(search || typeFilter !== "all" || classFilter !== "all" || riskFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter("all"); setClassFilter("all"); setRiskFilter("all"); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto gap-1"><Export size={14} />Export</Button>
      </div>

      {bulk.length > 0 && (
        <BulkActionToolbar count={bulk.length} onClear={() => setBulk([])}
          actions={[
            { label:"Decommission", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, status:"Decommissioning" } : i)); setBulk([]); toast.success("Marked for decommission"); } },
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
              <Th label="Asset Name" col="name" sp={sp} />
              <Th label="Type" col="type" sp={sp} />
              <Th label="Classification" col="classification" sp={sp} />
              <Th label="Owner" col="owner" sp={sp} />
              <Th label="Location" col="location" sp={sp} />
              <Th label="Risk Level" col="riskLevel" sp={sp} />
              <Th label="Status" col="status" sp={sp} />
              <Th label="Last Audited" col="lastAudited" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sp.page.length === 0 && (
              <tr><td colSpan={11}><EmptyState icon={<Database size={32} />} title="No assets found" description="Register your first asset" action={<Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>Register Asset</Button>} /></td></tr>
            )}
            {sp.page.map(item => (
              <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={bulk.includes(item.id)} onChange={() => toggleBulk(item.id)} className="rounded" /></td>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{item.id}</td>
                <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[200px] truncate">{item.name}</td>
                <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]">{item.type}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${CLASS_COLORS[item.classification]||"bg-gray-100 text-gray-700"}`}>{item.classification}</span></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.owner}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.location}</td>
                <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: RISK_COLORS[item.riskLevel]||"#888" }}>{item.riskLevel}</span></td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.lastAudited}</td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewItem(item); setModal("view"); }}><Eye size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><PencilSimple size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-red-500"><Trash size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar sp={sp} />

      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY); setEditId(null); }} title={editId ? "Edit Asset" : "Register Asset"} size="lg">
        <FormSection title="Asset Details">
          <TInput label="Asset Name *" value={form.name} onChange={setF("name")} placeholder="e.g. GPT-4o Risk Scorer v2" />
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Asset Type" value={form.type} onChange={setF("type")} options={ASSET_TYPES} />
            <TSelect label="Classification" value={form.classification} onChange={setF("classification")} options={CLASSIFICATIONS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
            <TSelect label="Department" value={form.department} onChange={setF("department")} options={DEPTS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Location" value={form.location} onChange={setF("location")} options={LOCATIONS} />
            <TSelect label="Risk Level" value={form.riskLevel} onChange={setF("riskLevel")} options={RISK_LEVELS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            <TInput label="Last Audited" value={form.lastAudited} onChange={setF("lastAudited")} type="date" />
          </div>
          <TTextarea label="Description" value={form.description} onChange={setF("description")} rows={3} placeholder="Describe this asset's purpose and context" />
        </FormSection>
        <FormSection title="Security Controls">
          <div className="flex gap-2 mb-2">
            <Input value={controlInput} onChange={e => setControlInput(e.target.value)} placeholder="Add security control" className="h-8 text-sm flex-1" onKeyDown={e => { if (e.key === "Enter" && controlInput.trim()) { setForm((f: any) => ({ ...f, controls: [...(f.controls||[]), controlInput.trim()] })); setControlInput(""); } }} />
            <Button size="sm" variant="outline" onClick={() => { if (controlInput.trim()) { setForm((f: any) => ({ ...f, controls: [...(f.controls||[]), controlInput.trim()] })); setControlInput(""); } }}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(form.controls||[]).map((c: string, idx: number) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                {c}<button onClick={() => setForm((f: any) => ({ ...f, controls: f.controls.filter((_: any, i: number) => i !== idx) }))} className="hover:text-red-500"><X size={10} /></button>
              </span>
            ))}
          </div>
        </FormSection>
        <FormFooter saving={saving} onDraft={() => save(true)} onSubmit={() => save(false)} onCancel={() => { setModal(null); setForm(EMPTY); setEditId(null); }} />
      </CrudModal>

      <CrudModal open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.name || ""} size="lg">
        {viewItem && <>
          <MetaBar items={[
            { label:"Ref", value: viewItem.id },
            { label:"Type", value: viewItem.type },
            { label:"Classification", value: <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CLASS_COLORS[viewItem.classification]||""}`}>{viewItem.classification}</span> },
            { label:"Risk", value: <span className="font-semibold" style={{ color: RISK_COLORS[viewItem.riskLevel] }}>{viewItem.riskLevel}</span> },
            { label:"Status", value: <StatusBadge status={viewItem.status} /> },
            { label:"Owner", value: viewItem.owner },
            { label:"Location", value: viewItem.location },
            { label:"Department", value: viewItem.department },
          ]} />
          <FormSection title="Description">
            <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p>
          </FormSection>
          <FormSection title="Security Controls">
            <div className="flex flex-wrap gap-1">
              {(viewItem.controls||[]).map((c: string) => (
                <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{c}</span>
              ))}
            </div>
          </FormSection>
          <FormSection title="Compliance Mapping">
            <div className="flex flex-wrap gap-1">
              {(viewItem.frameworks||[]).map((f: string) => (
                <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">{f}</span>
              ))}
            </div>
          </FormSection>
          {viewItem.auditHistory?.length > 0 && (
            <FormSection title="Audit History">
              <div className="space-y-2">
                {viewItem.auditHistory.map((a: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 text-sm border-b border-[hsl(var(--border))] pb-2 last:border-0">
                    <span className="text-[hsl(var(--text-3))] text-xs">{a.date}</span>
                    <span className="text-[hsl(var(--text-2))] flex-1">{a.auditor}</span>
                    <span className={`text-xs font-medium ${a.result.startsWith("Pass") ? "text-green-600" : "text-red-600"}`}>{a.result}</span>
                  </div>
                ))}
              </div>
            </FormSection>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => openEdit(viewItem)} variant="outline" size="sm"><PencilSimple size={14} className="mr-1" />Edit</Button>
            <Button onClick={() => { toast.success("Decommission initiated"); setItems(p => p.map(i => i.id === viewItem.id ? { ...i, status:"Decommissioning" } : i)); setModal(null); }} variant="outline" size="sm">Decommission</Button>
            <Button onClick={() => { setModal(null); setDeleteTarget(viewItem); }} variant="destructive" size="sm"><Trash size={14} className="mr-1" />Delete</Button>
          </div>
        </>}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete Asset" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
