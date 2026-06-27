// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// ChartContainer — wraps any Recharts/chart component with:
//   - Title + subtitle header
//   - Export to PNG/CSV via menu
//   - Date range picker slot
//   - Loading skeleton + error state
//   - Responsive wrapper

import React, { useRef } from 'react'
import { Download, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ChartContainerProps {
  title: string
  subtitle?: string
  /** The chart component to render */
  children: React.ReactNode
  /** Show loading skeleton */
  loading?: boolean
  /** Show error state */
  error?: string | null
  /** Retry handler for error state */
  onRetry?: () => void
  /** Extra controls (e.g. date range picker) */
  controls?: React.ReactNode
  /** Height of the chart area in px */
  height?: number
  /** Export CSV callback — if provided, shows export button */
  onExportCsv?: () => void
  className?: string
}

/**
 * ChartContainer — wraps any chart with standard enterprise chrome.
 *
 * Usage:
 * ```tsx
 * <ChartContainer title="Risk Trend" subtitle="Last 30 days" onExportCsv={handleExport}>
 *   <ResponsiveContainer width="100%" height={300}>
 *     <LineChart data={data}>...</LineChart>
 *   </ResponsiveContainer>
 * </ChartContainer>
 * ```
 */
export function ChartContainer({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  onRetry,
  controls,
  height = 280,
  onExportCsv,
  className,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleExportPng = async () => {
    try {
      const el = containerRef.current
      if (!el) return
      // Dynamic import to keep bundle lean
      const html2canvas = ((await import('html2canvas' as string)) as any).default
      const canvas = await html2canvas(el)
      const link = document.createElement('a')
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // html2canvas not available — silently skip
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[hsl(var(--border))] bg-surface',
        'shadow-sm hover:shadow-md transition-shadow duration-150',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{title}</h3>
          {subtitle && (
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {controls}
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              aria-label="Export CSV"
              title="Export CSV"
              className="p-1.5 rounded text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] hover:bg-[hsl(var(--bg-muted))] transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div
        ref={containerRef}
        className="px-2 pb-4"
        style={{ height: loading || error ? undefined : height }}
      >
        {loading ? (
          <ChartSkeleton height={height} />
        ) : error ? (
          <ChartError message={error} onRetry={onRetry} height={height} />
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="flex items-end gap-2 px-2"
      style={{ height }}
      aria-label="Loading chart"
      aria-busy="true"
    >
      {[40, 65, 50, 80, 45, 70, 55, 90, 60, 75].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t animate-pulse bg-[hsl(var(--bg-muted))]"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

function ChartError({
  message,
  onRetry,
  height,
}: {
  message: string
  onRetry?: () => void
  height: number
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-center"
      style={{ height }}
      role="alert"
    >
      <AlertCircle
        className="w-8 h-8 text-[hsl(var(--s-er-tx))]"
        aria-hidden="true"
      />
      <p className="text-sm text-[hsl(var(--text-3))]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-muted))] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  )
}

export default ChartContainer
