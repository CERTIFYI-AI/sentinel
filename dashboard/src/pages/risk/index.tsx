// @ts-nocheck
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import React, { useState, useMemo } from "react";
import { Plus, PencilSimple, Trash, X, Download } from "@phosphor-icons/react";
import { RBACGate } from '@/components/shared';
import { useRBAC } from '@/hooks/useRBAC';
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCardRow } from "@/components/ui/StatCardRow";
import { FilterBar } from "@/components/ui/FilterBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";

interface Item {
  id: string;
  name: string;
  category: string;
  severity: string;
  owner: string;
  status: string;
}

const SEED: Item[] = [
  { id: "1", name: "LLM Hallucination in Customer Advice", category: "Model Risk", severity: "Critical", owner: "Chief AI Officer", status: "Mitigating" },
  { id: "2", name: "Training Data PII Leakage", category: "Data Risk", severity: "High", owner: "Data Protection Officer", status: "Open" },
  { id: "3", name: "Biased Lending Model Outcomes", category: "Compliance", severity: "Critical", owner: "Fair Lending Officer", status: "Mitigating" },
  { id: "4", name: "Model Drift in Fraud Detection", category: "Model Risk", severity: "High", owner: "ML Ops Lead", status: "Open" },
  { id: "5", name: "EU AI Act Non-Compliance", category: "Compliance", severity: "Critical", owner: "General Counsel", status: "Open" },
  { id: "6", name: "Adversarial Attack on Vision Model", category: "Security", severity: "High", owner: "CISO", status: "Mitigating" },
];

const CATEGORIES = ["Model Risk", "Data Risk", "Operational", "Compliance", "Security"];
const SEVERITIES = ["Critical", "High", "Medium", "Low"];
const STATUSES = ["Open", "Mitigating", "Accepted", "Closed"];

const SEV_STYLE: Record<string, string> = {
  Critical: "bg-[hsl(0_72%_51%/0.12)] text-[hsl(var(--s-er-tx))] border border-[hsl(0_72%_51%/0.3)]",
  High: "bg-[hsl(25_95%_53%/0.12)] text-[hsl(var(--s-wn-tx))] border border-[hsl(25_95%_53%/0.3)]",
  Medium: "bg-[hsl(45_93%_47%/0.12)] text-[hsl(var(--s-wn-tx))] border border-[hsl(45_93%_47%/0.3)]",
  Low: "bg-[hsl(142_71%_45%/0.12)] text-[hsl(var(--s-ok-tx))] border border-[hsl(142_71%_45%/0.3)]",
};

const STATUS_STYLE: Record<string, string> = {
  Open: "bg-[hsl(0_72%_51%/0.10)] text-[hsl(var(--s-er-tx))]",
  Mitigating: "bg-[hsl(25_95%_53%/0.10)] text-[hsl(var(--s-wn-tx))]",
  Accepted: "bg-[hsl(45_93%_47%/0.10)] text-[hsl(var(--s-wn-tx))]",
  Closed: "bg-[hsl(142_71%_45%/0.10)] text-[hsl(var(--s-ok-tx))]",
};

