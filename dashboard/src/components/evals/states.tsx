// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Consistent loading / empty / error states for Validation & Evals views.

import React from 'react'
import { Warning, Plus, ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="h-8 flex-1 bg-[hsl(var(--bg-sunken))]" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ title, message, actionLabel, onAction }: {
  title: string; message?: string; actionLabel?: string; onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-[hsl(var(--border))] py-12 text-center">
      <div className="text-sm font-medium text-[hsl(var(--text-1))]">{title}</div>
      {message && <p className="max-w-sm text-[13px] text-[hsl(var(--text-3))]">{message}</p>}
      {actionLabel && onAction && (
        <Button size="sm" icon={<Plus />} onClick={onAction} className="mt-2">{actionLabel}</Button>
      )}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 border border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))] py-10 text-center">
      <Warning size={20} className="text-[hsl(var(--s-er-tx))]" />
      <div className="text-sm font-medium text-[hsl(var(--s-er-tx))]">Something went wrong</div>
      <p className="max-w-sm text-[13px] text-[hsl(var(--text-3))]">{message ?? 'Failed to load records.'}</p>
      <div className="mt-2 flex items-center gap-2">
        {onRetry && <Button size="sm" variant="secondary" icon={<ArrowClockwise />} onClick={onRetry}>Retry</Button>}
        <a href="mailto:support@certifyi.ai" className="text-[13px] text-[hsl(var(--brand))] hover:underline">Contact support</a>
      </div>
    </div>
  )
}
