// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Governance state machine + segregation-of-duties for Validation & Evals.
// Shared by validation runs, explainability profiles, bias audits and
// remediation plans. Approval is gated on role AND 4-eyes (the approver must
// not be the last editor) — SR 11-7 "effective challenge" / independence.

import type { WorkflowState, Verdict, RiskTier } from '../types/evals'

/** Allowed forward/back transitions per workflow state. */
export const TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  Draft: ['InReview'],
  InReview: ['Approved', 'CondApproved', 'Rejected', 'Draft'],
  CondApproved: ['Approved', 'Rejected', 'InReview'], // conditions cleared → Approved
  Approved: [], // terminal — a new version starts a new run
  Rejected: ['Draft'],
}

export const APPROVAL_STATES: WorkflowState[] = ['Approved', 'CondApproved', 'Rejected']

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/** Roles allowed to edit vs approve each resource (segregation of duties). */
export const SOD_RULES: Record<string, { edit: string[]; approve: string[] }> = {
  validation_run: { edit: ['builder', 'validator', 'contributor'], approve: ['approver', 'compliance_officer', 'risk_manager'] },
  bias_audit: { edit: ['builder', 'validator', 'contributor'], approve: ['approver', 'compliance_officer'] },
  explainability_profile: { edit: ['builder', 'contributor'], approve: ['validator', 'compliance_officer'] },
  bias_remediation_plan: { edit: ['builder', 'validator', 'contributor'], approve: ['risk_manager', 'approver'] },
}

/** 4-eyes check: approving role AND actor ≠ last editor. `admin` bypasses role, not 4-eyes. */
export function canApprove(resource: string, role: string, actorId: string, lastEditorId?: string): boolean {
  const rule = SOD_RULES[resource]
  if (!rule) return false
  const roleOk = role === 'admin' || rule.approve.includes(role)
  const independent = !lastEditorId || actorId !== lastEditorId
  return roleOk && independent
}

// ── Token helpers ───────────────────────────────────────────────────────────
// Return complete Tailwind class literals so the JIT compiler detects them.
// Readable-badge rule: subtle *-bg background + strong *-tx text (never same).

export function verdictClass(v: Verdict): { cls: string; label: string } {
  switch (v) {
    case 'pass': return { cls: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]', label: 'Pass' }
    case 'warn': return { cls: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]', label: 'Warn' }
    case 'fail': return { cls: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]', label: 'Fail' }
    default: return { cls: 'bg-[hsl(var(--s-nt-bg))] text-[hsl(var(--s-nt-tx))] border-[hsl(var(--s-nt-br))]', label: 'N/A' }
  }
}

export function stateClass(s: WorkflowState): { cls: string; label: string } {
  switch (s) {
    case 'Approved': return { cls: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]', label: 'Approved' }
    case 'CondApproved': return { cls: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]', label: 'Conditional' }
    case 'InReview': return { cls: 'bg-[hsl(var(--s-in-bg))] text-[hsl(var(--s-in-tx))] border-[hsl(var(--s-in-br))]', label: 'In Review' }
    case 'Rejected': return { cls: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]', label: 'Rejected' }
    default: return { cls: 'bg-[hsl(var(--s-nt-bg))] text-[hsl(var(--s-nt-tx))] border-[hsl(var(--s-nt-br))]', label: 'Draft' }
  }
}

export function riskClass(r: RiskTier): { cls: string; label: string } {
  switch (r) {
    case 'critical': return { cls: 'bg-[hsl(var(--r-cr-bg))] text-[hsl(var(--r-cr-tx))] border-[hsl(var(--r-cr-br))]', label: 'Critical' }
    case 'high': return { cls: 'bg-[hsl(var(--r-hi-bg))] text-[hsl(var(--r-hi-tx))] border-[hsl(var(--r-hi-br))]', label: 'High' }
    case 'medium': return { cls: 'bg-[hsl(var(--r-md-bg))] text-[hsl(var(--r-md-tx))] border-[hsl(var(--r-md-br))]', label: 'Medium' }
    default: return { cls: 'bg-[hsl(var(--r-lo-bg))] text-[hsl(var(--r-lo-tx))] border-[hsl(var(--r-lo-br))]', label: 'Low' }
  }
}
