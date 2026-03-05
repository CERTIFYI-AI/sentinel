// Recharts requires raw color strings, not Tailwind classes.
// These read CSS custom properties at runtime so theme switching works.
export const chartColors = {
  trustHigh: "hsl(var(--trust-high))",
  trustMedium: "hsl(var(--trust-medium))",
  trustLow: "hsl(var(--trust-low))",
  interventionNone: "hsl(var(--intervention-none))",
  interventionRegen: "hsl(var(--intervention-regen))",
  interventionUpgrade: "hsl(var(--intervention-upgrade))",
  interventionHitl: "hsl(var(--intervention-hitl))",
  muted: "hsl(var(--muted-foreground))",
  primary: "hsl(var(--primary))",
  background: "hsl(var(--background))",
} as const;

export function trustScoreColor(score: number): string {
  if (score >= 0.85) return chartColors.trustHigh;
  if (score >= 0.70) return chartColors.trustMedium;
  return chartColors.trustLow;
}

export function trustScoreClass(score: number): string {
  if (score >= 0.85) return "text-green-500";
  if (score >= 0.70) return "text-amber-500";
  return "text-red-500";
}