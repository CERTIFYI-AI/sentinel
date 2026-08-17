// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// The ADMIN register vocabularies are enforced by CHECK constraints in
// 20260823000001_admin_registers_and_demo_table_lockdown.sql. A service
// constant that drifts from the constraint is a fake-success trap: the form
// offers the option, the database rejects the write. This test parses the
// migration and pins the two sides together — the same drift class that made
// the DSR page's every filter and stat read zero.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BIA_CRITICALITIES, IDENTITY_TYPES, PRIVILEGE_LEVELS, REVIEW_STATUSES,
} from '@/services/resilienceService'
import { CRITICALITIES, DATA_CLASSIFICATIONS } from '@/services/assetService'

const MIGRATION = join(
  __dirname,
  '../../../supabase/migrations/20260823000001_admin_registers_and_demo_table_lockdown.sql',
)

/** Extract the vocabulary of `check (col is null or col in (...))`. */
function checkVocabulary(sql: string, column: string): string[] {
  const m = sql.match(new RegExp(
    `check \\(${column} is null or ${column} in \\(([^)]+)\\)`,
  ))
  if (!m) throw new Error(`no CHECK constraint found for ${column}`)
  return m[1].split(',').map((s) => s.trim().replace(/'/g, ''))
}

describe('ADMIN register vocabularies match the database CHECK constraints', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('bia_processes.criticality', () => {
    expect([...BIA_CRITICALITIES]).toEqual(checkVocabulary(sql, 'criticality'))
  })

  it('identities.identity_type', () => {
    expect([...IDENTITY_TYPES]).toEqual(checkVocabulary(sql, 'identity_type'))
  })

  it('identities.privilege_level', () => {
    expect([...PRIVILEGE_LEVELS]).toEqual(checkVocabulary(sql, 'privilege_level'))
  })

  it('identities.review_status', () => {
    expect([...REVIEW_STATUSES]).toEqual(checkVocabulary(sql, 'review_status'))
  })

  it('vocabularies are lowercase (pages filter on lowercase)', () => {
    for (const v of [...CRITICALITIES, ...DATA_CLASSIFICATIONS, ...IDENTITY_TYPES]) {
      expect(v).toBe(v.toLowerCase())
    }
  })
})
