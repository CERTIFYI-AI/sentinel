// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
import { z } from 'zod'
import { createService } from '../lib/serviceFactory'
import { supabase } from '../lib/supabase'
import { ok, err } from '../types/errors'

export const NotificationSchema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  body: z.string(),
  type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  url_path: z.string().optional(),
  is_read: z.boolean().default(false),
  read_at: z.string().optional(),
  created_at: z.string().optional(),
})

export type Notification = z.infer<typeof NotificationSchema>

const base = createService<typeof NotificationSchema, Notification>({
  table: 'notifications',
  schema: NotificationSchema,
  orgField: 'org_id',
})

export const notificationsService = {
  ...base,
  async markRead(id: string, orgId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
    if (error) return err('MARK_READ_FAILED', error.message)
    return ok(undefined)
  },
  async markAllRead(userId: string, orgId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('is_read', false)
    if (error) return err('MARK_ALL_READ_FAILED', error.message)
    return ok(undefined)
  },
}

// Backward-compatible wrappers for useNotificationData
export async function fetchAllNotifications(orgId: string = '00000000-0000-0000-0000-000000000001'): Promise<Notification[]> {
  const result = await notificationsService.list({ orgId })
  return result.ok ? result.data : []
}

export async function upsertNotification(record: Record<string, unknown>): Promise<Notification | Record<string, unknown>> {
  const orgId = (record.org_id as string) || '00000000-0000-0000-0000-000000000001'
  if (record.id) {
    const result = await notificationsService.update(record.id as string, orgId, record as any)
    return result.ok ? result.data : record
  } else {
    const result = await notificationsService.create({ ...record, org_id: orgId } as any)
    return result.ok ? result.data : record
  }
}

export async function deleteNotification(id: string, orgId: string = '00000000-0000-0000-0000-000000000001'): Promise<boolean> {
  const result = await notificationsService.remove(id, orgId)
  return result.ok
}

export const fetchNotifications = fetchAllNotifications
export const saveNotification = upsertNotification
