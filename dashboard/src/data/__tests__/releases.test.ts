// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Tests for the generated release data behind the "What's new" panel.
//
// The panel previously hard-coded a version that had drifted from reality and
// linked to a tag that was never cut. These assertions are the guard against
// that returning: the data must be internally consistent and must actually
// come from the changelog.

import { describe, it, expect } from 'vitest'

import {
  RELEASES,
  UNRELEASED,
  LATEST_VERSION,
  TOTAL_RELEASE_COUNT,
  DETAILED_RELEASE_COUNT,
} from '../releases.generated'

describe('release data', () => {
  it('records at least one release', () => {
    expect(RELEASES.length).toBeGreaterThan(0)
    expect(TOTAL_RELEASE_COUNT).toBe(RELEASES.length)
  })

  it('names the newest release as the latest version', () => {
    expect(LATEST_VERSION).toBe(RELEASES[0].version)
  })

  it('has a version for every release and no duplicates', () => {
    const versions = RELEASES.map(r => r.version)
    expect(versions.every(v => v.length > 0)).toBe(true)
    expect(new Set(versions).size).toBe(versions.length)
  })

  it('never labels a release "Unreleased"', () => {
    // Unreleased work is carried separately so the UI cannot present it as shipped.
    expect(RELEASES.some(r => r.version.toLowerCase() === 'unreleased')).toBe(false)
  })

  it('carries entry text for exactly the detailed releases', () => {
    RELEASES.forEach((release, i) => {
      expect(release.detailed).toBe(i < DETAILED_RELEASE_COUNT)
      if (release.detailed) {
        expect(release.entries.length).toBe(release.entryCount)
      } else {
        // Non-detailed releases keep an honest count, just no text.
        expect(release.entries).toEqual([])
        expect(release.entryCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  it('keeps entry counts non-negative and summaries non-empty', () => {
    for (const release of RELEASES) {
      expect(release.entryCount).toBeGreaterThanOrEqual(0)
      for (const entry of release.entries) {
        expect(entry.summary.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('parses dates in the changelog format when present', () => {
    for (const release of RELEASES) {
      if (release.date === null) continue
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('keeps the unreleased block consistent', () => {
    expect(UNRELEASED.entries.length).toBe(UNRELEASED.entryCount)
  })

  it('splits conventional-commit prefixes off the summary', () => {
    const typed = [...RELEASES.flatMap(r => r.entries), ...UNRELEASED.entries].filter(
      e => e.type !== null,
    )
    expect(typed.length).toBeGreaterThan(0)
    for (const entry of typed) {
      // The prefix is extracted, so it must not survive in the summary text.
      expect(entry.summary.startsWith(`${entry.type}:`)).toBe(false)
      expect(entry.summary.startsWith(`${entry.type}(`)).toBe(false)
    }
  })
})
