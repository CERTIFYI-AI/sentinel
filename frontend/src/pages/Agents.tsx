import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function Agents() {
  const { data: items, loading, reload } = useApi<any[]>('/agents');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: "", agent_type: "Autonomous", status: "Active", risk_level: "Medium", description: "" });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/agents', form); setShowForm(false); setForm({ name: "", agent_type: "Autonomous", status: "Active", risk_level: "Medium", description: "" }); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Delete?')) return;
    try { await apiDel('/agents/'+id); reload(); setToast('Deleted'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">AI Agents</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ New</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Create AI Agents</h3>
      <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
<div className="form-group"><label>Type</label><select value={form.agent_type} onChange={e=>setForm({...form,agent_type:e.target.value})}><option value="Autonomous">Autonomous</option><option value="Semi-Autonomous">Semi-Autonomous</option><option value="Assistive">Assistive</option><option value="Chatbot">Chatbot</option></select></div>
<div className="form-group"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Under Review">Under Review</option><option value="Retired">Retired</option></select></div>
<div className="form-group"><label>Risk</label><select value={form.risk_level} onChange={e=>setForm({...form,risk_level:e.target.value})}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
<div className="form-group"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>

      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Create</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Risk</th><th>Actions</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.agent_type}</td><td><span className={`badge ${r.status==="Active"?"green":"yellow"}`}>{r.status}</span></td><td>{r.risk_level}</td><td><button className="btn btn-sm" onClick={()=>handleDelete(r.id)}>Del</button></td></tr>)):<tr><td colSpan={99} className="empty">No items</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
