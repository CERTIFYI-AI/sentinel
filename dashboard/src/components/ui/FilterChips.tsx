// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// FilterChips — faceted, dismissible active filters.
//
// The platform's FilterBar shows a COUNT ("3 filters") but not WHICH three.
// An enterprise operator scanning a governance table needs to see, and remove,
// each facet individually — `Status: Active ×`, `Severity: High ×` — without
// opening a panel to remember what they set. This renders exactly that, plus a
// "Clear all" once more than one facet is active.
//
// It renders nothing when no facet is active, so a page can mount it
// unconditionally under its search bar without leaving an empty row.

import { X } from '@phosphor-icons/react'

export interface ActiveFacet {
  /** Stable key, e.g. 'status' — used for removal and React keys. */
  key: string
  /** Facet name shown before the colon, e.g. 'Status'. */
  label: string
  /** The chosen value shown after the colon, e.g. 'Active'. */
  value: string
}

/**
 * Derive the active facets from a filter state object.
 *
 * A facet is active when its value is set and is not the sentinel that means
 * "no filter" (empty string, or an explicit `allValue` like 'all'). Pure, so
 * a page's chip row is a function of its filter state and cannot drift from it.
 */
export function deriveFacets(
  state: Record<string, string | null | undefined>,
  labels: Record<string, string>,
  allValue = 'all',
): ActiveFacet[] {
  const facets: ActiveFacet[] = []
  for (const [key, raw] of Object.entries(state)) {
    const value = (raw ?? '').trim()
    if (!value || value === allValue) continue
    facets.push({ key, label: labels[key] ?? key, value })
  }
  return facets
}

export function FilterChips({
  facets,
  onRemove,
  onClearAll,
}: {
  facets: ActiveFacet[]
  onRemove: (key: string) => void
  onClearAll?: () => void
}) {
  if (facets.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Active filters">
      {facets.map(f => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1 border border-[hsl(var(--border))] bg-raised px-2 py-0.5 text-[11px] text-[hsl(var(--text-2))]"
        >
          <span className="text-[hsl(var(--text-4))]">{f.label}:</span>
          <span className="font-medium">{f.value}</span>
          <button
            type="button"
            onClick={() => onRemove(f.key)}
            aria-label={`Remove ${f.label} filter`}
            className="ml-0.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]"
          >
            <X size={11} weight="bold" />
          </button>
        </span>
      ))}
      {onClearAll && facets.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-[hsl(var(--text-4))] underline-offset-2 hover:text-[hsl(var(--text-2))] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
