
import { useState } from 'react';
import { Plus, ClipboardText, Clock, CheckCircle, Warning } from '@phosphor-icons/react';

const stats = [
  { label: 'Open', value: 12, color: '--s-in-tx', icon: ClipboardText },
  { label: 'In Progress', value: 7, color: '--s-wn-tx', icon: Clock },
  { label: 'Completed', value: 34, color: '--s-ok-tx', icon: CheckCircle },
  { label: 'Overdue', value: 3, color: '--s-er-tx', icon: Warning },
];

export default function Tasks() {
  const [tasks] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', assignee: '', priority: 'medium', dueDate: ''  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>Task Management</h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginTop: 4 }}>Track compliance and governance tasks</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
        >
          <Plus size={14}/> Add Task
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <s.icon size={16} style={{ color: `hsl(var(${s.color}))` }}/>
              <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: `hsl(var(${s.color}))` }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: 'hsl(var(--text-1))', fontSize: 14 }}>All Tasks</span>
          <input placeholder="Search tasks..." style={{ padding: '6px 10px', background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 12, width: 200 }}/>
        </div>
        {tasks.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'hsl(var(--text-3))', fontSize: 13 }}>
            <ClipboardText size={32} style={{ marginBottom: 8, opacity: 0.4 }}/>
            <p>No tasks yet. Click "Add Task" to create your first task.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'hsl(var(--bg-raised))' }}>
                {['ID','Title','Assignee','Priority','Status','Due Date','Project'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontWeight: 600, color: 'hsl(var(--text-3))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{tasks.map((t,i) => <tr key={i}><td>{t.id}</td></tr>)}</tbody>
          </table>
        )}
      </div>

      {/* Add Dialog */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsl(var(--bg-page)/60%)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', width: 480, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'hsl(var(--text-1))' }}>Add New Task</span>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['Title','title','text'],['Assignee','assignee','text'],['Due Date','dueDate','date']].map(([label,key,type]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={e => setForm({...form, [key]: e.target.value})}
                    style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 4, textTransform: 'uppercase' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{ width: '100%', padding: '7px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13 }}>
                  {['low','medium','high'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-sunken))', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid hsl(var(--border-mid))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={() => setShowAdd(false)} style={{ padding: '6px 14px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
