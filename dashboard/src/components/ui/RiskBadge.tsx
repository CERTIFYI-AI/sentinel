import React from 'react';

export interface RiskBadgeProps {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  pulse?: boolean;
  className?: string;
  showIcon?: boolean;
}

const RISK_STYLES: Record<string, string> = {
  CRITICAL: 'bg-[hsl(var(--r-cr-bg))] text-[hsl(var(--r-cr-tx))] border-[hsl(var(--r-cr-br))]',
  HIGH:     'bg-[hsl(var(--r-hi-bg))] text-[hsl(var(--r-hi-tx))] border-[hsl(var(--r-hi-br))]',
  MEDIUM:   'bg-[hsl(var(--r-md-bg))] text-[hsl(var(--r-md-tx))] border-[hsl(var(--r-md-br))]',
  LOW:      'bg-[hsl(var(--r-lo-bg))] text-[hsl(var(--r-lo-tx))] border-[hsl(var(--r-lo-br))]',
}

const FALLBACK = 'bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))] border-[hsl(var(--border))]'

export function RiskBadge({ level, pulse = false, className = '', showIcon = true }: RiskBadgeProps) {
  const norm = level.toUpperCase();
  const styles = RISK_STYLES[norm] || FALLBACK;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${styles} ${className}`}>
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />
      )}
      {norm}
    </span>
  );
}

export default RiskBadge;
