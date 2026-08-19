// Regulation Detail — one entry from the org-scoped regulation_entries
// register, addressed by uuid (or regulationRef as a fallback). The
// obligations checklist reads the real jsonb; toggling an obligation persists
// through save() on the parent entry (write throws; success toast fires only
// from the mutation's onSuccess). Linked models and risks resolve to chips.
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Warning, Clock, Globe, ListChecks, ArrowSquareOut, CalendarBlank } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { InterlinkChip } from '@/components/ui/InterlinkChip'
import { obStyle } from '@/components/ui/HorizonBadge'
import { useRegulationEntries } from '@/hooks/useRiskIncidents'
import { useModelsData } from '@/hooks/useModelsData'
import { useRisksData } from '@/hooks/useRisksData'
import { daysUntil, type RegulationEntryRecord } from '@/services/riskGroupService'
import { safeExternalUrl } from '@/lib/url';

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  enacted:  { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  guidance: { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  draft:    { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
}
const statusStyle = (s?: string): React.CSSProperties =>
  STATUS_STYLE[(s ?? '').toLowerCase()] ?? { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }

export default function RegDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, isLoading, error, save, isSaving } = useRegulationEntries()
  const { models } = useModelsData()
  const { risks } = useRisksData()
  const modelName = (mid: string) => models.find(m => m.id === mid)?.name ?? 'Unavailable'
  const riskName = (rid: string) => risks.find((r: any) => r.id === rid)?.title ?? 'Unavailable'

  // The row that failed to toggle stays visually unchanged — no optimistic lie.
  const [togglingRef, setTogglingRef] = useState<string | null>(null)

  const regulation: RegulationEntryRecord | undefined =
    items.find(r => r.id === id) ?? items.find(r => r.regulationRef === id)

  if (isLoading) return <PageSkeleton title="Regulation Detail" rows={4} />

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/reg-radar')} style={{ padding: '4px 8px' }}>
          <ArrowLeft size={14} /> Back to Reg Radar
        </Button>
        <div role="alert" className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load the regulation register</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!regulation) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--s-wn-tx))' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Regulation not found</p>
        <p className="mt-1 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
          No entry in the register matches this id — it may have been deleted.
        </p>
        <Button className="mt-4" onClick={() => navigate('/reg-radar')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} /> Back to Reg Radar
        </Button>
      </div>
    )
  }

  const days = daysUntil(regulation.effectiveOn)
  const isInForce = days != null && days < 0
  const isUrgent = days != null && days >= 0 && days <= 90

  const obligations = regulation.obligations
  const mappedCount = obligations.filter(o => (o.status ?? '').toLowerCase() === 'mapped').length

  // Toggling flips mapped ↔ unmapped and persists the whole obligations array
  // back to the parent entry. Other statuses (partial/exempt) are shown
  // read-only as stored — toggling from them marks the obligation mapped.
  const toggleObligation = async (ref: string) => {
    if (!regulation.id || isSaving) return
    const next = obligations.map(o =>
      o.ref === ref
        ? { ...o, status: (o.status ?? '').toLowerCase() === 'mapped' ? 'unmapped' : 'mapped' }
        : o)
    setTogglingRef(ref)
    try {
      await save({ ...regulation, obligations: next })
    } catch {
      // Error toast fires from the mutation; the list re-renders from the
      // unchanged cache, so no fake state persists.
    } finally {
      setTogglingRef(null)
    }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/reg-radar')} style={{ padding: '4px 8px' }}>
        <ArrowLeft size={14} /> Back to Reg Radar
      </Button>

      {isInForce && (
        <div style={{ background: 'hsl(var(--s-ok-bg))', border: '1px solid hsl(var(--s-ok-br))', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarBlank size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-ok-tx))' }}>
            In force since {regulation.effectiveOn} ({Math.abs(days!)} days ago).
          </p>
        </div>
      )}
      {isUrgent && (
        <div style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-br))', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} style={{ color: 'hsl(var(--s-wn-tx))' }} />
          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-wn-tx))' }}>
            Effective in {days} days ({regulation.effectiveOn}).
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {regulation.regulationRef && <span className="font-mono text-xs text-[hsl(var(--brand))]">{regulation.regulationRef}</span>}
            {regulation.status && <span className="text-[11px] px-2 py-0.5 font-medium" style={statusStyle(regulation.status)}>{regulation.status}</span>}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{regulation.name}</h1>
          <p className="text-sm mt-1 flex items-center gap-3 flex-wrap" style={{ color: 'hsl(var(--text-3))' }}>
            {regulation.jurisdiction && <span className="inline-flex items-center gap-1"><Globe size={13} /> {regulation.jurisdiction}</span>}
            {regulation.owner && <span>Owner: {regulation.owner}</span>}
            {regulation.relevanceScore != null && <span>Relevance: {regulation.relevanceScore}</span>}
          </p>
        </div>
        {regulation.sourceUrl && (
          <a href={safeExternalUrl(regulation.sourceUrl) ?? undefined} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[hsl(var(--brand))] hover:underline">
            View official source <ArrowSquareOut size={12} />
          </a>
        )}
      </div>

      {/* Meta row — every figure from the entry itself */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Effective Date',
            value: regulation.effectiveOn ?? 'Not set',
            sub: days == null ? 'No countdown without a date' : days < 0 ? `${Math.abs(days)} days ago` : `${days} days remaining`,
          },
          {
            label: 'Obligations',
            value: obligations.length > 0 ? `${mappedCount}/${obligations.length}` : '—',
            sub: obligations.length > 0 ? 'mapped to controls' : 'None extracted yet',
          },
          {
            label: 'Compliance Gap',
            value: regulation.gapPercent != null ? `${regulation.gapPercent}%` : '—',
            sub: regulation.gapPercent != null ? 'From the register' : 'Not assessed yet',
          },
          {
            label: 'Models in Scope',
            value: String((regulation.linkedModelIds ?? []).length),
            sub: 'Linked via ai_models.id',
          },
        ].map(m => (
          <Card key={m.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardContent className="p-4">
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{m.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{m.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Requirements Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {regulation.requirementsSummary ? (
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{regulation.requirementsSummary}</p>
          ) : (
            <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>No summary recorded for this regulation yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Obligations checklist — statuses from the jsonb; toggles persist */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'hsl(var(--text-1))' }}>
              <ListChecks size={15} /> Obligations
            </CardTitle>
            {obligations.length > 0 && (
              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{mappedCount} of {obligations.length} mapped</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {obligations.length === 0 ? (
            <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>
              No obligations extracted yet for this regulation.
            </p>
          ) : (
            obligations.map((ob, i) => {
              const isMapped = (ob.status ?? '').toLowerCase() === 'mapped'
              const busy = isSaving && togglingRef === ob.ref
              return (
                <label
                  key={`${ob.ref}-${i}`}
                  className="flex items-start gap-3 cursor-pointer"
                  style={{
                    padding: '10px 12px',
                    background: isMapped ? 'hsl(var(--s-ok-bg))' : 'transparent',
                    border: `1px solid ${isMapped ? 'hsl(var(--s-ok-br))' : 'hsl(var(--border))'}`,
                    opacity: busy ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isMapped}
                    disabled={isSaving}
                    onChange={() => toggleObligation(ob.ref)}
                    aria-label={`Mark obligation ${ob.ref} as ${isMapped ? 'unmapped' : 'mapped'}`}
                    style={{ accentColor: 'hsl(var(--s-ok-tx))', marginTop: 2, flexShrink: 0 }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px]" style={{ color: 'hsl(var(--brand))' }}>{ob.ref}</span>
                      <span className="text-[10px] px-1.5 py-0.5 font-medium" style={obStyle(ob.status)}>{ob.status}</span>
                      {busy && <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Saving…</span>}
                    </div>
                    <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{ob.title}</p>
                  </div>
                </label>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Interlinks */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Models in Scope</CardTitle>
          </CardHeader>
          <CardContent>
            {(regulation.linkedModelIds ?? []).length === 0 ? (
              <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>No models linked to this regulation yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(regulation.linkedModelIds ?? []).map(mid => (
                  <InterlinkChip key={mid} label={modelName(mid)} to={`/models/inventory/${mid}`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked Risks</CardTitle>
          </CardHeader>
          <CardContent>
            {(regulation.linkedRiskIds ?? []).length === 0 ? (
              <p className="text-xs italic" style={{ color: 'hsl(var(--text-4))' }}>No risks linked to this regulation yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(regulation.linkedRiskIds ?? []).map(rid => (
                  <InterlinkChip key={rid} label={riskName(rid)} to={`/risks?open=${rid}`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
        Gap tracking and control mapping for this entry live in{' '}
        <Link to="/risk-intelligence" className="underline text-[hsl(var(--brand))]">Regulatory Intelligence</Link> — the risk lens on the same register.
      </p>
    </div>
  )
}
