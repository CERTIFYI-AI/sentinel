import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';

export default function Models() {
  const { data: items, loading, reload } = useApi<any[]>('/models');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: "", model_type: "LLM", risk_level: "Medium", owner: "", description: "", lifecycle_stage: "Draft", });
  const [toast, setToast] = useState('');

  const handleCreate = async () => {
    try {
      await post('/models', form);
      setShowForm(false);
      setForm({ name: "", model_type: "LLM", risk_level: "Medium", owner: "", description: "", lifecycle_stage: "Draft", });
      reload();
      setToast('AI Models created');
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 5000); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await apiDel('/models/' + id);
      reload();
      setToast('Deleted');
      setTimeout(() => setToast(''), 3000);
    } catch (e: any) { setToast('Error: ' + e.message); setTimeout(() => setToast(''), 5000); }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="toolbar">
        <h1 className="page-title">AI Models</h1>
        <div style={{flex:1}} />
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create AI Models</h3>
            
            <div className="form-group">
              <label>Model Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.model_type} onChange={e => setForm({...form, model_type: e.target.value})}><option value="LLM">LLM</option><option value="Vision">Vision</option><option value="Multimodal">Multimodal</option><option value="Classification">Classification</option><option value="Regression">Regression</option></select>
            </div>
            <div className="form-group">
              <label>Risk Level</label>
              <select value={form.risk_level} onChange={e => setForm({...form, risk_level: e.target.value})}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select>
            </div>
            <div className="form-group">
              <label>Owner</label>
              <input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Stage</label>
              <select value={form.lifecycle_stage} onChange={e => setForm({...form, lifecycle_stage: e.target.value})}><option value="Draft">Draft</option><option value="Development">Development</option><option value="Testing">Testing</option><option value="Production">Production</option><option value="Retired">Retired</option></select>
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
          <thead><tr><th>Name</th><th>Type</th><th>Risk</th><th>Stage</th><th>Owner</th><th>Actions</th></tr></thead>
          <tbody>
            {items && items.length > 0 ? items.map((r: any) => (
              <tr key={r.id}>
                <td>{r.name}</td><td>{r.model_type}</td><td><span className={`badge ${r.risk_level==="High"?"red":r.risk_level==="Medium"?"yellow":"green"}`}>{r.risk_level}</span></td><td>{r.lifecycle_stage}</td><td>{r.owner}</td>
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
