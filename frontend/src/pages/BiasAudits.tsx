import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function BiasAudits() {
  const { data: items, loading, reload } = useApi<any[]>('/bias-audits');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ model_id: "", audit_type: "Fairness", status: "Pending", description: "" });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/bias-audits', form); setShowForm(false); setForm({ model_id: "", audit_type: "Fairness", status: "Pending", description: "" }); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Delete?')) return;
    try { await apiDel('/bias-audits/'+id); reload(); setToast('Deleted'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">Bias Audits</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ New</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Create Bias Audits</h3>
      <div className="form-group"><label>Model ID</label><input value={form.model_id} onChange={e=>setForm({...form,model_id:e.target.value})}/></div>
<div className="form-group"><label>Audit Type</label><select value={form.audit_type} onChange={e=>setForm({...form,audit_type:e.target.value})}><option value="Fairness">Fairness</option><option value="Demographic Parity">Demographic Parity</option><option value="Equalized Odds">Equalized Odds</option><option value="Disparate Impact">Disparate Impact</option></select></div>
<div className="form-group"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="Failed">Failed</option></select></div>
<div className="form-group"><label>Notes</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>

      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Create</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Model</th><th>Type</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.model_id}</td><td>{r.audit_type}</td><td>{r.bias_score}</td><td>{r.status}</td><td><button className="btn btn-sm" onClick={()=>handleDelete(r.id)}>Del</button></td></tr>)):<tr><td colSpan={99} className="empty">No items</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
