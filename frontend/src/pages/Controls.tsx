import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';

export default function Controls() {
  const { data: items, loading, reload } = useApi<any[]>('/controls');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", category: "Technical", status: "Planned", priority: "Medium", });
  const [toast, setToast] = useState('');

  const handleCreate = async () => {
    try {
      await post('/controls', form);
      setShowForm(false);
      setForm({ name: "", description: "", category: "Technical", status: "Planned", priority: "Medium", });
      reload();
      setToast('Controls created');
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 5000); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await apiDel('/controls/' + id);
      reload();
      setToast('Deleted');
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 5000); }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="toolbar">
        <h1 className="page-title">Controls</h1>
        <div style={{flex:1}} />
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Controls</h3>
            
            <div className="form-group">
              <label>Control Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}><option value="Technical">Technical</option><option value="Organizational">Organizational</option><option value="Legal">Legal</option><option value="Ethical">Ethical</option></select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="Planned">Planned</option><option value="In Progress">In Progress</option><option value="Implemented">Implemented</option><option value="Verified">Verified</option></select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select>
            </div>
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Priority</th><th>Actions</th></tr></thead>
          <tbody>
            {items && items.length > 0 ? items.map((r: any) => (
              <tr key={r.id}>
                <td>{r.name}</td><td>{r.category}</td><td><span className={`badge ${r.status==="Implemented"?"green":r.status==="Planned"?"yellow":"red"}`}>{r.status}</span></td><td>{r.priority}</td>
                <td><button className="btn btn-sm" onClick={() => handleDelete(r.id)}>Delete</button></td>
              </tr>
            )) : <tr><td colSpan={99} className="empty">No items yet</td></tr>}
          </tbody>
        </table>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
