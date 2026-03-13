import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function Vendors() {
  const { data: items, loading, reload } = useApi<any[]>('/vendors');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: "", vendor_type: "SaaS", risk_tier: "Medium", compliance_status: "Pending", contact_email: "" });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/vendors', form); setShowForm(false); setForm({ name: "", vendor_type: "SaaS", risk_tier: "Medium", compliance_status: "Pending", contact_email: "" }); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Delete?')) return;
    try { await apiDel('/vendors/'+id); reload(); setToast('Deleted'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">Vendors</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ New</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Create Vendors</h3>
      <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
<div className="form-group"><label>Type</label><select value={form.vendor_type} onChange={e=>setForm({...form,vendor_type:e.target.value})}><option value="SaaS">SaaS</option><option value="API Provider">API Provider</option><option value="Cloud">Cloud</option><option value="On-Premise">On-Premise</option><option value="Consulting">Consulting</option></select></div>
<div className="form-group"><label>Risk</label><select value={form.risk_tier} onChange={e=>setForm({...form,risk_tier:e.target.value})}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option></select></div>
<div className="form-group"><label>Status</label><select value={form.compliance_status} onChange={e=>setForm({...form,compliance_status:e.target.value})}><option value="Pending">Pending</option><option value="Compliant">Compliant</option><option value="Non-Compliant">Non-Compliant</option><option value="Under Review">Under Review</option></select></div>
<div className="form-group"><label>Contact Email</label><input value={form.contact_email} onChange={e=>setForm({...form,contact_email:e.target.value})}/></div>

      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Create</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Name</th><th>Type</th><th>Risk</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.vendor_type}</td><td>{r.risk_tier}</td><td>{r.compliance_status}</td><td><button className="btn btn-sm" onClick={()=>handleDelete(r.id)}>Del</button></td></tr>)):<tr><td colSpan={99} className="empty">No items</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
