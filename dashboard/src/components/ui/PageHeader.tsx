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
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  badge?: React.ReactNode
  className?: string
  icon?: any
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
  description,
  breadcrumbs,
  actions,
  badge,
  className,
  icon: Icon,
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
        <nav aria-label="breadcrumb">
          <ol className="flex items-center flex-wrap gap-1.5 text-xs text-[hsl(var(--text-4))] mb-1">
            <li className="flex items-center">
              <a
                href="/overview"
                aria-label="Home"
                className="flex items-center text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M224,115.55V208a16,16,0,0,1-16,16H168a16,16,0,0,1-16-16V168a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8v40a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V115.55a16,16,0,0,1,5.17-11.78l80-75.48.11-.11a16,16,0,0,1,21.53,0,1.14,1.14,0,0,0,.11.11l80,75.48A16,16,0,0,1,224,115.55Z"></path></svg>
              </a>
            </li>
            {breadcrumbs
              .filter((crumb, i) => !(i === 0 && (crumb.label === 'Home' || crumb.label === 'Dashboard')))
              .map((crumb, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-[hsl(var(--text-4))] shrink-0" aria-hidden="true" />
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors whitespace-nowrap"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-[hsl(var(--text-2))] font-medium whitespace-nowrap">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
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
          {Icon && <Icon className="w-6 h-6 text-[hsl(var(--brand))]" />}
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

      {/* Subtitle / Description */}
      {(subtitle || description) && (
        <p className="text-sm text-[hsl(var(--text-3))] mt-0.5">{subtitle || description}</p>
      )}
    </header>
  )
}

export default PageHeader
