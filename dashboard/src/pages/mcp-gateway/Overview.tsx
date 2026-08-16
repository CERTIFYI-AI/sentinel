// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MCP Overview — the gateway's posture at a glance. Every figure is computed
// from the real `mcp_servers` / `mcp_tools` registries (the page previously
// showed invented headline percentages); an empty org gets an honest empty
// state rather than fabricated numbers.

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Plugs, Scan, ShieldWarning, Warning } from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/evals/states'
import { useMcpServers, useMcpTools } from '@/hooks/useMcpData'

function Stat({ label, value, tone, hint }: { label: string; value: React.ReactNode; tone?: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">{label}</p>
      <p className={`font-mono text-2xl font-bold ${tone ?? 'text-[hsl(var(--text-1))]'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-[hsl(var(--text-4))]">{hint}</p>}
    </div>
  )
}

export default function McpOverview() {
  const nav = useNavigate()
  const servers = useMcpServers()
  const tools = useMcpTools()

  const m = useMemo(() => {
    const s = servers.data
    const t = tools.data
    const healthy = s.filter((x) => x.status === 'healthy').length
    const unhealthy = s.filter((x) => x.status === 'degraded' || x.status === 'offline')
    const restrictedServers = s.filter((x) => x.approvalState !== 'approved')
    const writeTools = t.filter((x) => x.category !== 'read')
    const hitlTools = t.filter((x) => x.requiresHitl)
    const pendingTools = t.filter((x) => x.approvalState !== 'approved')
    const ungoverned = t.filter((x) => x.allowedAgentIds.length === 0)
    const calls30d = t.reduce((sum, x) => sum + (x.invocations30d ?? 0), 0)
    return {
      servers: s.length, healthy, unhealthy, restrictedServers,
      tools: t.length, writeTools, hitlTools, pendingTools, ungoverned, calls30d,
      healthPct: s.length ? Math.round((healthy / s.length) * 100) : null,
    }
  }, [servers.data, tools.data])

  if (servers.isError || tools.isError) {
    return (
      <div>
        <PageHeader title="MCP Overview" subtitle="Model Context Protocol gateway posture" icon={Plugs} />
        <ErrorState
          message={(servers.error ?? tools.error)?.message}
          onRetry={() => { servers.refetch(); tools.refetch() }}
        />
      </div>
    )
  }

  const loading = servers.isLoading || tools.isLoading

  return (
    <div>
      <PageHeader
        title="MCP Overview"
        subtitle="Model Context Protocol gateway — servers, exposed tools and their governance posture"
        icon={Plugs}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => nav('/mcp-gateway/servers')}>Servers</Button>
            <Button size="sm" variant="secondary" onClick={() => nav('/mcp-gateway/tools')}>Tool Catalog</Button>
          </div>
        }
      />

      {loading ? (
        <div className="p-4 text-sm text-[hsl(var(--text-3))]">Loading gateway posture…</div>
      ) : m.servers === 0 ? (
        <EmptyState
          title="No MCP servers registered"
          message="Register the Model Context Protocol servers your agents connect to — then every tool they expose can be risk-tiered, approved and monitored here."
          actionLabel="Register a server"
          onAction={() => nav('/mcp-gateway/servers')}
        />
      ) : (
        <>
          <Card className="mb-4">
            <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
              <Stat label="Servers" value={m.servers} hint={`${m.healthy} healthy`} />
              <Stat
                label="Health"
                value={m.healthPct == null ? '—' : `${m.healthPct}%`}
                tone={m.healthPct != null && m.healthPct < 80 ? 'text-[hsl(var(--s-wn-tx))]' : 'text-[hsl(var(--s-ok-tx))]'}
                hint="servers reporting healthy"
              />
              <Stat label="Exposed tools" value={m.tools} hint={`${m.writeTools.length} write/execute`} />
              <Stat
                label="Calls (30d)"
                value={m.calls30d ? m.calls30d.toLocaleString() : '—'}
                hint={m.calls30d ? 'recorded invocations' : 'no invocation data yet'}
              />
            </CardContent>
          </Card>

          {/* Governance attention — each row links to the records behind it */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <p className="mb-3 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Needs attention</p>
              {m.unhealthy.length === 0 && m.pendingTools.length === 0 && m.ungoverned.length === 0 && m.restrictedServers.length === 0 ? (
                <p className="text-sm text-[hsl(var(--s-ok-tx))]">Every server is healthy and approved, and every tool has an agent allow-list.</p>
              ) : (
                <div className="space-y-2">
                  {m.unhealthy.length > 0 && (
                    <button onClick={() => nav('/mcp-gateway/servers')}
                      className="flex w-full items-center justify-between border border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-bg))] px-3 py-2 text-left">
                      <span className="flex items-center gap-2 text-sm text-[hsl(var(--s-er-tx))]">
                        <Warning size={14} /> {m.unhealthy.length} server{m.unhealthy.length > 1 ? 's' : ''} degraded or offline
                      </span>
                      <ArrowRight size={14} className="text-[hsl(var(--s-er-tx))]" />
                    </button>
                  )}
                  {m.restrictedServers.length > 0 && (
                    <button onClick={() => nav('/mcp-gateway/servers')}
                      className="flex w-full items-center justify-between border border-[hsl(var(--s-wn-br))] bg-[hsl(var(--s-wn-bg))] px-3 py-2 text-left">
                      <span className="flex items-center gap-2 text-sm text-[hsl(var(--s-wn-tx))]">
                        <ShieldWarning size={14} /> {m.restrictedServers.length} server{m.restrictedServers.length > 1 ? 's' : ''} not fully approved
                      </span>
                      <ArrowRight size={14} className="text-[hsl(var(--s-wn-tx))]" />
                    </button>
                  )}
                  {m.pendingTools.length > 0 && (
                    <button onClick={() => nav('/mcp-gateway/tools')}
                      className="flex w-full items-center justify-between border border-[hsl(var(--s-wn-br))] bg-[hsl(var(--s-wn-bg))] px-3 py-2 text-left">
                      <span className="flex items-center gap-2 text-sm text-[hsl(var(--s-wn-tx))]">
                        <Scan size={14} /> {m.pendingTools.length} tool{m.pendingTools.length > 1 ? 's' : ''} awaiting approval
                      </span>
                      <ArrowRight size={14} className="text-[hsl(var(--s-wn-tx))]" />
                    </button>
                  )}
                  {m.ungoverned.length > 0 && (
                    <button onClick={() => nav('/mcp-gateway/tools')}
                      className="flex w-full items-center justify-between border border-[hsl(var(--border))] bg-[hsl(var(--bg-muted))] px-3 py-2 text-left">
                      <span className="flex items-center gap-2 text-sm text-[hsl(var(--text-2))]">
                        <Scan size={14} /> {m.ungoverned.length} tool{m.ungoverned.length > 1 ? 's' : ''} with no agent allow-list
                      </span>
                      <ArrowRight size={14} className="text-[hsl(var(--text-3))]" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Risk posture of what the gateway exposes */}
          <Card>
            <CardContent className="p-4">
              <p className="mb-3 text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">Exposure posture</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Write / execute tools" value={m.writeTools.length}
                  tone={m.writeTools.length ? 'text-[hsl(var(--s-wn-tx))]' : undefined}
                  hint="can change state in a system of record" />
                <Stat label="Human-review gated" value={m.hitlTools.length} hint="require approval before the call proceeds" />
                <Stat label="Read-only tools" value={m.tools - m.writeTools.length} hint="lookup only, no side effects" />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
