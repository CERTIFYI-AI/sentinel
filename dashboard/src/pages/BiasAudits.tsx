// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// BiasAudits — fairness and disparate impact assessment for AI systems.

import { useState, useMemo } from "react";
import { Scales, Plus, Eye, PencilSimple, Trash, Export, Flask } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCardRow } from "@/components/ui/StatCardRow";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle, TCheckGroup } from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { useBiasAuditsData } from '@/hooks/useBiasAuditsData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'

function exportCsv(rows: any[], filename: string) { // any: generic CSV export utility
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

const ATTRIBUTES = ["Gender","Race / Ethnicity","Age","Disability","Religion","National Origin","Socioeconomic Status","Geography"];
const METHODOLOGIES = ["Disparate Impact","Equal Opportunity","Demographic Parity","Calibration","Counterfactual Fairness","Custom"];
const FRAMEWORKS = ["EU AI Act","NIST AI RMF","ISO 42001","GDPR","US Executive Order on AI"];
const SEVERITIES = ["Critical","High","Medium","Low","Informational"];
const STATUSES = ["Draft","In Progress","Completed","Failed","Archived"];
const MODELS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Loan Approval AI"];

const EMPTY: any = { name:"", model:"", date:"", attributes:[], methodology:"", dataset:"", periodFrom:"", periodTo:"", auditor:"", org:"", findings:"", severity:"Medium", remediationRequired:false, framework:"", status:"Draft" }; // any: form state with mixed field types

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-[hsl(var(--text-4))]">—</span>;
  const pct = Math.round(score * 100);
  const color = pct >= 90 ? "#22c55e" : pct >= 75 ? "hsl(var(--s-wn-tx))" : "hsl(var(--s-er-tx))";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
        <div style={{ width:`${pct}%`, background:color, height:"100%" }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score.toFixed(2)}</span>
    </div>
  );
}

