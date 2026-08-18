// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Policy Decisions — what the gateway actually did.
//
// Before this page, `mcp_tools` carried a complete authorization policy
// (approval state, HITL flag, per-agent grants, risk tier) that nothing read
// at call time and nobody could see the effect of. This is the other half:
// every decision the enforcement runtime made, allowed and denied alike.
//
// Two deliberate choices about how it reads:
//
//   * Denied and awaiting-approval come FIRST and are the default filter. An
//     allowed call is the uninteresting case; a refused one is why someone
//     opened this screen.
//   * "Awaiting approval" is rendered as its own state, never as a denial.
//     Policy permitted the call and paused it for a person (EU AI Act Art.
//     14); showing it as refused would misreport what the platform did.
//
// No figure here is stored. Counts are derived from the rows at render time,
// so the page cannot advertise a number the table does not contain.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gavel, ShieldCheck, Prohibit, Hourglass, ArrowClockwise } from '@phosphor-icons/react'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/evals/states'
import { usePolicyDecisions } from '@/hooks/useMcpEnforcement'
import { useMcpTools } from '@/hooks/useMcpData'
import { reasonLabel, type DecisionKind } from '@/services/mcpEnforcementService'

type Filter = 'open' | 'all' | DecisionKind

const TONE: Record<DecisionKind, { chip: string; label: string; Icon: typeof Gavel }> = {
  allowed: {
    chip: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
    label: 'Allowed',
    Icon: ShieldCheck,
  },
  denied: {
    chip: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
    label: 'Denied',
    Icon: Prohibit,
  },
  pending_approval: {
    chip: 'bg-[hsl(var(--s-wa-bg))] text-[hsl(var(--s-wa-tx))]',
    label: 'Awaiting approval',
    Icon: Hourglass,
  },
}

function Stat({
  label, value, hint, tone,
}: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">{label}</p>
      <p className={`font-mono text-2xl font-bold ${tone ?? 'text-[hsl(var(--text-1))]'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">{hint}</p>}
    </div>
  )
}

export default function PolicyDecisions() {
  const decisions = usePolicyDecisions()
  const tools = useMcpTools()
  const [filter, setFilter] = useState<Filter>('open')

  // Tool names are resolved at render from the live registry, never stored on
  // the decision. `tool_ref` is the fallback the gateway recorded at the time,
  // which is all there is when the tool was unknown or has since been removed.
  const toolName = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of tools.data) m.set(t.id, t.name)
    return m
  }, [tools.data])

  const rows = useMemo(() => {
    const all = decisions.data
    if (filter === 'all') return all
    if (filter === 'open') return all.filter(d => d.decision !== 'allowed')
    return all.filter(d => d.decision === filter)
  }, [decisions.data, filter])

  if (decisions.isError) {
    return (
      <div>
        <PageHeader title="Policy Decisions" subtitle="Agent tool-call authorization" icon={Gavel} />
        <ErrorState message={decisions.error?.message} onRetry={() => decisions.refetch()} />
      </div>
    )
  }

  const c = decisions.counts

  return (
    <div>
      <PageHeader
        title="Policy Decisions"
        subtitle="Every authorization the gateway made on an agent's tool call — allowed, refused, or paused for a person"
        icon={Gavel}
        actions={
          <Button variant="outline" onClick={() => decisions.refetch()}>
            <ArrowClockwise size={14} className="mr-1.5" />
            Refresh
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="grid grid-cols-2 gap-6 py-4 md:grid-cols-4">
          <Stat label="Decisions" value={c.total} hint="most recent 200" />
          <Stat label="Allowed" value={c.allowed} tone="text-[hsl(var(--s-ok-tx))]" />
          <Stat label="Refused" value={c.denied} tone="text-[hsl(var(--s-er-tx))]" />
          <Stat
            label="Awaiting approval"
            value={c.pending}
            tone="text-[hsl(var(--s-wa-tx))]"
            hint="permitted, held for a human"
          />
        </CardContent>
      </Card>

      {decisions.reasons.length > 0 && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
              Why calls are not proceeding
            </p>
            <div className="flex flex-wrap gap-2">
              {decisions.reasons.map(r => (
                <span
                  key={r.code}
                  className="rounded-full bg-[hsl(var(--surface-2))] px-2.5 py-1 text-[12px] text-[hsl(var(--text-2))]"
                >
                  {reasonLabel(r.code)}
                  <span className="ml-1.5 font-mono text-[hsl(var(--text-4))]">{r.count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {([
          ['open', `Needs attention (${c.open})`],
          ['denied', `Denied (${c.denied})`],
          ['pending_approval', `Awaiting approval (${c.pending})`],
          ['allowed', `Allowed (${c.allowed})`],
          ['all', `All (${c.total})`],
        ] as Array<[Filter, string]>).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`rounded-md px-2.5 py-1 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] ${
              filter === key
                ? 'bg-[hsl(var(--surface-3))] text-[hsl(var(--text-1))]'
                : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--surface-2))]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {decisions.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            c.total === 0
              ? 'No tool calls have been authorized yet'
              : 'Nothing matches this filter'
          }
          message={
            c.total === 0
              ? 'Decisions appear here as soon as an agent asks the gateway to authorize a tool call. Until an agent runtime calls the gateway, there is nothing to record — this is an honest empty state, not a failure.'
              : 'Every decision in the current window falls outside this filter.'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
                    <th className="px-4 py-2 font-medium">Decision</th>
                    <th className="px-4 py-2 font-medium">Tool</th>
                    <th className="px-4 py-2 font-medium">Agent</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                    <th className="px-4 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(d => {
                    const tone = TONE[d.decision]
                    const name = (d.toolId && toolName.get(d.toolId)) || d.toolRef
                    return (
                      <tr
                        key={d.id}
                        className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--surface-2))]"
                      >
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.chip}`}>
                            <tone.Icon size={12} />
                            {tone.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {d.toolId ? (
                            <Link
                              to={`/mcp-gateway/tools?open=${d.toolId}`}
                              className="rounded px-1 py-0.5 text-[hsl(var(--text-1))] underline-offset-2 hover:bg-[hsl(var(--surface-3))] hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            // An unknown tool has no record to link to; showing
                            // the raw reference is more use than "Unavailable"
                            // because it is what the caller asked for.
                            <span className="text-[hsl(var(--text-3))]">{name ?? 'Unavailable'}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {d.agentId ? (
                            <Link
                              to={`/agents?open=${d.agentId}`}
                              className="rounded px-1 py-0.5 text-[hsl(var(--text-2))] underline-offset-2 hover:bg-[hsl(var(--surface-3))] hover:underline"
                            >
                              Agent
                            </Link>
                          ) : (
                            <span className="text-[hsl(var(--text-4))]">
                              {d.agentRef ? 'Unregistered' : 'Unavailable'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[hsl(var(--text-2))]">{reasonLabel(d.reasonCode)}</span>
                          {d.hitlItemId && (
                            <Link
                              to="/hitl"
                              className="ml-2 rounded px-1 py-0.5 text-[11px] text-[hsl(var(--text-3))] underline-offset-2 hover:underline"
                            >
                              Review queued →
                            </Link>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-[hsl(var(--text-4))]">
                          {new Date(d.decidedAt).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-[hsl(var(--text-4))]">
        Tool arguments are never stored. The gateway keeps a hash of them so a
        repeated call is recognisable, which is all an audit needs and avoids
        retaining whatever the call carried.
      </p>
    </div>
  )
}
