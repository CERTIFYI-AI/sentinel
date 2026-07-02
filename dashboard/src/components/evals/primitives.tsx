// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Shared presentational primitives for Validation & Evals detail views.
// Tokens only (no raw palette / hex). Square corners inherited globally.

import React from 'react'
import { cn } from '@/lib/utils'
import { verdictClass, stateClass, riskClass } from '@/lib/evalsWorkflow'
import type {
  Verdict, WorkflowState, RiskTier, RegMapping, AuditEntry, RiskDimension,
} from '@/types/evals'

const chip = 'inline-flex items-center gap-1 border px-2 py-[2px] text-[11px] font-medium whitespace-nowrap'

export function VerdictBadge({ v, className }: { v: Verdict; className?: string }) {
  const { cls, label } = verdictClass(v)
  return <span className={cn(chip, cls, className)}>{label}</span>
}

export function StateBadge({ s, className }: { s: WorkflowState; className?: string }) {
  const { cls, label } = stateClass(s)
  return <span className={cn(chip, cls, className)}>{label}</span>
}

export function RiskBadge({ r, className }: { r: RiskTier; className?: string }) {
  const { cls, label } = riskClass(r)
  return <span className={cn(chip, cls, className)}>{label}</span>
}

/** Compact key/value stat used across summary strips. */
export function Stat({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">{label}</div>
      <div className={cn('text-sm text-[hsl(var(--text-1))] truncate', mono && 'font-mono')}>{value}</div>
    </div>
  )
}

/** Titled section wrapper (thin, table-dense enterprise look). */
export function Section({ title, right, children, className }: {
  title: string; right?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <section className={cn('border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-[hsl(var(--border))] px-3 py-2">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{title}</h3>
        {right}
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

/** Regulatory clause mapping table — reused by every module. */
export function RegMappingTable({ mappings }: { mappings: RegMapping[] }) {
  const tone: Record<RegMapping['status'], Verdict> = { satisfied: 'pass', partial: 'warn', missing: 'fail', na: 'na' }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
          <th className="py-2 pr-3 font-medium">Framework</th>
          <th className="py-2 pr-3 font-medium">Clause</th>
          <th className="py-2 pr-3 font-medium">Status</th>
          <th className="py-2 font-medium">Note</th>
        </tr>
      </thead>
      <tbody>
        {mappings.map((m, i) => (
          <tr key={i} className="border-t border-[hsl(var(--border))]">
            <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{m.framework}</td>
            <td className="py-2 pr-3 font-mono text-[hsl(var(--text-2))]">{m.clause}</td>
            <td className="py-2 pr-3"><VerdictBadge v={tone[m.status]} /></td>
            <td className="py-2 text-[hsl(var(--text-3))]">{m.note ?? (m.evidenceIds?.length ? `${m.evidenceIds.length} evidence` : '—')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Audit-trail timeline — appears last on every detail page. */
export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <ol className="space-y-0">
      {entries.map((e, i) => (
        <li key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--brand))]" />
            {i < entries.length - 1 && <span className="w-px flex-1 bg-[hsl(var(--border))]" />}
          </div>
          <div className="pb-4">
            <div className="text-sm text-[hsl(var(--text-1))]">
              <span className="font-medium">{e.actor}</span> {e.action}
            </div>
            {e.note && <div className="text-[13px] text-[hsl(var(--text-3))]">{e.note}</div>}
            <div className="font-mono text-[11px] text-[hsl(var(--text-4))]">{e.at}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Test-coverage matrix: rows = suites, cols = risk dimensions. */
export function CoverageMatrix({
  dims, rows,
}: { dims: RiskDimension[]; rows: { name: string; coverage: Partial<Record<RiskDimension, Verdict>> }[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
          <th className="py-2 pr-3 font-medium">Suite</th>
          {dims.map((d) => <th key={d} className="py-2 px-2 font-medium capitalize">{d}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-[hsl(var(--border))]">
            <td className="py-2 pr-3 text-[hsl(var(--text-1))]">{r.name}</td>
            {dims.map((d) => (
              <td key={d} className="py-2 px-2">
                {r.coverage[d] ? <VerdictBadge v={r.coverage[d]!} /> : <span className="text-[hsl(var(--text-4))]">—</span>}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Horizontal metric bar with a target marker (0..1 or 0..100 auto-scaled). */
export function MetricBar({ label, value, target, max = 1 }: { label: string; value: number; target?: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const ok = target === undefined || value >= target
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-[hsl(var(--text-2))]">{label}</span>
        <span className="font-mono text-[hsl(var(--text-1))]">{value.toFixed(2)}{target !== undefined && <span className="text-[hsl(var(--text-4))]"> / {target.toFixed(2)}</span>}</span>
      </div>
      <div className="relative h-2 w-full bg-[hsl(var(--bg-sunken))]">
        <div className={cn('h-2', ok ? 'bg-[hsl(var(--s-ok-tx))]' : 'bg-[hsl(var(--s-wn-tx))]')} style={{ width: `${pct}%` }} />
        {target !== undefined && <div className="absolute top-0 h-2 w-px bg-[hsl(var(--text-2))]" style={{ left: `${(target / max) * 100}%` }} />}
      </div>
    </div>
  )
}

/** Intersectional pass/warn/fail heatmap cell grid. */
export function Heatmap({
  cells, onCell,
}: { cells: { key: string; verdict: Verdict; caseRefs: string[] }[]; onCell?: (key: string) => void }) {
  const bg: Record<Verdict, string> = {
    pass: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
    warn: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
    fail: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
    na: 'bg-[hsl(var(--s-nt-bg))] text-[hsl(var(--s-nt-tx))]',
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {cells.map((c) => (
        <button
          key={c.key}
          onClick={() => onCell?.(c.key)}
          className={cn('flex flex-col items-start border border-[hsl(var(--border))] px-2 py-1.5 text-left', bg[c.verdict])}
        >
          <span className="text-[13px] font-medium">{c.key}</span>
          <span className="text-[11px] opacity-80">{c.caseRefs.length ? `${c.caseRefs.length} flagged case(s)` : 'within threshold'}</span>
        </button>
      ))}
    </div>
  )
}
