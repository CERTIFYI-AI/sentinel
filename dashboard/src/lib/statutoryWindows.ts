// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Statutory notification windows for regulator filings, keyed by the
// FILING_REGULATIONS vocabulary (regulatoryOpsService — mirrors the
// regulator_filings.regulation CHECK constraint). One source of truth so the
// agent-drafted filings, the incident-log Art. 73 prompt and the filing form
// all derive the same deadline instead of hardcoding hours in three places.
//
// These are the *initial* notification clocks. Several regimes are staged;
// where they are, the stage chosen as the default is documented per entry so
// an auditor can see the reasoning, and the staged windows are kept in
// `stagedNotes` for display.

export interface StatutoryWindow {
  /** Hours from the reference instant (incident detection, or now) to the initial notification deadline. */
  hours: number
  /** Short human label, e.g. "72h". */
  label: string
  /** Legal basis for the clock. */
  basis: string
  /** Staged-deadline commentary when the regime has more than one clock. */
  stagedNotes?: string
}

export const STATUTORY_WINDOWS: Record<string, StatutoryWindow> = {
  // EU AI Act Art. 73 is staged: 15 days for a serious incident, 10 days on
  // death of a person, and 2 days (48h) for a widespread infringement or a
  // serious incident affecting critical infrastructure. We default to 72h —
  // consistent with the existing Incident Log prompt — as a conservative
  // initial clock that keeps the team ahead of every staged deadline except
  // the 48h case, which the filing owner tightens manually when it applies.
  'EU-AI-Act-73': {
    hours: 72,
    label: '72h',
    basis: 'EU AI Act Art. 73 serious-incident reporting',
    stagedNotes: 'Staged: 15d serious incident · 10d death · 2d widespread infringement / critical infrastructure. 72h default keeps ahead of all but the 48h stage.',
  },
  // GDPR Art. 33: notify the supervisory authority without undue delay and,
  // where feasible, not later than 72 hours after becoming aware.
  'GDPR-33': {
    hours: 72,
    label: '72h',
    basis: 'GDPR Art. 33(1) breach notification to the supervisory authority',
  },
  // GDPR Art. 34 (communication to data subjects) is "without undue delay"
  // with no fixed clock; we mirror the Art. 33 72h window as the working SLA.
  'GDPR-34': {
    hours: 72,
    label: '72h',
    basis: 'GDPR Art. 34 communication to data subjects (working SLA; statute says "without undue delay")',
  },
  // NIS2 Art. 23 is staged: 24h early warning, 72h incident notification,
  // one-month final report. The 24h early warning is the first clock that
  // can be missed, so it is the default.
  NIS2: {
    hours: 24,
    label: '24h',
    basis: 'NIS2 Art. 23 early warning',
    stagedNotes: 'Staged: 24h early warning · 72h incident notification · 1 month final report. Default is the first clock (24h early warning).',
  },
  // DORA major ICT-incident reporting is staged (initial notification within
  // 4h of classification / no later than 24h from awareness, intermediate
  // 72h, final 1 month under the RTS). We take 24h from awareness as the
  // initial default since classification time is not tracked here.
  DORA: {
    hours: 24,
    label: '24h',
    basis: 'DORA Art. 19 initial notification (24h from awareness)',
    stagedNotes: 'Staged: 4h from classification / 24h from awareness initial · 72h intermediate · 1 month final. Default 24h from awareness.',
  },
  // SEC Form 8-K Item 1.05: four business days after materiality
  // determination — kept as the 96h used by the notify agent today.
  'SEC-1.05': {
    hours: 96,
    label: '4 business days',
    basis: 'SEC Form 8-K Item 1.05 material cybersecurity incident',
  },
  // FCA SUP 15.3 has no fixed statutory clock ("immediately"); 72h is the
  // working SLA already used by the regulator-notify templates.
  FCA: {
    hours: 72,
    label: '72h',
    basis: 'FCA SUP 15.3 notification (working SLA; rule says "immediately")',
  },
}

/** The statutory window for a FILING_REGULATIONS value, or null when the regime has no defined clock (PRA, Other). */
export function statutoryWindowFor(regulation: string): StatutoryWindow | null {
  return STATUTORY_WINDOWS[regulation] ?? null
}

/**
 * ISO deadline for a regulation counted from `from` (incident detection time
 * when known, else now). Null when the regime has no defined clock — callers
 * must not invent one.
 */
export function statutoryDeadline(regulation: string, from?: string | Date | null): string | null {
  const w = statutoryWindowFor(regulation)
  if (!w) return null
  const base = from ? new Date(from).getTime() : Date.now()
  if (Number.isNaN(base)) return null
  return new Date(base + w.hours * 3600 * 1000).toISOString()
}
