import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './sheet'
import { Button } from './button'
import { Badge } from './badge'
import { useNavigate } from 'react-router-dom'
import {
  Warning, ShieldCheck, Robot, FileText, CheckCircle,
  Bell, X, Eye, ArrowRight, Virus,
  Gear, ChartBar, Lock, Brain, Scales, ShieldWarning,
  UserCircleCheck, Buildings,
} from '@phosphor-icons/react'

type NotifSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'system'
type NotifCategory =
  | 'model' | 'security' | 'compliance' | 'hitl' | 'risk' | 'bias'
  | 'incident' | 'vendor' | 'policy' | 'system' | 'guardrail' | 'agent'

interface Notification {
  id: string
  title: string
  description: string
  timestamp: string
  severity: NotifSeverity
  category: NotifCategory
  read: boolean
  link: string
}

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'N-001',
    title: 'Critical: Bias threshold exceeded',
    description: 'MDL-004 Loan Approval Assistant — gender fairness score dropped to 0.62, below 0.85 threshold.',
    timestamp: '2026-04-10T13:47:00Z',
    severity: 'critical',
    category: 'bias',
    read: false,
    link: '/bias-audits',
  },
  {
    id: 'N-002',
    title: 'Shadow AI agent detected',
    description: 'AGT-010 in Marketing — unauthorized LangChain agent accessing customer PII. Agent quarantined.',
    timestamp: '2026-04-10T11:22:00Z',
    severity: 'high',
    category: 'agent',
    read: false,
    link: '/agents',
  },
  {
    id: 'N-003',
    title: 'Evidence EV-005 GDPR DPA expired',
    description: 'Data Processing Agreement with OpenAI expired. Renewal required before EU data processing.',
    timestamp: '2026-04-10T09:15:00Z',
    severity: 'medium',
    category: 'compliance',
    read: false,
    link: '/compliance/evidence',
  },
  {
    id: 'N-004',
    title: 'HITL queue — 3 pending reviews',
    description: 'Credit Risk Scorer and Loan Approval Assistant decisions awaiting human review. Avg wait: 4 min.',
    timestamp: '2026-04-09T16:00:00Z',
    severity: 'high',
    category: 'hitl',
    read: false,
    link: '/hitl',
  },
  {
    id: 'N-005',
    title: 'EU AI Act Article 11 gap identified',
    description: 'Technical documentation missing for 2 high-risk systems (MDL-001, MDL-004).',
    timestamp: '2026-04-09T14:30:00Z',
    severity: 'high',
    category: 'compliance',
    read: false,
    link: '/compliance',
  },
  {
    id: 'N-006',
    title: 'Vendor risk alert: C3.ai',
    description: 'C3.ai DPA still unsigned. High-risk flag raised. Enhanced due diligence required.',
    timestamp: '2026-04-09T10:00:00Z',
    severity: 'high',
    category: 'vendor',
    read: true,
    link: '/vendors',
  },
  {
    id: 'N-007',
    title: 'Model drift warning: Credit Risk Scorer',
    description: 'MDL-001 input distribution shifted 18% from baseline. Revalidation recommended.',
    timestamp: '2026-04-08T15:45:00Z',
    severity: 'medium',
    category: 'model',
    read: true,
    link: '/models/inventory',
  },
  {
    id: 'N-008',
    title: 'RSK-006 shadow AI data exfiltration risk elevated',
    description: 'Risk score updated to Critical (16/25). Immediate containment actions recommended.',
    timestamp: '2026-04-08T12:00:00Z',
    severity: 'critical',
    category: 'risk',
    read: true,
    link: '/risks',
  },
  {
    id: 'N-009',
    title: 'EU AI Act Q1 2026 report ready',
    description: 'Quarterly compliance report generated and available for download in Export Center.',
    timestamp: '2026-04-07T09:00:00Z',
    severity: 'info',
    category: 'compliance',
    read: true,
    link: '/export',
  },
  {
    id: 'N-010',
    title: 'Guardrail triggered: Loan Assistant hallucination',
    description: 'Hallucination Guard blocked 3 fabricated loan terms. Review in Trust Engine required.',
    timestamp: '2026-04-06T17:15:00Z',
    severity: 'high',
    category: 'guardrail',
    read: true,
    link: '/trust-engine',
  },
  {
    id: 'N-011',
    title: 'Training course overdue: GDPR Fundamentals',
    description: '4 users have not completed mandatory GDPR training due 2026-04-01.',
    timestamp: '2026-04-05T08:00:00Z',
    severity: 'medium',
    category: 'system',
    read: true,
    link: '/training',
  },
  {
    id: 'N-012',
    title: 'Audit Trail integrity verified',
    description: '14,820 entries checked. No tampering detected. Chain hash valid.',
    timestamp: '2026-04-04T06:00:00Z',
    severity: 'info',
    category: 'system',
    read: true,
    link: '/audit-trail',
  },
]

