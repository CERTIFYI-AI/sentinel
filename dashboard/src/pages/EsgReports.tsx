import { useState } from 'react'
import { Globe, Export, Plus, Eye, X, CheckCircle, Clock } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

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
  { id: 'ESG-2026-Q1', title: 'AI ESG Report — Q1 2026', period: 'Q1 2026', framework: 'GRI / SASB / EU CSRD', status: 'Published', publishedDate: '2026-04-08', author: 'Maria Santos', environmentalScore: 82, socialScore: 74, governanceScore: 88, overallScore: 81, highlights: ['Carbon footprint reduced 17% vs Q4 2025 through model optimization', 'Renewable energy: 84% of compute workloads on green infrastructure', 'Bias incidents: 2 (vs 4 in Q4 2025) — 50% improvement', 'AI governance training completion: 94% of relevant staff'], aiSpecificMetrics: [{ metric: 'Total AI Carbon (tCO₂e)', value: '175.7', trend: 'down' }, { metric: 'AI Energy Efficiency (tokens/kWh)', value: '847K', trend: 'up' }, { metric: 'Bias Incident Rate', value: '0.8%', trend: 'down' }, { metric: 'Explainability Coverage', value: '91%', trend: 'up' }, { metric: 'HITL Override Rate', value: '3.2%', trend: 'stable' }, { metric: 'Model Diversity Index', value: '0.78', trend: 'up' }] },
  { id: 'ESG-2025-Q4', title: 'AI ESG Report — Q4 2025', period: 'Q4 2025', framework: 'GRI / SASB', status: 'Published', publishedDate: '2026-01-15', author: 'Maria Santos', environmentalScore: 76, socialScore: 71, governanceScore: 84, overallScore: 77, highlights: ['Baseline established for AI carbon footprint tracking', 'Launched Model Efficiency Benchmarking program', 'EU AI Act readiness assessment initiated', '3 high-risk AI systems formally registered'], aiSpecificMetrics: [{ metric: 'Total AI Carbon (tCO₂e)', value: '211.4', trend: 'stable' }, { metric: 'AI Energy Efficiency (tokens/kWh)', value: '782K', trend: 'stable' }, { metric: 'Bias Incident Rate', value: '1.6%', trend: 'stable' }, { metric: 'Explainability Coverage', value: '84%', trend: 'up' }, { metric: 'HITL Override Rate', value: '3.8%', trend: 'stable' }, { metric: 'Model Diversity Index', value: '0.71', trend: 'stable' }] },
  { id: 'ESG-2026-Q2-DRAFT', title: 'AI ESG Report — Q2 2026 (Draft)', period: 'Q2 2026', framework: 'GRI / SASB / EU CSRD / TCFD', status: 'Draft', author: 'Maria Santos', environmentalScore: 0, socialScore: 0, governanceScore: 0, overallScore: 0, highlights: [], aiSpecificMetrics: [] },
]

const RADAR_DATA = [
  { subject: 'Environmental', Q1: 82, Q4: 76 },
  { subject: 'Social', Q1: 74, Q4: 71 },
  { subject: 'Governance', Q1: 88, Q4: 84 },
  { subject: 'AI Safety', Q1: 78, Q4: 69 },
  { subject: 'Privacy', Q1: 85, Q4: 79 },
  { subject: 'Fairness', Q1: 72, Q4: 65 },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Published: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Draft: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  'Under Review': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Approved: { bg: 'hsl(142 71% 45% / 0.15)', color: 'hsl(var(--s-ok-tx))' },
}

export default function EsgReports() {
  const [selected, setSelected] = useState<ESGReport | null>(null)

  const published = SEED.filter(r => r.status === 'Published')
  const latest = published[0]

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
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
          <button onClick={() => toast.info('New ESG report wizard')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90"><Plus size={14} /> New Report</button>
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
          <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">ESG Dimension Comparison (Q4 2025 vs Q1 2026)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Radar name="Q4 2025" dataKey="Q4" stroke="hsl(var(--text-4))" fill="hsl(var(--text-4) / 0.1)" strokeWidth={1} strokeDasharray="4 2" />
              <Radar name="Q1 2026" dataKey="Q1" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.15)" strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {latest && (
          <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-3">AI-Specific Metrics — {latest.period}</h3>
            <div className="space-y-2">
              {latest.aiSpecificMetrics.map(m => (
                <div key={m.metric} className="flex items-center justify-between p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                  <span className="text-xs text-[hsl(var(--text-3))]">{m.metric}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[hsl(var(--text-1))]">{m.value}</span>
                    <span className="text-[10px]" style={{ color: m.trend === 'up' ? 'hsl(var(--s-ok-tx))' : m.trend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>
                      {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {SEED.map(r => (
          <div key={r.id} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 flex items-center justify-between cursor-pointer hover:border-[hsl(var(--brand)/0.4)]" onClick={() => setSelected(r)}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[hsl(var(--brand)/0.1)] border border-[hsl(var(--brand)/0.2)] flex items-center justify-center">
                <Globe size={18} className="text-[hsl(var(--brand))]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{r.title}</h3>
                <p className="text-xs text-[hsl(var(--text-4))]">{r.framework} · {r.author}{r.publishedDate ? ` · Published ${r.publishedDate}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {r.overallScore > 0 && <div className="text-right"><p className="text-lg font-bold text-[hsl(var(--text-1))]">{r.overallScore}</p><p className="text-[10px] text-[hsl(var(--text-4))]">ESG Score</p></div>}
              <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[r.status]}>{r.status}</span>
              <Eye size={14} className="text-[hsl(var(--text-4))]" />
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.title}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span></div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Period', value: selected.period },
                  { label: 'Framework', value: selected.framework },
                  { label: 'Author', value: selected.author },
                  { label: 'Published', value: selected.publishedDate ?? 'TBD' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {selected.highlights.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Key Highlights</p>
                  <div className="space-y-1.5">{selected.highlights.map((h, i) => <div key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--text-2))]"><span className="text-[hsl(var(--s-ok-tx))] mt-0.5 flex-shrink-0">✓</span>{h}</div>)}</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => toast.success('Report downloaded')} className="w-full py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">Download Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
