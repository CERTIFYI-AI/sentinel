// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TrustEngineTabs — sub-navigation for the Runtime Trust workspace. The
// /trust-engine family (dashboard, guardrails, traces, costs, fallback, tools,
// config) is one operational surface; this strip lets operators move between
// the related views without going back to the sidebar. Active-route aware,
// keyboard/screen-reader accessible.

import { NavLink } from 'react-router-dom'
import {
  Gauge, ShieldCheck, Lightning, Coins, ArrowsClockwise, Wrench, SlidersHorizontal,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const TABS: { to: string; label: string; icon: React.ElementType }[] = [
  { to: '/trust-engine', label: 'Runtime Trust', icon: Gauge },
  { to: '/trust-engine/guardrails', label: 'Active Guardrails', icon: ShieldCheck },
  { to: '/trust-engine/traces', label: 'Live Inference Traces', icon: Lightning },
  { to: '/trust-engine/costs', label: 'Trust Costs & Tokens', icon: Coins },
  { to: '/trust-engine/fallback', label: 'Fallback Failovers', icon: ArrowsClockwise },
  { to: '/trust-engine/tools', label: 'Tool Monitor', icon: Wrench },
  { to: '/trust-engine/config', label: 'Configuration', icon: SlidersHorizontal },
]

export function TrustEngineTabs() {
  return (
    <nav
      aria-label="Runtime Trust sections"
      className="flex flex-wrap items-center gap-1 border-b border-[hsl(var(--border))] pb-2"
    >
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/trust-engine'}
          className={({ isActive }) => cn(
            'inline-flex items-center gap-1.5 border px-2.5 py-1 text-[13px] transition-colors',
            isActive
              ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] font-medium'
              : 'border-transparent text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]',
          )}
        >
          <Icon size={14} weight="fill" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default TrustEngineTabs
