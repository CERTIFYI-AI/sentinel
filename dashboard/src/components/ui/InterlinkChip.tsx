import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowSquareOut } from '@phosphor-icons/react';

export interface InterlinkChipProps {
  label: string;
  to: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function InterlinkChip({ label, to, className = '', onClick }: InterlinkChipProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-2 py-0.5 font-medium rounded-none border border-slate-200 transition-colors ${className}`}
    >
      <span>{label}</span>
      <ArrowSquareOut size={12} weight="duotone" className="flex-shrink-0" />
    </Link>
  );
}

export default InterlinkChip;
