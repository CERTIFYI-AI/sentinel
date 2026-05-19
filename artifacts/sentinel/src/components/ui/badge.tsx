import React from 'react';
import { clsx } from 'clsx';

export type BadgeVariant =
  | 'healthy' | 'degraded' | 'critical' | 'unknown'
  | 'passing' | 'failing' | 'not_tested' | 'not_applicable'
  | 'open' | 'mitigated' | 'accepted' | 'closed'
  | 'draft' | 'active' | 'archived' | 'under_review'
  | 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  | 'low' | 'medium' | 'high';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<string, string> = {
  healthy:       "bg-primary/10 text-primary border border-primary/30",
  passing:       "bg-primary/10 text-primary border border-primary/30",
  active:        "bg-primary/10 text-primary border border-primary/30",
  mitigated:     "bg-primary/10 text-primary border border-primary/30",
  success:       "bg-primary/10 text-primary border border-primary/30",
  closed:        "bg-primary/10 text-primary border border-primary/30",
  degraded:      "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  warning:       "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  medium:        "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  under_review:  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  accepted:      "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  critical:      "bg-red-500/10 text-red-400 border border-red-500/30",
  failing:       "bg-red-500/10 text-red-400 border border-red-500/30",
  destructive:   "bg-red-500/10 text-red-400 border border-red-500/30",
  high:          "bg-red-500/10 text-red-400 border border-red-500/30",
  open:          "bg-red-500/10 text-red-400 border border-red-500/30",
  unknown:       "bg-zinc-500/10 text-muted-foreground border border-zinc-500/30",
  not_tested:    "bg-zinc-500/10 text-muted-foreground border border-zinc-500/30",
  not_applicable:"bg-zinc-500/10 text-muted-foreground border border-zinc-500/30",
  archived:      "bg-zinc-500/10 text-muted-foreground border border-zinc-500/30",
  draft:         "bg-zinc-500/10 text-muted-foreground border border-zinc-500/30",
  secondary:     "bg-zinc-500/10 text-muted-foreground border border-zinc-500/30",
  outline:       "bg-transparent text-muted-foreground border border-zinc-600",
  default:       "bg-primary/10 text-primary border border-primary/30",
  low:           "bg-blue-500/10 text-blue-400 border border-blue-500/30",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-1.5 py-0",
  md: "text-xs px-2 py-0.5",
};

const Badge = ({ variant = 'default', size = 'md', pulse = false, children, className, style }: BadgeProps) => (
  <span className={clsx(
    "inline-flex items-center gap-1 font-medium whitespace-nowrap rounded-sm",
    variantStyles[variant] ?? variantStyles.default,
    sizeStyles[size],
    className
  )} style={style}>
    {pulse && <span className="w-[6px] h-[6px] rounded-full bg-current animate-pulse-dot flex-shrink-0" />}
    {children}
  </span>
);

export { Badge };
export default Badge;
