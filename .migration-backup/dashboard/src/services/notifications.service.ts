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
  type: z.enum(['info','warning','error','success']).default('info'),
  resource_type: z.string().optional(),
  resource_id: z.string().optional(),
  url_path: z.string().optional(),
  is_read: z.boolean().default(false),
  read_at: z.string().optional(),
  created_at: z.string().optional(),
})
export type Notification = z.infer<typeof NotificationSchema>
const base = createService<typeof NotificationSchema, Notification>({ table: 'notifications', schema: NotificationSchema, orgField: 'org_id' })

export const notificationsService = {
  ...base,
  async markRead(id: string, orgId: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id).eq('org_id', orgId)
    if (error) return err('MARK_READ_FAILED', error.message)
    return ok(undefined)
  },
  async markAllRead(userId: string, orgId: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', userId).eq('org_id', orgId).eq('is_read', false)
    if (error) return err('MARK_ALL_READ_FAILED', error.message)
    return ok(undefined)
  },
}
