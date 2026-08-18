// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// CSV export — the safe kind.
//
// Two hazards this handles that a naive `rows.map(r => r.join(',')).join('\n')`
// does not:
//
//   1. Quoting. A cell containing a comma, a quote or a newline must be
//      double-quoted with its quotes doubled, or the file is corrupt the
//      moment any free-text field (a risk description, a remediation note)
//      contains punctuation.
//
//   2. Formula injection (CWE-1236). A cell whose text begins with = + - @,
//      or a tab/carriage-return, is interpreted as a FORMULA by Excel and
//      Google Sheets when the file is opened — `=cmd|...`, `=HYPERLINK(...)`,
//      data-exfiltration via `=WEBSERVICE(...)`. A governance platform whose
//      "Export CSV" hands an auditor a spreadsheet that runs an attacker's
//      formula is exactly the failure it exists to prevent. Every such cell is
//      prefixed with a single quote, which neutralises the formula while
//      displaying the original text.
//
// The value is escaped for injection FIRST, then quoted — so the guarding
// quote is itself inside the CSV quoting and survives round-trips.

/** Columns to export: a header and how to pull the cell from a row. */
export interface CsvColumn<T> {
  header: string
  value: (row: T) => unknown
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/

/** Render one cell: neutralise a leading formula trigger, then CSV-quote. */
export function csvCell(raw: unknown): string {
  // null / undefined become an empty cell, never the strings "null"/"undefined".
  let s = raw === null || raw === undefined ? '' : String(raw)

  // Injection guard. Prefix, don't strip — the operator asked to export this
  // text and is entitled to see it; we only stop the spreadsheet executing it.
  if (FORMULA_TRIGGER.test(s)) s = `'${s}`

  // Quote if the cell contains a comma, quote, or any newline.
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * Serialise rows to a CSV string with a header line.
 *
 * A BOM is prepended so Excel opens UTF-8 correctly (an é or a — in a policy
 * title survives), and rows are joined with CRLF, which is what RFC 4180 and
 * every spreadsheet expect.
 */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const header = columns.map(c => csvCell(c.header)).join(',')
  const body = rows.map(row => columns.map(c => csvCell(c.value(row))).join(',')).join('\r\n')
  const table = body ? `${header}\r\n${body}` : header
  return `﻿${table}`
}

/**
 * Trigger a browser download of `rows` as a CSV file.
 *
 * Returns the row count so a caller can report "Exported 42 rows" honestly.
 * No-ops outside a browser (SSR / tests) rather than throwing.
 */
export function downloadCsv<T>(
  filename: string,
  rows: readonly T[],
  columns: readonly CsvColumn<T>[],
): number {
  const csv = toCsv(rows, columns)
  if (typeof document === 'undefined' || typeof URL?.createObjectURL !== 'function') {
    return rows.length
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on the next tick so the click has consumed the URL.
  setTimeout(() => URL.revokeObjectURL(url), 0)
  return rows.length
}
