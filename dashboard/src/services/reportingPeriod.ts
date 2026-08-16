// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Reporting-period ordering, shared by the Sustainability & ESG cluster.
//
// WHY. Rows arrive `created_at desc`, so every trend line, ▲/▼ delta and
// "latest vs prior" comparison in this cluster was computed over an arbitrary
// order — the Carbon Ledger's month-on-month arrow compared two unrelated
// quarters, and the ESG radar compared whichever two rows happened to be
// first. Periods are strings in several spellings ('2026-Q1', 'Q1 2026',
// '2026-03', '2026'), so ordering needs one parser everyone uses.
//
// A period that cannot be placed in time returns NaN. Callers must EXCLUDE
// those from time series rather than slot them in at an arbitrary position.

/** Sortable epoch-ms key for a reporting period; NaN when unplaceable. */
export function periodSortKey(period: string | null | undefined, periodStart?: string | null): number {
  if (periodStart) {
    const t = Date.parse(periodStart)
    if (!Number.isNaN(t)) return t
  }
  if (!period) return Number.NaN
  const p = period.trim()
  let m = p.match(/^(\d{4})\s*[-–\s]?\s*Q([1-4])$/i)
  if (m) return Date.UTC(Number(m[1]), (Number(m[2]) - 1) * 3, 1)
  m = p.match(/^Q([1-4])\s*[-–\s]?\s*(\d{4})$/i)
  if (m) return Date.UTC(Number(m[2]), (Number(m[1]) - 1) * 3, 1)
  m = p.match(/^(\d{4})\s*[-–\s]?\s*(\d{2})$/)
  if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)
  m = p.match(/^(\d{4})(?:\s+annual)?$/i)
  if (m) return Date.UTC(Number(m[1]), 0, 1)
  const t = Date.parse(p)
  return Number.isNaN(t) ? Number.NaN : t
}

/** Newest first, unplaceable periods last. */
export function comparePeriodsDesc(
  a: { period?: string | null; periodStart?: string | null },
  b: { period?: string | null; periodStart?: string | null },
): number {
  const ka = periodSortKey(a.period, a.periodStart)
  const kb = periodSortKey(b.period, b.periodStart)
  if (Number.isNaN(ka) && Number.isNaN(kb)) return 0
  if (Number.isNaN(ka)) return 1
  if (Number.isNaN(kb)) return -1
  return kb - ka
}