export default function RiskPage() {
  const { data: items, setData: setItems } = useSupabaseTable('index_table', SEED);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  // RBAC gating applied via <RBACGate> wrapper on destructive actions
  useRBAC();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Item, "id">>({ name: "", category: "Model Risk", severity: "High", owner: "", status: "Open" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i =>
      (!q || Object.values(i).some(v => String(v).toLowerCase().includes(q)))
      && (!filterCategory || i.category === filterCategory)
      && (!filterSeverity || i.severity === filterSeverity)
      && (!filterStatus || i.status === filterStatus)
    );
  }, [items, search, filterCategory, filterSeverity, filterStatus]);

  // KPI values
  const totalRisks = items.length;
  const criticalCount = items.filter(i => i.severity === "Critical").length;
  const openCount = items.filter(i => i.status === "Open").length;
  const mitigatingCount = items.filter(i => i.status === "Mitigating").length;

  const handleSave = () => {
    if (editId) {
      setItems(items.map(i => i.id === editId ? { ...form, id: editId } : i));
    } else {
      setItems([...items, { ...form, id: crypto.randomUUID() }]);
    }
    setShowModal(false);
    setEditId(null);
    setForm({ name: "", category: "Model Risk", severity: "High", owner: "", status: "Open" });
  };

  const handleEdit = (item: Item) => {
    setEditId(item.id);
    const { id, ...rest } = item;
    setForm(rest);
    setShowModal(true);
  };

  const handleDelete = () => {
    setItems(items.filter(i => i.id !== deleteId));
    setDeleteId(null);
  };

  const activeFilterCount = (filterCategory ? 1 : 0) + (filterSeverity ? 1 : 0) + (filterStatus ? 1 : 0);
  const deleteItem = items.find(i => i.id === deleteId);

  return (
    <div className="space-y-6 p-6 max-w-[1400px]">
      <PageHeader
        title="Risk Register"
        subtitle="Identify, assess and treat AI risks"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Risk Register' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                // Export to CSV
                const keys = Object.keys(items[0] ?? {}) as (keyof Item)[];
                const csv = [keys.join(','), ...items.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                a.download = 'risks.csv';
                a.click();
              }}
            >
              <Download size={14} />Export
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditId(null);
                setForm({ name: "", category: "Model Risk", severity: "High", owner: "", status: "Open" });
                setShowModal(true);
              }}
            >
              <Plus size={14} weight="bold" />Add Risk
            </Button>
          </div>
        }
      />

      <StatCardRow
        cards={[
          { label: 'Total Risks', value: totalRisks },
          { label: 'Critical', value: criticalCount, isPositiveUp: false },
          { label: 'Open', value: openCount, isPositiveUp: false },
          { label: 'Mitigating', value: mitigatingCount, isPositiveUp: true },
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search risks…"
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(""); setFilterCategory(""); setFilterSeverity(""); setFilterStatus(""); }}
        filters={[
          {
            key: "category",
            label: "Category",
            value: filterCategory,
            onChange: setFilterCategory,
            options: CATEGORIES.map(c => ({ label: c, value: c })),
          },
          {
            key: "severity",
            label: "Severity",
            value: filterSeverity,
            onChange: setFilterSeverity,
            options: SEVERITIES.map(s => ({ label: s, value: s })),
          },
          {
            key: "status",
            label: "Status",
            value: filterStatus,
            onChange: setFilterStatus,
            options: STATUSES.map(s => ({ label: s, value: s })),
          },
        ]}
      />

      {/* Table */}
      <div className="bg-surface border border-[hsl(var(--border))] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[hsl(var(--bg-raised,var(--bg-surface)))] border-b border-[hsl(var(--border))]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Risk Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-[hsl(var(--bg-muted,var(--bg-surface)))] transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-[hsl(var(--text-1))]">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-[hsl(var(--text-2))]">
                    <span className="px-2 py-0.5 text-xs rounded border border-[hsl(var(--border))] text-[hsl(var(--text-2))]">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${SEV_STYLE[item.severity] ?? ''}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[hsl(var(--text-2))]">{item.owner}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_STYLE[item.status] ?? ''}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 rounded hover:bg-[hsl(var(--bg-muted,var(--bg-surface)))] text-[hsl(var(--text-3))] hover:text-[hsl(var(--brand))]"
                        aria-label="Edit risk"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <RBACGate action="delete">
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded hover:bg-[hsl(0_72%_51%/0.10)] text-[hsl(var(--text-3))] hover:text-[hsl(var(--s-er-tx))]"
                          aria-label="Delete risk"
                        >
                          <Trash size={14} />
                        </button>
                      </RBACGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-[hsl(var(--text-4))] text-sm">No risks match your filters.</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-surface border border-[hsl(var(--border))] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{editId ? "Edit Risk" : "Add New Risk"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Risk Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[hsl(var(--bg-page))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:ring-1 focus:ring-[hsl(var(--brand))] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[hsl(var(--bg-page))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Severity</label>
                  <select
                    value={form.severity}
                    onChange={e => setForm({ ...form, severity: e.target.value })}
                    className="w-full px-3 py-2 bg-[hsl(var(--bg-page))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none"
                  >
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Owner</label>
                <input
                  type="text"
                  value={form.owner}
                  onChange={e => setForm({ ...form, owner: e.target.value })}
                  className="w-full px-3 py-2 bg-[hsl(var(--bg-page))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:ring-1 focus:ring-[hsl(var(--brand))] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--text-3))] mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[hsl(var(--bg-page))] border border-[hsl(var(--border))] rounded text-sm text-[hsl(var(--text-1))] focus:border-[hsl(var(--brand))] focus:outline-none"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[hsl(var(--border))]">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!form.name.trim()}>{editId ? "Update Risk" : "Add Risk"}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Destructive delete action wrapped in ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteId}
        title={`Delete "${deleteItem?.name ?? 'this risk'}"?`}
        message="This action cannot be undone. The risk record will be permanently removed."
        type="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onOpenChange={open => { if (!open) setDeleteId(null); }}
        isDestructive
      />
    </div>
  );
}
