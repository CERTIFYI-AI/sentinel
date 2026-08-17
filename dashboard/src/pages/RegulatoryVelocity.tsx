// Regulatory Velocity — change pressure derived entirely from the org-scoped
// regulation_entries register. "Velocity" here means how many tracked
// regulations become effective in the next 90/180 days, computed from the
// stored effective dates via daysUntil() at render time. No scores, trends or
// impact levels are invented: obligations come from the jsonb, and impacted
// models are the union of linkedModelIds resolved through ai_models.id.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Gauge, Globe, ArrowSquareOut } from '@phosphor-icons/react'
import { Card, CardContent } from '../components/ui/card'
import { PageHeader } from '../components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { HorizonBadge, OB_STYLE } from '@/components/ui/HorizonBadge'
import { useRegulationEntries } from '@/hooks/useRiskIncidents'
import { useModelsData } from '@/hooks/useModelsData'
import { daysUntil, type RegulationEntryRecord } from '@/services/riskGroupService'

/** Per-entry obligation status tallies — straight from the jsonb. */
function obligationTallies(r: RegulationEntryRecord) {
  const tallies: Record<string, number> = {}
  for (const ob of r.obligations) {
    const key = (ob.status ?? 'unmapped').toLowerCase()
    tallies[key] = (tallies[key] ?? 0) + 1
  }
  return tallies
}

