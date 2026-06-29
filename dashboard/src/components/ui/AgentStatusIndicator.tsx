import React from 'react'
import { cn } from '@/lib/utils'

type AgentState = 'online' | 'processing' | 'degraded' | 'offline' | 'error'

interface AgentStatusIndicatorProps {
  state: AgentState
  label?: string
  lastSeen?: string
  className?: string
  size?: 'sm' | 'md'
}

const STATE_CONFIG: Record<AgentState, { dot: string; text: string; label: string }> = {
  online:     { dot: 'bg-[hsl(var(--s-ok-tx))]',  text: 'text-[hsl(var(--s-ok-tx))]',  label: 'Online' },
  processing: { dot: 'bg-[hsl(var(--s-in-tx))]',  text: 'text-[hsl(var(--s-in-tx))]',  label: 'Processing' },
  degraded:   { dot: 'bg-[hsl(var(--s-wn-tx))]',  text: 'text-[hsl(var(--s-wn-tx))]',  label: 'Degraded' },
  offline:    { dot: 'bg-[hsl(var(--text-4))]',    text: 'text-[hsl(var(--text-4))]',    label: 'Offline' },
  error:      { dot: 'bg-[hsl(var(--s-er-tx))]',  text: 'text-[hsl(var(--s-er-tx))]',  label: 'Error' },
}

export function AgentStatusIndicator({ state, label, lastSeen, className, size = 'sm' }: AgentStatusIndicatorProps) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.offline
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={lastSeen ? `Last seen: ${lastSeen}` : undefined}>
      <span className={cn(dotSize, 'rounded-full flex-shrink-0', config.dot, state === 'processing' && 'animate-pulse')} />
      <span className={cn(textSize, 'font-medium', config.text)}>
        {label || config.label}
      </span>
    </span>
  )
}

export default AgentStatusIndicator
