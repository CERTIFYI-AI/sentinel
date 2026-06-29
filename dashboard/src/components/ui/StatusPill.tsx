import React from 'react';

export interface StatusPillProps {
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPLOYED' | 'DEPRECATED' | 'RETIRED' | string;
  className?: string;
  pulse?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED:  'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  DEPLOYED:  'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  ACTIVE:    'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  COMPLETED: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  RESOLVED:  'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  DRAFT:       'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]',
  IN_REVIEW:   'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]',
  UNDER_REVIEW:'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]',
  PENDING:     'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]',
  IN_PROGRESS: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))] border-[hsl(var(--s-in-br))]',
  OPEN:        'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]',
  REJECTED:    'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]',
  FAILED:      'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]',
  DEPRECATED:'bg-[hsl(var(--s-nt-bg))] text-[hsl(var(--s-nt-tx))] border-[hsl(var(--s-nt-br))]',
  RETIRED:   'bg-[hsl(var(--s-nt-bg))] text-[hsl(var(--s-nt-tx))] border-[hsl(var(--s-nt-br))]',
  CLOSED:    'bg-[hsl(var(--s-nt-bg))] text-[hsl(var(--s-nt-tx))] border-[hsl(var(--s-nt-br))]',
}

const FALLBACK = 'bg-[hsl(var(--s-nt-bg))] text-[hsl(var(--s-nt-tx))] border-[hsl(var(--s-nt-br))]'

export function StatusPill({ status, className = '', pulse = false }: StatusPillProps) {
  const norm = status.toUpperCase().replace(/[\s-]/g, '_');
  const styles = STATUS_STYLES[norm] || FALLBACK;
  const label = status.replace(/_/g, ' ').toUpperCase();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${styles} ${className}`}>
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />}
      {label}
    </span>
  );
}

export default StatusPill;
