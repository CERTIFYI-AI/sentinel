import { useState } from 'react';
import { useApi } from '../hooks';
import { post, del as apiDel } from '../api';
export default function RegRadar() {
  const { data: items, loading, reload } = useApi<any[]>('/reg-radar');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ name: '', jurisdiction: 'EU', regulation_type: 'AI Act', status: 'Monitoring', effective_date: '', impact_level: 'Medium' });
  const [toast, setToast] = useState('');
  const handleCreate = async () => {
    try { await post('/reg-radar', form); setShowForm(false); reload(); setToast('Created'); setTimeout(()=>setToast(''),3000); }
    catch(e:any){ setToast('Error: '+e.message); setTimeout(()=>setToast(''),5000); }
  };
  if(loading) return <div className="loading">Loading...</div>;
  return (<div>
    <div className="toolbar"><h1 className="page-title">Regulatory Radar</h1><div style={{flex:1}}/><button className="btn btn-primary" onClick={()=>setShowForm(true)}>+ Track Regulation</button></div>
    {showForm&&<div className="modal-overlay" onClick={()=>setShowForm(false)}><div className="modal" onClick={e=>e.stopPropagation()}><h3>Track Regulation</h3>
      <div className="form-group"><label>Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
      <div className="form-group"><label>Jurisdiction</label><select value={form.jurisdiction} onChange={e=>setForm({...form,jurisdiction:e.target.value})}><option>EU</option><option>US</option><option>UK</option><option>Australia</option><option>Global</option></select></div>
      <div className="form-group"><label>Type</label><select value={form.regulation_type} onChange={e=>setForm({...form,regulation_type:e.target.value})}><option>AI Act</option><option>Data Protection</option><option>Sector Specific</option><option>Executive Order</option></select></div>
      <div className="form-group"><label>Impact</label><select value={form.impact_level} onChange={e=>setForm({...form,impact_level:e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
      <div style={{display:'flex',gap:8,marginTop:16}}><button className="btn btn-primary" onClick={handleCreate}>Track</button><button className="btn" onClick={()=>setShowForm(false)}>Cancel</button></div>
    </div></div>}
    <div className="card"><table><thead><tr><th>Regulation</th><th>Jurisdiction</th><th>Type</th><th>Impact</th><th>Status</th></tr></thead><tbody>
      {items&&items.length>0?items.map((r:any)=>(<tr key={r.id}><td>{r.name}</td><td><span className="badge blue">{r.jurisdiction}</span></td><td>{r.regulation_type}</td><td><span className={`badge ${r.impact_level==="Critical"?"red":r.impact_level==="High"?"yellow":"green"}`}>{r.impact_level}</span></td><td>{r.status}</td></tr>)):<tr><td colSpan={5} className="empty">No regulations tracked</td></tr>}
    </tbody></table></div>
    {toast&&<div className="toast">{toast}</div>}
  </div>);
}
