// SPDX-License-Identifier: Apache-2.0
// Notification drawer — reads the REAL org-scoped `notifications` table
// (mesh broadcasts land here via notificationAgent with user_id='system';
// the org-broadcast RLS policy makes them readable org-wide). No seeded
// cards, no fabricated queue counts: what renders is what is stored.
// Mark-as-read is a checked write — it throws when nothing was updated.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './sheet'
import { Button } from './button'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Warning, Robot, Bell, Eye, ArrowRight, Virus, Gear,
} from '@phosphor-icons/react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

// ── Shared data layer (also used by pages/Notifications.tsx) ─────────────────

export interface NotificationRow {
  id: string
  title: string
  message: string | null
  notificationType: string
  severity: string
  entityType: string | null
  entityId: string | null
  urlPath: string | null
  isRead: boolean
  createdAt: string
}

function mapRow(r: any): NotificationRow {
  return {
    id: r.id,
    title: r.title ?? '(untitled notification)',
    message: r.message ?? null,
    // Live columns: `type` is a SEVERITY vocabulary (info/success/warning/
    // error/critical) and the event name travels in `source_module`; there is
    // no notification_type/entity_type/entity_id/url_path. Selecting the
    // imagined names made every load fail with "column ... does not exist".
    notificationType: r.source_module ?? r.type ?? 'info',
    severity: r.type ?? 'info',
    entityType: null,
    entityId: r.entity_ref ?? null,
    urlPath: r.action_url ?? null,
    isRead: r.is_read ?? false,
    createdAt: r.created_at,
  }
}

async function fetchNotifications(limit: number): Promise<NotificationRow[]> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — notifications are unavailable')
  }
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, source_module, entity_ref, is_read, action_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Could not load notifications: ${error.message}`)
  return (data ?? []).map(mapRow)
}

/** Checked write: throws when the update did not land (e.g. RLS denies
 *  updating a broadcast row) so no fake "read" state is shown. */
async function markReadWrite(ids: string[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — notifications are unavailable')
  }
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', ids)
    .select('id')
  if (error) throw new Error(`Mark as read failed: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error('Mark as read did not persist — this notification is not writable for your account')
  }
}

export function useNotificationsData(limit = 100) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    // Key starts with 'notifications' so the global Realtime invalidation
    // refreshes this list on every insert/update.
    queryKey: ['notifications', limit],
    queryFn: () => fetchNotifications(limit),
    staleTime: 15_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({
    mutationFn: (id: string) => markReadWrite([id]),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? 'Mark as read failed'),
  })
  const markAllRead = useMutation({
    mutationFn: (ids: string[]) => markReadWrite(ids),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e?.message ?? 'Mark all read failed'),
  })
  return {
    items, isLoading, error,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
    isMarking: markRead.isPending || markAllRead.isPending,
  }
}

// ── Presentation helpers ─────────────────────────────────────────────────────

/** Tone from the stored value. `type` is the severity vocabulary
 *  (info/success/warning/error/critical); `source_module` carries the mesh
 *  event name (e.g. "governance-mesh:INCIDENT_CREATED"). Both are matched so a
 *  row tones correctly whichever of the two it was written with. */
export function notificationTone(type: string): 'critical' | 'warning' | 'info' {
  const t = (type ?? '').toUpperCase()
  if (/^CRITICAL$|^ERROR$/.test(t)) return 'critical'
  if (/^WARNING$/.test(t)) return 'warning'
  if (/INCIDENT|CONTAINMENT|KILL|REGULATOR/.test(t)) return 'critical'
  if (/RISK|HITL|EXCEEDED|DRIFT|OVERDUE/.test(t)) return 'warning'
  return 'info'
}

const TONE_STYLE: Record<'critical' | 'warning' | 'info', { dot: string; badge: string; badgeText: string }> = {
  critical: { dot: 'bg-[hsl(var(--s-er-tx))]', badge: 'bg-[hsl(var(--s-er-bg))]', badgeText: 'text-[hsl(var(--s-er-tx))]' },
  warning:  { dot: 'bg-[hsl(var(--s-wn-tx))]', badge: 'bg-[hsl(var(--s-wn-bg))]', badgeText: 'text-[hsl(var(--s-wn-tx))]' },
  info:     { dot: 'bg-[hsl(var(--brand))]', badge: 'bg-[hsl(var(--brand-subtle))]', badgeText: 'text-[hsl(var(--brand))]' },
}

