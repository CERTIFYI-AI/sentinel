// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// XC-08 — Export utilities: CSV, JSON download for any dataset.

// A cell whose text begins with = + - @ (or a tab/CR) is executed as a FORMULA
// by Excel/Sheets when the file is opened — CSV formula injection, CWE-1236.
// Many exported fields here are attacker-influenceable (a risk title, an owner,
// a resource tag synced from a connected integration), so every cell is
// neutralised with a leading apostrophe before the RFC-4180 quoting below —
// the same guard as lib/csv.ts. See TD-021.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/
function cell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v)
  if (FORMULA_TRIGGER.test(s)) s = `'${s}`
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function exportCsv<T extends Record<string, unknown>>(rows: T[], filename: string): void {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const header = cols.map(cell).join(',')
  const body = rows.map(r =>
    cols.map(c => cell(r[c])).join(',')
  ).join('\n')
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportJson<T>(rows: T[], filename: string): void {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