export default function BiasAudits() {
  const { items, isLoading, saveBiasAudits, removeBiasAudits } = useBiasAuditsData()
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY); // any: form state with mixed field types
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null); // any: audit item shape varies
  const [deleteTarget, setDeleteTarget] = useState<any>(null); // any: target shape for confirm dialog
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.name.toLowerCase().includes(q) || i.model.toLowerCase().includes(q) || i.auditor.toLowerCase().includes(q)) && (statusFilter === "all" || i.status === statusFilter);
  }), [items, search, statusFilter]);

  const sp = useSortAndPage(filtered, "name");

  if (isLoading) return <PageSkeleton />
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v })); // any: dynamic field update

  const save = async (draft = false) => {
    if (!draft && !form.name.trim()) { toast.error("Audit name is required"); return; }
    setSaving(true);
    try {
      const status = draft ? "Draft" : (form.status || "Completed");
      const payload = editId
        ? { ...form, status, id: editId }
        : { ...form, status };
      await saveBiasAudits(payload);
      setModal(null); setForm(EMPTY); setEditId(null);
    } catch { /* toast handled by hook */ }
    setSaving(false);
  };

  const openEdit = (item: any) => { // any: audit item shape from hook
    setForm({ name:item.name, model:item.model, date:item.date, attributes:item.attributes||[], methodology:item.methodology, dataset:item.dataset, periodFrom:"", periodTo:"", auditor:item.auditor, org:item.org, findings:item.findings, severity:item.severity, remediationRequired:item.remediationRequired, framework:item.framework, status:item.status });
    setEditId(item.id); setModal("edit");
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    await removeBiasAudits(deleteTarget.id);
    setDeleteTarget(null);
  };

  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  // Compute KPI values
  const totalAudits = items.length;
  const passedAudits = items.filter(i => i.status === "Completed" && !i.remediationRequired).length;
  const failedAudits = items.filter(i => i.status === "Failed" || (i.status === "Completed" && i.remediationRequired)).length;
  const pendingAudits = items.filter(i => i.status === "In Progress" || i.status === "Draft").length;

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <PageHeader
        title="Bias Audits"
        subtitle="Fairness and disparate impact assessment for AI systems"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Bias Audits' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(items, 'bias-audits.csv')}>
              <Export size={14} />Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>
              <Plus size={14} />New Audit
            </Button>
          </div>
        }
      />

      <StatCardRow
        cards={[
          {
            label: 'Total Audits',
            value: totalAudits,
            description: `Total Audits: ${totalAudits}`,
          },
          {
            label: 'Passed',
            value: passedAudits,
            description: `Passed Audits: ${passedAudits} — completed without remediation`,
          },
          {
            label: 'Failed / Remediation',
            value: failedAudits,
            description: `Failed or Remediation Required: ${failedAudits}`,
          },
          {
            label: 'In Progress / Draft',
            value: pendingAudits,
            description: `Pending Audits: ${pendingAudits} — in progress or draft`,
          },
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search audits by name, model, auditor…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter === "all" ? "" : statusFilter,
            onChange: v => setStatusFilter(v || "all"),
            options: STATUSES.map(s => ({ label: s, value: s })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(""); setStatusFilter("all"); }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} audit{filtered.length !== 1 ? 's' : ''}</span>
        }
      />

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={async () => { for (const id of sp.selectedIds) { await removeBiasAudits(id); } sp.clearSelected(); }} onExport={() => exportCsv(sp.paged.filter((i:any)=>sp.selectedIds.has(i.id)), 'bias-audits-selected.csv')} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Flask size={32} className="text-[hsl(var(--brand))]" />} title="No bias audits found" description="Create your first audit to track fairness metrics." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} className="mr-1" />New Audit</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="name" label="Audit Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="model" label="Model / System" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="date" label="Audit Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Attributes</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Bias Score</th>
                  <Th col="severity" label="Severity" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="auditor" label="Auditor" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => ( // any: audit item shape from hook
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p><p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id}</p></td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))]">{item.model}</td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-3))] whitespace-nowrap">{item.date}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {item.attributes.slice(0,2).map((a:string)=><span key={a} className="text-xs px-1.5 py-0.5 bg-raised border border-[hsl(var(--border))]">{a}</span>)}
                        {item.attributes.length>2&&<span className="text-xs text-[hsl(var(--text-4))]">+{item.attributes.length-2}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><ScoreBar score={item.score} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.severity} /></td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))]">{item.auditor}</td>
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

      {/* Create / Edit */}
      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Bias Audit":"New Bias Audit"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Audit Name" required value={form.name} onChange={setF("name")} placeholder="Q1 Fairness Audit — HR Screening" />
              <TInput label="Audit Date" type="date" value={form.date} onChange={setF("date")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Target Model" required value={form.model} onChange={setF("model")} options={MODELS} />
              <TSelect label="Dataset Used" value={form.dataset} onChange={setF("dataset")} options={["HR Dataset 2025","Credit Dataset v4","Transactions 2025","Loan Applications 2025","Text Corpus v2"]} />
            </div>
          </FormSection>
          <FormSection title="Audit Scope">
            <TCheckGroup label="Protected Attributes *" options={ATTRIBUTES} value={form.attributes} onChange={setF("attributes")} />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Methodology" value={form.methodology} onChange={setF("methodology")} options={METHODOLOGIES} />
              <TSelect label="Regulatory Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Period From" type="date" value={form.periodFrom} onChange={setF("periodFrom")} />
              <TInput label="Period To" type="date" value={form.periodTo} onChange={setF("periodTo")} />
            </div>
          </FormSection>
          <FormSection title="Auditor & Findings">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Auditor Name" required value={form.auditor} onChange={setF("auditor")} placeholder="Dr. Sarah Chen" />
              <TInput label="Auditor Organization" value={form.org} onChange={setF("org")} placeholder="Internal / Deloitte / EY" />
            </div>
            <TTextarea label="Findings Summary" value={form.findings} onChange={setF("findings")} placeholder="Summarise key findings…" rows={4} maxLength={2000} />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Severity" value={form.severity} onChange={setF("severity")} options={SEVERITIES} />
              <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            </div>
            <TToggle label="Remediation Required" value={form.remediationRequired} onChange={setF("remediationRequired")} hint="Enable if results require remediation actions" />
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Audit":"Submit Audit"} />
      </CrudModal>

      {/* Detail */}
      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.name??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap"><StatusBadge status={viewItem.status} /><StatusBadge status={viewItem.severity} />{viewItem.remediationRequired&&<StatusBadge status="Remediation Required" />}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Model",viewItem.model],["Methodology",viewItem.methodology],["Dataset",viewItem.dataset],["Framework",viewItem.framework],["Auditor",viewItem.auditor],["Organization",viewItem.org],["Audit Date",viewItem.date]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              <div><p className="text-xs text-[hsl(var(--text-4))] mb-1.5">Protected Attributes</p>
                <div className="flex flex-wrap gap-1.5">{viewItem.attributes.map((a:string)=><span key={a} className="text-xs px-2 py-0.5 bg-raised border border-[hsl(var(--border))]">{a}</span>)}</div>
              </div>
              <div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Overall Bias Score</p><ScoreBar score={viewItem.score} /></div>
              {viewItem.findings&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Findings Summary</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.findings}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"created this audit"},{date:viewItem.updatedAt,actor:"system",action:"last updated record"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`} message="This action cannot be undone. All associated records will be unlinked." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
