// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// ComplianceControls — implement and test compliance controls.
// Full CRUD with KPI row, unified FilterBar, and confirmation dialogs.

import { useState, useMemo } from "react";
import { ShieldCheck, Plus, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCardRow } from "@/components/ui/StatCardRow";
import { FilterBar } from "@/components/ui/FilterBar";
import type { StatCardRowItem } from "@/components/ui/StatCardRow";
import {
  StatusBadge, BulkActionToolbar, PaginationBar, CrudModal, FormSection,
  FormFooter, MetaBar, ActivityTimeline, useSortAndPage, Th, TInput,
  TSelect, TTextarea, TToggle,
} from "@/components/ui/crud-helpers";
import { toast } from "sonner";
import { useControlData } from "@/hooks/useControlData";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

const FRAMEWORKS_OPT = ["SOC 2", "ISO 27001", "ISO 42001", "NIST AI RMF", "EU AI Act", "HIPAA", "GDPR", "CCPA", "PCI DSS"];
const DOMAINS = ["Access Management", "Data Protection", "AI Safety", "Fairness", "Incident Management", "Vendor Management", "Transparency", "Data Governance", "Security", "Operational Resilience"];
const CONTROL_TYPES = ["Preventive", "Detective", "Corrective", "Compensating"];
const IMPL_STATUSES = ["Not Implemented", "Planned", "In Progress", "Implemented", "Partially Implemented", "Deprecated"];
const TEST_FREQS = ["Continuous", "Monthly", "Quarterly", "Semi-Annual", "Annual", "Ad Hoc"];
const OWNERS = ["Dr. Sarah Chen", "Alex Kumar", "James Wilson", "Emma Rodriguez", "Lisa Park", "Mike Johnson", "Priya Nair"];

// SEED data removed — using Supabase hook

const EMPTY: any = {
  name: "", controlId: "", framework: "", domain: "", type: "Preventive",
  status: "Not Implemented", testFreq: "Annual", owner: "", dueDate: "",
  evidenceRequired: false, description: "", implGuidance: "", testProcedure: "", relatedRisks: [],
};

