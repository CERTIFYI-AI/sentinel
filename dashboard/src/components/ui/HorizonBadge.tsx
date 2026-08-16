// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Shared regulatory-horizon primitives, extracted from RegRadar /
// RegulatoryVelocity / RegDetail so the three lenses on the same
// regulation_entries register render deadlines and obligation statuses
// identically. The countdown is computed at render time via daysUntil() —
// never stored.

import { daysUntil } from '@/services/riskGroupService'

/**
 * Days-until-effective badge for a regulation entry.
 * `compact` renders "42d" instead of "42d until effective" (dense lists).
 */
export function HorizonBadge({ effectiveOn, compact = false }: { effectiveOn?: string | null; compact?: boolean }) {
  const d = daysUntil(effectiveOn)
  const suffix = compact ? '' : ' until effective'
  if (d == null) return <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">No date set</span>
  if (d < 0) return <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]">In force</span>
  if (d <= 90) return <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--s-er-bg))] text-[hsl(var(--destructive))] font-semibold">{d}d{suffix}</span>
  return <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{d}d{suffix}</span>
}

/** Obligation-status pill styles (mapped/unmapped/partial/exempt) shared across the regulatory pages. */
export const OB_STYLE: Record<string, React.CSSProperties> = {
  mapped:   { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  unmapped: { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  partial:  { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  exempt:   { background: 'hsl(220 13% 50% / 0.12)', color: 'hsl(var(--text-4))' },
}

export const obStyle = (s?: string): React.CSSProperties =>
  OB_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }
