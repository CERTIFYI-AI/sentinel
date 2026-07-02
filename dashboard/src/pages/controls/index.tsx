// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Plus, MagnifyingGlass, PencilSimple, Trash, X, Download, Funnel } from "@phosphor-icons/react";

interface Item {
  id: string;
  "control_id": string, "name": string, "framework": string, "category": string, "status": string, "owner": string;
}

const SEED: Item[] = [
  {
    "id": "1",
    "control_id": "AC-001",
    "name": "AI Model Access Control",
    "framework": "ISO 27001",
    "category": "Technical",
    "status": "Implemented",
    "owner": "Security Team"
  },
  {
    "id": "2",
    "control_id": "MG-002",
    "name": "Model Governance Policy",
    "framework": "NIST AI RMF",
    "category": "Administrative",
    "status": "Implemented",
    "owner": "AI Governance"
  },
  {
    "id": "3",
    "control_id": "TR-003",
    "name": "Bias Testing Protocol",
    "framework": "EU AI Act",
    "category": "Technical",
    "status": "Partial",
    "owner": "ML Engineering"
  },
  {
    "id": "4",
    "control_id": "DP-004",
    "name": "Training Data Protection",
    "framework": "SOC-2",
    "category": "Technical",
    "status": "Implemented",
    "owner": "Data Engineering"
  },
  {
    "id": "5",
    "control_id": "HR-005",
    "name": "AI Ethics Training",
    "framework": "ISO 42001",
    "category": "Administrative",
    "status": "Planned",
    "owner": "HR Department"
  },
  {
    "id": "6",
    "control_id": "IM-006",
    "name": "Incident Response Plan",
    "framework": "NIST AI RMF",
    "category": "Administrative",
    "status": "Implemented",
    "owner": "Risk Management"
  }
];