const CATEGORY_ICON: Record<NotifCategory, any> = {
  model: Robot,
  security: ShieldWarning,
  compliance: ChartBar,
  hitl: UserCircleCheck,
  risk: Warning,
  bias: Scales,
  incident: Virus,
  vendor: Buildings,
  policy: FileText,
  system: Gear,
  guardrail: ShieldCheck,
  agent: Brain,
}

const SEVERITY_COLOR: Record<NotifSeverity, { dot: string; badge: string; badgeText: string }> = {
  critical: { dot: 'bg-[hsl(var(--s-er-tx))]', badge: 'bg-[hsl(var(--s-er-bg))]', badgeText: 'text-[hsl(var(--s-er-tx))]' },
  high:     { dot: 'bg-[hsl(var(--s-er-tx))]', badge: 'bg-[hsl(var(--s-er-bg))]', badgeText: 'text-[hsl(var(--s-er-tx))]' },
  medium:   { dot: 'bg-[hsl(var(--s-wn-tx))]', badge: 'bg-[hsl(var(--s-wn-bg))]', badgeText: 'text-[hsl(var(--s-wn-tx))]' },
  low:      { dot: 'bg-[hsl(var(--s-ok-tx))]', badge: 'bg-[hsl(var(--s-ok-bg))]', badgeText: 'text-[hsl(var(--s-ok-tx))]' },
  info:     { dot: 'bg-[hsl(var(--brand))]', badge: 'bg-[hsl(var(--brand-subtle))]', badgeText: 'text-[hsl(var(--brand))]' },
  system:   { dot: 'bg-[hsl(var(--text-4))]', badge: 'bg-[hsl(var(--bg-raised))]', badgeText: 'text-[hsl(var(--text-3))]' },
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
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const unreadCount = notifications.filter(n => !n.read).length

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const markRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const dismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleClick = (n: Notification) => {
    markRead(n.id)
    navigate(n.link)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-[380px] sm:w-[420px] p-0 flex flex-col bg-[hsl(var(--bg-surface))] border-[hsl(var(--border))]'
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
                  onClick={markAllRead}
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
                    : 'text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] hover:bg-[hsl(var(--bg-raised))]'
                }`}
              >
                {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Items */}
        <div className='flex-1 overflow-y-auto divide-y divide-[hsl(var(--border))]'>
          {filtered.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-16 text-[hsl(var(--text-4))]'>
              <Eye size={32} className='mb-3 opacity-30' />
              <p className='text-sm'>No {filter === 'unread' ? 'unread ' : ''}notifications</p>
            </div>
          ) : (
            filtered.map(n => {
              const Icon = CATEGORY_ICON[n.category]
              const sc = SEVERITY_COLOR[n.severity]
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-[hsl(var(--bg-raised))] transition-colors group relative ${
                    !n.read ? 'bg-[hsl(var(--bg-raised)/0.4)]' : ''
                  }`}
                >
                  <div className='flex gap-3'>
                    {/* Unread dot + icon */}
                    <div className='flex flex-col items-center gap-1 flex-shrink-0 pt-0.5'>
                      <span className={`w-1.5 h-1.5 ${n.read ? 'opacity-0' : sc.dot}`} />
                      <span className={`w-7 h-7 flex items-center justify-center ${sc.badge}`}>
                        <Icon size={14} weight='duotone' className={sc.badgeText} />
                      </span>
                    </div>

                    {/* Content */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2 mb-0.5'>
                        <p className={`text-[12.5px] font-semibold leading-snug ${n.read ? 'text-[hsl(var(--text-2))]' : 'text-[hsl(var(--text-1))]'}`}>
                          {n.title}
                        </p>
                        <button
                          onClick={(e) => dismiss(n.id, e)}
                          className='opacity-0 group-hover:opacity-100 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] transition-all flex-shrink-0 mt-0.5'
                          aria-label='Dismiss notification'
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className='text-[11.5px] text-[hsl(var(--text-3))] leading-snug line-clamp-2 mb-1.5'>
                        {n.description}
                      </p>
                      <div className='flex items-center gap-2'>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 ${sc.badge} ${sc.badgeText}`}>
                          {n.severity.toUpperCase()}
                        </span>
                        <span className='text-[10px] text-[hsl(var(--text-4))]'>
                          {timeAgo(n.timestamp)}
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
        <div className='border-t border-[hsl(var(--border))] px-4 py-2.5 flex-shrink-0 bg-[hsl(var(--bg-raised))]'>
          <p className='text-[10px] text-[hsl(var(--text-4))]'>
            Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''} • Real-time alerts enabled
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
