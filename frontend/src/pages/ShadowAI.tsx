import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function ShadowAI() {
  const { data: items, loading, reload } = useApi<any[]>('/shadow-ai');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: '', tool_type: 'LLM', detected_by: '', risk_level: 'Medium', department: '' });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/shadow-ai', form); setShowForm(false); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Delete?')) return;
    try { await apiDel('/shadow-ai/'+id); reload(); setToast('Deleted'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">Shadow AI Detection</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ Report</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Report Shadow AI</h3>
      <div className="form-group"><label>Tool Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
      <div className="form-group"><label>Type</label><select value={form.tool_type} onChange={e=>setForm({...form,tool_type:e.target.value})}><option>LLM</option><option>Image Gen</option><option>Code Assistant</option><option>Other</option></select></div>
      <div className="form-group"><label>Department</label><input value={form.department} onChange={e=>setForm({...form,department:e.target.value})}/></div>
      <div className="form-group"><label>Risk</label><select value={form.risk_level} onChange={e=>setForm({...form,risk_level:e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Submit</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Tool</th><th>Type</th><th>Dept</th><th>Risk</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.tool_type}</td><td>{r.department}</td><td><span className={`badge ${r.risk_level==="Critical"?"red":r.risk_level==="High"?"yellow":"green"}`}>{r.risk_level}</span></td><td>{r.status}</td><td><button className="btn btn-sm" onClick={()=>handleDelete(r.id)}>Del</button></td></tr>)):<tr><td colSpan={6} className="empty">No shadow AI detected</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
