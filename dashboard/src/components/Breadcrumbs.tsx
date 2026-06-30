// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Breadcrumbs — single shared render surface for the unified breadcrumb system.
// Pass an explicit `trail` for full control, or omit it to derive the canonical
// route-aware trail from src/lib/breadcrumbs. All label/ID formatting and
// section→module alignment live in that config, never here.

import { Link } from 'react-router-dom'
import { CaretRight, House } from '@phosphor-icons/react'
import { type Crumb, useBreadcrumbs } from '@/lib/breadcrumbs'

interface BreadcrumbsProps {
  /** Explicit trail. When omitted, the trail is derived from the current route. */
  trail?: Crumb[]
  className?: string
}

export default function Breadcrumbs({ trail, className }: BreadcrumbsProps) {
  const auto = useBreadcrumbs()
  const crumbs = trail ?? auto
  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center flex-wrap gap-1.5 text-xs text-[hsl(var(--text-4))]">
        <li className="flex items-center">
          <Link
            to="/overview"
            aria-label="Home"
            className="flex items-center text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors"
          >
            <House size={14} />
          </Link>
        </li>

        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5" aria-current={isLast ? 'page' : undefined}>
              <CaretRight size={11} className="text-[hsl(var(--text-4))] shrink-0" aria-hidden />
              {isLast || !crumb.href ? (
                <span className={isLast ? 'text-[hsl(var(--text-2))] font-medium whitespace-nowrap' : 'text-[hsl(var(--text-4))] whitespace-nowrap'}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.href}
                  className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors whitespace-nowrap"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
