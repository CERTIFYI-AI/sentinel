// @ts-nocheck
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState, useMemo } from "react";
import { useSupabaseTable } from '@/hooks/useSupabaseTable';
import { Warning, Plus, Eye, PencilSimple, Trash, Export, Siren, Clock, ChartLine } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCardRow } from "@/components/ui/StatCardRow";
import { FilterBar } from "@/components/ui/FilterBar";
import { StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection, FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput, TSelect, TTextarea, TToggle } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

const INCIDENT_TYPES = ["Model Failure","Data Breach","Bias Event","Drift","Hallucination","Adversarial Attack","System Outage","Privacy Violation","Unauthorized Access","Other"];
const SEVERITIES = ["P1 Critical","P2 High","P3 Medium","P4 Low"];
const AI_SYSTEMS = ["GPT-4o Risk Scorer v2","Fraud Detection v3","Credit Scoring Engine","HR Screening Model","NLP Classifier","Customer Support Orchestrator"];
const BUSINESS_IMPACTS = ["Critical — Business Halted","High — Major Disruption","Medium — Partial Disruption","Low — Minimal Impact","Unknown"];
const REPORTERS = ["Dr. Sarah Chen","Alex Kumar","James Wilson","Emma Rodriguez","Lisa Park","Mike Johnson","System (Automated)"];
const STATUSES = ["Open","Investigating","Contained","Resolved","Closed","Escalated"];

const SEED: any[] = [
  { id:"INC-001", title:"HR Screening Model — Gender Bias Detected", type:"Bias Event", severity:"P1 Critical", aiSystem:"HR Screening Model", businessImpact:"Critical — Business Halted", dateOccurred:"2026-01-10T09:30:00Z", reportedBy:"Dr. Sarah Chen", status:"Resolved", description:"Automated bias detection pipeline detected statistically significant disparate impact on female candidates. Screening suspended immediately.", immediateActions:"Suspended model inference. Notified CISO and DPO. Escalated to HR leadership.", rootCause:"Training data imbalance introduced during Q4 2025 re-training cycle.", cvssScore:8.5, regulatoryNotification:true, affectedUsers:1250, dataBreachInvolved:false, mttr:"72 hours", createdAt:"2026-01-10", updatedAt:"2026-01-13", createdBy:"schenai" },
  { id:"INC-002", title:"Fraud Model — Spike in False Positives", type:"Model Failure", severity:"P2 High", aiSystem:"Fraud Detection v3", businessImpact:"High — Major Disruption", dateOccurred:"2026-02-15T14:22:00Z", reportedBy:"Alex Kumar", status:"Resolved", description:"False positive rate increased 340% following v3.1 update. 2,300 legitimate transactions incorrectly blocked.", immediateActions:"Rolled back to v3.0.8. Notified affected customers via CX team.", rootCause:"Deployment of unvalidated feature set from upstream data pipeline change.", cvssScore:6.2, regulatoryNotification:false, affectedUsers:2300, dataBreachInvolved:false, mttr:"4 hours", createdAt:"2026-02-15", updatedAt:"2026-02-15", createdBy:"akumar" },
  { id:"INC-003", title:"GPT-4o — Hallucinated Regulatory Requirement", type:"Hallucination", severity:"P2 High", aiSystem:"GPT-4o Risk Scorer v2", businessImpact:"High — Major Disruption", dateOccurred:"2026-03-01T11:00:00Z", reportedBy:"Lisa Park", status:"Investigating", description:"AI advisor generated a fabricated EU AI Act article citation in a compliance report. Report was submitted to board before detection.", immediateActions:"Recalled report. Engaged legal team. Enabled human review for all AI-generated regulatory citations.", rootCause:"Under investigation — suspected prompt injection or model temperature setting.", cvssScore:5.8, regulatoryNotification:true, affectedUsers:12, dataBreachInvolved:false, mttr:null, createdAt:"2026-03-01", updatedAt:"2026-03-05", createdBy:"lpark" },
  { id:"INC-004", title:"Customer Data Exposure — Logging Misconfiguration", type:"Data Breach", severity:"P1 Critical", aiSystem:"Customer Support Orchestrator", businessImpact:"Critical — Business Halted", dateOccurred:"2026-03-18T08:15:00Z", reportedBy:"System (Automated)", status:"Contained", description:"Logging misconfiguration caused PII (names, emails) to be written to non-encrypted S3 bucket. Exposed for 47 minutes before detection.", immediateActions:"Disabled logging. Deleted exposed log files. Rotated API keys. Engaged DPO and legal.", rootCause:"Infrastructure-as-Code change not reviewed by security team.", cvssScore:9.1, regulatoryNotification:true, affectedUsers:8740, dataBreachInvolved:true, mttr:"47 minutes exposure, 6 hours containment", createdAt:"2026-03-18", updatedAt:"2026-03-19", createdBy:"auto-detect" },
  { id:"INC-005", title:"NLP Classifier — Concept Drift Alert", type:"Drift", severity:"P3 Medium", aiSystem:"NLP Classifier", businessImpact:"Medium — Partial Disruption", dateOccurred:"2026-04-02T16:45:00Z", reportedBy:"James Wilson", status:"Open", description:"PSI score exceeded 0.25 threshold for NLP classifier deployed in legal document processing. Classification accuracy dropping.", immediateActions:"Flagged for retraining. Increased human review rate to 100% for affected pipeline.", rootCause:"Pending investigation — likely regulatory language drift post EU AI Act enforcement.", cvssScore:4.1, regulatoryNotification:false, affectedUsers:0, dataBreachInvolved:false, mttr:null, createdAt:"2026-04-02", updatedAt:"2026-04-02", createdBy:"jwilson" },
];