export default function ControlsPage() {
  const { data: items, setData: setItems } = useSupabaseTable('index_table', SEED);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Item,"id">>({"control_id": "", "name": "", "framework": "", "category": "", "status": "", "owner": ""});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(s)));
  }, [items, search]);

  const handleSave = () => {
    if (editId) {
      setItems(items.map(i => i.id === editId ? { ...form, id: editId } : i));
    } else {
      setItems([...items, { ...form, id: crypto.randomUUID() }]);
    }
    setShowModal(false);
    setEditId(null);
    setForm({"control_id": "", "name": "", "framework": "", "category": "", "status": "", "owner": ""});
  };

  const handleEdit = (item: Item) => {
    setEditId(item.id);
    const { id, ...rest } = item;
    setForm(rest as any);
    setShowModal(true);
  };

  const handleDelete = () => {
    setItems(items.filter(i => i.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--bg-surface))]">Controls Library</h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-1">Security and compliance controls</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))] rounded-lg text-sm hover:bg-[hsl(var(--bg-sunken))]">
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => { setEditId(null); setForm({"control_id": "", "name": "", "framework": "", "category": "", "status": "", "owner": ""}); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--s-in-tx))] text-[hsl(var(--bg-surface))] rounded-lg text-sm hover:bg-[hsl(var(--s-in-tx))]"
          >
            <Plus size={16} weight="bold" /> Add New
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-lg p-4">
          <p className="text-[hsl(var(--text-4))] text-xs">Total</p>
          <p className="text-2xl font-bold text-[hsl(var(--bg-surface))]">{items.length}</p>
        </div>
        <div className="bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-lg p-4">
          <p className="text-[hsl(var(--text-4))] text-xs">Active</p>
          <p className="text-2xl font-bold text-[hsl(var(--s-ok-tx))]">{items.filter(i => Object.values(i).some(v => /active|approved|pass|complet|low/i.test(String(v)))).length}</p>
        </div>
        <div className="bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-lg p-4">
          <p className="text-[hsl(var(--text-4))] text-xs">Pending</p>
          <p className="text-2xl font-bold text-[hsl(var(--s-wn-tx))]">{items.filter(i => Object.values(i).some(v => /pending|review|medium|draft/i.test(String(v)))).length}</p>
        </div>
        <div className="bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-lg p-4">
          <p className="text-[hsl(var(--text-4))] text-xs">Critical</p>
          <p className="text-2xl font-bold text-[hsl(var(--s-er-tx))]">{items.filter(i => Object.values(i).some(v => /critical|high|fail|reject|expired/i.test(String(v)))).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-3))]" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-lg text-sm text-[hsl(var(--bg-surface))] focus:border-[hsl(var(--s-in-br))] focus:ring-1 focus:ring-[hsl(var(--s-in-br))]"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))] rounded-lg text-sm hover:bg-[hsl(var(--bg-sunken))]">
          <Funnel size={16} /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[hsl(var(--bg-sunken))]">
              <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider">Control ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider">Control Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider">Framework</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[hsl(var(--text-4))] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-[hsl(var(--bg-sunken))] transition-colors">
              <td className="px-4 py-3 text-sm text-[hsl(var(--text-4))]">{item.control_id}</td>
              <td className="px-4 py-3 text-sm text-[hsl(var(--text-4))]">{item.name}</td>
              <td className="px-4 py-3 text-sm text-[hsl(var(--text-4))]"><span className={"px-2 py-1 text-xs rounded-full " + ({"ISO 27001": "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))]", "SOC-2": "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))]", "NIST AI RMF": "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))]", "EU AI Act": "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))]", "ISO 42001": "bg-[hsl(var(--s-in-tx))] text-[hsl(var(--s-in-tx))]"}[item.framework] || "bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))]")}>{item.framework}</span></td>
              <td className="px-4 py-3 text-sm text-[hsl(var(--text-4))]"><span className={"px-2 py-1 text-xs rounded-full " + ({"Technical": "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))]", "Administrative": "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))]", "Physical": "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))]"}[item.category] || "bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))]")}>{item.category}</span></td>
              <td className="px-4 py-3 text-sm text-[hsl(var(--text-4))]"><span className={"px-2 py-1 text-xs rounded-full " + ({"Implemented": "bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))]", "Partial": "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))]", "Planned": "bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))]", "Not Applicable": "bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))]"}[item.status] || "bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))]")}>{item.status}</span></td>
              <td className="px-4 py-3 text-sm text-[hsl(var(--text-4))]">{item.owner}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 rounded hover:bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-in-tx))]">
                        <PencilSimple size={16} />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1 rounded hover:bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-er-tx))]">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-[hsl(var(--text-3))]">No records found</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[hsl(var(--bg-surface))]">{editId ? "Edit" : "Create"} Record</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-[hsl(var(--bg-sunken))] text-[hsl(var(--text-4))]">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-4))] mb-1">Control ID</label>
              <input type="text" value={form.control_id} onChange={e => setForm({...form, control_id: e.target.value})} className="w-full px-3 py-2 bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--bg-surface))] focus:border-[hsl(var(--s-in-br))] focus:ring-1 focus:ring-[hsl(var(--s-in-br))]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-4))] mb-1">Control Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--bg-surface))] focus:border-[hsl(var(--s-in-br))] focus:ring-1 focus:ring-[hsl(var(--s-in-br))]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-4))] mb-1">Framework</label>
              <select value={form.framework} onChange={e => setForm({...form, framework: e.target.value})} className="w-full px-3 py-2 bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--bg-surface))] focus:border-[hsl(var(--s-in-br))] focus:ring-1 focus:ring-[hsl(var(--s-in-br))]"><option value="ISO 27001">ISO 27001</option><option value="SOC-2">SOC-2</option><option value="NIST AI RMF">NIST AI RMF</option><option value="EU AI Act">EU AI Act</option><option value="ISO 42001">ISO 42001</option></select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-4))] mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--bg-surface))] focus:border-[hsl(var(--s-in-br))] focus:ring-1 focus:ring-[hsl(var(--s-in-br))]"><option value="Technical">Technical</option><option value="Administrative">Administrative</option><option value="Physical">Physical</option></select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-4))] mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--bg-surface))] focus:border-[hsl(var(--s-in-br))] focus:ring-1 focus:ring-[hsl(var(--s-in-br))]"><option value="Implemented">Implemented</option><option value="Partial">Partial</option><option value="Planned">Planned</option><option value="Not Applicable">Not Applicable</option></select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--text-4))] mb-1">Owner</label>
              <input type="text" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} className="w-full px-3 py-2 bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-md text-sm text-[hsl(var(--bg-surface))] focus:border-[hsl(var(--s-in-br))] focus:ring-1 focus:ring-[hsl(var(--s-in-br))]" />
            </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-[hsl(var(--text-4))] hover:text-[hsl(var(--bg-surface))]">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-[hsl(var(--s-in-tx))] text-[hsl(var(--bg-surface))] rounded-lg text-sm hover:bg-[hsl(var(--s-in-tx))]">{editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[hsl(var(--bg-sunken))] border border-[hsl(var(--border))] rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-[hsl(var(--bg-surface))] mb-2">Confirm Delete</h2>
            <p className="text-sm text-[hsl(var(--text-4))] mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-[hsl(var(--text-4))] hover:text-[hsl(var(--bg-surface))]">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-[hsl(var(--s-er-tx))] text-[hsl(var(--bg-surface))] rounded-lg text-sm hover:bg-[hsl(var(--s-er-tx))]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
