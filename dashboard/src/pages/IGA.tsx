import { useState, useMemo } from "react";
import { UserList, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, X, Warning, CheckCircle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, CrudSlideOver, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const IDENTITY_TYPES = ["Human","Service Account","API Key","Bot"];
const PRIVILEGE_LEVELS = ["Admin","Operator","Viewer","No Access"];
const REVIEW_STATUSES = ["Current","Due","Overdue","Revoked"];
const IDENTITY_STATUSES = ["Active","Inactive","Suspended","Revoked"];
const DEPTS = ["IT","Security","Data Science","Compliance","Finance","HR","Operations","Risk","Product","Legal"];
const REVIEWERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel"];
const AI_SYSTEMS_LIST = ["GPT-4o Risk Scorer v2","Fraud Detection v3","HR Screening Model","NLP Classifier","Customer Support Orchestrator","Credit Scoring Engine","Bias Monitoring System"];

const PRIV_COLORS: Record<string,string> = {
  "Admin": "bg-red-100 text-red-700",
  "Operator": "bg-amber-100 text-amber-700",
  "Viewer": "bg-blue-100 text-blue-700",
  "No Access": "bg-gray-100 text-gray-500",
};

const SEED: any[] = [
  { id:"IGA-001", name:"Dr. Sarah Chen", email:"s.chen@acme.com", type:"Human", role:"CISO", department:"Security", manager:"CEO", privilegeLevel:"Admin", aiSystemsAccess:["GPT-4o Risk Scorer v2","Fraud Detection v3","HR Screening Model","NLP Classifier","Customer Support Orchestrator","Credit Scoring Engine","Bias Monitoring System"], reviewStatus:"Current", reviewer:"James Wilson", nextReview:"2026-07-01", lastLogin:"2026-04-17", status:"Active", riskFlags:[], entitlements:[{ system:"Sentinel GRC", role:"Super Admin", granted:"2025-01-01", grantedBy:"CEO", justification:"CISO role requires full platform access" }], createdAt:"2025-01-01", updatedAt:"2026-04-01", createdBy:"admin" },
  { id:"IGA-002", name:"Alex Kumar", email:"a.kumar@acme.com", type:"Human", role:"MLOps Engineer", department:"Data Science", manager:"Dr. Sarah Chen", privilegeLevel:"Operator", aiSystemsAccess:["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine"], reviewStatus:"Due", reviewer:"Dr. Sarah Chen", nextReview:"2026-04-30", lastLogin:"2026-04-15", status:"Active", riskFlags:[], entitlements:[{ system:"ML Platform", role:"Model Deployer", granted:"2025-03-15", grantedBy:"Dr. Sarah Chen", justification:"MLOps role requires deployment access" }], createdAt:"2025-03-01", updatedAt:"2026-03-15", createdBy:"schen" },
  { id:"IGA-003", name:"James Wilson", email:"j.wilson@acme.com", type:"Human", role:"DPO", department:"Compliance", manager:"CEO", privilegeLevel:"Operator", aiSystemsAccess:["GPT-4o Risk Scorer v2","HR Screening Model","Bias Monitoring System"], reviewStatus:"Current", reviewer:"Dr. Sarah Chen", nextReview:"2026-07-01", lastLogin:"2026-04-16", status:"Active", riskFlags:[], entitlements:[{ system:"Sentinel GRC", role:"DPO", granted:"2025-01-01", grantedBy:"CEO", justification:"DPO statutory role" }], createdAt:"2025-01-01", updatedAt:"2026-04-01", createdBy:"admin" },
  { id:"IGA-004", name:"Emma Rodriguez", email:"e.rodriguez@acme.com", type:"Human", role:"HR Director", department:"HR", manager:"CEO", privilegeLevel:"Viewer", aiSystemsAccess:["HR Screening Model"], reviewStatus:"Overdue", reviewer:"James Wilson", nextReview:"2026-03-31", lastLogin:"2026-04-10", status:"Active", riskFlags:["Access review overdue > 14 days"], entitlements:[{ system:"HR Platform", role:"HR Admin", granted:"2025-02-01", grantedBy:"CEO", justification:"HR Director needs full HR system access" },{ system:"AI Screening Tool", role:"Viewer", granted:"2025-04-01", grantedBy:"Dr. Sarah Chen", justification:"Required for screening oversight" }], createdAt:"2025-02-01", updatedAt:"2026-01-01", createdBy:"admin" },
  { id:"IGA-005", name:"model-serving-svc", email:"model-svc@acme-internal", type:"Service Account", role:"ML Model Serving", department:"IT", manager:"Alex Kumar", privilegeLevel:"Operator", aiSystemsAccess:["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","Customer Support Orchestrator"], reviewStatus:"Current", reviewer:"Alex Kumar", nextReview:"2026-06-01", lastLogin:"2026-04-17", status:"Active", riskFlags:[], entitlements:[{ system:"Model Serving API", role:"Service Operator", granted:"2025-08-01", grantedBy:"Alex Kumar", justification:"Required for automated model inference pipeline" }], createdAt:"2025-08-01", updatedAt:"2026-04-01", createdBy:"akumar" },
  { id:"IGA-006", name:"fraud-detection-api-key", email:"N/A", type:"API Key", role:"Fraud Detection Integration", department:"IT", manager:"Alex Kumar", privilegeLevel:"Operator", aiSystemsAccess:["Fraud Detection v3"], reviewStatus:"Due", reviewer:"Alex Kumar", nextReview:"2026-05-01", lastLogin:"2026-04-17", status:"Active", riskFlags:[], entitlements:[{ system:"Fraud Detection API", role:"API Consumer", granted:"2025-05-01", grantedBy:"Alex Kumar", justification:"PSD2 integration requires API access" }], createdAt:"2025-05-01", updatedAt:"2026-04-01", createdBy:"akumar" },
  { id:"IGA-007", name:"Nina Patel", email:"n.patel@acme.com", type:"Human", role:"Privacy Analyst", department:"Compliance", manager:"James Wilson", privilegeLevel:"Viewer", aiSystemsAccess:["Bias Monitoring System"], reviewStatus:"Current", reviewer:"James Wilson", nextReview:"2026-07-01", lastLogin:"2026-04-14", status:"Active", riskFlags:[], entitlements:[{ system:"Sentinel GRC", role:"Privacy Viewer", granted:"2025-06-01", grantedBy:"James Wilson", justification:"Privacy analyst needs read access to GRC platform" }], createdAt:"2025-06-01", updatedAt:"2026-01-01", createdBy:"jwilson" },
  { id:"IGA-008", name:"Mike Johnson (Departed)", email:"m.johnson@acme.com", type:"Human", role:"Former IT Manager", department:"IT", manager:"Dr. Sarah Chen", privilegeLevel:"Admin", aiSystemsAccess:["GPT-4o Risk Scorer v2","Fraud Detection v3","HR Screening Model","NLP Classifier","Customer Support Orchestrator","Credit Scoring Engine"], reviewStatus:"Overdue", reviewer:"Dr. Sarah Chen", nextReview:"2026-01-01", lastLogin:"2026-01-05", status:"Suspended", riskFlags:["Orphaned account — no login 102 days","Excessive privileges — Admin level for departed user","Immediate revocation recommended"], entitlements:[{ system:"Sentinel GRC", role:"Admin", granted:"2023-01-01", grantedBy:"CEO", justification:"IT Manager role" },{ system:"ML Platform", role:"Admin", granted:"2024-03-01", grantedBy:"Dr. Sarah Chen", justification:"Escalated access for incident response" }], createdAt:"2023-01-01", updatedAt:"2026-01-05", createdBy:"admin" },
  { id:"IGA-009", name:"reporting-bot", email:"bot@acme-internal", type:"Bot", role:"Compliance Reporting Bot", department:"Compliance", manager:"James Wilson", privilegeLevel:"Viewer", aiSystemsAccess:["Bias Monitoring System"], reviewStatus:"Current", reviewer:"James Wilson", nextReview:"2026-06-01", lastLogin:"2026-04-17", status:"Active", riskFlags:[], entitlements:[{ system:"Sentinel GRC", role:"Report Generator", granted:"2025-09-01", grantedBy:"James Wilson", justification:"Automated weekly reporting" }], createdAt:"2025-09-01", updatedAt:"2026-01-01", createdBy:"jwilson" },
  { id:"IGA-010", name:"Lisa Park", email:"l.park@acme.com", type:"Human", role:"Product Manager", department:"Product", manager:"CEO", privilegeLevel:"Viewer", aiSystemsAccess:["Customer Support Orchestrator"], reviewStatus:"Current", reviewer:"Dr. Sarah Chen", nextReview:"2026-07-01", lastLogin:"2026-04-16", status:"Active", riskFlags:[], entitlements:[{ system:"Sentinel GRC", role:"Viewer", granted:"2025-04-01", grantedBy:"Dr. Sarah Chen", justification:"PM needs read access for governance reporting" }], createdAt:"2025-04-01", updatedAt:"2026-01-01", createdBy:"schen" },
];

const EMPTY: any = { name:"", email:"", type:"Human", role:"", department:"", manager:"", privilegeLevel:"Viewer", aiSystemsAccess:[], reviewStatus:"Current", reviewer:"", nextReview:"", status:"Active", riskFlags:[], entitlements:[] };

export default function IGA() {
  const [items, setItems] = useState(SEED);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"identities"|"campaigns">("identities");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q) || i.role.toLowerCase().includes(q))
      && (typeFilter === "all" || i.type === typeFilter)
      && (reviewFilter === "all" || i.reviewStatus === reviewFilter);
  }), [items, search, typeFilter, reviewFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Identity name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("Identity updated");
      } else {
        const id = `IGA-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, id, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Identity created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Identity deleted"); };
  const toggleBulk = (id: string) => setBulk(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = sp.page.length > 0 && sp.page.every(i => bulk.includes(i.id));

  const privileged = items.filter(i => i.privilegeLevel === "Admin" || i.privilegeLevel === "Operator").length;
  const pendingReviews = items.filter(i => i.reviewStatus === "Due" || i.reviewStatus === "Overdue").length;
  const orphaned = items.filter(i => i.riskFlags?.some((f: string) => f.toLowerCase().includes("orphan"))).length;
  const avgReviewPct = Math.round((items.filter(i => i.reviewStatus === "Current").length / items.length) * 100);

  const MOCK_CAMPAIGNS = [
    { id:"CAM-001", name:"Q1 2026 Access Review", scope:"All AI Systems", reviewer:"Dr. Sarah Chen", dueDate:"2026-03-31", progress:72, status:"In Progress" },
    { id:"CAM-002", name:"Privileged Account Review", scope:"Admin & Operator privilege", reviewer:"James Wilson", dueDate:"2026-04-30", progress:0, status:"Planned" },
    { id:"CAM-003", name:"Orphaned Account Cleanup", scope:"Inactive 90+ days", reviewer:"Alex Kumar", dueDate:"2026-04-15", progress:100, status:"Completed" },
  ];

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
            <UserList size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Identity Governance
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">SOC 2 CC6.1 / ISO 27001 A.5.15 — manage access rights, entitlements, and least-privilege for AI systems</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> Add Identity
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label:"Total Identities", value: items.length, color:"hsl(var(--text-1))" },
          { label:"Privileged Accounts", value: privileged, color:"#f59e0b" },
          { label:"Pending Access Reviews", value: pendingReviews, color:"#f97316" },
          { label:"Orphaned Accounts", value: orphaned, color: orphaned > 0 ? "#ef4444" : "#22c55e" },
          { label:"Avg Review Completion", value: `${avgReviewPct}%`, color:"hsl(var(--brand))" },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[hsl(var(--border))]">
        {(["identities","campaigns"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-[hsl(var(--brand))] text-[hsl(var(--brand))]" : "border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-2))]"}`}>{tab === "identities" ? "Identities" : "Review Campaigns"}</button>
        ))}
      </div>

      {activeTab === "identities" && <>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" size={15} />
            <Input placeholder="Search identities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
            <option value="all">All Types</option>
            {IDENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
            <option value="all">All Review Statuses</option>
            {REVIEW_STATUSES.map(r => <option key={r}>{r}</option>)}
          </select>
          {(search || typeFilter !== "all" || reviewFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTypeFilter("all"); setReviewFilter("all"); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
          )}
          <Button variant="outline" size="sm" className="ml-auto gap-1"><Export size={14} />Export</Button>
        </div>

        {bulk.length > 0 && (
          <BulkActionToolbar count={bulk.length} onClear={() => setBulk([])}
            actions={[
              { label:"Trigger Access Review", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, reviewStatus:"Due" } : i)); setBulk([]); toast.success("Access review triggered"); } },
              { label:"Revoke All Access", variant:"destructive", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, status:"Revoked", privilegeLevel:"No Access", aiSystemsAccess:[], reviewStatus:"Revoked" } : i)); setBulk([]); toast.success("Access revoked"); } },
            ]}
          />
        )}

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={e => setBulk(e.target.checked ? sp.page.map(i => i.id) : [])} className="rounded" /></th>
                <Th label="Identity" col="name" sp={sp} />
                <Th label="Type" col="type" sp={sp} />
                <Th label="Role" col="role" sp={sp} />
                <Th label="Department" col="department" sp={sp} />
                <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))]">AI Systems Access</th>
                <Th label="Privilege Level" col="privilegeLevel" sp={sp} />
                <Th label="Last Login" col="lastLogin" sp={sp} />
                <Th label="Review Status" col="reviewStatus" sp={sp} />
                <Th label="Next Review" col="nextReview" sp={sp} />
                <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sp.page.length === 0 && (
                <tr><td colSpan={11}><EmptyState icon={<UserList size={32} />} title="No identities found" description="Add an identity to get started" action={<Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>Add Identity</Button>} /></td></tr>
              )}
              {sp.page.map(item => (
                <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={bulk.includes(item.id)} onChange={() => toggleBulk(item.id)} className="rounded" /></td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[hsl(var(--text-1))]">{item.name}{item.riskFlags?.length > 0 && <Warning size={12} className="text-red-500 inline ml-1" weight="fill" />}</div>
                    <div className="text-xs text-[hsl(var(--text-3))]">{item.email}</div>
                  </td>
                  <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]">{item.type}</span></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.role}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.department}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">
                    <span>{item.aiSystemsAccess?.length} system{item.aiSystemsAccess?.length !== 1 ? "s" : ""}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRIV_COLORS[item.privilegeLevel]||""}`}>{item.privilegeLevel}</span></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.lastLogin || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.reviewStatus} /></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.nextReview}</td>
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
      </>}

      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => toast.success("Campaign creation coming soon")}>+ New Campaign</Button>
          </div>
          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]">
                  {["Campaign","Scope","Reviewer","Due Date","Progress","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_CAMPAIGNS.map(c => (
                  <tr key={c.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)]">
                    <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))]">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{c.scope}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{c.reviewer}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{c.dueDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                          <div className="h-full rounded-full bg-[hsl(var(--brand))]" style={{ width:`${c.progress}%` }} />
                        </div>
                        <span className="text-xs">{c.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY); setEditId(null); }} title={editId ? "Edit Identity" : "Add Identity"} size="lg">
        <FormSection title="Identity Profile">
          <TInput label="Name *" value={form.name} onChange={setF("name")} placeholder="Full name or service account name" />
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Email" value={form.email} onChange={setF("email")} placeholder="user@company.com" />
            <TSelect label="Type" value={form.type} onChange={setF("type")} options={IDENTITY_TYPES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Role" value={form.role} onChange={setF("role")} placeholder="e.g. MLOps Engineer" />
            <TSelect label="Department" value={form.department} onChange={setF("department")} options={DEPTS} />
          </div>
          <TInput label="Manager" value={form.manager} onChange={setF("manager")} placeholder="Manager name" />
        </FormSection>
        <FormSection title="Access & Privileges">
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Privilege Level" value={form.privilegeLevel} onChange={setF("privilegeLevel")} options={PRIVILEGE_LEVELS} />
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={IDENTITY_STATUSES} />
          </div>
          <div>
            <label className="text-xs font-semibold text-[hsl(var(--text-2))] mb-1 block">AI Systems Access</label>
            <div className="grid grid-cols-2 gap-1">
              {AI_SYSTEMS_LIST.map(sys => (
                <label key={sys} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={(form.aiSystemsAccess||[]).includes(sys)} onChange={e => {
                    const cur = form.aiSystemsAccess||[];
                    setF("aiSystemsAccess")(e.target.checked ? [...cur, sys] : cur.filter((s: string) => s !== sys));
                  }} className="rounded" />
                  <span className="text-[hsl(var(--text-2))]">{sys}</span>
                </label>
              ))}
            </div>
          </div>
        </FormSection>
        <FormSection title="Access Review">
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Review Status" value={form.reviewStatus} onChange={setF("reviewStatus")} options={REVIEW_STATUSES} />
            <TSelect label="Reviewer" value={form.reviewer} onChange={setF("reviewer")} options={REVIEWERS} />
          </div>
          <TInput label="Next Review Date" value={form.nextReview} onChange={setF("nextReview")} type="date" />
        </FormSection>
        <FormFooter saving={saving} onDraft={() => save(true)} onSubmit={() => save(false)} onCancel={() => { setModal(null); setForm(EMPTY); setEditId(null); }} />
      </CrudModal>

      <CrudSlideOver open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.name || ""}>
        {viewItem && <>
          <MetaBar items={[
            { label:"Type", value: viewItem.type },
            { label:"Role", value: viewItem.role },
            { label:"Department", value: viewItem.department },
            { label:"Privilege", value: <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIV_COLORS[viewItem.privilegeLevel]||""}`}>{viewItem.privilegeLevel}</span> },
            { label:"Review", value: <StatusBadge status={viewItem.reviewStatus} /> },
            { label:"Status", value: <StatusBadge status={viewItem.status} /> },
          ]} />
          {viewItem.riskFlags?.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1"><Warning size={16} className="text-red-600" weight="fill" /><span className="text-sm font-semibold text-red-700">Risk Indicators</span></div>
              {viewItem.riskFlags.map((f: string) => <div key={f} className="text-xs text-red-600 ml-6">• {f}</div>)}
            </div>
          )}
          <FormSection title="Identity Profile">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-[hsl(var(--text-3))]">Email:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.email}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Manager:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.manager}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Last Login:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.lastLogin || "—"}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Next Review:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.nextReview}</span></div>
            </div>
          </FormSection>
          <FormSection title="AI Systems Access">
            <div className="flex flex-wrap gap-1">
              {(viewItem.aiSystemsAccess||[]).map((s: string) => (
                <span key={s} className="inline-flex px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{s}</span>
              ))}
            </div>
          </FormSection>
          <FormSection title="Entitlements">
            <div className="space-y-3">
              {(viewItem.entitlements||[]).map((ent: any, idx: number) => (
                <div key={idx} className="border border-[hsl(var(--border))] rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[hsl(var(--text-1))]">{ent.system}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIV_COLORS["Operator"]||""}`}>{ent.role}</span>
                  </div>
                  <div className="text-xs text-[hsl(var(--text-3))]">Granted: {ent.granted} by {ent.grantedBy}</div>
                  <div className="text-xs text-[hsl(var(--text-2))] mt-0.5">{ent.justification}</div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="h-6 text-xs text-green-600" onClick={() => toast.success("Access approved")}><CheckCircle size={10} className="mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs text-red-600" onClick={() => toast.success("Access revoked")}><XCircle size={10} className="mr-1" />Revoke</Button>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => openEdit(viewItem)} variant="outline" size="sm"><PencilSimple size={14} className="mr-1" />Edit</Button>
            <Button onClick={() => { toast.success("Access review triggered"); setItems(p => p.map(i => i.id === viewItem.id ? { ...i, reviewStatus:"Due" } : i)); setModal(null); }} variant="outline" size="sm">Trigger Review</Button>
            <Button onClick={() => { setModal(null); setDeleteTarget(viewItem); }} variant="destructive" size="sm"><Trash size={14} className="mr-1" />Delete</Button>
          </div>
        </>}
      </CrudSlideOver>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete Identity" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
