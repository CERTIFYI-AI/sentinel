// Compliance Autopilot — an honest, compliance-scoped window onto the REAL
// agentic mesh. It reads the same agent_registry catalog and agent_executions
// ledger as Governance Mesh (see meshFleetService), filtered to the agents
// whose category or target modules are compliance-relevant. Nothing here is
// invented: status derives from registry state, the action log is the actual
// execution ledger, and every KPI is computed from those executions only.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Robot } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { useRequiredOrgId } from '../hooks/useTenant'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { fetchMeshExecutions, type MeshExecution } from '../services/meshFleetService'

// Categories (agent_registry.agent_type) that belong to the compliance lane,
// plus target modules that make an agent compliance-relevant regardless of
// its category label.
const COMPLIANCE_TYPES = new Set(['compliance', 'reporting', 'narrative', 'policy'])
const COMPLIANCE_MODULES = new Set([
  'controls', 'frameworks', 'compliance_scores', 'regulator_filings',
  'transparency_reports', 'conformity_assessments', 'policies',
])

interface RegistryAgent {
  id: string
  agentName: string
  agentType: string | null
  runMode: string | null
  status: string | null
  isEnabled: boolean
  description: string | null
  triggerEvents: string[]
  targetModules: string[]
  ownerTeam: string | null
  priority: number | null
}

/** Same read pattern as meshFleetService: catalog rows, mapped at the boundary. */
async function fetchComplianceAgents(): Promise<RegistryAgent[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('agent_registry')
    .select('id, agent_name, agent_type, run_mode, status, is_enabled, description, trigger_events, target_modules, owner_team, priority')
    .order('priority')
  if (error) throw new Error(error.message)
  return (data ?? [])
    .map((r: Record<string, unknown>) => ({
      id: r.id as string,
      agentName: r.agent_name as string,
      agentType: (r.agent_type as string | null) ?? null,
      runMode: (r.run_mode as string | null) ?? null,
      status: (r.status as string | null) ?? null,
      isEnabled: (r.is_enabled as boolean | null) ?? true,
      description: (r.description as string | null) ?? null,
      triggerEvents: (r.trigger_events as string[] | null) ?? [],
      targetModules: (r.target_modules as string[] | null) ?? [],
      ownerTeam: (r.owner_team as string | null) ?? null,
      priority: (r.priority as number | null) ?? null,
    }))
    .filter(a =>
      COMPLIANCE_TYPES.has((a.agentType ?? '').toLowerCase()) ||
      a.targetModules.some(m => COMPLIANCE_MODULES.has(m)))
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  completed: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
  succeeded: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))' },
  started:   { bg: 'hsl(var(--brand-subtle))', text: 'hsl(var(--brand))' },
  failed:    { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
  timeout:   { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))' },
  skipped:   { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' },
}
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_STYLE[status] ?? { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' }
  return (
    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', background: c.bg, color: c.text }}>
      {status}
    </span>
  )
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 90) return `${Math.round(s)}s ago`
  if (s < 5400) return `${Math.round(s / 60)}m ago`
  if (s < 129600) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

