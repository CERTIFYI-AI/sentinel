// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-12 — Row color escalation: red-50 if overdue, amber-50 if <24h remaining.
export function remediationRowClass(dueDate: string | null | undefined, status?: string): string {
  if (!dueDate || status === 'COMPLETED' || status === 'CLOSED') return ''
  const now = Date.now()
  const due = new Date(dueDate).getTime()
  const remainingMs = due - now
  if (remainingMs < 0) return 'bg-red-50 border-l-2 border-red-400'
  if (remainingMs < 86_400_000) return 'bg-amber-50 border-l-2 border-amber-400'
  return ''
}