export default function ComplianceControls() {
  const { controls: items, isLoading, save: saveControl, remove: removeControl } = useControlData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | "view" | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewItem, setViewItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => items.filter((i: any) => {
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.controlId.toLowerCase().includes(q) ||
      i.owner.toLowerCase().includes(q)
    ) &&
      (!statusFilter || i.status === statusFilter) &&
      (!frameworkFilter || i.framework === frameworkFilter);
  }), [items, search, statusFilter, frameworkFilter]);

  const sp = useSortAndPage(filtered, "name");
  const setF = (k: string) => (v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // ── KPI derived metrics ──────────────────────────────────────────────────────
  const implCount = items.filter((i: any) => i.status === "Implemented").length;
  const partialCount = items.filter((i: any) =>
    i.status === "In Progress" || i.status === "Partially Implemented"
  ).length;
  const notStartedCount = items.filter((i: any) => i.status === "Not Implemented").length;
  const implPct = Math.round((implCount / Math.max(items.length, 1)) * 100);

  const kpiCards: StatCardRowItem[] = [
    {
      label: 'Total Controls',
      value: items.length,
      icon: <ShieldCheck size={18} />,
      description: `${items.length} controls tracked across all frameworks`,
    },
    {
      label: 'Implemented',
      value: implCount,
      icon: <ShieldCheck size={18} />,
      delta: `${implPct}%`,
      deltaDir: 'up',
      isPositiveUp: true,
      description: `${implCount} controls fully implemented (${implPct}%)`,
    },
    {
      label: 'Partial / In Progress',
      value: partialCount,
      description: `${partialCount} controls partially implemented or in progress`,
    },
    {
      label: 'Not Started',
      value: notStartedCount,
      delta: notStartedCount > 0 ? String(notStartedCount) : undefined,
      deltaDir: 'up',
      isPositiveUp: false,
      description: `${notStartedCount} controls not yet started`,
    },
  ];

  const activeFilterCount = (statusFilter ? 1 : 0) + (frameworkFilter ? 1 : 0);

  const clearAll = () => {
    setSearch('');
    setStatusFilter('');
    setFrameworkFilter('');
  };

  const save = async (draft = false) => {
    if (!form.name.trim()) { toast.error("Control name is required"); return; }
    setSaving(true);
    try {
      const status = draft ? "Planned" : (form.status || "Not Implemented");
      const record: any = { ...form, status };
      if (editId) record.id = editId;
      await saveControl(record);
    } catch { toast.error("Failed to save"); }
    setSaving(false); setModal(null); setForm(EMPTY); setEditId(null);
  };

  const openEdit = (item: any) => {
    setForm({
      name: item.name, controlId: item.controlId, framework: item.framework,
      domain: item.domain, type: item.type, status: item.status, testFreq: item.testFreq,
      owner: item.owner, dueDate: item.dueDate, evidenceRequired: item.evidenceRequired,
      description: item.description, implGuidance: item.implGuidance,
      testProcedure: item.testProcedure, relatedRisks: item.relatedRisks || [],
    });
    setEditId(item.id); setModal("edit");
  };

  const doDelete = async () => {
    if (deleteTarget?.id) {
      try { await removeControl(deleteTarget.id); } catch { /* handled by hook */ }
    }
    setDeleteTarget(null);
  };

  if (isLoading) return <PageSkeleton />;
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Enterprise Page Header */}
      <PageHeader
        title="Controls"
        subtitle="Implement and test compliance controls across frameworks"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Controls' },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportCsv(items, 'controls.csv')}>
              <Export size={14} />Export CSV
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setForm(EMPTY); setEditId(null); setModal("create"); }}>
              <Plus size={14} />New Control
            </Button>
          </div>
        }
      />

      {/* KPI Row */}
      <StatCardRow cards={kpiCards} />

      {/* FilterBar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search controls…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: IMPL_STATUSES.map(s => ({ label: s, value: s })),
          },
          {
            key: 'framework',
            label: 'Framework',
            value: frameworkFilter,
            onChange: setFrameworkFilter,
            options: FRAMEWORKS_OPT.map(s => ({ label: s, value: s })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAll}
        trailing={
          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            {filtered.length} controls
          </span>
        }
      />

      <BulkActionToolbar
        count={sp.selectedIds.size}
        onClear={sp.clearSelected}
        onDelete={() => { sp.clearSelected(); toast.success("Use individual delete buttons"); }}
        onExport={() => exportCsv(items, "controls.csv")}
      />

      <Card><CardContent className="p-0">
        {sp.paged.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={32} className="text-[hsl(var(--brand))]" />}
            title="No controls found"
            description="Add compliance controls to start tracking your implementation."
            action={
              <Button size="sm" onClick={() => { setForm(EMPTY); setModal("create"); }}>
                <Plus size={14} className="mr-1" />New Control
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
                <tr>
                  <th className="px-3 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={sp.selectedIds.size === sp.paged.length && sp.paged.length > 0}
                      onChange={sp.toggleAll}
                    />
                  </th>
                  <Th col="controlId" label="Control ID" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="name" label="Control Name" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="framework" label="Framework" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="domain" label="Domain" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="status" label="Status" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="type" label="Type" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="owner" label="Owner" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <Th col="dueDate" label="Due Date" sortCol={sp.sortCol} sortDir={sp.sortDir} onSort={sp.handleSort} />
                  <th className="px-3 py-2.5 text-right text-xs text-[hsl(var(--text-4))]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sp.paged.map((item: any) => (
                  <tr
                    key={item.id}
                    className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer"
                    onClick={() => { setViewItem(item); setModal("view"); }}
                  >
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={sp.selectedIds.has(item.id)} onChange={() => sp.toggleSelect(item.id)} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[hsl(var(--text-3))]">{item.controlId}</td>
                    <td className="px-3 py-2.5"><p className="font-medium text-[hsl(var(--text-1))]">{item.name}</p></td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{item.framework}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))] text-xs">{item.domain}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={item.status} /></td>
                    <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{item.type}</td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-2))] text-xs">{item.owner}</td>
                    <td className="px-3 py-2.5 text-[hsl(var(--text-3))] text-xs whitespace-nowrap">{item.dueDate}</td>
                    <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setViewItem(item); setModal("view"); }}
                          className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 hover:bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]"
                        >
                          <PencilSimple size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 hover:bg-red-50 text-[hsl(0_72%_51%)]"
                        >
                          <Trash size={14} />
                        </button>
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

      {/* Create / Edit Modal */}
      <CrudModal
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal(null)}
        title={editId ? "Edit Control" : "New Compliance Control"}
        size="xl"
      >
        <div className="p-5 space-y-2">
          <FormSection title="Control Identity">
            <div className="grid grid-cols-2 gap-4">
              <TInput label="Control ID" value={form.controlId} onChange={setF("controlId")} placeholder="CTL-007 (auto-generated if blank)" />
              <TInput label="Control Name" required value={form.name} onChange={setF("name")} placeholder="AI Model Access Control" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Framework" value={form.framework} onChange={setF("framework")} options={FRAMEWORKS_OPT} />
              <TSelect label="Domain" value={form.domain} onChange={setF("domain")} options={DOMAINS} />
            </div>
          </FormSection>
          <FormSection title="Implementation Details">
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Control Type" value={form.type} onChange={setF("type")} options={CONTROL_TYPES} />
              <TSelect label="Implementation Status" value={form.status} onChange={setF("status")} options={IMPL_STATUSES} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TSelect label="Test Frequency" value={form.testFreq} onChange={setF("testFreq")} options={TEST_FREQS} />
              <TSelect label="Control Owner" value={form.owner} onChange={setF("owner")} options={OWNERS} />
            </div>
            <TInput label="Due Date" type="date" value={form.dueDate} onChange={setF("dueDate")} />
            <TToggle
              label="Evidence Required"
              value={form.evidenceRequired}
              onChange={setF("evidenceRequired")}
              hint="Evidence artifacts must be attached for this control"
            />
          </FormSection>
          <FormSection title="Description & Guidance">
            <TTextarea label="Description" required value={form.description} onChange={setF("description")} placeholder="Describe the control objective…" rows={3} maxLength={1000} />
            <TTextarea label="Implementation Guidance" value={form.implGuidance} onChange={setF("implGuidance")} placeholder="Step-by-step implementation guidance…" rows={3} maxLength={2000} />
            <TTextarea label="Testing Procedure" value={form.testProcedure} onChange={setF("testProcedure")} placeholder="How will this control be tested…" rows={3} maxLength={2000} />
          </FormSection>
        </div>
        <FormFooter
          onCancel={() => setModal(null)}
          onSaveDraft={() => save(true)}
          onSubmit={() => save(false)}
          loading={saving}
          submitLabel={editId ? "Update Control" : "Create Control"}
        />
      </CrudModal>

      {/* View Modal */}
      <CrudModal open={modal === "view"} onClose={() => setModal(null)} title={viewItem?.name ?? ""} size="xl">
        {viewItem && (
          <div>
            <MetaBar record={viewItem} />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewItem.status} />
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.type}</span>
                <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{viewItem.framework}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Control ID", viewItem.controlId],
                  ["Domain", viewItem.domain],
                  ["Test Frequency", viewItem.testFreq],
                  ["Owner", viewItem.owner],
                  ["Due Date", viewItem.dueDate],
                  ["Evidence Required", viewItem.evidenceRequired ? "Yes" : "No"],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-0.5">{k}</p>
                    <p className="font-medium text-[hsl(var(--text-1))]">{v || "—"}</p>
                  </div>
                ))}
              </div>
              {viewItem.description && (
                <div>
                  <p className="text-xs text-[hsl(var(--text-4))] mb-1">Description</p>
                  <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.description}</p>
                </div>
              )}
              {viewItem.implGuidance && (
                <div>
                  <p className="text-xs text-[hsl(var(--text-4))] mb-1">Implementation Guidance</p>
                  <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.implGuidance}</p>
                </div>
              )}
              {viewItem.testProcedure && (
                <div>
                  <p className="text-xs text-[hsl(var(--text-4))] mb-1">Testing Procedure</p>
                  <p className="text-sm text-[hsl(var(--text-2))]">{viewItem.testProcedure}</p>
                </div>
              )}
              <ActivityTimeline items={[
                { date: viewItem.createdAt, actor: viewItem.createdBy, action: "created this control" },
                { date: viewItem.updatedAt, actor: "system", action: "last updated record" },
              ]} />
            </div>
            <div className="px-5 pb-4 flex gap-2">
              <Button size="sm" onClick={() => { setModal(null); openEdit(viewItem); }}>Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setModal(null); setDeleteTarget(viewItem); }}>Delete</Button>
            </div>
          </div>
        )}
      </CrudModal>

      {/* Destructive delete — must use ConfirmDialog per rules */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This action cannot be undone. All associated records will be unlinked."
        type="danger"
        confirmLabel="Delete"
        onConfirm={doDelete}
        onOpenChange={(o: boolean) => { if (!o) setDeleteTarget(null); }}
        isDestructive
      />
    </div>
  );
}
