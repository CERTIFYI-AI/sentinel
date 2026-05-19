// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-01 — StatCard with data lineage tooltip (asOf, source, method, SLA badge).
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

interface DataLineage {
  asOf: string       // ISO timestamp
  source: string     // e.g. "Risk Register live query"
  method: string     // e.g. "COUNT(*) WHERE status='OPEN'"
  slaBreach?: 'ok' | 'warn' | 'critical'  // green/amber/red
}

interface StatCardProps {
  label: string
  value: ReactNode
  delta?: string
  deltaDir?: 'up' | 'down'
  isPositiveUp?: boolean  // if true, up=green; if false, up=red
  icon?: ReactNode
  lineage?: DataLineage
  href?: string
  className?: string
}

function slaColor(sla?: 'ok' | 'warn' | 'critical') {
  if (!sla || sla === 'ok') return 'bg-green-500'
  if (sla === 'warn') return 'bg-amber-500'
  return 'bg-red-500'
}

function formatAsOf(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`
  return `${Math.floor(diff/1440)}d ago`
}

export function StatCard({ label, value, delta, deltaDir, isPositiveUp = false, icon, lineage, href, className = '' }: StatCardProps) {
  const deltaPositive = deltaDir === 'up' ? isPositiveUp : !isPositiveUp
  const deltaColor = deltaDir ? (deltaPositive ? 'text-green-600' : 'text-red-600') : 'text-zinc-400'

  const card = (
    <div className={`relative group border border-zinc-200 rounded p-4 bg-white hover:border-zinc-300 transition-colors ${className}`}>
      {lineage && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Tooltip trigger */}
          <div className="relative">
            <Info size={13} className="text-zinc-400 cursor-help" aria-label={`Data lineage for ${label}`} />
            <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-56 bg-zinc-900 text-white text-xs rounded shadow-lg p-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${slaColor(lineage.slaBreach)}`} />
                <span className="font-medium">As of: {formatAsOf(lineage.asOf)}</span>
              </div>
              <p className="text-zinc-300">Source: {lineage.source}</p>
              <p className="text-zinc-400 font-mono text-[10px] break-all">{lineage.method}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
          <p
            className="text-2xl font-bold text-zinc-900 mt-1"
            aria-label={`${label}: ${String(value)}${delta ? `, ${deltaDir === 'up' ? 'increased' : 'decreased'} ${delta} vs last period` : ''}`}
          >
            {value}
          </p>
          {delta && (
            <p className={`text-xs mt-1 ${deltaColor}`}>
              {deltaDir === 'up' ? '▲' : '▼'} {delta}
            </p>
          )}
        </div>
        {icon && <div className="ml-3 text-zinc-400">{icon}</div>}
      </div>
    </div>
  )

  if (href) return <a href={href} className="block">{card}</a>
  return card
}
