// @ts-nocheck
import { useState, useMemo } from 'react'
import { Globe, Export, Plus, Eye, X, CheckCircle, Clock, Trash, Warning, ChartBar } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useEsgData } from '@/hooks/useEsgData'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { useChartTheme } from '@/hooks/useChartTheme'

function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click()
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Published: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Draft: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  'Under Review': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Approved: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
}

const FRAMEWORKS = ['GRI / SASB', 'GRI / SASB / EU CSRD', 'GRI / SASB / EU CSRD / TCFD', 'TCFD Only', 'ISSB (IFRS S1/S2)', 'CDP + SASB', 'GRI Only']
const PERIODS = ['Q2 2026', 'Q3 2026', 'Q4 2026', '2026 Annual', '2025 Annual']
const AUTHORS = ['Maria Santos', 'Sarah Chen', 'James Patel', 'David Kim', 'Linda Park']

const BLANK_FORM = {
  title: '',
  period: '',
  framework: '',
  author: '',
  status: 'Draft',
  environmentalScore: '',
  socialScore: '',
  governanceScore: '',
  highlights: '',
}

export default function EsgReports() {
  const { items, isLoading, save, remove } = useEsgData()
  const chartTheme = useChartTheme()
  if (isLoading) return <PageSkeleton />

  // Normalize items
  const reports = (items || []).map((r: any) => ({
    id: r.id,
    title: r.title || r.metadata?.title || `ESG Report ${r.id}`,
    period: r.period || r.metadata?.period || '',
    framework: r.framework || r.metadata?.framework || 'GRI / SASB',
    status: r.status || r.metadata?.status || 'Draft',
    publishedDate: r.publishedDate ?? r.published_date ?? r.metadata?.publishedDate,
    author: r.author || r.metadata?.author || '',
    environmentalScore: Number(r.environmentalScore ?? r.environmental_score ?? r.metadata?.environmentalScore ?? 0),
    socialScore: Number(r.socialScore ?? r.social_score ?? r.metadata?.socialScore ?? 0),
    governanceScore: Number(r.governanceScore ?? r.governance_score ?? r.metadata?.governanceScore ?? 0),
    overallScore: Number(r.overallScore ?? r.overall_score ?? r.metadata?.overallScore ?? 0),
    highlights: r.highlights ?? r.metadata?.highlights ?? [],
    aiSpecificMetrics: r.aiSpecificMetrics ?? r.ai_specific_metrics ?? r.metadata?.aiSpecificMetrics ?? [],
  }))

  return <EsgReportsInner reports={reports} save={save} remove={remove} chartTheme={chartTheme} />
}