function entityIcon(entityType: string | null) {
  switch ((entityType ?? '').toLowerCase()) {
    case 'model': return Robot
    case 'incident': return Virus
    case 'risk': return Warning
    case 'event': return Gear
    default: return Bell
  }
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export interface NotificationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationDrawer({ open, onOpenChange }: NotificationDrawerProps) {
  const navigate = useNavigate()
  const { items, isLoading, error, markRead, markAllRead } = useNotificationsData(50)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unread = items.filter(n => !n.isRead)
  const unreadCount = unread.length

  // Unread first, newest first within each group; the drawer shows the top 10.
  const ordered = [...items].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  const filtered = (filter === 'unread' ? ordered.filter(n => !n.isRead) : ordered).slice(0, 10)

  const handleClick = async (n: NotificationRow) => {
    if (!n.isRead) {
      try { await markRead(n.id) } catch { /* hook toasts the error */ }
    }
    if (n.urlPath) {
      navigate(n.urlPath)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-[380px] sm:w-[420px] p-0 flex flex-col bg-surface border-[hsl(var(--border))]'
      >
        {/* Header */}
        <SheetHeader className='px-4 py-3 border-b border-[hsl(var(--border))] flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <Bell size={16} weight='duotone' className='text-[hsl(var(--text-3))]' />
              <SheetTitle className='text-base font-semibold text-[hsl(var(--text-1))]'>
                Notifications
              </SheetTitle>
              {unreadCount > 0 && (
                <span className='bg-[hsl(var(--brand))] text-white text-[10px] font-bold px-1.5 py-0.5 leading-none min-w-[18px] text-center'>
                  {unreadCount}
                </span>
              )}
            </div>
            <div className='flex items-center gap-1'>
              {unreadCount > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-[11px] text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]'
                  onClick={() => markAllRead(unread.map(n => n.id)).catch(() => { /* hook toasts */ })}
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant='ghost'
                size='sm'
                className='h-7 text-[11px]'
                onClick={() => { navigate('/notifications'); onOpenChange(false) }}
              >
                View all
                <ArrowRight size={10} className='ml-1' />
              </Button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className='flex items-center gap-1 mt-2'>
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-[hsl(var(--brand))] text-white'
                    : 'text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] hover:bg-raised'
                }`}
              >
                {f === 'all' ? `All (${items.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Items */}
        <div className='flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]'>
          {isLoading ? (
            <div className='px-4 py-6 space-y-3'>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='h-14 bg-raised animate-pulse' />
              ))}
            </div>
          ) : error ? (
            <div className='px-4 py-8 text-center'>
              <Warning size={24} className='mx-auto mb-2 text-[hsl(var(--destructive))]' />
              <p className='text-xs text-[hsl(var(--destructive))]'>
                Failed to load notifications: {(error as Error).message}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-[hsl(var(--text-4))]'>
              <Eye size={32} className='mb-3 opacity-30' />
              <p className='text-sm'>No {filter === 'unread' ? 'unread ' : ''}notifications</p>
              <p className='text-[11px] mt-1 max-w-[260px] text-center'>
                Governance events (incidents, risks, HITL reviews) appear here as the platform records them.
              </p>
            </div>
          ) : (
            filtered.map(n => {
              const tone = notificationTone(n.notificationType)
              const Icon = entityIcon(n.entityType)
              const sc = TONE_STYLE[tone]
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-raised transition-colors group relative ${
                    !n.isRead ? 'bg-[hsl(var(--bg-raised)/0.4)]' : ''
                  }`}
                >
                  <div className='flex gap-3'>
                    {/* Unread dot + icon */}
                    <div className='flex flex-col items-center gap-1 flex-shrink-0 pt-0.5'>
                      <span className={`w-1.5 h-1.5 ${n.isRead ? 'opacity-0' : sc.dot}`} />
                      <span className={`w-7 h-7 flex items-center justify-center ${sc.badge}`}>
                        <Icon size={14} weight='duotone' className={sc.badgeText} />
                      </span>
                    </div>

                    {/* Content */}
                    <div className='flex-1 min-w-0'>
                      <p className={`text-[12.5px] font-semibold leading-snug mb-0.5 ${n.isRead ? 'text-[hsl(var(--text-2))]' : 'text-[hsl(var(--text-1))]'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className='text-[11.5px] text-[hsl(var(--text-3))] leading-snug line-clamp-2 mb-1.5'>
                          {n.message}
                        </p>
                      )}
                      <div className='flex items-center gap-2'>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${sc.badge} ${sc.badgeText}`}>
                          {n.notificationType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className='text-[10px] text-[hsl(var(--text-4))]'>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className='border-t border-[hsl(var(--border))] px-4 py-2.5 flex-shrink-0 bg-raised'>
          <p className='text-[10px] text-[hsl(var(--text-4))]'>
            {isLoading || error ? '—' : `Showing ${filtered.length} of ${items.length} stored notification${items.length !== 1 ? 's' : ''}`} • Live via Realtime
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
