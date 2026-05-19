// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// PageHeader — enterprise-grade page header component.
// Every route must use this instead of bespoke h1/header elements.

import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  icon?: React.ReactNode
  disabled?: boolean
  loading?: boolean
}

export interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  badge?: React.ReactNode
  className?: string
  /** Render a back-navigation affordance */
  onBack?: () => void
}

/**
 * PageHeader — canonical top-of-page header.
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Risk Register"
 *   subtitle="Manage and track all identified risks"
 *   breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Risk' }]}
 *   actions={<Button>Add Risk</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  className,
  onBack,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-1 pb-4 border-b border-[hsl(var(--border))] mb-6',
        className,
      )}
      aria-labelledby="page-title"
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-1">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight
                  className="w-3 h-3 text-[hsl(var(--text-4))]"
                  aria-hidden="true"
                />
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-xs text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-xs text-[hsl(var(--text-3))]">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="rounded p-1 hover:bg-[hsl(var(--bg-surface))] transition-colors text-[hsl(var(--text-3))]"
            >
              <ChevronRight className="w-4 h-4 rotate-180" aria-hidden="true" />
            </button>
          )}
          <h1
            id="page-title"
            className="text-xl font-semibold text-[hsl(var(--text-1))] truncate"
          >
            {title}
          </h1>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">{subtitle}</p>
      )}
    </header>
  )
}

export default PageHeader
