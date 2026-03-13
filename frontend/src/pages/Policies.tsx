import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';

export default function Policies() {
  const { data: items, loading, reload } = useApi<any[]>('/policies');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: "", description: "", framework: "EU AI Act", owner: "", status: "Draft", });
  const [toast, setToast] = useState('');

  const handleCreate = async () => {
    try {
      await post('/policies', form);
      setShowForm(false);
      setForm({ name: "", description: "", framework: "EU AI Act", owner: "", status: "Draft", });
      reload();
      setToast('Policies created');
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 5000); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await apiDel('/policies/' + id);
      reload();
      setToast('Deleted');
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 5000); }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="toolbar">
        <h1 className="page-title">Policies</h1>
        <div style={{flex:1}} />
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Policies</h3>
            
            <div className="form-group">
              <label>Policy Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Framework</label>
              <select value={form.framework} onChange={e => setForm({...form, framework: e.target.value})}><option value="EU AI Act">EU AI Act</option><option value="NIST AI RMF">NIST AI RMF</option><option value="ISO 42001">ISO 42001</option><option value="SOC-2">SOC-2</option><option value="OWASP LLM">OWASP LLM</option></select>
            </div>
            <div className="form-group">
              <label>Owner</label>
              <input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="Draft">Draft</option><option value="In Review">In Review</option><option value="Approved">Approved</option><option value="Archived">Archived</option></select>
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
          <thead><tr><th>Name</th><th>Status</th><th>Framework</th><th>Owner</th><th>Actions</th></tr></thead>
          <tbody>
            {items && items.length > 0 ? items.map((r: any) => (
              <tr key={r.id}>
                <td>{r.name}</td><td><span className={`badge ${r.status==="Approved"?"green":r.status==="Draft"?"yellow":"blue"}`}>{r.status}</span></td><td>{r.framework}</td><td>{r.owner}</td>
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