const EMPTY: any = { title:"", type:"Model Failure", severity:"P3 Medium", aiSystem:"", businessImpact:"Unknown", dateOccurred:"", reportedBy:"", status:"Open", description:"", immediateActions:"", rootCause:"", cvssScore:"", regulatoryNotification:false, affectedUsers:"", dataBreachInvolved:false, mttr:"" };

const SEV_COLORS: Record<string, string> = { "P1 Critical":"hsl(var(--s-er-tx))","P2 High":"hsl(var(--r-hi-tx))","P3 Medium":"hsl(var(--s-wn-tx))","P4 Low":"#22c55e" };

export default function Incidents() {
  const { data: items, setData: setItems } = useSupabaseTable('incidents_table', SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"view"|null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string|null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    const q = search.toLowerCase();
    return (i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.aiSystem.toLowerCase().includes(q))
      && (statusFilter === "all" || i.status === statusFilter)
      && (sevFilter === "all" || i.severity === sevFilter);
  }), [items, search, statusFilter, sevFilter]);

  const sp = useSortAndPage(filtered, "title");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // KPI computations
  const totalCount = items.length;
  const openActiveCount = items.filter(i => i.status === 'Open' || i.status === 'Investigating').length;
  const p1CriticalCount = items.filter(i => i.severity === 'P1 Critical').length;
  // Avg MTTR: parse hours from resolved items with numeric mttr strings
  const resolvedWithMttr = items.filter(i => i.status === 'Resolved' && i.mttr);
  const avgMttr = resolvedWithMttr.length > 0
    ? (() => {
        const parsed = resolvedWithMttr.map((i: any) => {
          const match = String(i.mttr).match(/([\d.]+)\s*(hour|hr|h)/i);
          return match ? parseFloat(match[1]) : null;
        }).filter((v): v is number => v !== null);
        return parsed.length > 0 ? `${(parsed.reduce((a, b) => a + b, 0) / parsed.length).toFixed(0)}h` : '—';
      })()
    : '—';

  const save = (draft = false) => {
    if (!form.title.trim()) { toast.error("Incident title is required"); return; }
    setSaving(true);
    setTimeout(() => {
      const status = draft ? "Open" : (form.status || "Open");
      if (editId) {
        setItems(p => p.map(i => i.id === editId ? { ...i, ...form, status, updatedAt:new Date().toISOString().slice(0,10) } : i));
        toast.success("Incident updated");
      } else {
        const id = `INC-${String(items.length+1).padStart(3,"0")}`;
        setItems(p => [...p, { ...form, status, id, createdAt:new Date().toISOString().slice(0,10), updatedAt:new Date().toISOString().slice(0,10), createdBy:"admin" }]);
        toast.success("Incident created");
      }
      setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
    }, 700);
  };

  const openEdit = (item: any) => { setForm({ ...item }); setEditId(item.id); setModal("edit"); };
  const doDelete = () => { setItems(p => p.filter(i => i.id !== deleteTarget?.id)); setDeleteTarget(null); toast.success("Incident deleted"); };

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (sevFilter !== 'all' ? 1 : 0);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <PageHeader
        title="Incident Log"
        subtitle="Track, investigate and resolve AI incidents"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Incidents' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5"><Export size={14} />Export</Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}><Plus size={14} />New Incident</Button>
          </div>
        }
      />

      <StatCardRow
        cards={[
          { label: 'Total Incidents', value: totalCount, icon: <Siren size={16} /> },
          { label: 'Open / Active', value: openActiveCount, icon: <Warning size={16} />, isPositiveUp: false },
          { label: 'P1 Critical', value: p1CriticalCount, icon: <ChartLine size={16} />, isPositiveUp: false },
          { label: 'Avg MTTR', value: avgMttr, icon: <Clock size={16} />, isPositiveUp: true },
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search incidents…"
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(''); setStatusFilter('all'); setSevFilter('all'); }}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter === 'all' ? '' : statusFilter,
            onChange: v => setStatusFilter(v || 'all'),
            options: STATUSES.map(s => ({ label: s, value: s })),
          },
          {
            key: 'severity',
            label: 'Severity',
            value: sevFilter === 'all' ? '' : sevFilter,
            onChange: v => setSevFilter(v || 'all'),
            options: SEVERITIES.map(s => ({ label: s, value: s })),
          },
        ]}
      />

      <BulkActionToolbar count={sp.selectedIds.size} onClear={sp.clearSelected} onDelete={() => { setItems(p=>p.filter(i=>!sp.selectedIds.has(i.id))); sp.clearSelected(); toast.success("Deleted"); }} onExport={() => toast.success("Exported")} />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState icon={<Warning size={32} className="text-[hsl(var(--brand))]" />} title="No incidents found" description="Report an incident to start tracking." action={<Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}><Plus size={14} />Report Incident</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-raised border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={sp.selectedIds.size===sp.paged.length&&sp.paged.length>0} onChange={sp.toggleAll} /></th>
                  <Th col="title" label="Incident" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="severity" label="Severity" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="aiSystem" label="AI System" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="dateOccurred" label="Date Occurred" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">MTTR</th>
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-raised cursor-pointer" onClick={() => { setViewItem(item); setModal("view"); }}>
                    <td className="px-3 py-2.5" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} /></td>
                    <td className="px-3 py-2.5 max-w-[240px]">
                      <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-[hsl(var(--text-4))] font-mono">{item.id}</p>
                        {item.regulatoryNotification&&<span className="text-xs text-[hsl(var(--s-wn-tx))] bg-[hsl(var(--s-wn-bg))] border border-[hsl(var(--s-wn-br))] px-1">Regulatory</span>}
                        {item.dataBreachInvolved&&<span className="text-xs text-[hsl(var(--s-er-tx))] bg-[hsl(var(--s-er-bg))] border border-[hsl(var(--s-er-br))] px-1">Breach</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-xs px-1.5 py-0.5 font-medium border" style={{ color:SEV_COLORS[item.severity], borderColor:`${SEV_COLORS[item.severity]}40`, background:`${SEV_COLORS[item.severity]}12` }}>{item.severity}</span></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.type}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))]">{item.aiSystem}</td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{item.dateOccurred?.slice(0,10)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.mttr || "—"}</td>
                    <td className="px-3 py-2.5 text-right" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setViewItem(item); setModal("view"); }} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><Eye size={14} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-raised text-[hsl(var(--text-3))]"><PencilSimple size={14} /></button>
                        <button onClick={() => setDeleteTarget(item)} className="p-1.5 hover:bg-[hsl(var(--s-er-bg))] text-[hsl(0_72%_51%)]"><Trash size={14} /></button>
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

      <CrudModal open={modal==="create"||modal==="edit"} onClose={() => setModal(null)} title={editId?"Edit Incident":"Report New Incident"} size="xl">
        <div className="p-5 space-y-2">
          <FormSection title="Incident Details">
            <TInput label="Incident Title" required value={form.title} onChange={setF("title")} placeholder="HR Screening Model — Bias Detected" />
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Incident Type" value={form.type} onChange={setF("type")} options={INCIDENT_TYPES} />
              <TSelect label="Severity" required value={form.severity} onChange={setF("severity")} options={SEVERITIES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="AI System Affected" value={form.aiSystem} onChange={setF("aiSystem")} options={AI_SYSTEMS} />
              <TSelect label="Business Impact" value={form.businessImpact} onChange={setF("businessImpact")} options={BUSINESS_IMPACTS} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Date / Time Occurred" type="datetime-local" value={form.dateOccurred} onChange={setF("dateOccurred")} />
              <TSelect label="Reported By" value={form.reportedBy} onChange={setF("reportedBy")} options={REPORTERS} />
            </div>
            <TSelect label="Status" value={form.status} onChange={setF("status")} options={STATUSES} />
            <TTextarea label="Description" required value={form.description} onChange={setF("description")} placeholder="Describe what happened, what was affected, and initial observations…" rows={4} maxLength={3000} />
          </FormSection>
          <FormSection title="Response & Analysis">
            <TTextarea label="Immediate Actions Taken" value={form.immediateActions} onChange={setF("immediateActions")} placeholder="What was done immediately to contain or mitigate the incident…" rows={3} maxLength={2000} />
            <TTextarea label="Root Cause Analysis" value={form.rootCause} onChange={setF("rootCause")} placeholder="Describe the identified or suspected root cause…" rows={3} maxLength={2000} />
            <div className="grid grid-cols-2 gap-4">
              <TInput label="CVSS / Risk Score (0–10)" type="number" value={String(form.cvssScore)} onChange={setF("cvssScore")} placeholder="7.5" />
              <TInput label="Affected Users Count" type="number" value={String(form.affectedUsers)} onChange={setF("affectedUsers")} placeholder="0" />
            </div>
            <TInput label="MTTR (Mean Time to Resolve)" value={form.mttr} onChange={setF("mttr")} placeholder="4 hours / 2 days" />
            <div className="grid grid-cols-2 gap-4">
              <TToggle label="Regulatory Notification Required" value={form.regulatoryNotification} onChange={setF("regulatoryNotification")} />
              <TToggle label="Data Breach Involved" value={form.dataBreachInvolved} onChange={setF("dataBreachInvolved")} />
            </div>
          </FormSection>
        </div>
        <FormFooter onCancel={() => setModal(null)} onSaveDraft={() => save(true)} onSubmit={() => save(false)} loading={saving} submitLabel={editId?"Update Incident":"Submit Incident"} />
      </CrudModal>

      <CrudModal open={modal==="view"} onClose={() => setModal(null)} title={viewItem?.title??""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-1.5 py-0.5 font-medium border" style={{ color:SEV_COLORS[viewItem.severity], borderColor:`${SEV_COLORS[viewItem.severity]}40`, background:`${SEV_COLORS[viewItem.severity]}12` }}>{viewItem.severity}</span>
                <StatusBadge status={viewItem.status} />
                {viewItem.regulatoryNotification&&<span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border border-[hsl(var(--s-wn-br))]">Regulatory Notification</span>}
                {viewItem.dataBreachInvolved&&<span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border border-[hsl(var(--s-er-br))]">Data Breach</span>}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[["Type",viewItem.type],["AI System",viewItem.aiSystem],["Business Impact",viewItem.businessImpact],["Reported By",viewItem.reportedBy],["Date Occurred",viewItem.dateOccurred?.slice(0,16)],["MTTR",viewItem.mttr||"—"],["Affected Users",viewItem.affectedUsers],["CVSS Score",viewItem.cvssScore||"—"]].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p><p className="font-medium text-[hsl(var(--text-1))]">{v||"—"}</p></div>
                ))}
              </div>
              {viewItem.description&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p></div>}
              {viewItem.immediateActions&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Immediate Actions</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.immediateActions}</p></div>}
              {viewItem.rootCause&&<div><p className="text-xs text-[hsl(var(--text-4))] mb-1">Root Cause</p><p className="text-sm text-[hsl(var(--text-2))]">{viewItem.rootCause}</p></div>}
              <ActivityTimeline items={[{date:viewItem.createdAt,actor:viewItem.createdBy,action:"reported this incident"},{date:viewItem.updatedAt,actor:"system",action:"last updated record"}]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.title}"?`} message="This action cannot be undone. The incident record and all related data will be permanently removed." type="danger" confirmLabel="Delete" onConfirm={doDelete} onOpenChange={o=>{ if(!o) setDeleteTarget(null); }} isDestructive />
    </div>
  );
}