function EsgReportsInner({ reports: initialReports, save, remove, chartTheme }: any) {
  const [selected, setSelected] = useState<any | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [localReports, setLocalReports] = useState<any[]>([])
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [localUpdates, setLocalUpdates] = useState<Record<string, any>>({})

  const reports = useMemo(() => {
    const merged = [...localReports, ...initialReports.filter((r: any) => !localReports.find((l: any) => l.id === r.id))]
    return merged
      .filter((r: any) => !deletedIds.has(r.id))
      .map((r: any) => localUpdates[r.id] ? { ...r, ...localUpdates[r.id] } : r)
  }, [initialReports, localReports, deletedIds, localUpdates])

  const published = reports.filter((r: any) => r.status === 'Published')
  const latest = published[0]

  // Radar data from live reports
  const radarData = useMemo(() => {
    if (reports.length < 2) return []
    const r0 = reports[0], r1 = reports[1]
    return [
      { subject: 'Environmental', A: r0.environmentalScore, B: r1.environmentalScore },
      { subject: 'Social', A: r0.socialScore, B: r1.socialScore },
      { subject: 'Governance', A: r0.governanceScore, B: r1.governanceScore },
    ]
  }, [reports])

  // Score trend from live data
  const scoreTrend = useMemo(() => {
    return reports.filter((r: any) => r.overallScore > 0).map((r: any) => ({
      period: r.period,
      env: r.environmentalScore,
      social: r.socialScore,
      gov: r.governanceScore,
      overall: r.overallScore,
    }))
  }, [reports])

  async function handleCreate() {
    if (!form.title || !form.period || !form.framework || !form.author) {
      toast.error('Please fill in all required fields')
      return
    }
    const env = Number(form.environmentalScore) || 0
    const soc = Number(form.socialScore) || 0
    const gov = Number(form.governanceScore) || 0
    const overall = env && soc && gov ? Math.round((env + soc + gov) / 3) : 0
    const highlights = form.highlights
      ? form.highlights.split('\n').map((h: string) => h.trim()).filter(Boolean)
      : []

    const newR: any = {
      id: `ESG-${Date.now()}`,
      title: form.title, period: form.period,
      framework: form.framework, status: form.status,
      author: form.author, environmentalScore: env,
      socialScore: soc, governanceScore: gov,
      overallScore: overall, highlights, aiSpecificMetrics: [],
    }
    setLocalReports(p => [newR, ...p])
    setShowCreate(false)
    setForm(BLANK_FORM)
    toast.success(`ESG Report "${newR.title}" created as ${newR.status}`)
    try {
      await save({
        title: newR.title, period: newR.period, framework: newR.framework,
        status: newR.status, author: newR.author,
        environmental_score: env, social_score: soc, governance_score: gov,
        overall_score: overall,
        highlights: highlights,
      })
    } catch {}
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeletedIds(p => new Set([...p, deleteTarget.id]))
    toast.success(`Report "${deleteTarget.title}" deleted`)
    setDeleteTarget(null)
    if (selected?.id === deleteTarget.id) setSelected(null)
    try { await remove(deleteTarget.id) } catch {}
  }

  function handleSubmitForReview(r: any) {
    setLocalUpdates(p => ({ ...p, [r.id]: { status: 'Under Review' } }))
    toast.success(`"${r.title}" submitted for review`)
    setSelected(null)
  }

  function handlePublish(r: any) {
    setLocalUpdates(p => ({ ...p, [r.id]: { status: 'Published', publishedDate: new Date().toISOString().slice(0, 10) } }))
    toast.success(`"${r.title}" published successfully`)
    setSelected(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Globe size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            ESG Reports
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">AI-specific ESG reporting aligned to GRI, SASB, EU CSRD, and TCFD frameworks</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCsv(reports, 'esg-reports.csv')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export CSV</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90"><Plus size={14} /> New Report</button>
        </div>
      </div>

      {/* KPI Strip from latest */}
      {latest && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Environmental Score', value: `${latest.environmentalScore}/100`, color: 'hsl(var(--s-ok-tx))' },
            { label: 'Social Score', value: `${latest.socialScore}/100`, color: 'hsl(var(--brand))' },
            { label: 'Governance Score', value: `${latest.governanceScore}/100`, color: 'hsl(220 90% 56%)' },
            { label: 'Overall ESG Score', value: `${latest.overallScore}/100`, color: 'hsl(var(--text-1))' },
          ].map(s => (
            <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
              <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">{latest.period}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {(radarData.length > 0 || scoreTrend.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {radarData.length > 0 && (
            <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">ESG Dimension Comparison (Latest vs Prior)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
                  <Radar name="Prior" dataKey="B" stroke="hsl(var(--text-4))" fill="hsl(var(--text-4) / 0.1)" strokeWidth={1} strokeDasharray="4 2" />
                  <Radar name="Latest" dataKey="A" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.15)" strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          {scoreTrend.length > 0 && (
            <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
              <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Score Trend by Dimension</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreTrend}>
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: chartTheme.tickColor }} />
                  <Tooltip contentStyle={chartTheme.tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="env" name="Environmental" fill="hsl(142 71% 45% / 0.7)" />
                  <Bar dataKey="social" name="Social" fill="hsl(var(--brand) / 0.7)" />
                  <Bar dataKey="gov" name="Governance" fill="hsl(220 90% 56% / 0.7)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* AI Metrics for latest */}
      {latest && latest.aiSpecificMetrics && latest.aiSpecificMetrics.length > 0 && (
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">AI-Specific Metrics — {latest.period}</h3>
          <div className="grid grid-cols-3 gap-2">
            {latest.aiSpecificMetrics.map((m: any) => (
              <div key={m.metric} className="flex items-center justify-between p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                <span className="text-xs text-[hsl(var(--text-3))]">{m.metric}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[hsl(var(--text-1))]">{m.value}</span>
                  <span className="text-xs font-bold" style={{ color: m.trend === 'up' ? 'hsl(var(--s-ok-tx))' : m.trend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>
                    {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report list */}
      {reports.length === 0 ? (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-12 text-center">
          <Globe size={32} className="mx-auto mb-3 text-[hsl(var(--text-4))]" />
          <p className="text-sm text-[hsl(var(--text-3))]">No ESG reports yet. Create your first report.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r: any) => (
            <div
              key={r.id}
              className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 flex items-center justify-between cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors"
              onClick={() => setSelected(r)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[hsl(var(--brand)/0.1)] border border-[hsl(var(--brand)/0.2)] flex items-center justify-center flex-shrink-0">
                  <Globe size={18} className="text-[hsl(var(--brand))]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{r.title}</h3>
                  <p className="text-xs text-[hsl(var(--text-4))]">{r.framework} · {r.author}{r.publishedDate ? ` · Published ${r.publishedDate}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.overallScore > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-[hsl(var(--text-1))]">{r.overallScore}</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))]">ESG Score</p>
                  </div>
                )}
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[r.status] || STATUS_STYLE.Draft}>{r.status}</span>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(r) }}
                  className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"
                >
                  <Trash size={13} />
                </button>
                <Eye size={14} className="text-[hsl(var(--text-4))]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[500px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{String(selected.id).slice(0, 16)}</p>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.title}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(selected)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={14} /></button>
                <button onClick={() => setSelected(null)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 flex-1">
              <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status] || STATUS_STYLE.Draft}>{selected.status}</span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Period', value: selected.period },
                  { label: 'Framework', value: selected.framework },
                  { label: 'Author', value: selected.author },
                  { label: 'Published', value: selected.publishedDate ?? 'TBD' },
                  ...(selected.overallScore > 0 ? [
                    { label: 'Environmental', value: `${selected.environmentalScore}/100` },
                    { label: 'Social', value: `${selected.socialScore}/100` },
                    { label: 'Governance', value: `${selected.governanceScore}/100` },
                    { label: 'Overall Score', value: `${selected.overallScore}/100` },
                  ] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {selected.highlights && selected.highlights.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Key Highlights</p>
                  <div className="space-y-1.5">
                    {selected.highlights.map((h: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--text-2))]">
                        <CheckCircle size={13} className="text-[hsl(var(--s-ok-tx))] flex-shrink-0 mt-0.5" />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))] space-y-2">
              {selected.status === 'Draft' && (
                <button onClick={() => handleSubmitForReview(selected)} className="w-full py-2 border border-[hsl(var(--brand))] text-[hsl(var(--brand))] text-sm font-medium hover:bg-[hsl(var(--brand)/0.06)]">Submit for Review</button>
              )}
              {selected.status === 'Under Review' && (
                <button onClick={() => handlePublish(selected)} className="w-full py-2 bg-[hsl(var(--s-ok-tx))] text-white text-sm font-medium hover:opacity-90">Approve & Publish</button>
              )}
              <button onClick={() => toast.success('Report downloaded')} className="w-full py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">Download Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
                <Globe size={15} className="text-[hsl(var(--brand))]" />
                Generate ESG Report
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Report Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]"
                  placeholder="e.g. AI ESG Report — Q2 2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Reporting Period *</label>
                  <select value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="">Select period...</option>
                    {PERIODS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Framework *</label>
                  <select value={form.framework} onChange={e => setForm(p => ({ ...p, framework: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="">Select framework...</option>
                    {FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Lead Author *</label>
                  <select value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="">Select author...</option>
                    {AUTHORS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Initial Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                    <option value="Draft">Draft</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-2">ESG Scores (0–100, optional for drafts)</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'environmentalScore', label: 'Environmental' },
                    { key: 'socialScore', label: 'Social' },
                    { key: 'governanceScore', label: 'Governance' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] text-[hsl(var(--text-4))] mb-1 block">{label}</label>
                      <input type="number" min={0} max={100} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" placeholder="0–100" />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Key Highlights (one per line)</label>
                <textarea
                  value={form.highlights}
                  onChange={e => setForm(p => ({ ...p, highlights: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none"
                  placeholder={'Carbon footprint reduced 17%\nRenewable energy at 84%'}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90">Generate Report</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete ESG Report?"
        description={`Permanently remove "${deleteTarget?.title}". This action cannot be undone.`}
        isDestructive
        confirmLabel="Delete Report"
      />
    </div>
  )
}
