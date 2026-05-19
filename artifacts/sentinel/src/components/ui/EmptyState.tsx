import React from 'react';
interface EmptyStateProps { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; }
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px 24px', textAlign:'center', gap:16 }}>
      {icon && <div style={{ background:'hsl(var(--bg-raised))', padding:16, display:'inline-flex', borderRadius:0 }}>{icon}</div>}
      <div>
        <p style={{ fontWeight:600, color:'hsl(var(--text-1))', marginBottom:4 }}>{title}</p>
        {description && <p style={{ fontSize:13, color:'hsl(var(--text-3))' }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
