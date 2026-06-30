// @ts-nocheck
import { useState, useMemo } from "react";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { ClipboardText, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, ArrowUp, ArrowDown, X, CheckCircle, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, CrudSlideOver, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const LEGAL_BASES = ["Art.6(1)(a) Consent","Art.6(1)(b) Contract","Art.6(1)(c) Legal Obligation","Art.6(1)(d) Vital Interest","Art.6(1)(e) Public Task","Art.6(1)(f) Legitimate Interest"];
const RISK_LEVELS = ["Critical","High","Medium","Low"];
const STATUSES = ["Draft","Active","Under Review","Archived"];
const DATA_SUBJECTS_OPTS = ["Employees","Customers","Applicants","Vendors","Minors","Patients","Website Visitors"];
const DATA_CATS_OPTS = ["Name","Email","Financial","Health","Biometric","Location","Behavioral","Criminal","Political","Racial/Ethnic"];
const OWNERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson","Nina Patel"];
const DEPTS = ["HR","Finance","Marketing","Legal","IT","Operations","Compliance","Product"];

const SEED: any[] = [
  { id:"RPA-001", name:"Employee Payroll Processing", purpose:"HR administration and salary disbursement", legalBasis:"Art.6(1)(b) Contract", dataSubjects:["Employees"], dataCategories:["Name","Email","Financial"], recipients:"HR Dept, Finance Dept, ADP Payroll", internationalTransfer:false, transferDest:"", transferMechanism:"", retentionPeriod:"7 years post-employment", riskLevel:"Medium", status:"Active", owner:"Mike Johnson", lastReviewed:"2026-01-15", createdAt:"2025-06-01", updatedAt:"2026-01-15", createdBy:"mjohnson", dpoReviewed:true, dpiaRequired:false, encryption:true, accessControls:true, pseudonymization:false },
  { id:"RPA-002", name:"Customer Credit Scoring ML Pipeline", purpose:"Automated creditworthiness assessment for loan applications", legalBasis:"Art.6(1)(b) Contract", dataSubjects:["Customers"], dataCategories:["Name","Email","Financial","Behavioral"], recipients:"Credit Risk Team, Underwriting, External CRA", internationalTransfer:true, transferDest:"USA", transferMechanism:"SCCs", retentionPeriod:"5 years post-decision", riskLevel:"Critical", status:"Active", owner:"Dr. Sarah Chen", lastReviewed:"2026-02-01", createdAt:"2025-03-15", updatedAt:"2026-02-01", createdBy:"schen", dpoReviewed:true, dpiaRequired:true, encryption:true, accessControls:true, pseudonymization:true },
  { id:"RPA-003", name:"Marketing Analytics & Targeting", purpose:"Personalised marketing and campaign optimisation", legalBasis:"Art.6(1)(a) Consent", dataSubjects:["Customers","Website Visitors"], dataCategories:["Email","Behavioral","Location"], recipients:"Marketing Dept, Google Analytics, Meta Ads", internationalTransfer:true, transferDest:"USA", transferMechanism:"SCCs", retentionPeriod:"Until consent withdrawn", riskLevel:"High", status:"Under Review", owner:"Emma Rodriguez", lastReviewed:"2026-03-10", createdAt:"2025-07-20", updatedAt:"2026-03-10", createdBy:"erodriguez", dpoReviewed:false, dpiaRequired:false, encryption:true, accessControls:true, pseudonymization:true },
  { id:"RPA-004", name:"AI Model Training Data", purpose:"Training and validation of internal AI models", legalBasis:"Art.6(1)(f) Legitimate Interest", dataSubjects:["Customers","Employees"], dataCategories:["Name","Behavioral","Financial","Biometric"], recipients:"AI/ML Team, Data Science", internationalTransfer:false, transferDest:"", transferMechanism:"", retentionPeriod:"3 years post-model retirement", riskLevel:"Critical", status:"Under Review", owner:"Dr. Sarah Chen", lastReviewed:"2026-01-28", createdAt:"2025-09-01", updatedAt:"2026-01-28", createdBy:"schen", dpoReviewed:false, dpiaRequired:true, encryption:true, accessControls:true, pseudonymization:true },
  { id:"RPA-005", name:"Vendor Due Diligence", purpose:"Third-party risk assessment and procurement compliance", legalBasis:"Art.6(1)(c) Legal Obligation", dataSubjects:["Vendors"], dataCategories:["Name","Email","Financial"], recipients:"Procurement, Legal, Security", internationalTransfer:false, transferDest:"", transferMechanism:"", retentionPeriod:"5 years post-contract", riskLevel:"Low", status:"Active", owner:"James Wilson", lastReviewed:"2026-02-20", createdAt:"2025-05-10", updatedAt:"2026-02-20", createdBy:"jwilson", dpoReviewed:true, dpiaRequired:false, encryption:true, accessControls:true, pseudonymization:false },
  { id:"RPA-006", name:"Employee Health Benefits Administration", purpose:"Administration of health insurance and wellness programs", legalBasis:"Art.6(1)(c) Legal Obligation", dataSubjects:["Employees"], dataCategories:["Name","Email","Health"], recipients:"HR Dept, AXA Insurance, Occupational Health", internationalTransfer:false, transferDest:"", transferMechanism:"", retentionPeriod:"10 years post-employment", riskLevel:"High", status:"Active", owner:"Nina Patel", lastReviewed:"2026-01-05", createdAt:"2025-04-01", updatedAt:"2026-01-05", createdBy:"npatel", dpoReviewed:true, dpiaRequired:false, encryption:true, accessControls:true, pseudonymization:true },
  { id:"RPA-007", name:"Website Cookie Tracking", purpose:"Analytics, performance measurement, and ad targeting", legalBasis:"Art.6(1)(a) Consent", dataSubjects:["Website Visitors"], dataCategories:["Behavioral","Location"], recipients:"Google Analytics, Hotjar, Marketing Dept", internationalTransfer:true, transferDest:"USA", transferMechanism:"SCCs", retentionPeriod:"12 months", riskLevel:"Medium", status:"Active", owner:"Emma Rodriguez", lastReviewed:"2026-03-01", createdAt:"2025-08-15", updatedAt:"2026-03-01", createdBy:"erodriguez", dpoReviewed:true, dpiaRequired:false, encryption:false, accessControls:true, pseudonymization:false },
  { id:"RPA-008", name:"Job Applicant Screening", purpose:"Automated resume screening and candidate ranking", legalBasis:"Art.6(1)(b) Contract", dataSubjects:["Applicants"], dataCategories:["Name","Email","Behavioral"], recipients:"HR Dept, HireVue, Hiring Managers", internationalTransfer:true, transferDest:"USA", transferMechanism:"SCCs", retentionPeriod:"2 years post-decision", riskLevel:"High", status:"Draft", owner:"Alex Kumar", lastReviewed:"2026-04-01", createdAt:"2026-01-10", updatedAt:"2026-04-01", createdBy:"akumar", dpoReviewed:false, dpiaRequired:true, encryption:true, accessControls:true, pseudonymization:true },
];

const EMPTY: any = { name:"", purpose:"", legalBasis:"Art.6(1)(b) Contract", dataSubjects:[], dataCategories:[], recipients:"", internationalTransfer:false, transferDest:"", transferMechanism:"SCCs", retentionPeriod:"", riskLevel:"Low", status:"Draft", owner:"", lastReviewed:"", dpiaRequired:false, dpoReviewed:false, encryption:false, accessControls:false, pseudonymization:false };

const RISK_COLOR: Record<string,string> = { Critical:"hsl(var(--s-er-tx))", High:"hsl(var(--r-hi-tx))", Medium:"hsl(var(--s-wn-tx))", Low:"#22c55e" };

export default function RoPA() {
  const { data: items, setData: setItems } = useSupabaseTable('ropa_table', SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.purpose.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (riskFilter === "all" || i.riskLevel === riskFilter);
  }), [items, search, statusFilter, riskFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Activity name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Draft" : (form.status || "Draft");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("Activity updated");
      } else {
        const id = `RPA-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Processing activity created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Activity deleted"); };
  const toggleBulk = (id: string) => setBulk(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = sp.page.length > 0 && sp.page.every(i => bulk.includes(i.id));

  const highRisk = items.filter(i => i.riskLevel === "Critical" || i.riskLevel === "High").length;
  const pendingDpo = items.filter(i => !i.dpoReviewed).length;
  const transfers = items.filter(i => i.internationalTransfer).length;

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
            <ClipboardText size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Records of Processing Activities
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">GDPR Article 30 — maintain a register of every personal data processing activity</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> Add Processing Activity
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Total Activities", value: items.length, color:"hsl(var(--text-1))" },
          { label:"High-Risk Activities", value: highRisk, color:"hsl(var(--s-er-tx))" },
          { label:"Pending DPO Review", value: pendingDpo, color:"hsl(var(--s-wn-tx))" },
          { label:"Intl. Transfers", value: transfers, color:"hsl(var(--brand))" },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" size={15} />
          <Input placeholder="Search activities..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm px-2 text-[hsl(var(--text-2))]">
          <option value="all">All Risk Levels</option>
          {RISK_LEVELS.map(r => <option key={r}>{r}</option>)}
        </select>
        {(search || statusFilter !== "all" || riskFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setRiskFilter("all"); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto gap-1"><Export size={14} />Export</Button>
      </div>

      {bulk.length > 0 && (
        <BulkActionToolbar count={bulk.length} onClear={() => setBulk([])}
          actions={[
            { label:"Archive", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, status:"Archived" } : i)); setBulk([]); toast.success("Archived"); } },
            { label:"Delete", variant:"destructive", onClick: () => { setItems(p => p.filter(i => !bulk.includes(i.id))); setBulk([]); toast.success("Deleted"); } },
          ]}
        />
      )}

      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={e => setBulk(e.target.checked ? sp.page.map(i => i.id) : [])} className="rounded" />
              </th>
              <Th label="Ref" col="id" sp={sp} />
              <Th label="Activity Name" col="name" sp={sp} />
              <Th label="Legal Basis" col="legalBasis" sp={sp} />
              <Th label="Data Subjects" col="dataSubjects" sp={sp} />
              <Th label="Transfer?" col="internationalTransfer" sp={sp} />
              <Th label="Retention" col="retentionPeriod" sp={sp} />
              <Th label="Risk" col="riskLevel" sp={sp} />
              <Th label="Status" col="status" sp={sp} />
              <Th label="Owner" col="owner" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sp.page.length === 0 && (
              <tr><td colSpan={11}><EmptyState icon={<ClipboardText size={32} />} title="No activities found" description="Add your first processing activity" action={<Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>Add Activity</Button>} /></td></tr>
            )}
            {sp.page.map(item => (
              <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={bulk.includes(item.id)} onChange={() => toggleBulk(item.id)} className="rounded" />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{item.id}</td>
                <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[180px] truncate">{item.name}</td>
                <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))]">{item.legalBasis.split(" ")[0] + " " + (item.legalBasis.split(" ")[1]||"")}</span></td>
                <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs">{(item.dataSubjects||[]).slice(0,2).join(", ")}{item.dataSubjects?.length > 2 ? ` +${item.dataSubjects.length-2}` : ""}</td>
                <td className="px-4 py-3">{item.internationalTransfer ? <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Warning size={12} />Yes — {item.transferDest}</span> : <span className="text-xs text-[hsl(var(--text-3))]">No</span>}</td>
                <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs max-w-[120px] truncate">{item.retentionPeriod}</td>
                <td className="px-4 py-3"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: RISK_COLOR[item.riskLevel]||"#888" }}>{item.riskLevel}</span></td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-[hsl(var(--text-2))] text-xs">{item.owner}</td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewItem(item); setModal("view"); }}><Eye size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><PencilSimple size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="text-red-500 hover:text-red-600"><Trash size={14} /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar sp={sp} />

      {/* Create/Edit Modal */}
      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY); setEditId(null); }} title={editId ? "Edit Processing Activity" : "New Processing Activity"} size="lg">
        <FormSection title="Step 1 — Activity Details">
          <TInput label="Activity Name *" value={form.name} onChange={setF("name")} placeholder="e.g. Employee Payroll Processing" />
          <TTextarea label="Purpose" value={form.purpose} onChange={setF("purpose")} placeholder="Describe the purpose of this processing activity" rows={3} />
          <TSelect label="Legal Basis" value={form.legalBasis} onChange={setF("legalBasis")} options={LEGAL_BASES} />
          <div className="grid grid-cols-2 gap-3">
            <TSelect label="Risk Level" value={form.riskLevel} onChange={setF("riskLevel")} options={RISK_LEVELS} />
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
          </div>
        </FormSection>
        <FormSection title="Step 2 — Data Subjects & Categories">
          <TCheckGroup label="Data Subjects" value={form.dataSubjects||[]} onChange={setF("dataSubjects")} options={DATA_SUBJECTS_OPTS} />
          <TCheckGroup label="Data Categories" value={form.dataCategories||[]} onChange={setF("dataCategories")} options={DATA_CATS_OPTS} />
          <TToggle label="DPIA Required?" value={form.dpiaRequired} onChange={setF("dpiaRequired")} />
        </FormSection>
        <FormSection title="Step 3 — Recipients & Transfers">
          <TTextarea label="Recipients" value={form.recipients} onChange={setF("recipients")} placeholder="List internal departments and external processors" rows={2} />
          <TInput label="Retention Period" value={form.retentionPeriod} onChange={setF("retentionPeriod")} placeholder="e.g. 7 years post-employment" />
          <TToggle label="International Transfer?" value={form.internationalTransfer} onChange={setF("internationalTransfer")} />
          {form.internationalTransfer && (
            <div className="grid grid-cols-2 gap-3">
              <TInput label="Destination Country" value={form.transferDest} onChange={setF("transferDest")} placeholder="e.g. USA, India" />
              <TSelect label="Transfer Mechanism" value={form.transferMechanism} onChange={setF("transferMechanism")} options={["SCCs","BCRs","Adequacy Decision","Derogation Art.49","Binding Agreement"]} />
            </div>
          )}
        </FormSection>
        <FormSection title="Step 4 — Technical & Org Measures">
          <div className="grid grid-cols-2 gap-3">
            <TToggle label="Encryption" value={form.encryption} onChange={setF("encryption")} />
            <TToggle label="Access Controls" value={form.accessControls} onChange={setF("accessControls")} />
            <TToggle label="Pseudonymization" value={form.pseudonymization} onChange={setF("pseudonymization")} />
            <TToggle label="DPO Reviewed" value={form.dpoReviewed} onChange={setF("dpoReviewed")} />
          </div>
          <TSelect label="Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
          <TInput label="Last Reviewed" value={form.lastReviewed} onChange={setF("lastReviewed")} type="date" />
        </FormSection>
        <FormFooter saving={saving} onDraft={() => save(true)} onSubmit={() => save(false)} onCancel={() => { setModal(null); setForm(EMPTY); setEditId(null); }} />
      </CrudModal>

      {/* Detail View */}
      <CrudSlideOver open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.name || ""}>
        {viewItem && <>
          <MetaBar items={[
            { label:"Ref", value: viewItem.id },
            { label:"Risk Level", value: <span className="font-semibold" style={{ color: RISK_COLOR[viewItem.riskLevel] }}>{viewItem.riskLevel}</span> },
            { label:"Status", value: <StatusBadge status={viewItem.status} /> },
            { label:"Owner", value: viewItem.owner },
            { label:"Last Reviewed", value: viewItem.lastReviewed },
          ]} />
          <FormSection title="Processing Details">
            <div className="space-y-2 text-sm">
              <div><span className="text-[hsl(var(--text-3))]">Purpose:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.purpose}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Legal Basis:</span> <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] text-[hsl(var(--text-2))] ml-1">{viewItem.legalBasis}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Retention:</span> <span className="text-[hsl(var(--text-1))]"> {viewItem.retentionPeriod}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">DPIA Required:</span> <span className={`ml-1 font-semibold ${viewItem.dpiaRequired ? "text-amber-500" : "text-green-500"}`}>{viewItem.dpiaRequired ? "Yes" : "No"}</span></div>
            </div>
          </FormSection>
          <FormSection title="Data Subjects & Categories">
            <div className="space-y-2 text-sm">
              <div><span className="text-[hsl(var(--text-3))]">Data Subjects:</span><div className="flex flex-wrap gap-1 mt-1">{(viewItem.dataSubjects||[]).map((s:string) => <span key={s} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{s}</span>)}</div></div>
              <div><span className="text-[hsl(var(--text-3))]">Data Categories:</span><div className="flex flex-wrap gap-1 mt-1">{(viewItem.dataCategories||[]).map((c:string) => <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">{c}</span>)}</div></div>
            </div>
          </FormSection>
          <FormSection title="Recipients & Transfers">
            <div className="space-y-2 text-sm">
              <div><span className="text-[hsl(var(--text-3))]">Recipients:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.recipients}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">International Transfer:</span> <span className={`ml-1 font-semibold ${viewItem.internationalTransfer ? "text-amber-500" : "text-green-500"}`}>{viewItem.internationalTransfer ? `Yes — ${viewItem.transferDest} (${viewItem.transferMechanism})` : "No"}</span></div>
            </div>
          </FormSection>
          <FormSection title="Technical & Org Measures">
            <div className="grid grid-cols-3 gap-2 text-sm">
              {[["Encryption", viewItem.encryption],["Access Controls", viewItem.accessControls],["Pseudonymization", viewItem.pseudonymization],["DPO Reviewed", viewItem.dpoReviewed]].map(([label, val]) => (
                <div key={label as string} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className={val ? "text-green-500" : "text-[hsl(var(--text-3))]"} weight={val ? "fill" : "regular"} />
                  <span className={val ? "text-[hsl(var(--text-1))]" : "text-[hsl(var(--text-3))]"}>{label as string}</span>
                </div>
              ))}
            </div>
          </FormSection>
          <ActivityTimeline events={[
            { date: viewItem.createdAt, label:"Created", user: viewItem.createdBy },
            { date: viewItem.lastReviewed, label:"Last Reviewed", user: viewItem.owner },
            { date: viewItem.updatedAt, label:"Last Updated", user: viewItem.createdBy },
          ]} />
          <div className="flex gap-2 pt-2">
            <Button onClick={() => { setModal("edit"); openEdit(viewItem); }} variant="outline" size="sm"><PencilSimple size={14} />Edit</Button>
            <Button onClick={() => { setModal(null); setDeleteTarget(viewItem); }} variant="destructive" size="sm"><Trash size={14} />Delete</Button>
          </div>
        </>}
      </CrudSlideOver>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete Processing Activity" description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
