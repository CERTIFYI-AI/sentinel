// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// StatCardRow — consistent KPI row. Max 4 cards per row.
// Wraps StatCard with responsive grid and enforces aria-labels.

import React from 'react'
import { cn } from '@/lib/utils'

export interface StatCardRowItem {
  label: string
  value: React.ReactNode
  delta?: string
  deltaDir?: 'up' | 'down'
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'error' | 'warn' | 'ok' | 'info'
  isPositiveUp?: boolean
  icon?: React.ReactNode
  /** href makes the card a navigation affordance */
  href?: string
  /** Used for aria-label: e.g. "Open Tasks: 14, up 3% this week" */
  description?: string
}

export interface StatCardRowProps {
  cards: StatCardRowItem[]
  className?: string
  loading?: boolean
}

/**
 * StatCardRow — renders up to 4 KPI stat cards in a consistent grid.
 *
 * Usage:
 * ```tsx
 * <StatCardRow cards={[
 *   { label: 'Open Risks', value: 42, delta: '+3', deltaDir: 'up', isPositiveUp: false },
 *   { label: 'Controls', value: '84%', delta: '+2%', deltaDir: 'up', isPositiveUp: true },
 * ]} />
 * ```
 */
export function StatCardRow({ cards, className, loading = false }: StatCardRowProps) {
  const capped = cards.slice(0, 4)

  return (
    <div
      className={cn(
        'grid gap-4',
        capped.length === 1 && 'grid-cols-1',
        capped.length === 2 && 'grid-cols-1 sm:grid-cols-2',
        capped.length === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        capped.length >= 4 && 'grid-cols-2 lg:grid-cols-4',
        className,
      )}
      aria-label="Key performance indicators"
    >
      {loading
        ? capped.map((_, i) => <StatCardSkeleton key={i} />)
        : capped.map((card, i) => (
            <StatCardItem key={i} {...card} />
          ))}
    </div>
  )
}

function StatCardItem({
  label,
  value,
  delta,
  deltaDir,
  isPositiveUp = true,
  icon,
  href,
  description,
}: StatCardRowItem) {
  const isUp = deltaDir === 'up'
  const isPositive = isPositiveUp ? isUp : !isUp
  const deltaColor = isPositive
    ? 'text-[hsl(var(--s-ok-tx))]'
    : 'text-[hsl(var(--s-er-tx))]'
  const deltaArrow = isUp ? '▲' : '▼'

  const ariaLabel = description
    ?? `${label}: ${String(value)}${delta ? `, ${deltaArrow} ${delta}` : ''}`

  const inner = (
    <div
      className={cn(
        'flex flex-col gap-2 p-4 rounded-lg border',
        'border-[hsl(var(--border))] bg-surface',
        'shadow-sm hover:shadow-md transition-shadow duration-150',
        'border-l-4 border-l-[hsl(var(--brand))]',
        href && 'cursor-pointer',
      )}
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[hsl(var(--text-3))] uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <span className="text-[hsl(var(--text-4))]" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold text-[hsl(var(--text-1))]">
          {value}
        </span>
        {delta && (
          <span className={cn('text-xs font-medium', deltaColor)}>
            {deltaArrow} {delta}
          </span>
        )}
      </div>
    </div>
  )

  return href ? (
    <a href={href} className="block no-underline">
      {inner}
    </a>
  ) : (
    inner
  )
}

function StatCardSkeleton() {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-4 rounded-lg border',
        'border-[hsl(var(--border))] bg-surface',
        'border-l-4 border-l-[hsl(var(--bg-muted))]',
      )}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-3 w-20 rounded animate-pulse bg-[hsl(var(--bg-muted))]" />
      <div className="h-8 w-16 rounded animate-pulse bg-[hsl(var(--bg-muted))]" />
    </div>
  )
}

export default StatCardRow
