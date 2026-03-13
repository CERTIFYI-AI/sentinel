import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function Compliance() {
  const { data: items, loading, reload } = useApi<any[]>('/compliance');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ framework: "EU AI Act", score: "0", status: "Draft", assessed_date: "" });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/compliance', form); setShowForm(false); setForm({ framework: "EU AI Act", score: "0", status: "Draft", assessed_date: "" }); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Delete?')) return;
    try { await apiDel('/compliance/'+id); reload(); setToast('Deleted'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">Compliance Scores</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ New</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Create Compliance Scores</h3>
      <div className="form-group"><label>Framework</label><select value={form.framework} onChange={e=>setForm({...form,framework:e.target.value})}><option value="EU AI Act">EU AI Act</option><option value="NIST AI RMF">NIST AI RMF</option><option value="ISO 42001">ISO 42001</option><option value="SOC-2">SOC-2</option><option value="OWASP LLM">OWASP LLM</option></select></div>
<div className="form-group"><label>Score (0-100)</label><input value={form.score} onChange={e=>setForm({...form,score:e.target.value})}/></div>
<div className="form-group"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Draft">Draft</option><option value="In Progress">In Progress</option><option value="Assessed">Assessed</option><option value="Certified">Certified</option></select></div>
<div className="form-group"><label>Date</label><input value={form.assessed_date} onChange={e=>setForm({...form,assessed_date:e.target.value})}/></div>

      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Create</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Framework</th><th>Score</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.framework}</td><td>{r.score}</td><td>{r.status}</td><td>{r.assessed_date}</td><td><button className="btn btn-sm" onClick={()=>handleDelete(r.id)}>Del</button></td></tr>)):<tr><td colSpan={99} className="empty">No items</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
