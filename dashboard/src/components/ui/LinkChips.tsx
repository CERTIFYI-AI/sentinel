// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Shared affordances for the one-id-space rule: a record stores ids, and the
// display name is resolved at render time.
//
// Both halves of that rule need a component. `LinkChips` renders stored ids as
// navigable pills, and `ChipMultiSelect` is how those ids get chosen in a
// form. Before this existed each module hand-rolled both, which is how the
// privacy pages ended up pairing a names array against an ids array by index
// and mislabelling links whenever one side drifted.
//
// Two conventions are enforced here rather than left to each caller:
//   * an id that resolves to nothing renders "Unavailable", never a raw uuid;
//   * an empty list renders an em-dash, never 0 or a blank cell.

import React from 'react'

export interface LinkChipsProps {
  ids: string[]
  /** Resolve an id to its display name; undefined means "not found". */
  resolve: (id: string) => string | undefined
  /** Where the chip navigates. Omit to render non-interactive chips. */
  hrefFor?: (id: string) => string
  onNavigate?: (href: string) => void
  /** Show at most this many, then "+N". */
  max?: number
  emptyLabel?: string
}

export function LinkChips({
  ids, resolve, hrefFor, onNavigate, max = 2, emptyLabel = '—',
}: LinkChipsProps) {
  if (!ids?.length) {
    return <span className="text-xs text-[hsl(var(--text-4))]">{emptyLabel}</span>
  }
  const shown = ids.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((id) => {
        const name = resolve(id)
        if (!name) {
          // The id is stored but points at nothing the user can reach — say so
          // rather than printing a uuid the reader cannot act on.
          return (
            <span key={id}
              className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-4))]"
              title="This link points to a record that no longer exists or is not visible to you">
              Unavailable
            </span>
          )
        }
        if (!hrefFor || !onNavigate) {
          return (
            <span key={id} className="border border-[hsl(var(--border))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--text-3))]">
              {name}
            </span>
          )
        }
        return (
          <button key={id} type="button"
            className="border border-[hsl(var(--brand))/30] bg-[hsl(var(--brand-subtle))] px-1.5 py-0.5 text-[10px] text-[hsl(var(--brand))] hover:underline"
            onClick={(e) => { e.stopPropagation(); onNavigate(hrefFor(id)) }}>
            {name}
          </button>
        )
      })}
      {ids.length > shown.length && (
        <span className="text-[10px] text-[hsl(var(--text-4))]">+{ids.length - shown.length}</span>
      )}
    </div>
  )
}

/** A single stored id rendered as one chip — the scalar case of the above. */
export function LinkChip({ id, resolve, href, onNavigate, emptyLabel = '—' }: {
  id?: string | null
  resolve: (id: string) => string | undefined
  href?: (id: string) => string
  onNavigate?: (href: string) => void
  emptyLabel?: string
}) {
  if (!id) return <span className="text-xs text-[hsl(var(--text-4))]">{emptyLabel}</span>
  const name = resolve(id)
  if (!name) return <span className="text-xs text-[hsl(var(--text-4))]" title="Points to a record that no longer exists or is not visible to you">Unavailable</span>
  if (!href || !onNavigate) return <span className="text-xs text-[hsl(var(--text-2))]">{name}</span>
  return (
    <button type="button" className="text-xs text-[hsl(var(--brand))] hover:underline"
      onClick={(e) => { e.stopPropagation(); onNavigate(href(id)) }}>
      {name}
    </button>
  )
}

export interface ChipMultiSelectProps {
  options: { id: string; name: string }[]
  value: string[]
  onChange: (next: string[]) => void
  emptyMessage?: string
}

/** Toggle grid for choosing which entities a record links to. */
export function ChipMultiSelect({
  options, value, onChange, emptyMessage = 'Nothing available to link yet.',
}: ChipMultiSelectProps) {
  if (!options.length) {
    return <span className="text-xs text-[hsl(var(--text-4))]">{emptyMessage}</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.id)
        return (
          <button key={o.id} type="button" aria-pressed={on}
            onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
            className={`border px-2 py-1 text-[12px] ${on
              ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
              : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))] hover:border-[hsl(var(--brand))/50]'}`}>
            {o.name}
          </button>
        )
      })}
    </div>
  )
}
