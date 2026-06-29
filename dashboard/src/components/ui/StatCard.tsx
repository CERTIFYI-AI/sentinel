import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataLineage {
  asOf: string
  source: string
  method: string
  slaBreach?: 'ok' | 'warn' | 'critical'
}

type StatVariant = 'default' | 'danger' | 'warning' | 'success' | 'info'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  delta?: string
  deltaDir?: 'up' | 'down'
  isPositiveUp?: boolean
  icon?: ReactNode
  lineage?: DataLineage
  href?: string
  className?: string
  variant?: StatVariant
  color?: string
}

const VARIANT_BORDER: Record<StatVariant, string> = {
  default: 'border-l-[hsl(var(--brand))]',
  danger: 'border-l-[hsl(var(--s-er-tx))]',
  warning: 'border-l-[hsl(var(--s-wn-tx))]',
  success: 'border-l-[hsl(var(--s-ok-tx))]',
  info: 'border-l-[hsl(var(--s-in-tx))]',
}

function slaColor(sla?: 'ok' | 'warn' | 'critical') {
  if (!sla || sla === 'ok') return 'bg-[hsl(var(--s-ok-tx))]'
  if (sla === 'warn') return 'bg-[hsl(var(--s-wn-tx))]'
  return 'bg-[hsl(var(--s-er-tx))]'
}

function formatAsOf(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`
  return `${Math.floor(diff/1440)}d ago`
}

export function StatCard({ label, value, sub, delta, deltaDir, isPositiveUp = false, icon, lineage, href, className = '', variant = 'default', color }: StatCardProps) {
  const deltaPositive = deltaDir === 'up' ? isPositiveUp : !isPositiveUp
  const deltaColor = deltaDir ? (deltaPositive ? 'text-[hsl(var(--s-ok-tx))]' : 'text-[hsl(var(--s-er-tx))]') : 'text-[hsl(var(--text-4))]'
  const borderStyle = color ? undefined : undefined
  const borderClass = color ? '' : VARIANT_BORDER[variant]

  const card = (
    <div
      className={cn(
        'relative group border border-[hsl(var(--border))] p-4 bg-surface hover:shadow-[var(--shadow-md)] transition-shadow border-l-4',
        borderClass, className
      )}
      style={color ? { borderLeftColor: color } : undefined}
    >
      {lineage && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <Info size={13} className="text-[hsl(var(--text-4))] cursor-help" aria-label={`Data lineage for ${label}`} />
            <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-56 bg-[hsl(var(--text-1))] text-[hsl(var(--bg-surface))] text-xs shadow-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${slaColor(lineage.slaBreach)}`} />
                <span className="font-medium">As of: {formatAsOf(lineage.asOf)}</span>
              </div>
              <p className="opacity-80">Source: {lineage.source}</p>
              <p className="opacity-60 font-mono text-[10px] break-all">{lineage.method}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-[hsl(var(--text-3))] uppercase tracking-wider">{label}</p>
          <p
            className="text-2xl font-bold text-[hsl(var(--text-1))] mt-1 tabular-nums"
            aria-label={`${label}: ${String(value)}${delta ? `, ${deltaDir === 'up' ? 'increased' : 'decreased'} ${delta} vs last period` : ''}`}
          >
            {value}
          </p>
          {sub && <p className="text-[11px] text-[hsl(var(--text-4))] mt-0.5">{sub}</p>}
          {delta && (
            <p className={`text-xs mt-1 font-medium ${deltaColor}`}>
              {deltaDir === 'up' ? '▲' : '▼'} {delta}
            </p>
          )}
        </div>
        {icon && <div className="ml-3 text-[hsl(var(--text-4))]">{icon}</div>}
      </div>
    </div>
  )

  if (href) return <a href={href} className="block no-underline">{card}</a>
  return card
}
