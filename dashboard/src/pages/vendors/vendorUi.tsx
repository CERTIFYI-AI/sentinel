// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Shared presentation helpers for the Vendors / TPRM cluster, so the six
// screens read as one product rather than six one-off styles.
//
// Two rules encoded here rather than repeated:
//   * `dash()` — a null metric renders an em-dash, never 0. "0 breaches" and
//     "never measured" are different facts and must look different.
//   * `resolveOrUnavailable()` — an id that cannot be resolved to a name shows
//     "Unavailable"; a raw uuid is never put in front of a user.

import React from 'react'
import { Link } from 'react-router-dom'
import { X } from '@phosphor-icons/react'

export const VENDOR_TIERS = ['critical', 'high', 'medium', 'low'] as const
export const VENDOR_CRITICALITIES = ['critical', 'high', 'moderate', 'low'] as const
export const DPA_STATUSES = ['signed', 'pending', 'not_signed', 'not_required'] as const

export type Tone = { bg: string; fg: string; br: string }

const TONE: Record<string, Tone> = {
  ok:   { bg: 'hsl(var(--s-ok-bg))', fg: 'hsl(var(--s-ok-tx))', br: 'hsl(var(--s-ok-br))' },
  warn: { bg: 'hsl(var(--s-wn-bg))', fg: 'hsl(var(--s-wn-tx))', br: 'hsl(var(--s-wn-br))' },
  err:  { bg: 'hsl(var(--s-er-bg))', fg: 'hsl(var(--s-er-tx))', br: 'hsl(var(--s-er-br))' },
  info: { bg: 'hsl(var(--s-in-bg))', fg: 'hsl(var(--s-in-tx))', br: 'hsl(var(--s-in-br))' },
  neutral: { bg: 'hsl(var(--s-nt-bg))', fg: 'hsl(var(--s-nt-tx))', br: 'hsl(var(--s-nt-br))' },
}

export function tone(name: keyof typeof TONE): Tone { return TONE[name] }

/** Tier tone. Unknown/absent tiers are NEUTRAL — never silently downgraded to
 *  a middle tier, which would hide a mis-tiered critical vendor. */
export function tierTone(tier?: string | null): Tone {
  switch (tier) {
    case 'critical': return TONE.err
    case 'high': return TONE.warn
    case 'medium': case 'moderate': return TONE.info
    case 'low': return TONE.ok
    default: return TONE.neutral
  }
}

export function tierLabel(tier?: string | null): string {
  if (!tier) return 'Untiered'
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

export function dpaTone(status?: string | null): Tone {
  switch (status) {
    case 'signed': return TONE.ok
    case 'pending': return TONE.warn
    case 'not_signed': return TONE.err
    case 'not_required': return TONE.neutral
    default: return TONE.neutral
  }
}

export function slaTone(status: string): Tone {
  switch (status) {
    case 'healthy': return TONE.ok
    case 'at_risk': return TONE.warn
    case 'breached': return TONE.err
    default: return TONE.neutral   // unmeasured
  }
}

export function assessmentTone(status: string): Tone {
  switch (status) {
    case 'approved': return TONE.ok
    case 'approved_with_conditions': return TONE.warn
    case 'rejected': case 'expired': return TONE.err
    case 'in_progress': case 'submitted': case 'under_review': return TONE.info
    default: return TONE.neutral   // draft
  }
}

export function docTone(status: string): Tone {
  switch (status) {
    case 'accepted': return TONE.ok
    case 'pending_review': return TONE.info
    case 'rejected': case 'expired': return TONE.err
    default: return TONE.neutral
  }
}

/** Null / undefined / NaN → em-dash. Never 0. */
export function dash(v: number | string | null | undefined, suffix = ''): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'number' && !Number.isFinite(v)) return '—'
  return `${v}${suffix}`
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const t = new Date(d)
  if (Number.isNaN(t.getTime())) return '—'
  return t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtMoney(amount?: number | null, currency?: string | null): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount}`
  }
}

export function daysUntil(d?: string | null): number | null {
  if (!d) return null
  const t = new Date(d).getTime()
  if (!Number.isFinite(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}

/** An id that does not resolve shows "Unavailable" — never the uuid itself. */
export function resolveOrUnavailable(id: string | null | undefined, names: Map<string, string>): string {
  if (!id) return 'Unavailable'
  return names.get(id) ?? 'Unavailable'
}

// ── shared bits of chrome ──────────────────────────────────────────────────

export function Pill({ tone: t, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border"
      style={{ background: t.bg, color: t.fg, borderColor: t.br }}
    >
      {children}
    </span>
  )
}

/** Pill-style deep link that carries context by uuid. */
export function LinkPill({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium border transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      style={{
        background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--brand))',
        borderColor: 'hsl(var(--border))', outlineColor: 'hsl(var(--brand))',
      }}
    >
      {children}
    </Link>
  )
}

/**
 * Dismissible chip announcing an active deep-link filter (?vendor=, ?model=).
 * Dismissing removes the param, which is the only thing that clears the
 * filter — so what the user sees and what the URL says can never diverge.
 */
export function FilterChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border"
      style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderColor: 'hsl(var(--s-in-br))' }}
    >
      <span className="uppercase tracking-wider text-[10px] font-semibold opacity-80">{label}</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label} filter`}
        className="inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
        style={{ outlineColor: 'hsl(var(--s-in-tx))' }}
      >
        <X size={12} weight="bold" />
      </button>
    </div>
  )
}

/** Small labelled fact. Renders '—' when the value is absent. */
export function Fact({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>
        {label}
      </p>
      <div className="mt-1 text-sm" style={{ color: 'hsl(var(--text-1))' }}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </div>
      {hint && <p className="mt-0.5 text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>{hint}</p>}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{children}</h2>
      {action}
    </div>
  )
}
