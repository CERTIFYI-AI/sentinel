// @ts-nocheck
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { Globe, Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export, X, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, CrudSlideOver, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const TRANSFER_TOOLS = ["SCCs — C2C","SCCs — C2P","BCRs","Consent","Derogation Art.49","Binding Agreement","Adequacy Decision"];
const STATUSES = ["Not Started","In Progress","Completed","Requires Supplementary Measures","Suspended"];
const RISK_LEVELS = ["High","Medium","Low"];
const ASSESSORS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Nina Patel"];

const SEED: any[] = [
  { id:"TIA-001", name:"AWS US-East Cloud Hosting", exporter:"Acme Corp (EU)", importer:"Amazon Web Services Inc.", destCountry:"🇺🇸 USA", adequacy:"No", transferTool:"SCCs — C2C", riskScore:72, status:"Completed", assessor:"Dr. Sarah Chen", dueDate:"2026-03-01", dataCategories:"Customer PII, Financial Records", volume:"~2M records", frequency:"Continuous", supplementaryMeasures:{ encryptionTransit:true, encryptionRest:true, pseudonymization:true, contractual:true, organizational:true, accessRestrictions:false }, ruleOfLawIndex:75, surveillanceLaw:"CLOUD Act / FISA 702", justification:"Standard SCCs with AWS DPA executed. Encryption at rest and in transit enforced. Risk accepted by DPO.", createdAt:"2025-10-01", updatedAt:"2026-02-28", createdBy:"schen" },
  { id:"TIA-002", name:"India BPO Data Processing", exporter:"Acme Corp (EU)", importer:"Infosys BPO Ltd.", destCountry:"🇮🇳 India", adequacy:"No", transferTool:"SCCs — C2P", riskScore:85, status:"Requires Supplementary Measures", assessor:"Alex Kumar", dueDate:"2026-04-15", dataCategories:"Employee HR Data, Customer Contacts", volume:"~50K records", frequency:"Monthly batch", supplementaryMeasures:{ encryptionTransit:true, encryptionRest:false, pseudonymization:true, contractual:true, organizational:false, accessRestrictions:false }, ruleOfLawIndex:52, surveillanceLaw:"IT Act 2000 / Surveillance laws", justification:"Supplementary measures required. Pending additional contractual commitments.", createdAt:"2025-11-15", updatedAt:"2026-03-10", createdBy:"akumar" },
  { id:"TIA-003", name:"UK Post-Brexit Analytics", exporter:"Acme Corp (EU)", importer:"DataLab UK Ltd.", destCountry:"🇬🇧 United Kingdom", adequacy:"Yes", transferTool:"Adequacy Decision", riskScore:18, status:"Completed", assessor:"James Wilson", dueDate:"2026-02-01", dataCategories:"Behavioral Analytics, Cookie Data", volume:"~500K events/day", frequency:"Real-time", supplementaryMeasures:{ encryptionTransit:true, encryptionRest:true, pseudonymization:true, contractual:true, organizational:true, accessRestrictions:true }, ruleOfLawIndex:88, surveillanceLaw:"IPA 2016 — review needed", justification:"UK adequacy decision in force. Risk low. Monitor UK data protection law changes.", createdAt:"2025-09-01", updatedAt:"2026-01-20", createdBy:"jwilson" },
  { id:"TIA-004", name:"Israel Analytics Vendor", exporter:"Acme Corp (EU)", importer:"Analytics360 Ltd.", destCountry:"🇮🇱 Israel", adequacy:"Yes", transferTool:"Adequacy Decision", riskScore:25, status:"Completed", assessor:"Emma Rodriguez", dueDate:"2026-03-15", dataCategories:"Marketing Analytics, Device IDs", volume:"~200K records", frequency:"Weekly", supplementaryMeasures:{ encryptionTransit:true, encryptionRest:true, pseudonymization:false, contractual:true, organizational:true, accessRestrictions:false }, ruleOfLawIndex:78, surveillanceLaw:"Israeli Security Agency Law", justification:"Israel adequacy confirmed. DPA in place. Low risk transfer.", createdAt:"2025-10-20", updatedAt:"2026-03-01", createdBy:"erodriguez" },
  { id:"TIA-005", name:"Philippines BPO Customer Support", exporter:"Acme Corp (EU)", importer:"TechSupport PH Corp.", destCountry:"🇵🇭 Philippines", adequacy:"No", transferTool:"SCCs — C2P", riskScore:78, status:"In Progress", assessor:"Nina Patel", dueDate:"2026-05-01", dataCategories:"Customer PII, Support Tickets", volume:"~100K records", frequency:"Daily", supplementaryMeasures:{ encryptionTransit:true, encryptionRest:false, pseudonymization:false, contractual:true, organizational:false, accessRestrictions:false }, ruleOfLawIndex:48, surveillanceLaw:"Data Privacy Act 2012, broad surveillance powers", justification:"SCCs executed. Additional TOM review in progress.", createdAt:"2026-01-10", updatedAt:"2026-04-01", createdBy:"npatel" },
  { id:"TIA-006", name:"Switzerland Data Warehouse", exporter:"Acme Corp (EU)", importer:"SwissCloud AG", destCountry:"🇨🇭 Switzerland", adequacy:"Yes", transferTool:"Adequacy Decision", riskScore:15, status:"Completed", assessor:"Dr. Sarah Chen", dueDate:"2026-01-15", dataCategories:"Financial Records, Audit Logs", volume:"~1M records", frequency:"Continuous", supplementaryMeasures:{ encryptionTransit:true, encryptionRest:true, pseudonymization:true, contractual:true, organizational:true, accessRestrictions:true }, ruleOfLawIndex:92, surveillanceLaw:"nDSG (Swiss DPA) — aligned with GDPR", justification:"Switzerland has GDPR adequacy. Excellent rule of law. Very low risk.", createdAt:"2025-08-01", updatedAt:"2026-01-10", createdBy:"schen" },
];

const EMPTY: any = { name:"", exporter:"Acme Corp (EU)", importer:"", destCountry:"", adequacy:"No", transferTool:"SCCs — C2C", riskScore:"", status:"Not Started", assessor:"", dueDate:"", dataCategories:"", volume:"", frequency:"", ruleOfLawIndex:"", surveillanceLaw:"", justification:"", supplementaryMeasures:{ encryptionTransit:false, encryptionRest:false, pseudonymization:false, contractual:false, organizational:false, accessRestrictions:false } };

const SCORE_COLOR = (s: number) => s >= 61 ? "hsl(var(--s-er-tx))" : s >= 31 ? "hsl(var(--s-wn-tx))" : "#22c55e";

export default function TIA() {
  const { data: items, setData: setItems } = useSupabaseTable('tia_table', SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState<string[]>([]);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.destCountry.toLowerCase().includes(q) || i.importer.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setSM = (k: string) => (v: any) => setForm((f: any) => ({ ...f, supplementaryMeasures: { ...f.supplementaryMeasures, [k]: v } }));

  const save = (draft = false) => {
    if (!form.name.trim()) { toast.error("Transfer name is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Not Started" : (form.status || "Not Started");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt: new Date().toISOString().slice(0,10) } : i));
        toast.success("TIA updated");
      } else {
        const id = `TIA-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt: new Date().toISOString().slice(0,10), updatedAt: new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Transfer Impact Assessment created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("TIA deleted"); };
  const toggleBulk = (id: string) => setBulk(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = sp.page.length > 0 && sp.page.every(i => bulk.includes(i.id));

  const highRisk = items.filter(i => i.riskScore >= 61).length;
  const pending = items.filter(i => i.status === "Not Started" || i.status === "In Progress").length;
  const avgScore = Math.round(items.reduce((a, b) => a + (Number(b.riskScore)||0), 0) / items.length);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <Breadcrumbs />
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Globe size={24} weight="duotone" className="text-[hsl(var(--brand))]" />
            Transfer Impact Assessments
          </h1>
          <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">Post-Schrems II — assess safeguards for international data transfers per GDPR Art. 46</p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }} className="gap-2">
          <Plus weight="bold" size={16} /> New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:"Total Transfers Assessed", value: items.length, color:"hsl(var(--text-1))" },
          { label:"High-Risk Transfers", value: highRisk, color:"hsl(var(--s-er-tx))" },
          { label:"Pending Assessments", value: pending, color:"hsl(var(--s-wn-tx))" },
          { label:"Avg Risk Score", value: avgScore, color: SCORE_COLOR(avgScore) },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-4">
            <p className="text-xs text-[hsl(var(--text-3))] mb-1">{k.label}</p>
            <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}{k.label === "Avg Risk Score" ? "/100" : ""}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" size={15} />
          <Input placeholder="Search transfers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="gap-1 text-[hsl(var(--text-3))]"><X size={14} />Clear all</Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto gap-1"><Export size={14} />Export</Button>
      </div>

      {bulk.length > 0 && (
        <BulkActionToolbar count={bulk.length} onClear={() => setBulk([])}
          actions={[
            { label:"Suspend", onClick: () => { setItems(p => p.map(i => bulk.includes(i.id) ? { ...i, status:"Suspended" } : i)); setBulk([]); toast.success("Suspended"); } },
            { label:"Delete", variant:"destructive", onClick: () => { setItems(p => p.filter(i => !bulk.includes(i.id))); setBulk([]); toast.success("Deleted"); } },
          ]}
        />
      )}

      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allSelected} onChange={e => setBulk(e.target.checked ? sp.page.map(i => i.id) : [])} className="rounded" />
              </th>
              <Th label="Ref" col="id" sp={sp} />
              <Th label="Transfer Name" col="name" sp={sp} />
              <Th label="Destination" col="destCountry" sp={sp} />
              <Th label="Adequacy" col="adequacy" sp={sp} />
              <Th label="Transfer Tool" col="transferTool" sp={sp} />
              <Th label="Risk Score" col="riskScore" sp={sp} />
              <Th label="Status" col="status" sp={sp} />
              <Th label="Assessor" col="assessor" sp={sp} />
              <Th label="Due Date" col="dueDate" sp={sp} />
              <th className="px-4 py-3 text-xs font-semibold text-[hsl(var(--text-3))] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sp.page.length === 0 && (
              <tr><td colSpan={11}><EmptyState icon={<Globe size={32} />} title="No assessments found" description="Create your first Transfer Impact Assessment" action={<Button onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>New TIA</Button>} /></td></tr>
            )}
            {sp.page.map(item => (
              <tr key={item.id} onClick={() => { setViewItem(item); setModal("view"); }} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.4)] cursor-pointer transition-colors">
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={bulk.includes(item.id)} onChange={() => toggleBulk(item.id)} className="rounded" /></td>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{item.id}</td>
                <td className="px-4 py-3 font-medium text-[hsl(var(--text-1))] max-w-[160px] truncate">{item.name}</td>
                <td className="px-4 py-3 text-[hsl(var(--text-2))]">{item.destCountry}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${item.adequacy === "Yes" ? "bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]" : item.adequacy === "Partial" ? "bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]" : "bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]"}`}>{item.adequacy}</span>
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.transferTool}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.riskScore}%`, background: SCORE_COLOR(item.riskScore) }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color: SCORE_COLOR(item.riskScore) }}>{item.riskScore}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.assessor}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))]">{item.dueDate}</td>
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

      <CrudModal open={modal === "create" || modal === "edit"} onClose={() => { setModal(null); setForm(EMPTY); setEditId(null); }} title={editId ? "Edit TIA" : "New Transfer Impact Assessment"} size="lg">
        <FormSection title="Step 1 — Transfer Overview">
          <TInput label="Transfer Name *" value={form.name} onChange={setF("name")} placeholder="e.g. AWS US-East Cloud Hosting" />
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Data Exporter" value={form.exporter} onChange={setF("exporter")} placeholder="e.g. Acme Corp (EU)" />
            <TInput label="Data Importer" value={form.importer} onChange={setF("importer")} placeholder="e.g. Amazon Web Services Inc." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Destination Country" value={form.destCountry} onChange={setF("destCountry")} placeholder="e.g. 🇺🇸 USA" />
            <TSelect label="Adequacy Decision" value={form.adequacy} onChange={setF("adequacy")} options={["Yes","No","Partial"]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Data Volume" value={form.volume} onChange={setF("volume")} placeholder="e.g. ~2M records" />
            <TInput label="Transfer Frequency" value={form.frequency} onChange={setF("frequency")} placeholder="e.g. Continuous" />
          </div>
          <TTextarea label="Data Categories" value={form.dataCategories} onChange={setF("dataCategories")} rows={2} placeholder="List data categories transferred" />
        </FormSection>
        <FormSection title="Step 2 — Transfer Mechanism">
          <TSelect label="Transfer Tool" value={form.transferTool} onChange={setF("transferTool")} options={TRANSFER_TOOLS} />
        </FormSection>
        <FormSection title="Step 3 — Country Assessment">
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Rule of Law Index (0-100)" value={form.ruleOfLawIndex} onChange={setF("ruleOfLawIndex")} type="number" placeholder="e.g. 75" />
            <TInput label="Surveillance Law" value={form.surveillanceLaw} onChange={setF("surveillanceLaw")} placeholder="e.g. CLOUD Act / FISA 702" />
          </div>
        </FormSection>
        <FormSection title="Step 4 — Supplementary Measures">
          <div className="grid grid-cols-2 gap-2">
            <TToggle label="Encryption in Transit" value={form.supplementaryMeasures?.encryptionTransit} onChange={setSM("encryptionTransit")} />
            <TToggle label="Encryption at Rest" value={form.supplementaryMeasures?.encryptionRest} onChange={setSM("encryptionRest")} />
            <TToggle label="Pseudonymization" value={form.supplementaryMeasures?.pseudonymization} onChange={setSM("pseudonymization")} />
            <TToggle label="Contractual Commitments" value={form.supplementaryMeasures?.contractual} onChange={setSM("contractual")} />
            <TToggle label="Organizational Measures" value={form.supplementaryMeasures?.organizational} onChange={setSM("organizational")} />
            <TToggle label="Technical Access Restrictions" value={form.supplementaryMeasures?.accessRestrictions} onChange={setSM("accessRestrictions")} />
          </div>
        </FormSection>
        <FormSection title="Step 5 — Risk Conclusion">
          <div className="grid grid-cols-2 gap-3">
            <TInput label="Risk Score (0-100)" value={form.riskScore} onChange={setF("riskScore")} type="number" placeholder="0-100" />
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
          </div>
          <TSelect label="Assessor" value={form.assessor} onChange={setF("assessor")} options={ASSESSORS} />
          <TInput label="Due Date" value={form.dueDate} onChange={setF("dueDate")} type="date" />
          <TTextarea label="Justification" value={form.justification} onChange={setF("justification")} rows={3} placeholder="Assessor's conclusion and justification" />
        </FormSection>
        <FormFooter saving={saving} onDraft={() => save(true)} onSubmit={() => save(false)} submitLabel="Complete Assessment" onCancel={() => { setModal(null); setForm(EMPTY); setEditId(null); }} />
      </CrudModal>

      <CrudSlideOver open={modal === "view"} onClose={() => { setModal(null); setViewItem(null); }} title={viewItem?.name || ""}>
        {viewItem && <>
          <MetaBar items={[
            { label:"Ref", value: viewItem.id },
            { label:"Destination", value: viewItem.destCountry },
            { label:"Adequacy", value: <span className={`font-semibold ${viewItem.adequacy === "Yes" ? "text-[hsl(var(--s-ok-tx))]" : "text-[hsl(var(--s-er-tx))]"}`}>{viewItem.adequacy}</span> },
            { label:"Risk Score", value: <span className="font-bold" style={{ color: SCORE_COLOR(viewItem.riskScore) }}>{viewItem.riskScore}/100</span> },
            { label:"Status", value: <StatusBadge status={viewItem.status} /> },
            { label:"Assessor", value: viewItem.assessor },
          ]} />
          <FormSection title="Transfer Details">
            <div className="space-y-2 text-sm">
              <div><span className="text-[hsl(var(--text-3))]">Exporter:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.exporter}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Importer:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.importer}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Data Categories:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.dataCategories}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Volume:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.volume}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Frequency:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.frequency}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Transfer Tool:</span> <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[hsl(var(--muted))] ml-1">{viewItem.transferTool}</span></div>
              <div><span className="text-[hsl(var(--text-3))]">Surveillance Law:</span> <span className="text-[hsl(var(--text-1))]">{viewItem.surveillanceLaw}</span></div>
            </div>
          </FormSection>
          <FormSection title="Supplementary Measures">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(viewItem.supplementaryMeasures||{}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${v ? "bg-[hsl(var(--s-ok-tx))]" : "bg-[hsl(var(--muted))]"}`} />
                  <span className={v ? "text-[hsl(var(--text-1))]" : "text-[hsl(var(--text-3))]"}>{k.replace(/([A-Z])/g, " $1").trim()}</span>
                </div>
              ))}
            </div>
          </FormSection>
          <FormSection title="Risk Conclusion">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex-1 h-3 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width:`${viewItem.riskScore}%`, background: SCORE_COLOR(viewItem.riskScore) }} />
              </div>
              <span className="font-bold text-sm" style={{ color: SCORE_COLOR(viewItem.riskScore) }}>{viewItem.riskScore}/100</span>
            </div>
            <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.justification}</p>
          </FormSection>
          <ActivityTimeline events={[
            { date: viewItem.createdAt, label:"Created", user: viewItem.createdBy },
            { date: viewItem.dueDate, label:"Due Date", user: viewItem.assessor },
            { date: viewItem.updatedAt, label:"Last Updated", user: viewItem.createdBy },
          ]} />
          <div className="flex gap-2 pt-2">
            <Button onClick={() => openEdit(viewItem)} variant="outline" size="sm"><PencilSimple size={14} />Edit</Button>
            <Button onClick={() => { setModal(null); setDeleteTarget(viewItem); }} variant="destructive" size="sm"><Trash size={14} />Delete</Button>
          </div>
        </>}
      </CrudSlideOver>

      <ConfirmDialog open={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={doDelete} title="Delete TIA" description={`Delete "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" destructive />
    </div>
  );
}
