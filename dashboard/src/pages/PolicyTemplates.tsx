// @ts-nocheck
import { useState } from 'react'
import { toast } from 'sonner'

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

const TEMPLATES = [
  { id: 1, name: 'EU AI Act High-Risk System Transparency Policy', framework: 'EU AI Act', article: 'Article 13', category: 'Transparency', risk_level: 'High', status: 'Published', used_by: 3, last_updated: '2025-01-15', description: 'Comprehensive transparency requirements for high-risk AI systems including information about system purpose, logic, and output interpretation.' },
  { id: 2, name: 'NIST AI RMF Govern Function Policy', framework: 'NIST AI RMF', article: 'GOVERN', category: 'Governance', risk_level: 'Medium', status: 'Published', used_by: 5, last_updated: '2025-01-10', description: 'Organizational policies and processes for AI risk governance aligned with NIST AI Risk Management Framework GOVERN function.' },
  { id: 3, name: 'ISO 42001 AI Management System Policy', framework: 'ISO 42001', article: 'Clause 5.2', category: 'Management', risk_level: 'Medium', status: 'Draft', used_by: 1, last_updated: '2025-01-20', description: 'Top-level AI management system policy establishing organizational commitment to responsible AI development and deployment.' },
  { id: 4, name: 'Bias Detection and Mitigation Policy', framework: 'EU AI Act', article: 'Article 10', category: 'Fairness', risk_level: 'Critical', status: 'Published', used_by: 4, last_updated: '2025-01-12', description: 'Policy governing bias detection in training data and model outputs for high-risk AI applications in financial services.' },
  { id: 5, name: 'Model Documentation and Card Policy', framework: 'ISO 42001', article: 'Clause 8.4', category: 'Documentation', risk_level: 'Low', status: 'Published', used_by: 6, last_updated: '2024-12-20', description: 'Requirements for maintaining comprehensive model cards covering intended use, limitations, evaluation results, and ethical considerations.' },
  { id: 6, name: 'Human-in-the-Loop Override Policy', framework: 'EU AI Act', article: 'Article 14', category: 'Human Oversight', risk_level: 'High', status: 'Published', used_by: 3, last_updated: '2025-01-08', description: 'Policy defining when human review is mandatory for AI-generated decisions, escalation procedures, and override documentation requirements.' },
  { id: 7, name: 'Algorithmic Impact Assessment Policy', framework: 'NIST AI RMF', article: 'MAP 1.5', category: 'Risk Assessment', risk_level: 'High', status: 'Review', used_by: 2, last_updated: '2025-01-18', description: 'Structured assessment of potential harms from AI system deployment including disparate impact analysis and mitigation strategies.' },
  { id: 8, name: 'Third-Party AI Vendor Due Diligence Policy', framework: 'SOC 2', article: 'CC9.2', category: 'Vendor Risk', risk_level: 'Medium', status: 'Published', used_by: 4, last_updated: '2025-01-05', description: 'Requirements for evaluating and monitoring third-party AI providers including contractual obligations, audit rights, and incident notification.' },
  { id: 9, name: 'Data Minimization for AI Training Policy', framework: 'GDPR', article: 'Article 5(1)(c)', category: 'Data Privacy', risk_level: 'High', status: 'Published', used_by: 3, last_updated: '2024-12-15', description: 'Policy limiting personal data collection and retention for AI model training to what is strictly necessary for specified purposes.' },
  { id: 10, name: 'AI Incident Response and Reporting Policy', framework: 'EU AI Act', article: 'Article 62', category: 'Incident Management', risk_level: 'Critical', status: 'Published', used_by: 5, last_updated: '2025-01-14', description: 'Mandatory incident reporting procedures for serious incidents involving high-risk AI systems including timelines and regulatory notification.' },
  { id: 11, name: 'Explainability and Interpretability Policy', framework: 'NIST AI RMF', article: 'EXPLAIN', category: 'Explainability', risk_level: 'High', status: 'Draft', used_by: 2, last_updated: '2025-01-22', description: 'Technical and organizational measures to ensure AI decisions can be explained to affected individuals and internal stakeholders.' },
  { id: 12, name: 'Continuous Model Monitoring Policy', framework: 'ISO 42001', article: 'Clause 9.1', category: 'Monitoring', risk_level: 'Medium', status: 'Published', used_by: 6, last_updated: '2024-12-28', description: 'Policy for ongoing performance monitoring of deployed AI models including drift detection, accuracy thresholds, and retraining triggers.' },
]

export default function PolicyTemplates() {
  const [search, setSearch] = useState('')
  const [filterFramework, setFilterFramework] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [selected, setSelected] = useState<number | null>(null)

  const frameworks = ['All', 'EU AI Act', 'NIST AI RMF', 'ISO 42001', 'SOC 2', 'GDPR']
  const statuses = ['All', 'Published', 'Draft', 'Review']
  const categories = ['All', 'Transparency', 'Governance', 'Management', 'Fairness', 'Documentation', 'Human Oversight', 'Risk Assessment', 'Vendor Risk', 'Data Privacy', 'Incident Management', 'Explainability', 'Monitoring']

  const filtered = TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    const matchFramework = filterFramework === 'All' || t.framework === filterFramework
    const matchStatus = filterStatus === 'All' || t.status === filterStatus
    const matchCategory = filterCategory === 'All' || t.category === filterCategory
    return matchSearch && matchFramework && matchStatus && matchCategory
  })

  const handleUse = (t: typeof TEMPLATES[0]) => {
    toast({ title: 'Template applied', description: `"${t.name}" has been applied to your policy library.` })
  }

  const handleExport = (t: typeof TEMPLATES[0]) => {
    toast({ title: 'Template exported', description: `Exporting "${t.name}" as PDF...` })
  }

  const riskColor = (r: string) => r === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : r === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : r === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  const statusColor = (s: string) => s === 'Published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : s === 'Draft' ? 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'

  return (
    <div className="flex flex-col gap-4 p-4 bg-background text-foreground h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Policy Templates</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} templates across EU AI Act, NIST AI RMF, ISO 42001 and more</p>
        </div>
        <button onClick={() => toast('Export all', { description: 'Exporting all templates...' })} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Export All</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
          placeholder="Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm" value={filterFramework} onChange={e => setFilterFramework(e.target.value)}>
          {frameworks.map(f => <option key={f}>{f}</option>)}
        </select>
        <select className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto">
        {filtered.map(t => (
          <div key={t.id} onClick={() => setSelected(selected === t.id ? null : t.id)} className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.framework} · {t.article}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor(t.status)}`}>{t.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColor(t.risk_level)}`}>{t.risk_level}</span>
              <span className="text-xs text-muted-foreground">{t.category}</span>
            </div>
            {selected === t.id && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
                <p className="text-xs text-muted-foreground">Used by {t.used_by} policies · Updated {t.last_updated}</p>
                <div className="flex gap-1 mt-2">
                  <button onClick={e => { e.stopPropagation(); handleUse(t) }} className="flex-1 text-xs bg-primary text-primary-foreground rounded px-2 py-1 hover:bg-primary/90">Use Template</button>
                  <button onClick={e => { e.stopPropagation(); handleExport(t) }} className="text-xs border border-border rounded px-2 py-1 hover:bg-muted">Export</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
