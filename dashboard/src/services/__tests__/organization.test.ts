// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// The organisation record is the single source of truth for what this tenant
// is called. These tests pin the two things that go wrong when it is not:
// an unset name rendering as an empty subtitle, and a placeholder company name
// leaking back in as a default.

import { describe, it, expect } from 'vitest'

import {
  organizationDisplayName,
  UNNAMED_ORGANIZATION,
  type Organization,
} from '../organizationService'
import {
  byEventType,
  CHANNEL_LABEL,
  NOTIFICATION_CHANNELS,
  type NotificationPref,
} from '../notificationPrefsService'

const org = (over: Partial<Organization> = {}): Organization => ({
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Northwind Analytics',
  domain: null,
  industry: null,
  companySize: null,
  primaryContact: null,
  timezone: 'UTC',
  fiscalYearStart: 'January',
  country: null,
  createdAt: null,
  ...over,
})

describe('organizationDisplayName', () => {
  it('uses the stored name', () => {
    expect(organizationDisplayName(org())).toBe('Northwind Analytics')
  })

  it('never returns an empty string', () => {
    // A page subtitle reading " · Enterprise AI risk inventory" is a rendering
    // bug, so a blank name resolves to a neutral phrase instead.
    for (const value of ['', '   ', undefined as any, null as any]) {
      expect(organizationDisplayName(org({ name: value }))).toBe(UNNAMED_ORGANIZATION)
    }
    expect(organizationDisplayName(null)).toBe(UNNAMED_ORGANIZATION)
    expect(organizationDisplayName(undefined)).toBe(UNNAMED_ORGANIZATION)
  })

  it('falls back to a neutral phrase, never to a company name', () => {
    // The whole point of this change: no tenant ever sees another company's
    // name because the platform shipped one as a default.
    expect(UNNAMED_ORGANIZATION).not.toMatch(/corp|inc|ltd|llc|gmbh|financial/i)
  })
})

describe('notification preferences', () => {
  const pref = (over: Partial<NotificationPref> = {}): NotificationPref => ({
    id: crypto.randomUUID(),
    channel: 'in_app',
    eventType: 'MODEL_REGISTERED',
    isEnabled: true,
    config: {},
    updatedAt: null,
    ...over,
  })

  it('groups every channel under one event, sorted', () => {
    const rows = [
      pref({ eventType: 'RISK_CREATED', channel: 'email' }),
      pref({ eventType: 'MODEL_REGISTERED', channel: 'in_app' }),
      pref({ eventType: 'MODEL_REGISTERED', channel: 'email' }),
    ]
    const grouped = byEventType(rows)
    expect(grouped.map(g => g.eventType)).toEqual(['MODEL_REGISTERED', 'RISK_CREATED'])
    expect(grouped[0].prefs).toHaveLength(2)
  })

  it('returns nothing for an org with no rules, rather than a default set', () => {
    // An empty list means nothing is being sent. Inventing default rules here
    // would tell an operator alerts are configured when none are.
    expect(byEventType([])).toEqual([])
  })

  it('labels every channel the table accepts', () => {
    for (const c of NOTIFICATION_CHANNELS) {
      expect(CHANNEL_LABEL[c], c).toBeTruthy()
      expect(CHANNEL_LABEL[c]).not.toBe(c)
    }
  })
})
