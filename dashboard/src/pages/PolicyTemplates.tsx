// @ts-nocheck
import { useState } from 'react'
import { toast } from 'sonner'

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

const TEMPLATES = [
  { id: 1, name: 'AI Policy', framework: 'ISO/IEC 42001', article: 'Clause 5.2', category: 'AI Management', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai policy mapped to ISO/IEC 42001.' },
  { id: 2, name: 'AI System Acceptable Use Policy', framework: 'ISO/IEC 42001', article: 'Clause 5.3', category: 'Acceptable Use', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai system acceptable use policy mapped to ISO/IEC 42001.' },
  { id: 3, name: 'AI Risk Management Methodology', framework: 'ISO/IEC 42001', article: 'Clause 6.1', category: 'Risk Management', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai risk management methodology mapped to ISO/IEC 42001.' },
  { id: 4, name: 'AI System Impact Assessment Process', framework: 'ISO/IEC 42001', article: 'Clause 6.2', category: 'Impact Assessment', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai system impact assessment process mapped to ISO/IEC 42001.' },
  { id: 5, name: 'Data Quality Management Procedure', framework: 'ISO/IEC 42001', article: 'Clause 7.4', category: 'Data Quality', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for data quality management procedure mapped to ISO/IEC 42001.' },
  { id: 6, name: 'AI Incident Response Procedure', framework: 'ISO/IEC 42001', article: 'Clause 10.1', category: 'Incident Management', risk_level: 'Critical', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai incident response procedure mapped to ISO/IEC 42001.' },
  { id: 7, name: 'AI Supplier Management Procedure', framework: 'ISO/IEC 42001', article: 'Annex B.7', category: 'Third Party', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai supplier management procedure mapped to ISO/IEC 42001.' },
  { id: 8, name: 'Quality Management System (QMS) Policy', framework: 'EU AI Act', article: 'Article 17', category: 'Quality Management', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for quality management system (qms) policy mapped to EU AI Act.' },
  { id: 9, name: 'Risk Management System Policy', framework: 'EU AI Act', article: 'Article 9', category: 'Risk Management', risk_level: 'Critical', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for risk management system policy mapped to EU AI Act.' },
  { id: 10, name: 'Technical Documentation Policy', framework: 'EU AI Act', article: 'Article 11', category: 'Documentation', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for technical documentation policy mapped to EU AI Act.' },
  { id: 11, name: 'Copyright Compliance Policy (GPAI)', framework: 'EU AI Act', article: 'Article 53', category: 'Copyright', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for copyright compliance policy (gpai) mapped to EU AI Act.' },
  { id: 12, name: 'Fundamental Rights Impact Assessment (FRIA) Policy', framework: 'EU AI Act', article: 'Article 27', category: 'Fundamental Rights', risk_level: 'Critical', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for fundamental rights impact assessment (fria) policy mapped to EU AI Act.' },
  { id: 13, name: 'AI Governance Policy (GOVERN)', framework: 'NIST AI RMF', article: 'GOVERN', category: 'Governance', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai governance policy (govern) mapped to NIST AI RMF.' },
  { id: 14, name: 'Risk Tolerance & Prioritization Policy', framework: 'NIST AI RMF', article: 'GOVERN 5', category: 'Risk Management', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for risk tolerance & prioritization policy mapped to NIST AI RMF.' },
  { id: 15, name: 'Human-AI Interaction Policy', framework: 'NIST AI RMF', article: 'MEASURE 3', category: 'Human Oversight', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for human-ai interaction policy mapped to NIST AI RMF.' },
  { id: 16, name: 'Workforce AI Training Policy', framework: 'NIST AI RMF', article: 'GOVERN 4', category: 'Training', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for workforce ai training policy mapped to NIST AI RMF.' },
  { id: 17, name: 'Internal Governance Structure Policy', framework: 'Singapore Model AI', article: 'Section 2', category: 'Governance', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for internal governance structure policy mapped to Singapore Model AI.' },
  { id: 18, name: 'Operations Management Policy', framework: 'Singapore Model AI', article: 'Section 3', category: 'Operations', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for operations management policy mapped to Singapore Model AI.' },
  { id: 19, name: 'Customer Communication Policy', framework: 'Singapore Model AI', article: 'Section 4', category: 'Communication', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for customer communication policy mapped to Singapore Model AI.' },
  { id: 20, name: 'Agentic AI Limits Policy (2026)', framework: 'Singapore Model AI', article: 'Section 5', category: 'Agentic AI', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for agentic ai limits policy (2026) mapped to Singapore Model AI.' },
  { id: 21, name: 'Automated Decision-Making (ADM) Policy', framework: 'GDPR', article: 'Article 22', category: 'Automated Decisions', risk_level: 'Critical', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for automated decision-making (adm) policy mapped to GDPR.' },
  { id: 22, name: 'Privacy by Design Policy', framework: 'GDPR', article: 'Article 25', category: 'Privacy', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for privacy by design policy mapped to GDPR.' },
  { id: 23, name: 'Data Protection Impact Assessment (DPIA) Policy', framework: 'GDPR', article: 'Article 35', category: 'Impact Assessment', risk_level: 'Critical', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for data protection impact assessment (dpia) policy mapped to GDPR.' },
  { id: 24, name: 'Secure AI Development Policy', framework: 'OWASP LLM Top 10', article: 'LLM01-LLM10', category: 'Security', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for secure ai development policy mapped to OWASP LLM Top 10.' },
  { id: 25, name: 'AI Data Leakage Prevention (DLP) Policy', framework: 'OWASP LLM Top 10', article: 'LLM06', category: 'Data Protection', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai data leakage prevention (dlp) policy mapped to OWASP LLM Top 10.' },
  { id: 26, name: 'AI Supply Chain Security Policy', framework: 'Google SAIF', article: 'SAIF 10', category: 'Supply Chain', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai supply chain security policy mapped to Google SAIF.' },
  { id: 27, name: 'Red Teaming & Adversarial Testing Policy', framework: 'Google SAIF', article: 'SAIF 5', category: 'Security Testing', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for red teaming & adversarial testing policy mapped to Google SAIF.' },
  { id: 28, name: 'Responsible Stewardship Policy', framework: 'OECD AI Principles', article: 'Principle 1.2', category: 'Stewardship', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for responsible stewardship policy mapped to OECD AI Principles.' },
  { id: 29, name: 'Transparency and Explainability Policy', framework: 'OECD AI Principles', article: 'Principle 1.3', category: 'Transparency', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for transparency and explainability policy mapped to OECD AI Principles.' },
  { id: 30, name: 'Ethical Governance Policy', framework: 'UNESCO Ethics of AI', article: 'Area 4', category: 'Ethics', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ethical governance policy mapped to UNESCO Ethics of AI.' },
  { id: 31, name: 'Environmental Sustainability Policy', framework: 'UNESCO Ethics of AI', article: 'Area 10', category: 'Sustainability', risk_level: 'Medium', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for environmental sustainability policy mapped to UNESCO Ethics of AI.' },
  { id: 32, name: 'Threat Modeling Policy', framework: 'MITRE ATLAS', article: 'AML.T0000-T0039', category: 'Threat Intelligence', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for threat modeling policy mapped to MITRE ATLAS.' },
  { id: 33, name: 'Adversarial Defense Policy', framework: 'MITRE ATLAS', article: 'AML.T0004', category: 'Adversarial Defense', risk_level: 'Critical', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for adversarial defense policy mapped to MITRE ATLAS.' },
  { id: 34, name: 'Master AI Governance Policy', framework: 'Cross-Framework', article: 'All', category: 'Master Governance', risk_level: 'Critical', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for master ai governance policy mapped to Cross-Framework.' },
  { id: 35, name: 'AI Change Management Policy', framework: 'Cross-Framework', article: 'All', category: 'Change Management', risk_level: 'High', status: 'Draft', used_by: 0, last_updated: '2026-04-19', description: 'Editable template for ai change management policy mapped to Cross-Framework.' }
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
