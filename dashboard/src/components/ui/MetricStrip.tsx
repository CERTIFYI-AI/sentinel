import React from 'react'
import { cn } from '@/lib/utils'

export interface MetricStripItem {
  label: string
  value: React.ReactNode
  sub?: string
  color?: string
}

interface MetricStripProps {
  items: MetricStripItem[]
  className?: string
}

export function MetricStrip({ items, className }: MetricStripProps) {
  return (
    <div className={cn('flex items-stretch border border-[hsl(var(--border))] divide-x divide-[hsl(var(--border))] bg-surface', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex-1 px-4 py-3 min-w-0">
          <p className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wider truncate">{item.label}</p>
          <p className="text-lg font-bold tabular-nums mt-0.5" style={item.color ? { color: item.color } : { color: 'hsl(var(--text-1))' }}>
            {item.value}
          </p>
          {item.sub && <p className="text-[10px] text-[hsl(var(--text-4))] mt-0.5 truncate">{item.sub}</p>}
        </div>
      ))}
    </div>
  )
}

export default MetricStrip
