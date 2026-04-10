import { useState } from 'react'
import { Speedometer, Export, Eye, X } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'

interface ModelBenchmark {
  id: string
  model: string
  version: string
  task: string
  latencyP50: number
  latencyP99: number
  throughput: number
  accuracy: number
  f1Score: number
  costPerInference: number
  memoryMb: number
  carbonPerInference: number
  complianceScore: number
  biasScore: number
  explainabilityScore: number
  overallScore: number
  benchmarkDate: string
  benchmarkedBy: string
}

const SEED: ModelBenchmark[] = [
  { id: 'BMK-001', model: 'Credit Scoring Model', version: 'v2.1', task: 'Binary Classification', latencyP50: 45, latencyP99: 120, throughput: 2200, accuracy: 89.4, f1Score: 0.871, costPerInference: 0.00012, memoryMb: 840, carbonPerInference: 0.0026, complianceScore: 91, biasScore: 88, explainabilityScore: 94, overallScore: 89, benchmarkDate: '2026-04-08', benchmarkedBy: 'James Liu' },
  { id: 'BMK-002', model: 'Loan Approval Model', version: 'v3.0', task: 'Multi-class Classification', latencyP50: 82, latencyP99: 210, throughput: 1100, accuracy: 87.2, f1Score: 0.858, costPerInference: 0.00028, memoryMb: 1240, carbonPerInference: 0.0038, complianceScore: 84, biasScore: 62, explainabilityScore: 88, overallScore: 78, benchmarkDate: '2026-04-05', benchmarkedBy: 'Maria Santos' },
  { id: 'BMK-003', model: 'Fraud Detection Engine', version: 'v4.2', task: 'Anomaly Detection', latencyP50: 130, latencyP99: 420, throughput: 680, accuracy: 92.1, f1Score: 0.904, costPerInference: 0.00089, memoryMb: 3200, carbonPerInference: 0.0091, complianceScore: 79, biasScore: 77, explainabilityScore: 71, overallScore: 76, benchmarkDate: '2026-03-28', benchmarkedBy: 'James Liu' },
  { id: 'BMK-004', model: 'Customer Churn Predictor', version: 'v2.3', task: 'Binary Classification', latencyP50: 28, latencyP99: 75, throughput: 3500, accuracy: 71.2, f1Score: 0.688, costPerInference: 0.00008, memoryMb: 520, carbonPerInference: 0.0016, complianceScore: 88, biasScore: 84, explainabilityScore: 91, overallScore: 68, benchmarkDate: '2026-04-01', benchmarkedBy: 'James Liu' },
]

const RADAR_MODELS = (b: ModelBenchmark) => [
  { metric: 'Accuracy', value: b.accuracy },
  { metric: 'Compliance', value: b.complianceScore },
  { metric: 'Fairness', value: b.biasScore },
  { metric: 'Explainability', value: b.explainabilityScore },
  { metric: 'Efficiency', value: Math.min(100, Math.round((2200 / b.throughput) * 60)) },
  { metric: 'Latency', value: Math.max(0, 100 - b.latencyP50) },
]

export default function ModelEfficiency() {
  const [selected, setSelected] = useState<ModelBenchmark | null>(null)
  const [compareA, setCompareA] = useState<string>(SEED[0].id)
  const [compareB, setCompareB] = useState<string>(SEED[1].id)

  const mA = SEED.find(b => b.id === compareA)!
  const mB = SEED.find(b => b.id === compareB)!

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Speedometer size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Model Efficiency Benchmarking
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Multi-dimensional model benchmarking — accuracy, latency, cost, carbon, fairness, and explainability</p>
        </div>
        <button onClick={() => toast.success('Benchmarks exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
      </div>

      {/* Comparison */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] mb-4">Model Comparison Radar</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[hsl(var(--brand))]" />
            <select value={compareA} onChange={e => setCompareA(e.target.value)} className="text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] px-2 py-1 focus:outline-none">
              {SEED.map(b => <option key={b.id} value={b.id}>{b.model} {b.version}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[hsl(var(--destructive))]" />
            <select value={compareB} onChange={e => setCompareB(e.target.value)} className="text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] px-2 py-1 focus:outline-none">
              {SEED.map(b => <option key={b.id} value={b.id}>{b.model} {b.version}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-6">
          <ResponsiveContainer width="50%" height={220}>
            <RadarChart data={RADAR_MODELS(mA)}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Radar dataKey="value" stroke="hsl(var(--brand))" fill="hsl(var(--brand) / 0.2)" strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="50%" height={220}>
            <RadarChart data={RADAR_MODELS(mB)}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'hsl(var(--text-4))' }} />
              <Radar dataKey="value" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.2)" strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['Model', 'Task', 'Accuracy', 'P50 Lat', 'P99 Lat', 'Throughput', '$/Inference', 'Carbon/Inf', 'Fairness', 'Explainability', 'Overall', ''].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED.map(b => (
              <tr key={b.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(b)}>
                <td className="px-3 py-3"><p className="text-xs font-medium text-[hsl(var(--text-1))]">{b.model}</p><p className="text-[10px] text-[hsl(var(--text-4))]">{b.version}</p></td>
                <td className="px-3 py-3 text-xs text-[hsl(var(--text-3))]">{b.task}</td>
                <td className="px-3 py-3 text-xs font-mono font-semibold text-[hsl(var(--text-1))]">{b.accuracy.toFixed(1)}%</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.latencyP50}ms</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.latencyP99}ms</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.throughput}/s</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">${b.costPerInference.toFixed(5)}</td>
                <td className="px-3 py-3 text-xs font-mono text-[hsl(var(--text-3))]">{b.carbonPerInference}g</td>
                <td className="px-3 py-3">
                  <span className="text-xs font-bold" style={{ color: b.biasScore >= 80 ? 'hsl(var(--s-ok-tx))' : b.biasScore >= 65 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }}>{b.biasScore}/100</span>
                </td>
                <td className="px-3 py-3 text-xs font-bold text-[hsl(var(--s-ok-tx))]">{b.explainabilityScore}/100</td>
                <td className="px-3 py-3">
                  <span className="text-sm font-bold" style={{ color: b.overallScore >= 80 ? 'hsl(var(--s-ok-tx))' : b.overallScore >= 70 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }}>{b.overallScore}</span>
                </td>
                <td className="px-3 py-3"><Eye size={14} className="text-[hsl(var(--text-4))]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[440px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.model} {selected.version}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Overall Score', value: `${selected.overallScore}/100` },
                  { label: 'Task', value: selected.task },
                  { label: 'Accuracy', value: `${selected.accuracy.toFixed(1)}%` },
                  { label: 'F1 Score', value: selected.f1Score.toFixed(3) },
                  { label: 'P50 Latency', value: `${selected.latencyP50}ms` },
                  { label: 'P99 Latency', value: `${selected.latencyP99}ms` },
                  { label: 'Throughput', value: `${selected.throughput} req/s` },
                  { label: 'Cost / Inference', value: `$${selected.costPerInference.toFixed(5)}` },
                  { label: 'Memory', value: `${selected.memoryMb} MB` },
                  { label: 'Carbon / Inference', value: `${selected.carbonPerInference}g CO₂e` },
                  { label: 'Fairness Score', value: `${selected.biasScore}/100` },
                  { label: 'Explainability', value: `${selected.explainabilityScore}/100` },
                  { label: 'Compliance Score', value: `${selected.complianceScore}/100` },
                  { label: 'Benchmarked By', value: selected.benchmarkedBy },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-sm font-semibold text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