export default function ComplianceAutopilot() {
  const orgId = useRequiredOrgId()

  const { data: agents = [], isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ['compliance-autopilot-agents'],
    queryFn: fetchComplianceAgents,
    staleTime: 30_000,
  })
  const { data: executions = [], isLoading: execLoading, error: execError } = useQuery({
    queryKey: ['compliance-autopilot-executions', orgId],
    queryFn: () => fetchMeshExecutions(orgId, 200),
    enabled: !!orgId,
    staleTime: 15_000,
  })

  const agentNames = useMemo(() => new Set(agents.map(a => a.agentName)), [agents])
  // Action log: the real execution ledger, restricted to compliance agents.
  const log = useMemo(
    () => executions.filter(x => agentNames.has(x.agentName)),
    [executions, agentNames],
  )
  const lastRunByAgent = useMemo(() => {
    const map = new Map<string, MeshExecution>()
    for (const x of log) if (!map.has(x.agentName)) map.set(x.agentName, x) // ledger is newest-first
    return map
  }, [log])

  // KPIs — derived from executions only.
  const dayAgo = Date.now() - 86_400_000
  const actions24 = log.filter(x => new Date(x.startedAt).getTime() > dayAgo).length
  const failed = log.filter(x => x.status === 'failed' || x.status === 'timeout').length
  const succeeded = log.filter(x => x.status === 'succeeded' || x.status === 'completed').length
  const lastAction = log[0]?.startedAt ?? null

  const isLoading = agentsLoading || execLoading
  const error = agentsError ?? execError

  if (isLoading) return <PageSkeleton title="Compliance Autopilot" showStats rows={5} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Compliance Autopilot"
        subtitle="The compliance-relevant slice of the governance mesh — real registry agents and their actual execution ledger, nothing simulated"
        icon={Robot}
        actions={
          <div className="flex items-center gap-2">
            <InterlinkChip label="Full fleet → Governance Mesh" to="/governance-mesh" />
            <InterlinkChip label="Automation rules → Automation Studio" to="/automation-studio" />
          </div>
        }
      />

      {error && (
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load the mesh registry</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* KPIs — derived from the execution ledger only */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Compliance Agents', value: String(agents.length), sub: 'Registry rows in the compliance lane', color: 'hsl(var(--brand))' },
          { label: 'Actions (24h)', value: String(actions24), sub: 'Recorded executions', color: 'hsl(var(--text-1))' },
          { label: 'Succeeded / Failed', value: log.length > 0 ? `${succeeded} / ${failed}` : '—', sub: log.length > 0 ? `Across ${log.length} recent executions` : 'No executions recorded yet', color: failed > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' },
          { label: 'Last Action', value: lastAction ? timeAgo(lastAction) : '—', sub: lastAction ? 'From the execution ledger' : 'Nothing recorded yet', color: 'hsl(var(--text-1))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Agent roster */}
      {agents.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-14 text-center">
          <Robot size={28} className="mx-auto mb-3 opacity-40 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-2))]">No compliance-relevant agents found in the registry.</p>
          <p className="text-xs text-[hsl(var(--text-4))] mt-1">
            The mesh catalog seeds them via migration — see the full fleet in{' '}
            <Link to="/governance-mesh" className="underline text-[hsl(var(--brand))]">Governance Mesh</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map(a => {
            const last = lastRunByAgent.get(a.agentName)
            return (
              <Card key={a.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold flex-1" style={{ color: 'hsl(var(--text-1))' }}>{a.agentName}</h3>
                    {a.agentType && (
                      <span className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{a.agentType}</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 uppercase tracking-wide" style={{
                      background: a.isEnabled ? 'hsl(var(--s-ok-bg))' : 'hsl(var(--bg-muted))',
                      color: a.isEnabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))',
                    }}>
                      {a.isEnabled ? (a.runMode === 'continuous' ? 'Continuous' : 'Event-driven') : 'Disabled'}
                    </span>
                  </div>
                  {a.description && <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-3))' }}>{a.description}</p>}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {a.targetModules.map(m => (
                      <span key={m} className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' }}>{m}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>
                    {a.ownerTeam && <span>Team: {a.ownerTeam}</span>}
                    {a.ownerTeam && <span>·</span>}
                    {last ? (
                      <span className="inline-flex items-center gap-1.5">
                        Last run {timeAgo(last.startedAt)} <StatusBadge status={last.status} />
                      </span>
                    ) : (
                      <span>No runs recorded yet for this org</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Action log — the real execution ledger */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle style={{ fontSize: 14 }}>Action Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {log.length === 0 ? (
            <p className="text-sm text-center py-10" style={{ color: 'hsl(var(--text-4))' }}>
              No autonomous actions recorded yet — run a sweep from{' '}
              <Link to="/governance-mesh" className="underline text-[hsl(var(--brand))]">Governance Mesh</Link>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                    {['When', 'Agent', 'Event', 'Status', 'Summary'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {log.slice(0, 50).map(x => (
                    <tr key={x.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-raised">
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>
                        {timeAgo(x.startedAt)}{x.durationMs != null ? ` · ${x.durationMs}ms` : ''}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{x.agentName}</span>
                      </td>
                      <td className="px-3 py-2" style={{ color: 'hsl(var(--text-3))' }}>{x.eventType}</td>
                      <td className="px-3 py-2"><StatusBadge status={x.status} /></td>
                      <td className="px-3 py-2 max-w-[380px]" style={{ color: 'hsl(var(--text-2))' }}>
                        <span className="line-clamp-2">{x.output?.summary ?? x.error ?? '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
