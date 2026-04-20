import React, { useState, useMemo } from "react";
import { Plus, MagnifyingGlass, PencilSimple, Trash, X, Download, Funnel } from "@phosphor-icons/react";
import { RBACGate } from '@/components/shared';
import { useRBAC } from '@/hooks/useRBAC';

interface Item {
  id: string;
  "name": string, "category": string, "severity": string, "owner": string, "status": string;
}

const SEED: Item[] = [
  {
    "id": "1",
    "name": "LLM Hallucination in Customer Advice",
    "category": "Model Risk",
    "severity": "Critical",
    "owner": "Chief AI Officer",
    "status": "Mitigating"
  },
  {
    "id": "2",
    "name": "Training Data PII Leakage",
    "category": "Data Risk",
    "severity": "High",
    "owner": "Data Protection Officer",
    "status": "Open"
  },
  {
    "id": "3",
    "name": "Biased Lending Model Outcomes",
    "category": "Compliance",
    "severity": "Critical",
    "owner": "Fair Lending Officer",
    "status": "Mitigating"
  },
  {
    "id": "4",
    "name": "Model Drift in Fraud Detection",
    "category": "Model Risk",
    "severity": "High",
    "owner": "ML Ops Lead",
    "status": "Open"
  },
  {
    "id": "5",
    "name": "EU AI Act Non-Compliance",
    "category": "Compliance",
    "severity": "Critical",
    "owner": "General Counsel",
    "status": "Open"
  },
  {
    "id": "6",
    "name": "Adversarial Attack on Vision Model",
    "category": "Security",
    "severity": "High",
    "owner": "CISO",
    "status": "Mitigating"
  }
];

export default function RiskPage() {
  const [items, setItems] = useState<Item[]>(SEED);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  // RBAC gating applied via <RBACGate> wrapper on destructive actions
  useRBAC();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Item,"id">>({"name": "", "category": "", "severity": "", "owner": "", "status": ""});
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
    setForm({"name": "", "category": "", "severity": "", "owner": "", "status": ""});
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
          <h1 className="text-2xl font-bold text-white">Risk Register</h1>
          <p className="text-sm text-zinc-400 mt-1">Enterprise AI risk tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700">
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => { setEditId(null); setForm({"name": "", "category": "", "severity": "", "owner": "", "status": ""}); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} weight="bold" /> Add New
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-xs">Total</p>
          <p className="text-2xl font-bold text-white">{items.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-xs">Active</p>
          <p className="text-2xl font-bold text-green-400">{items.filter(i => Object.values(i).some(v => /active|approved|pass|complet|low/i.test(String(v)))).length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-xs">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{items.filter(i => Object.values(i).some(v => /pending|review|medium|draft/i.test(String(v)))).length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-zinc-400 text-xs">Critical</p>
          <p className="text-2xl font-bold text-red-400">{items.filter(i => Object.values(i).some(v => /critical|high|fail|reject|expired/i.test(String(v)))).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700">
          <Funnel size={16} /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800/50">
              <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Risk Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
              <td className="px-4 py-3 text-sm text-zinc-300">{item.name}</td>
              <td className="px-4 py-3 text-sm text-zinc-300"><span className={"px-2 py-1 text-xs rounded-full " + ({"Model Risk": "bg-red-900/50 text-red-400", "Data Risk": "bg-orange-900/50 text-orange-400", "Operational": "bg-yellow-900/50 text-yellow-400", "Compliance": "bg-green-900/50 text-green-400", "Security": "bg-blue-900/50 text-blue-400"}[item.category] || "bg-zinc-700 text-zinc-300")}>{item.category}</span></td>
              <td className="px-4 py-3 text-sm text-zinc-300"><span className={"px-2 py-1 text-xs rounded-full " + ({"Critical": "bg-red-900/50 text-red-400", "High": "bg-orange-900/50 text-orange-400", "Medium": "bg-yellow-900/50 text-yellow-400", "Low": "bg-green-900/50 text-green-400"}[item.severity] || "bg-zinc-700 text-zinc-300")}>{item.severity}</span></td>
              <td className="px-4 py-3 text-sm text-zinc-300">{item.owner}</td>
              <td className="px-4 py-3 text-sm text-zinc-300"><span className={"px-2 py-1 text-xs rounded-full " + ({"Open": "bg-red-900/50 text-red-400", "Mitigating": "bg-orange-900/50 text-orange-400", "Accepted": "bg-yellow-900/50 text-yellow-400", "Closed": "bg-green-900/50 text-green-400"}[item.status] || "bg-zinc-700 text-zinc-300")}>{item.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-blue-400">
                        <PencilSimple size={16} />
                      </button>
                      <RBACGate action="delete"><button onClick={() => setDeleteId(item.id)} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400">
                        <Trash size={16} />
                      </button></RBACGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-zinc-500">No records found</div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editId ? "Edit" : "Create"} Record</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Risk Name</label>
              <input type="text" value={{form.name}} onChange={{e => setForm({{...form, name: e.target.value}})}} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Category</label>
              <select value={{form.category}} onChange={{e => setForm({{...form, category: e.target.value}})}} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option value="Model Risk">Model Risk</option><option value="Data Risk">Data Risk</option><option value="Operational">Operational</option><option value="Compliance">Compliance</option><option value="Security">Security</option></select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Severity</label>
              <select value={{form.severity}} onChange={{e => setForm({{...form, severity: e.target.value}})}} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Owner</label>
              <input type="text" value={{form.owner}} onChange={{e => setForm({{...form, owner: e.target.value}})}} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
              <select value={{form.status}} onChange={{e => setForm({{...form, status: e.target.value}})}} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option value="Open">Open</option><option value="Mitigating">Mitigating</option><option value="Accepted">Accepted</option><option value="Closed">Closed</option></select>
            </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-white mb-2">Confirm Delete</h2>
            <p className="text-sm text-zinc-400 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
