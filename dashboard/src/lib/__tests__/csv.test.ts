// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// The load-bearing test here is formula injection: a GRC platform whose CSV
// export runs an auditor's spreadsheet formula is the failure it exists to
// prevent. Everything else is correctness of quoting.

import { describe, it, expect } from 'vitest'
import { csvCell, toCsv } from '../csv'

/** Strip one layer of CSV quoting, undoubling quotes, to inspect the value. */
function unquote(cell: string): string {
  if (!cell.startsWith('"')) return cell
  return cell.slice(1, -1).replace(/""/g, '"')
}

describe('csvCell — formula injection (CWE-1236)', () => {
  it('neutralises every formula-trigger prefix', () => {
    // The guard inserts a leading apostrophe. Once unwrapped from any CSV
    // quoting, the CELL VALUE always begins with that apostrophe — so a
    // spreadsheet treats it as text, never as a formula.
    for (const evil of ['=1+1', '+1', '-1', '@SUM(A1)', '=cmd|/c calc', '=HYPERLINK(x)']) {
      const cell = unquote(csvCell(evil))
      expect(cell[0]).toBe("'")
      expect(cell.slice(1)).toBe(evil) // original text preserved after the guard
    }
  })

  it('guards a tab/CR-led cell too, not just the obvious operators', () => {
    // These also contain a control char, so they get CSV-quoted as well —
    // unwrap first, then assert the formula guard is the first real character.
    expect(unquote(csvCell('\t=BAD()'))[0]).toBe("'")
    expect(unquote(csvCell('\r=BAD()'))[0]).toBe("'")
  })

  it('leaves an ordinary value untouched', () => {
    expect(csvCell('MDL-001')).toBe('MDL-001')
    expect(csvCell('High')).toBe('High')
  })
})

describe('csvCell — quoting', () => {
  it('quotes and doubles quotes when the cell has a comma or quote', () => {
    expect(csvCell('Ada, Countess')).toBe('"Ada, Countess"')
    expect(csvCell('a "quoted" word')).toBe('"a ""quoted"" word"')
  })

  it('quotes a cell with a newline so a description does not break the row', () => {
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('renders null and undefined as empty, never the literal strings', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(0)).toBe('0') // zero is a value, not blank
  })
})

describe('toCsv', () => {
  const cols = [
    { header: 'ID', value: (r: { id: string; risk: string }) => r.id },
    { header: 'Risk', value: (r: { id: string; risk: string }) => r.risk },
  ]

  it('emits a header and CRLF-joined rows with a UTF-8 BOM', () => {
    const csv = toCsv([{ id: 'R-1', risk: 'High' }], cols)
    expect(csv.charCodeAt(0)).toBe(0xfeff) // BOM so Excel reads UTF-8
    expect(csv).toContain('ID,Risk\r\nR-1,High')
  })

  it('emits just the header for an empty set, never a blank body row', () => {
    const csv = toCsv([], cols)
    expect(csv).toBe('﻿ID,Risk')
  })

  it('escapes an injected cell inside the full document', () => {
    const csv = toCsv([{ id: '=WEBSERVICE("http://evil")', risk: 'x' }], cols)
    // Quoted (contains a comma via the URL is not present, but the leading
    // quote-guard is) — the '=' is never the first character of the cell.
    expect(csv).not.toMatch(/\r\n=WEBSERVICE/)
    expect(csv).toContain("'=WEBSERVICE")
  })
})
