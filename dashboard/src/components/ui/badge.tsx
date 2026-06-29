// dashboard/src/components/ui/Badge.tsx
import React from "react";
import { clsx } from "clsx";

type BadgeVariant = "healthy"|"degraded"|"critical"|"none"|"regen"|"upgrade"|"hitl"|"blocked"|"closed"|"halfopen"|"open"|"mandatory"|"certifiable"|"voluntary"|"policy"|"technical"|"active"|"inactive"|"error"|"pending"|"revoked"|"soon"|"high"|"medium"|"low"|"admin"|"reviewer"|"api"|"connected"|"disconnected";
type BadgeSize = "sm"|"md"|"lg";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  healthy: "bg-[hsl(var(--trust-high-bg))] text-[hsl(var(--trust-high))] border border-[hsl(var(--trust-high))]",
  degraded: "bg-[hsl(var(--trust-medium-bg))] text-[hsl(var(--trust-medium))] border border-[hsl(var(--trust-medium))]",
  critical: "bg-[hsl(var(--trust-low-bg))] text-[hsl(var(--trust-low))] border border-[hsl(var(--trust-low))]",
  none: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border border-[hsl(var(--tag-zinc-border))]",
  regen: "bg-[hsl(var(--info-bg))] text-[hsl(var(--int-regen))] border border-[hsl(var(--int-regen))]",
  upgrade: "bg-[hsl(var(--warning-bg))] text-[hsl(var(--int-upgrade))] border border-[hsl(var(--int-upgrade))]",
  hitl: "bg-[hsl(var(--trust-low-bg))] text-[hsl(var(--int-hitl))] border border-[hsl(var(--int-hitl))]",
  blocked: "bg-[hsl(var(--tag-purple-bg))] text-[hsl(var(--int-blocked))] border border-[hsl(var(--int-blocked))]",
  closed: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border border-[hsl(var(--success))]",
  halfopen: "bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning))] border border-[hsl(var(--warning))]",
  open: "bg-[hsl(var(--trust-low-bg))] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))]",
  mandatory: "bg-[hsl(var(--tag-red-bg))] text-[hsl(var(--tag-red))] border border-[hsl(var(--tag-red-border))]",
  certifiable: "bg-[hsl(var(--tag-blue-bg))] text-[hsl(var(--tag-blue))] border border-[hsl(var(--tag-blue-border))]",
  voluntary: "bg-[hsl(var(--tag-green-bg))] text-[hsl(var(--tag-green))] border border-[hsl(var(--tag-green-border))]",
  policy: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border border-[hsl(var(--tag-zinc-border))]",
  technical: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border border-[hsl(var(--tag-zinc-border))]",
  active: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border border-[hsl(var(--success))]",
  inactive: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border border-[hsl(var(--tag-zinc-border))]",
  error: "bg-[hsl(var(--destructive-bg))] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))]",
  pending: "bg-[hsl(var(--info-bg))] text-[hsl(var(--info))] border border-[hsl(var(--info))]",
  revoked: "bg-[hsl(var(--destructive-bg))] text-[hsl(var(--destructive))] border border-[hsl(var(--destructive))] line-through",
  soon: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))]/70 border border-[hsl(var(--tag-zinc-border))]",
  high: "bg-[hsl(var(--tag-red-bg))] text-[hsl(var(--tag-red))] border border-[hsl(var(--tag-red-border))]",
  medium: "bg-[hsl(var(--tag-amber-bg))] text-[hsl(var(--tag-amber))] border border-[hsl(var(--tag-amber-border))]",
  low: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border border-[hsl(var(--tag-zinc-border))]",
  admin: "bg-[hsl(var(--tag-green-bg))] text-[hsl(var(--tag-green))] border border-[hsl(var(--tag-green-border))]",
  reviewer: "bg-[hsl(var(--tag-blue-bg))] text-[hsl(var(--tag-blue))] border border-[hsl(var(--tag-blue-border))]",
  api: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border border-[hsl(var(--tag-zinc-border))]",
  connected: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border border-[hsl(var(--success))]",
  disconnected: "bg-[hsl(var(--tag-zinc-bg))] text-[hsl(var(--tag-zinc))] border border-[hsl(var(--tag-zinc-border))]",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-[6px] py-[1px] rounded-[3px]",
  md: "text-[11px] px-2 py-[2px] rounded-[4px]",
  lg: "text-[12px] px-[10px] py-[3px] rounded-[4px]",
};

export function trustBadgeVariant(score: number): BadgeVariant {
  if (score >= 0.85) return "healthy";
  if (score >= 0.70) return "degraded";
  return "critical";
}

export function Badge({ variant="none", size="md", children, pulse=false, className }: BadgeProps) {
  return (
    <span className={clsx("inline-flex items-center gap-1 font-medium whitespace-nowrap", variantStyles[variant], sizeStyles[size], className)}>
      {pulse && <span className="w-[6px] h-[6px] rounded-full bg-current animate-pulse-dot flex-shrink-0" />}
      {children}
    </span>
  );
}

export default Badge;
