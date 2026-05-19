// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// FilterBar — unified search + filter controls for list views.

import React, { useRef, useEffect } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterField {
  key: string
  label: string
  options: FilterOption[]
  value?: string
  onChange: (value: string) => void
}

export interface FilterBarProps {
  /** Current search value */
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Array of filter dropdowns */
  filters?: FilterField[]
  /** Active filter count (for badge) */
  activeFilterCount?: number
  onClearAll?: () => void
  /** Trailing slot for custom actions (e.g. Export button) */
  trailing?: React.ReactNode
  className?: string
  /** Auto-focus the search input on mount */
  autoFocus?: boolean
}

/**
 * FilterBar — canonical search + filter bar for list/table pages.
 *
 * Usage:
 * ```tsx
 * <FilterBar
 *   search={search}
 *   onSearchChange={setSearch}
 *   searchPlaceholder="Search risks…"
 *   filters={[{ key: 'status', label: 'Status', options: [...], value, onChange }]}
 *   onClearAll={clearAll}
 *   trailing={<ExportButton />}
 * />
 * ```
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  activeFilterCount = 0,
  onClearAll,
  trailing,
  className,
  autoFocus,
}: FilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) searchRef.current?.focus()
  }, [autoFocus])

  const hasActive = activeFilterCount > 0 || search.length > 0

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 py-2',
        className,
      )}
      role="search"
      aria-label="Filter and search"
    >
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--text-4))] pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className={cn(
            'w-full h-9 pl-8 pr-8 text-sm rounded-md border',
            'border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]',
            'text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))]',
            'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))] focus:ring-offset-1',
            'transition-colors',
          )}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      {filters.map(f => (
        <div key={f.key} className="relative">
          <select
            value={f.value ?? ''}
            onChange={e => f.onChange(e.target.value)}
            aria-label={`Filter by ${f.label}`}
            className={cn(
              'h-9 pl-3 pr-7 text-sm rounded-md border appearance-none',
              'border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))]',
              'text-[hsl(var(--text-1))]',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))] focus:ring-offset-1',
              f.value ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand))]' : '',
            )}
          >
            <option value="">{f.label}: All</option>
            {f.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <SlidersHorizontal
            className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--text-4))] pointer-events-none"
            aria-hidden="true"
          />
        </div>
      ))}

      {/* Clear all */}
      {hasActive && onClearAll && (
        <button
          onClick={onClearAll}
          className={cn(
            'flex items-center gap-1 h-9 px-3 text-sm rounded-md',
            'text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]',
            'border border-[hsl(var(--border))] hover:border-[hsl(var(--border-mid))]',
            'transition-colors',
          )}
          aria-label="Clear all filters"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
          Clear
          {activeFilterCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] rounded-full bg-[hsl(var(--brand))] text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* Trailing slot */}
      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  )
}

export default FilterBar
