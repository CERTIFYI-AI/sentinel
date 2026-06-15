import React from 'react';

export interface RiskBadgeProps {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  pulse?: boolean;
  className?: string;
}

export function RiskBadge({ level, pulse = false, className = '' }: RiskBadgeProps) {
  const norm = level.toUpperCase();
  let styles = '';
  
  if (norm === 'CRITICAL') {
    styles = 'bg-red-50 text-red-700 border border-red-200';
  } else if (norm === 'HIGH') {
    styles = 'bg-orange-50 text-orange-700 border border-orange-200';
  } else if (norm === 'MEDIUM') {
    styles = 'bg-yellow-50 text-yellow-700 border border-yellow-200';
  } else {
    styles = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-none border ${styles} ${className}`}>
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse flex-shrink-0" />
      )}
      {norm}
    </span>
  );
}

export default RiskBadge;
