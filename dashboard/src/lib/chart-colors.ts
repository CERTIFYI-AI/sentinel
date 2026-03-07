// src/lib/chart-colors.ts
export const chartColors = {
  brand: "hsl(var(--brand))",
  brandSubtle: "hsl(var(--brand-subtle))",
  trustHigh: "hsl(var(--trust-high))",
  trustMedium: "hsl(var(--trust-medium))",
  trustLow: "hsl(var(--trust-low))",
  interventionNone: "hsl(var(--intervention-none))",
  interventionRegen: "hsl(var(--intervention-regen))",
  interventionUpgrade: "hsl(var(--intervention-upgrade))",
  interventionHitl: "hsl(var(--intervention-hitl))",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
} as const;

export function trustScoreColor(score: number): string {
  if (score >= 0.85) return chartColors.trustHigh;
  if (score >= 0.70) return chartColors.trustMedium;
  return chartColors.trustLow;
}

export function trustScoreClass(score: number): string {
  if (score >= 0.85) return "text-[hsl(var(--trust-high))]";
  if (score >= 0.70) return "text-[hsl(var(--trust-medium))]";
  return "text-[hsl(var(--trust-low))]";
}
export const CHART_COLORS = chartColors;
