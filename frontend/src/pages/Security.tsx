import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function Security() {
  const { data: items, loading, reload } = useApi<any[]>('/security');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: "", finding_type: "Vulnerability", severity: "Medium", status: "Open", description: "" });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/security', form); setShowForm(false); setForm({ name: "", finding_type: "Vulnerability", severity: "Medium", status: "Open", description: "" }); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Delete?')) return;
    try { await apiDel('/security/'+id); reload(); setToast('Deleted'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">Security / Red Team</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ New</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Create Security / Red Team</h3>
      <div className="form-group"><label>Finding Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
<div className="form-group"><label>Type</label><select value={form.finding_type} onChange={e=>setForm({...form,finding_type:e.target.value})}><option value="Vulnerability">Vulnerability</option><option value="Prompt Injection">Prompt Injection</option><option value="Data Leak">Data Leak</option><option value="Model Theft">Model Theft</option><option value="Adversarial">Adversarial</option><option value="Other">Other</option></select></div>
<div className="form-group"><label>Severity</label><select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value})}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
<div className="form-group"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Accepted">Accepted</option></select></div>
<div className="form-group"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>

      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Create</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Name</th><th>Type</th><th>Severity</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.finding_type}</td><td><span className={`badge ${r.severity==="Critical"?"red":r.severity==="High"?"yellow":"green"}`}>{r.severity}</span></td><td>{r.status}</td><td><button className="btn btn-sm" onClick={()=>handleDelete(r.id)}>Del</button></td></tr>)):<tr><td colSpan={99} className="empty">No items</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
