import React from 'react';

export interface StatusPillProps {
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPLOYED' | 'DEPRECATED' | 'RETIRED' | string;
  className?: string;
}

export function StatusPill({ status, className = '' }: StatusPillProps) {
  const norm = status.toUpperCase().replace(/[\s-]/g, '_');
  let styles = '';

  if (norm === 'APPROVED' || norm === 'DEPLOYED' || norm === 'ACTIVE') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (norm === 'DEPRECATED' || norm === 'RETIRED') {
    styles = 'bg-zinc-100 text-zinc-700 border-zinc-300';
  } else if (norm === 'DRAFT' || norm === 'IN_REVIEW' || norm === 'UNDER_REVIEW') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    styles = 'bg-slate-50 text-slate-700 border-slate-200';
  }

  const label = status.replace(/_/g, ' ').toUpperCase();

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-none border ${styles} ${className}`}>
      {label}
    </span>
  );
}

export default StatusPill;
