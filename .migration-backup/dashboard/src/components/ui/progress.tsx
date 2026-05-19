import React from 'react';
export function Progress({ value = 0, className = '' }: { value?: number; className?: string }) {
  return (
    <div className={`h-2 w-full rounded-full ${className}`} style={{ background: 'hsl(var(--muted))' }}>
      <div className='h-full rounded-full transition-all' style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: 'hsl(var(--primary))' }} />
    </div>
  );
}
export default Progress;
