// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Plus, MagnifyingGlass, PencilSimple, Trash, X, Download, Funnel } from "@phosphor-icons/react";

interface Item {
  id: string;
  "title": string, "severity": string, "affected_model": string, "reported_by": string, "date": string, "status": string;
}

const SEED: Item[] = [
  {
    "id": "1",
    "title": "LLM harmful financial advice",
    "severity": "P1-Critical",
    "affected_model": "GPT-4 Enterprise",
    "reported_by": "Sarah Chen",
    "date": "2026-04-08",
    "status": "Active"
  },
  {
    "id": "2",
    "title": "Fraud model false positive spike",
    "severity": "P2-High",
    "affected_model": "FraudDetect-v3",
    "reported_by": "Mike Rodriguez",
    "date": "2026-04-05",
    "status": "Investigating"
  },
  {
    "id": "3",
    "title": "PII exposed in training logs",
    "severity": "P1-Critical",
    "affected_model": "CustomerChurn-XGB",
    "reported_by": "DPO Office",
    "date": "2026-04-01",
    "status": "Resolved"
  },
  {
    "id": "4",
    "title": "Image classifier misidentifying products",
    "severity": "P3-Medium",
    "affected_model": "ImageClassifier",
    "reported_by": "QA Team",
    "date": "2026-03-28",
    "status": "Closed"
  }
];

export default function IncidentsPage() {
  const { data: items, setData: setItems } = useSupabaseTable('index_table', SEED);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Item,"id">>({"title": "", "severity": "", "affected_model": "", "reported_by": "", "date": "", "status": ""});
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
    setForm({"title": "", "severity": "", "affected_model": "", "reported_by": "", "date": "", "status": ""});
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
          <h1 className="text-2xl font-bold text-white">Incident Management</h1>
          <p className="text-sm text-zinc-400 mt-1">AI-related incident tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700">
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => { setEditId(null); setForm({"title": "", "severity": "", "affected_model": "", "reported_by": "", "date": "", "status": ""}); setShowModal(true); }}
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
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Incident</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Affected Model</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Reported By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
              <td className="px-4 py-3 text-sm text-zinc-300">{item.title}</td>
              <td className="px-4 py-3 text-sm text-zinc-300"><span className={"px-2 py-1 text-xs rounded-full " + ({"P1-Critical": "bg-red-900/50 text-red-400", "P2-High": "bg-orange-900/50 text-orange-400", "P3-Medium": "bg-yellow-900/50 text-yellow-400", "P4-Low": "bg-green-900/50 text-green-400"}[item.severity] || "bg-zinc-700 text-zinc-300")}>{item.severity}</span></td>
              <td className="px-4 py-3 text-sm text-zinc-300">{item.affected_model}</td>
              <td className="px-4 py-3 text-sm text-zinc-300">{item.reported_by}</td>
              <td className="px-4 py-3 text-sm text-zinc-300">{item.date}</td>
              <td className="px-4 py-3 text-sm text-zinc-300"><span className={"px-2 py-1 text-xs rounded-full " + ({"Active": "bg-red-900/50 text-red-400", "Investigating": "bg-orange-900/50 text-orange-400", "Resolved": "bg-yellow-900/50 text-yellow-400", "Closed": "bg-green-900/50 text-green-400"}[item.status] || "bg-zinc-700 text-zinc-300")}>{item.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(item)} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-blue-400">
                        <PencilSimple size={16} />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-red-400">
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
              <label className="block text-xs font-medium text-zinc-400 mb-1">Incident</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Severity</label>
              <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option value="P1-Critical">P1-Critical</option><option value="P2-High">P2-High</option><option value="P3-Medium">P3-Medium</option><option value="P4-Low">P4-Low</option></select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Affected Model</label>
              <input type="text" value={form.affected_model} onChange={e => setForm({...form, affected_model: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Reported By</label>
              <input type="text" value={form.reported_by} onChange={e => setForm({...form, reported_by: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
              <input type="text" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option value="Active">Active</option><option value="Investigating">Investigating</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select>
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
