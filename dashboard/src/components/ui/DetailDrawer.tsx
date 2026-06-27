// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// DetailDrawer — right-side slide-in drawer for record detail views.
// Contract: Summary | Activity | Linked | Comments tabs.
// Deep-linkable via ?drawer=<id> query param.

import React, { useEffect, useRef } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DetailDrawerTab {
  id: string
  label: string
  content: React.ReactNode
}

export interface DetailDrawerProps {
  /** Whether the drawer is open */
  open: boolean
  onClose: () => void
  /** Drawer title */
  title: string
  /** Optional subtitle or status badge */
  subtitle?: React.ReactNode
  /** Action buttons in the header (edit, archive, etc.) */
  actions?: React.ReactNode
  /** Tab definitions */
  tabs?: DetailDrawerTab[]
  /** Default tab id */
  defaultTab?: string
  /** Drawer width: 'md' = 600px, 'lg' = 800px */
  size?: 'md' | 'lg'
  /** Optional deep-link URL for "open full page" */
  fullPageHref?: string
  className?: string
}

/**
 * DetailDrawer — canonical right-side detail drawer.
 *
 * Features:
 * - Focus trap while open
 * - ESC to close
 * - Tabbed content (Summary, Activity, Linked, Comments)
 * - Backdrop click to close
 * - Deep-link via fullPageHref
 *
 * Usage:
 * ```tsx
 * <DetailDrawer
 *   open={!!selectedRisk}
 *   onClose={() => setSelectedRisk(null)}
 *   title={selectedRisk?.name ?? ''}
 *   subtitle={<Badge>{selectedRisk?.risk_level}</Badge>}
 *   tabs={[
 *     { id: 'summary', label: 'Summary', content: <RiskSummary /> },
 *     { id: 'activity', label: 'Activity', content: <AuditLog /> },
 *   ]}
 * />
 * ```
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  actions,
  tabs = [],
  defaultTab,
  size = 'md',
  fullPageHref,
  className,
}: DetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState(defaultTab ?? tabs[0]?.id ?? '')
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap + ESC handler
  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const el = drawerRef.current
        if (!el) return
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
          e.preventDefault()
          ;(e.shiftKey ? last : first).focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [open, onClose])

  // Sync active tab when tabs change
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  const widthClass = size === 'lg' ? 'w-full max-w-[800px]' : 'w-full max-w-[600px]'
  const activeContent = tabs.find(t => t.id === activeTab)?.content

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 flex flex-col',
          'bg-surface border-l border-[hsl(var(--border))]',
          'shadow-2xl transition-transform duration-200 ease-out',
          widthClass,
          open ? 'translate-x-0' : 'translate-x-full',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[hsl(var(--text-1))] truncate">
                {title}
              </h2>
              {fullPageHref && (
                <a
                  href={fullPageHref}
                  aria-label="Open full page"
                  title="Open full page"
                  className="shrink-0 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] transition-colors"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
            {subtitle && (
              <div className="mt-1 text-sm text-[hsl(var(--text-3))]">{subtitle}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {actions}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close drawer"
              className={cn(
                'p-1.5 rounded text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))]',
                'hover:bg-[hsl(var(--bg-muted))] transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand))]',
              )}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && (
          <div
            role="tablist"
            aria-label="Detail sections"
            className="flex border-b border-[hsl(var(--border))] px-4 shrink-0"
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={tab.id === activeTab}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none',
                  'focus:ring-2 focus:ring-inset focus:ring-[hsl(var(--brand))]',
                  tab.id === activeTab
                    ? 'border-[hsl(var(--brand))] text-[hsl(var(--brand))]'
                    : 'border-transparent text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="flex-1 overflow-y-auto p-4"
        >
          {open ? activeContent : null}
        </div>
      </div>
    </>
  )
}

export default DetailDrawer
