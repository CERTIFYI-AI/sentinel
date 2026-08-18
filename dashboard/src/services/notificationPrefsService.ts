// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Notification preferences — which governance events reach which channel.
//
// `notification_prefs` has existed since 20260421000003, org-scoped with RLS,
// and had **zero readers**: the Settings tab that claimed to configure it
// rendered six hardcoded toggles whose state was a literal in the JSX and
// whose clicks went nowhere. This module gives the table its first reader and
// its first writer.
//
// Writes throw. org_id is filled DB-side by `public.get_org_id()`, never sent
// from the client.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

/** Channels the table's own comment enumerates. */
export const NOTIFICATION_CHANNELS = ['in_app', 'email', 'slack', 'sms'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  in_app: 'In-app',
  email: 'Email',
  slack: 'Slack',
  sms: 'SMS',
}

export interface NotificationPref {
  id: string
  channel: NotificationChannel
  eventType: string
  isEnabled: boolean
  config: Record<string, unknown>
  updatedAt: string | null
}

function fromRow(r: Record<string, any>): NotificationPref {
  return {
    id: r.id,
    channel: (r.channel ?? 'in_app') as NotificationChannel,
    eventType: r.event_type ?? '',
    isEnabled: Boolean(r.is_enabled),
    config: (r.config ?? {}) as Record<string, unknown>,
    updatedAt: r.updated_at ?? null,
  }
}

export async function fetchNotificationPrefs(): Promise<NotificationPref[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('notification_prefs')
    .select('*')
    .order('event_type')
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

/**
 * Event types this organisation has actually emitted.
 *
 * The alternative — shipping a list of event names the platform might one day
 * raise — would put rules in front of an operator for events that never fire,
 * which reads as coverage the platform does not have. An org that has emitted
 * nothing yet gets an honest empty state instead.
 */
export async function fetchObservedEventTypes(): Promise<string[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('governance_events')
    .select('event_type')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  const seen = new Set<string>()
  for (const r of data ?? []) {
    const t = (r as { event_type?: string }).event_type
    if (t) seen.add(t)
  }
  return [...seen].sort()
}

export async function createNotificationPref(input: {
  channel: NotificationChannel
  eventType: string
  isEnabled?: boolean
}): Promise<NotificationPref> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Not signed in — cannot change notification preferences.')
  }
  const eventType = input.eventType.trim()
  if (!eventType) throw new Error('An event type is required.')
  const { data, error } = await supabase
    .from('notification_prefs')
    // org_id is omitted on purpose: the column defaults to get_org_id(), so
    // the tenant boundary is the database's to decide, not the browser's.
    .insert({ channel: input.channel, event_type: eventType, is_enabled: input.isEnabled ?? true })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  const pref = fromRow(data)
  await logAction({
    module: 'settings',
    entityType: 'notification_pref',
    entityId: pref.id,
    entityName: `${CHANNEL_LABEL[pref.channel]} · ${pref.eventType}`,
    action: 'create',
    newValues: { channel: pref.channel, eventType: pref.eventType, isEnabled: pref.isEnabled },
  })
  return pref
}

export async function setNotificationPrefEnabled(
  pref: NotificationPref,
  isEnabled: boolean,
): Promise<NotificationPref> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Not signed in — cannot change notification preferences.')
  }
  const { data, error } = await supabase
    .from('notification_prefs')
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq('id', pref.id)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('The change was not saved. You may not have permission to edit it.')
  const updated = fromRow(data)
  await logAction({
    module: 'settings',
    entityType: 'notification_pref',
    entityId: updated.id,
    entityName: `${CHANNEL_LABEL[updated.channel]} · ${updated.eventType}`,
    action: isEnabled ? 'enable' : 'disable',
    oldValues: { isEnabled: pref.isEnabled },
    newValues: { isEnabled: updated.isEnabled },
  })
  return updated
}

export async function deleteNotificationPref(pref: NotificationPref): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Not signed in — cannot change notification preferences.')
  }
  const { error } = await supabase.from('notification_prefs').delete().eq('id', pref.id)
  if (error) throw new Error(error.message)
  await logAction({
    module: 'settings',
    entityType: 'notification_pref',
    entityId: pref.id,
    entityName: `${CHANNEL_LABEL[pref.channel]} · ${pref.eventType}`,
    action: 'delete',
    oldValues: { channel: pref.channel, eventType: pref.eventType, isEnabled: pref.isEnabled },
  })
}

/** Group prefs by event type so one row shows every channel for that event. */
export function byEventType(
  prefs: NotificationPref[],
): Array<{ eventType: string; prefs: NotificationPref[] }> {
  const m = new Map<string, NotificationPref[]>()
  for (const p of prefs) {
    const list = m.get(p.eventType)
    if (list) list.push(p)
    else m.set(p.eventType, [p])
  }
  return [...m.entries()]
    .map(([eventType, list]) => ({ eventType, prefs: list }))
    .sort((a, b) => a.eventType.localeCompare(b.eventType))
}