export default function RegulatoryVelocity() {
  const { items, isLoading, error } = useRegulationEntries()
  const { models } = useModelsData()
  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable'

  // KPIs — derived only.
  const within90 = items.filter(r => { const d = daysUntil(r.effectiveOn); return d != null && d >= 0 && d <= 90 })
  const within180 = items.filter(r => { const d = daysUntil(r.effectiveOn); return d != null && d >= 0 && d <= 180 })
  const totalObligations = items.reduce((s, r) => s + r.obligations.length, 0)
  const metObligations = items.reduce((s, r) => s + r.obligations.filter(o => (o.status ?? '').toLowerCase() === 'mapped').length, 0)
  const openObligations = totalObligations - metObligations

  // Per-jurisdiction breakdown, counted from real rows.
  const byJurisdiction = useMemo(() => {
    const map = new Map<string, { total: number; upcoming90: number; inForce: number }>()
    for (const r of items) {
      const key = r.jurisdiction?.trim() || 'Unspecified'
      const row = map.get(key) ?? { total: 0, upcoming90: 0, inForce: 0 }
      row.total += 1
      const d = daysUntil(r.effectiveOn)
      if (d != null && d < 0) row.inForce += 1
      if (d != null && d >= 0 && d <= 90) row.upcoming90 += 1
      map.set(key, row)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total)
  }, [items])

  // Upcoming changes: dated entries sorted by computed days-until (in-force
  // entries excluded — they are no longer "upcoming").
  const upcoming = useMemo(() =>
    items
      .map(r => ({ r, d: daysUntil(r.effectiveOn) }))
      .filter((x): x is { r: RegulationEntryRecord; d: number } => x.d != null && x.d >= 0)
      .sort((a, b) => a.d - b.d),
    [items])

  // Models impacted = union of linkedModelIds across all entries.
  const impactedModelIds = useMemo(() => {
    const set = new Set<string>()
    for (const r of items) for (const id of r.linkedModelIds ?? []) set.add(id)
    return Array.from(set)
  }, [items])

  if (isLoading) return <PageSkeleton title="Regulatory Velocity" showStats rows={5} />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Regulatory Velocity"
        subtitle="Change pressure computed from the regulation register — effective-date horizons, obligation totals and model exposure, nothing invented"
        icon={Gauge}
      />

      {error && (
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load regulation entries</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {items.length === 0 && !error ? (
        <div className="rounded border border-[hsl(var(--border))] bg-surface py-14 text-center">
          <Gauge size={28} className="mx-auto mb-3 opacity-40 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-2))]">No regulations tracked yet — there is no velocity to compute.</p>
          <p className="text-xs text-[hsl(var(--text-4))] mt-1">
            Start tracking entries in <Link to="/reg-radar" className="underline text-[hsl(var(--brand))]">Reg Radar</Link>; every figure on this page derives from that register.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs — all computed from loaded rows */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Effective Within 90 Days', value: String(within90.length), sub: 'Computed from effective dates', color: within90.length > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' },
              { label: 'Effective Within 180 Days', value: String(within180.length), sub: `Of ${items.length} tracked regulations`, color: 'hsl(var(--text-1))' },
              { label: 'Obligations Open vs Met', value: totalObligations > 0 ? `${openObligations} / ${metObligations}` : '—', sub: totalObligations > 0 ? 'Open (not mapped) vs mapped to controls' : 'No obligations extracted yet', color: openObligations > 0 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' },
              { label: 'Models Impacted', value: String(impactedModelIds.length), sub: 'Union of models linked in the register', color: 'hsl(var(--brand))' },
            ].map(s => (
              <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
                <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Upcoming changes */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-sm font-semibold text-[hsl(var(--text-1))]">Upcoming Changes</p>
              {upcoming.length === 0 ? (
                <div className="rounded border border-[hsl(var(--border))] bg-surface py-10 text-center">
                  <p className="text-sm text-[hsl(var(--text-4))]">No tracked regulation has a future effective date.</p>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-1">
                    Add effective dates in <Link to="/reg-radar" className="underline text-[hsl(var(--brand))]">Reg Radar</Link> to build the horizon.
                  </p>
                </div>
              ) : (
                upcoming.map(({ r, d }) => {
                  const tallies = obligationTallies(r)
                  return (
                    <Link
                      key={r.id}
                      to={`/reg-radar/${r.id}`}
                      className="block rounded border bg-surface p-4 hover:border-[hsl(var(--brand)/0.4)] transition-colors"
                      style={{ borderColor: d <= 90 ? 'hsl(var(--destructive) / 0.4)' : 'hsl(var(--border))' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {r.regulationRef && <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{r.regulationRef}</span>}
                            {r.jurisdiction && <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{r.jurisdiction}</span>}
                            <HorizonBadge effectiveOn={r.effectiveOn} compact />
                          </div>
                          <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{r.name}</p>
                          {r.obligations.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {Object.entries(tallies).map(([status, count]) => (
                                <span key={status} className="text-[10px] px-1.5 py-0.5 font-medium" style={OB_STYLE[status] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                                  {count} {status}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] italic text-[hsl(var(--text-4))] mt-2">No obligations extracted yet.</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-[hsl(var(--text-4))]">Effective</p>
                          <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{r.effectiveOn}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Right rail: jurisdictions + impacted models */}
            <div className="space-y-4">
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'hsl(var(--text-1))' }}>
                    <Globe size={14} /> By Jurisdiction
                  </p>
                  <div className="space-y-2">
                    {byJurisdiction.map(([jur, row]) => (
                      <div key={jur} className="flex items-center justify-between text-xs border-b border-[hsl(var(--border))] pb-2 last:border-b-0 last:pb-0">
                        <span className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{jur}</span>
                        <span style={{ color: 'hsl(var(--text-4))' }}>
                          {row.total} tracked · {row.inForce} in force
                          {row.upcoming90 > 0 && <strong style={{ color: 'hsl(var(--destructive))' }}> · {row.upcoming90} due ≤90d</strong>}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Models Impacted</p>
                  <p className="text-[11px] mb-3" style={{ color: 'hsl(var(--text-4))' }}>Every model linked to at least one tracked regulation.</p>
                  {impactedModelIds.length === 0 ? (
                    <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>
                      No models linked in the register yet — link models from Regulatory Intelligence.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {impactedModelIds.map(id => (
                        <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-4))]">
                <span>Maintain the register in</span>
                <Link to="/reg-radar" className="inline-flex items-center gap-1 text-[hsl(var(--brand))] hover:underline">
                  Reg Radar <ArrowSquareOut size={12} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
