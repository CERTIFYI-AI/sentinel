// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// FormDialog — generic create/update modal wrapper. Owns the Save/Cancel
// footer, busy state and submit plumbing so module forms only render fields.

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel?: string
  busy?: boolean
  disabled?: boolean
  onSubmit: () => void
  children: React.ReactNode
}

export function FormDialog({
  open, onOpenChange, title, description, submitLabel = 'Save',
  busy, disabled, onSubmit, children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!disabled && !busy) onSubmit() }}
          className="space-y-4"
        >
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">{children}</div>
          <DialogFooter>
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={disabled || busy} loading={busy}>{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Labelled field wrapper for consistent form rows. */
export function Field({ label, htmlFor, required, hint, children }: {
  label: string; htmlFor?: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[hsl(var(--text-2))]">
        {label}{required && <span className="text-[hsl(var(--s-er-tx))]"> *</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[hsl(var(--text-4))]">{hint}</p>}
    </div>
  )
}

export default FormDialog
