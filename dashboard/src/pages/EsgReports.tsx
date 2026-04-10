import { useState } from 'react'
import { Globe, Export, Plus, Eye, X, CheckCircle, Clock, Trash, PencilSimple, Warning, ChartBar } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

interface ESGReport {
  id: string
  title: string
  period: string
  framework: string
  status: 'Published' | 'Draft' | 'Under Review' | 'Approved'
  publishedDate?: string
  author: string
  environmentalScore: number
  socialScore: number
  governanceScore: number
  overallScore: number
  highlights: string[]
  aiSpecificMetrics: { metric: string; value: string; trend: 'up' | 'down' | 'stable' }[]
}

const SEED: ESGReport[] = [
  {
    id: 'ESG-2026-Q1', title: 'AI ESG Report — Q1 2026', period: 'Q1 2026', framework: 'GRI / SASB / EU CSRD',
    status: 'Published', publishedDate: '2026-04-08', author: 'Maria Santos',
    environmentalScore: 82, socialScore: 74, governanceScore: 88, overallScore: 81,
    highlights: [
      'Carbon footprint reduced 17% vs Q4 2025 through model optimization',
      'Renewable energy: 84% of compute workloads on green infrastructure',
      'Bias incidents: 2 (vs 4 in Q4 2025) — 50% improvement',
      'AI governance training completion: 94% of relevant staff',
    ],
    aiSpecificMetrics: [
      { metric: 'Total AI Carbon (tCO₂e)', value: '175.7', trend: 'down' },
      { metric: 'AI Energy Efficiency (tokens/kWh)', value: '847K', trend: 'up' },
      { metric: 'Bias Incident Rate', value: '0.8%', trend: 'down' },
      { metric: 'Explainability Coverage', value: '91%', trend: 'up' },
      { metric: 'HITL Override Rate', value: '3.2%', trend: 'stable' },
      { metric: 'Model Diversity Index', value: '0.78', trend: 'up' },
    ],
  },
  {
    id: 'ESG-2025-Q4', title: 'AI ESG Report — Q4 2025', period: 'Q4 2025', framework: 'GRI / SASB',
    status: 'Published', publishedDate: '2026-01-15', author: 'Maria Santos',
    environmentalScore: 76, socialScore: 71, governanceScore: 84, overallScore: 77,
    highlights: [
      'Baseline established for AI carbon footprint tracking',
      'Launched Model Efficiency Benchmarking program',
      'EU AI Act readiness assessment initiated',
      '3 high-risk AI systems formally registered',
    ],
    aiSpecificMetrics: [
      { metric: 'Total AI Carbon (tCO₂e)', value: '211.4', trend: 'stable' },
      { metric: 'AI Energy Efficiency (tokens/kWh)', value: '782K', trend: 'stable' },
      { metric: 'Bias Incident Rate', value: '1.6%', trend: 'stable' },
      { metric: 'Explainability Coverage', value: '84%', trend: 'up' },
      { metric: 'HITL Override Rate', value: '3.8%', trend: 'stable' },
      { metric: 'Model Diversity Index', value: '0.71', trend: 'stable' },
    ],
  },
  {
    id: 'ESG-2026-Q2-DRAFT', title: 'AI ESG Report — Q2 2026 (Draft)', period: 'Q2 2026',
    framework: 'GRI / SASB / EU CSRD / TCFD', status: 'Draft', author: 'Maria Santos',
    environmentalScore: 0, socialScore: 0, governanceScore: 0, overallScore: 0,
    highlights: [], aiSpecificMetrics: [],
  },
]

const RADAR_DATA = [
  { subject: 'Environmental', Q1: 82, Q4: 76 },
  { subject: 'Social', Q1: 74, Q4: 71 },
  { subject: 'Governance', Q1: 88, Q4: 84 },
  { subject: 'AI Safety', Q1: 78, Q4: 69 },
  { subject: 'Privacy', Q1: 85, Q4: 79 },
  { subject: 'Fairness', Q1: 72, Q4: 65 },
]

const SCORE_TREND = [
  { period: 'Q3 2025', env: 70, social: 66, gov: 79, overall: 72 },
  { period: 'Q4 2025', env: 76, social: 71, gov: 84, overall: 77 },
  { period: 'Q1 2026', env: 82, social: 74, gov: 88, overall: 81 },
]

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
  status: 'Draft' as const,
  environmentalScore: '',
  socialScore: '',
  governanceScore: '',
  highlights: '',
}

