import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function Datasets() {
  const { data: items, loading, reload } = useApi<any[]>('/datasets');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: "", data_type: "Tabular", source: "", description: "" });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/datasets', form); setShowForm(false); setForm({ name: "", data_type: "Tabular", source: "", description: "" }); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  const handleDelete = async (id:string) => {
    if(!confirm('Delete?')) return;
    try { await apiDel('/datasets/'+id); reload(); setToast('Deleted'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">Datasets</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ New</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Create Datasets</h3>
      <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
<div className="form-group"><label>Type</label><select value={form.data_type} onChange={e=>setForm({...form,data_type:e.target.value})}><option value="Tabular">Tabular</option><option value="Text">Text</option><option value="Image">Image</option><option value="Audio">Audio</option><option value="Mixed">Mixed</option></select></div>
<div className="form-group"><label>Source</label><input value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/></div>
<div className="form-group"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>

      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Create</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Name</th><th>Type</th><th>Records</th><th>Source</th><th>Actions</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td>{r.data_type}</td><td>{r.record_count}</td><td>{r.source}</td><td><button className="btn btn-sm" onClick={()=>handleDelete(r.id)}>Del</button></td></tr>)):<tr><td colSpan={99} className="empty">No items</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