export default function EsgReports() {
  const [reports, setReports] = useState<ESGReport[]>(SEED)
  const [selected, setSelected] = useState<ESGReport | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ESGReport | null>(null)
  const [form, setForm] = useState(BLANK_FORM)

  const published = reports.filter(r => r.status === 'Published')
  const latest = published[0]

  function handleCreate() {
    if (!form.title || !form.period || !form.framework || !form.author) {
      toast.error('Please fill in all required fields')
      return
    }
    const env = Number(form.environmentalScore) || 0
    const soc = Number(form.socialScore) || 0
    const gov = Number(form.governanceScore) || 0
    const overall = env && soc && gov ? Math.round((env + soc + gov) / 3) : 0
    const highlights = form.highlights
      ? form.highlights.split('\n').map(h => h.trim()).filter(Boolean)
      : []

    const newR: ESGReport = {
      id: `ESG-${Date.now()}`,
      title: form.title,
      period: form.period,
      framework: form.framework,
      status: form.status,
      author: form.author,
      environmentalScore: env,
      socialScore: soc,
      governanceScore: gov,
      overallScore: overall,
      highlights,
      aiSpecificMetrics: [],
    }
    setReports(p => [newR, ...p])
    setShowCreate(false)
    setForm(BLANK_FORM)
    toast.success(`ESG Report "${newR.title}" created as ${newR.status}`)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setReports(p => p.filter(r => r.id !== deleteTarget.id))
    toast.success(`Report "${deleteTarget.title}" deleted`)
    setDeleteTarget(null)
    if (selected?.id === deleteTarget.id) setSelected(null)
  }

  function handleSubmitForReview(r: ESGReport) {
    setReports(p => p.map(x => x.id === r.id ? { ...x, status: 'Under Review' as const } : x))
    toast.success(`"${r.title}" submitted for review`)
    setSelected(null)
  }

  function handlePublish(r: ESGReport) {
    setReports(p => p.map(x => x.id === r.id ? { ...x, status: 'Published' as const, publishedDate: new Date().toISOString().slice(0, 10) } : x))
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
          <button onClick={() => toast.success('ESG reports exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
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
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">ESG Dimension Comparison (Q4 2025 vs Q1 2026)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Radar name="Q4 2025" dataKey="Q4" stroke="hsl(var(--text-4))" fill="hsl(var(--text-4) / 0.1)" strokeWidth={1} strokeDasharray="4 2" />
              <Radar name="Q1 2026" dataKey="Q1" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.15)" strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">Score Trend by Dimension</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SCORE_TREND}>
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="env" name="Environmental" fill="hsl(142 71% 45% / 0.7)" />
              <Bar dataKey="social" name="Social" fill="hsl(var(--brand) / 0.7)" />
              <Bar dataKey="gov" name="Governance" fill="hsl(220 90% 56% / 0.7)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Metrics for latest */}
      {latest && latest.aiSpecificMetrics.length > 0 && (
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">AI-Specific Metrics — {latest.period}</h3>
          <div className="grid grid-cols-3 gap-2">
            {latest.aiSpecificMetrics.map(m => (
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
      <div className="space-y-2">
        {reports.map(r => (
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
              <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[r.status]}>{r.status}</span>
              <button
                onClick={e => { e.stopPropagation(); setDeleteTarget(r) }}
                className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]"
              >
                <Trash size={13} />
              </button>
              <Eye size={14} className="text-[hsl(var(--text-4))]" />
            </div>
          </div>
        ))}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[500px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.title}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(selected)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--s-er-bg))]"><Trash size={14} /></button>
                <button onClick={() => setSelected(null)} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]"><X size={16} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 flex-1">
              <div className="flex gap-2">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
              </div>
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
              {selected.highlights.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Key Highlights</p>
                  <div className="space-y-1.5">
                    {selected.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--text-2))]">
                        <CheckCircle size={13} className="text-[hsl(var(--s-ok-tx))] flex-shrink-0 mt-0.5" />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.aiSpecificMetrics.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">AI Metrics</p>
                  <div className="space-y-1">
                    {selected.aiSpecificMetrics.map(m => (
                      <div key={m.metric} className="flex items-center justify-between p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <span className="text-xs text-[hsl(var(--text-3))]">{m.metric}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[hsl(var(--text-1))]">{m.value}</span>
                          <span className="text-xs" style={{ color: m.trend === 'up' ? 'hsl(var(--s-ok-tx))' : m.trend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>
                            {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selected.status === 'Draft' && (
                <div className="p-3 border border-[hsl(45_93%_47%_/_0.4)] bg-[hsl(45_93%_47%_/_0.06)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={13} className="text-[hsl(45_85%_40%)]" />
                    <p className="text-xs font-medium text-[hsl(45_85%_40%)]">Draft Report</p>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--text-4))]">Fill in all ESG scores and highlights, then submit for review before publishing.</p>
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
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
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
                  placeholder={'Carbon footprint reduced 17%\nRenewable energy at 84%\nBias incidents reduced 50%'}
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
