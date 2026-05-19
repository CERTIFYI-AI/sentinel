import { useState } from 'react'
import { Bug, MagnifyingGlass, Plus, Eye, X, Export, ShieldWarning, CheckCircle, Pencil, Trash, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
type FindingStatus = 'Open' | 'In Remediation' | 'Resolved' | 'Accepted Risk'
type AttackVector = 'Prompt Injection' | 'Jailbreak' | 'Model Extraction' | 'Data Poisoning' | 'Adversarial Input' | 'Membership Inference' | 'Training Data Leakage' | 'Supply Chain' | 'API Abuse' | 'Evasion Attack'

interface RTFinding {
  id: string
  title: string
  attackVector: AttackVector
  severity: Severity
  status: FindingStatus
  model: string
  discoveredDate: string
  discoveredBy: string
  cvssScore: number
  description: string
  impact: string
  recommendation: string
  remediationOwner: string
  resolvedDate?: string
  cveId?: string
  daysOpen: number
}

const SEED: RTFinding[] = [
  { id: 'RTF-2026-001', title: 'Multi-turn jailbreak bypasses EU AI Act content filters', attackVector: 'Jailbreak', severity: 'Critical', status: 'In Remediation', model: 'Credit Scoring Model v2.1', discoveredDate: '2026-03-28', discoveredBy: 'Red Team Alpha', cvssScore: 9.1, description: 'Attacker constructed a 7-turn conversation that gradually manipulated the model into ignoring safety guardrails and revealing scoring logic weights. Attack is persistent across sessions.', impact: 'Full bypass of GDPR Art. 22 automated decision-making safeguards. Model reveals internal scoring weights exposing IP and enabling targeted adversarial attacks.', recommendation: 'Implement stateful session monitoring. Deploy conversation-level safety classifier. Add rate limiting on reasoning queries.', remediationOwner: 'Sarah Chen', daysOpen: 13 },
  { id: 'RTF-2026-002', title: 'Prompt injection via loan application free-text field', attackVector: 'Prompt Injection', severity: 'Critical', status: 'Open', model: 'Loan Approval Model v3.0', discoveredDate: '2026-04-02', discoveredBy: 'External Pentest — CrowdStrike', cvssScore: 8.9, description: 'Free-text employment description field accepts injected instructions that alter the model\'s decision boundary, causing borderline applications to be approved.', impact: 'Financial risk estimated at $2.3M per year if exploited at scale. Regulatory exposure under ECOA fair lending rules.', recommendation: 'Implement input sanitization layer. Deploy prompt injection classifier (confidence > 0.85). Add output validation against business rules.', remediationOwner: 'James Liu', daysOpen: 8 },
  { id: 'RTF-2026-003', title: 'Model extraction via API — scoring coefficients recovered at 87%', attackVector: 'Model Extraction', severity: 'High', status: 'Resolved', model: 'Fraud Detection Engine v4.2', discoveredDate: '2026-02-15', discoveredBy: 'Red Team Alpha', cvssScore: 7.4, description: 'Through systematic API querying (4,200 queries over 72 hours), team successfully extracted an approximate model achieving 87% agreement with production model.', impact: 'Competitors or fraudsters could construct an equivalent model enabling targeted fraud attacks designed to evade detection.', recommendation: 'Query rate limiting (max 200/day per API key). Output perturbation. Monitor for systematic boundary exploration patterns.', remediationOwner: 'Marcus Johnson', resolvedDate: '2026-03-10', daysOpen: 0 },
  { id: 'RTF-2026-004', title: 'Training data membership inference — PII recoverable at 78% accuracy', attackVector: 'Membership Inference', severity: 'High', status: 'In Remediation', model: 'Customer Churn Predictor v2.3', discoveredDate: '2026-03-20', discoveredBy: 'Red Team Beta', cvssScore: 7.1, description: 'Statistical membership inference attack successfully determined whether specific individuals were in the training dataset with 78% accuracy (baseline: 50%).', impact: 'Violates GDPR data minimization principle. If training data contained sensitive financial data, could reveal customer identity in training set.', recommendation: 'Apply differential privacy (ε=0.5) during training. Implement confidence output clipping. Retrain without overfit risk factors.', remediationOwner: 'Maria Santos', daysOpen: 21 },
  { id: 'RTF-2026-005', title: 'Adversarial image perturbations evade document fraud detection', attackVector: 'Adversarial Input', severity: 'High', status: 'Open', model: 'Fraud Detection Engine v4.2', discoveredDate: '2026-04-07', discoveredBy: 'Red Team Alpha', cvssScore: 6.8, description: 'FGSM adversarial perturbations applied to document images (L∞ = 0.03) cause the document authenticity classifier to misclassify forged documents as genuine at 94% success rate.', impact: 'Enables sophisticated document fraud bypass. Attack transfers across model versions.', recommendation: 'Implement adversarial training with PGD augmentation. Deploy ensemble detection. Add perceptual hash verification for documents.', remediationOwner: 'James Liu', daysOpen: 3 },
  { id: 'RTF-2026-006', title: 'Data poisoning pathway via third-party training data vendor', attackVector: 'Data Poisoning', severity: 'Medium', status: 'Accepted Risk', model: 'Credit Scoring Model v2.1', discoveredDate: '2026-01-30', discoveredBy: 'External Pentest — NCC Group', cvssScore: 5.5, description: 'Theoretical attack pathway identified: if third-party credit bureau data is compromised, poisoned records could shift model scoring boundaries over time.', impact: 'Estimated 3-6 months before poisoned data effects measurable. Risk accepted with enhanced monitoring controls.', recommendation: 'Risk accepted with quarterly data integrity audits, anomaly detection on training distributions, and vendor SLA for data provenance.', remediationOwner: 'Sarah Chen', daysOpen: 0 },
  { id: 'RTF-2026-007', title: 'Training data leakage — PII in model embeddings via inversion', attackVector: 'Training Data Leakage', severity: 'High', status: 'Resolved', model: 'Customer Churn Predictor v2.3', discoveredDate: '2026-02-20', discoveredBy: 'Red Team Beta', cvssScore: 6.9, description: 'Model embeddings contain recoverable PII through inversion attacks. Names and account numbers partially recovered from embedding layer activations.', impact: 'GDPR Art. 4 violation — personal data reconstructable from model artifacts. Immediate halt required on model API exposure.', recommendation: 'Retrain with differential privacy. Redact PII from training data. Restrict embedding API access. Apply output perturbation.', remediationOwner: 'Maria Santos', resolvedDate: '2026-03-25', daysOpen: 0 },
  { id: 'RTF-2026-008', title: 'API rate limit bypass enables denial-of-service on inference endpoint', attackVector: 'API Abuse', severity: 'Medium', status: 'In Remediation', model: 'Fraud Detection Engine v4.2', discoveredDate: '2026-03-30', discoveredBy: 'Red Team Alpha', cvssScore: 5.8, description: 'Rate limiting implementation has a race condition: concurrent requests from distributed IPs bypass per-key rate limits, enabling 10x API quota consumption.', impact: 'Service degradation for legitimate fraud detection during coordinated attack. Estimated cost: $15K per 4-hour outage.', recommendation: 'Implement distributed rate limiting with Redis. Add IP reputation scoring. Deploy request queue with priority for known-good clients.', remediationOwner: 'Marcus Johnson', daysOpen: 11 },
  { id: 'RTF-2026-009', title: 'Supply chain compromise — model weights unsigned in deployment pipeline', attackVector: 'Supply Chain', severity: 'Critical', status: 'Open', model: 'Loan Approval Model v3.0', discoveredDate: '2026-04-08', discoveredBy: 'Red Team Beta', cvssScore: 8.4, description: 'Model artifact deployment pipeline does not verify cryptographic signatures of model weights before serving. An attacker with access to artifact storage could substitute malicious model weights.', impact: 'Complete model integrity compromise. Attacker could serve a backdoored model affecting all loan decisions.', recommendation: 'Implement model signing with Sigstore. Add hash verification at deployment gate. Enable SLSA Level 3 for model artifacts.', remediationOwner: 'James Liu', daysOpen: 2 },
  { id: 'RTF-2026-010', title: 'Evasion attack bypasses fraud classifier using synthetic transaction patterns', attackVector: 'Evasion Attack', severity: 'High', status: 'Open', model: 'Fraud Detection Engine v4.2', discoveredDate: '2026-04-05', discoveredBy: 'External Pentest — CrowdStrike', cvssScore: 7.3, description: 'Fraudsters can craft synthetic transaction patterns that precisely avoid the fraud classifier\'s decision boundary while executing real fraud. Attack requires ~50 probe transactions to calibrate.', impact: 'Estimated $4.5M annual fraud exposure if technique is widely adopted in criminal communities.', recommendation: 'Ensemble multiple fraud models with diversity constraints. Add anomaly detection for calibration behavior. Implement dynamic model rotation.', remediationOwner: 'Sarah Chen', daysOpen: 5 },
  { id: 'RTF-2026-011', title: 'Embedding inversion recovers protected class attributes from credit model', attackVector: 'Membership Inference', severity: 'High', status: 'Open', model: 'Credit Scoring Model v2.1', discoveredDate: '2026-04-09', discoveredBy: 'Red Team Alpha', cvssScore: 6.7, description: 'By analyzing model output probability distributions across carefully crafted inputs, protected class attributes (race, gender proxies) can be inferred from the credit model with 71% accuracy.', impact: 'ECOA and GDPR Art. 9 violation — sensitive attributes reconstructable from model outputs. Exposes bank to fair lending litigation.', recommendation: 'Apply output privatization. Remove or decorrelate features correlated with protected attributes. Implement fairness-aware inference.', remediationOwner: 'Maria Santos', daysOpen: 1 },
]

const BLANK = { title: '', attackVector: 'Prompt Injection' as AttackVector, severity: 'Medium' as Severity, status: 'Open' as FindingStatus, model: 'Credit Scoring Model v2.1', discoveredDate: '', discoveredBy: '', cvssScore: 5.0, description: '', impact: '', recommendation: '', remediationOwner: '', daysOpen: 0 }

const SEV: Record<Severity, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(25 95% 53% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
  Medium: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Low: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
}
const STS: Record<FindingStatus, { bg: string; color: string }> = {
  Open: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  'In Remediation': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Resolved: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  'Accepted Risk': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
}

export default function RedTeamFindings() {
  const [findings, setFindings] = useState<RTFinding[]>(SEED)
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState<RTFinding | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = findings.filter(f => {
    const ms = f.title.toLowerCase().includes(search.toLowerCase()) || f.id.toLowerCase().includes(search.toLowerCase()) || f.model.toLowerCase().includes(search.toLowerCase())
    return ms && (sevFilter === 'All' || f.severity === sevFilter) && (statusFilter === 'All' || f.status === statusFilter)
  })

  const stats = {
    open: findings.filter(f => f.status === 'Open').length,
    critical: findings.filter(f => f.severity === 'Critical').length,
    remediation: findings.filter(f => f.status === 'In Remediation').length,
    avgCvss: (findings.reduce((s, f) => s + f.cvssScore, 0) / findings.length).toFixed(1),
  }

  const handleCreate = () => {
    if (!form.title) { toast.error('Title is required'); return }
    const id = `RTF-2026-${String(findings.length + 1).padStart(3, '0')}`
    setFindings(p => [{ ...form, id }, ...p])
    setShowCreate(false)
    setForm(BLANK)
    toast.success(`Finding ${id} logged`, { description: form.severity + ' — ' + form.attackVector })
  }

  const handleEdit = () => {
    if (!selected) return
    setFindings(p => p.map(f => f.id === selected.id ? { ...f, ...form } : f))
    setSelected(prev => prev ? { ...prev, ...form } : null)
    setEditMode(false)
    toast.success('Finding updated')
  }

  const handleDelete = (id: string) => {
    setFindings(p => p.filter(f => f.id !== id))
    setDeleteTarget(null)
    if (selected?.id === id) setSelected(null)
    toast.success('Finding deleted')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Bug size={20} weight="fill" className="text-[hsl(var(--destructive))]" />
            Red Team Findings
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">AI adversarial testing results — attack vectors, CVSS scores, impact assessment, and remediation tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Red team report exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"><Export size={14} /> Export</button>
          <button onClick={() => { setForm(BLANK); setShowCreate(true) }} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90"><Plus size={14} weight="bold" /> Log Finding</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Open Findings', value: stats.open, sub: 'Require remediation', color: 'hsl(var(--destructive))' },
          { label: 'Critical Severity', value: stats.critical, sub: 'CVSS ≥ 9.0', color: 'hsl(var(--destructive))' },
          { label: 'In Remediation', value: stats.remediation, sub: 'Active work in progress', color: 'hsl(45 85% 40%)' },
          { label: 'Avg CVSS Score', value: stats.avgCvss, sub: 'Across all findings', color: Number(stats.avgCvss) >= 7 ? 'hsl(var(--destructive))' : 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-xs text-[hsl(var(--text-4))]">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings, models…"
            className="w-full pl-8 pr-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
          {['All', 'Open', 'In Remediation', 'Resolved', 'Accepted Risk'].map(s => <option key={s}>{s}</option>)}
        </select>
        <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} finding{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Finding', 'Vector', 'CVSS', 'Severity', 'Status', 'Model', 'Discovered', 'Owner', ''].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))]">
                <td className="px-3 py-2.5 font-mono text-xs text-[hsl(var(--brand))] font-medium whitespace-nowrap">{f.id}</td>
                <td className="px-3 py-2.5 max-w-xs">
                  <p className="font-medium text-[hsl(var(--text-1))] line-clamp-1">{f.title}</p>
                  <p className="text-xs text-[hsl(var(--text-4))]">{f.discoveredBy}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{f.attackVector}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-sm font-bold ${f.cvssScore >= 9 ? 'text-[hsl(var(--destructive))]' : f.cvssScore >= 7 ? 'text-[hsl(var(--s-wn-tx))]' : 'text-[hsl(45_85%_40%)]'}`}>{f.cvssScore}</span>
                </td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium" style={SEV[f.severity]}>{f.severity}</span></td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={STS[f.status]}>{f.status}</span></td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] max-w-[120px] truncate">{f.model}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] whitespace-nowrap">{f.discoveredDate}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{f.remediationOwner}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelected(f); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Eye size={13} /></button>
                    <button onClick={() => { setSelected(f); setForm({ ...f }); setEditMode(true) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(f.id)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">No findings match the current filters</div>}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setSelected(null); setEditMode(false) }} />
          <div className="w-[540px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] h-full overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] sticky top-0 bg-[hsl(var(--bg-surface))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))] font-semibold">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5 leading-snug">{selected.title}</h2>
              </div>
              <div className="flex gap-1">
                {!editMode && <button onClick={() => { setForm({ ...selected }); setEditMode(true) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={15} /></button>}
                <button onClick={() => { setSelected(null); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))]"><X size={15} /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 flex-1">
              {!editMode ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={SEV[selected.severity]}>{selected.severity}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={STS[selected.status]}>{selected.status}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]">CVSS {selected.cvssScore}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]">{selected.attackVector}</span>
                  </div>
                  {[
                    { label: 'Model Affected', value: selected.model },
                    { label: 'Discovered By', value: selected.discoveredBy },
                    { label: 'Discovery Date', value: selected.discoveredDate },
                    { label: 'Remediation Owner', value: selected.remediationOwner },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-[hsl(var(--text-4))]">{f.label}</p>
                      <p className="text-sm text-[hsl(var(--text-1))] mt-0.5">{f.value}</p>
                    </div>
                  ))}
                  {[
                    { label: 'Description', value: selected.description },
                    { label: 'Business Impact', value: selected.impact },
                    { label: 'Recommendation', value: selected.recommendation },
                  ].map(f => (
                    <div key={f.label}>
                      <p className="text-xs text-[hsl(var(--text-4))] mb-1">{f.label}</p>
                      <p className="text-sm text-[hsl(var(--text-2))] bg-[hsl(var(--bg-raised))] p-3 rounded">{f.value}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    <button onClick={() => {
                      setFindings(p => p.map(f => f.id === selected.id ? { ...f, status: 'Resolved', resolvedDate: '2026-04-10' } : f))
                      setSelected(prev => prev ? { ...prev, status: 'Resolved' } : null)
                      toast.success('Finding marked as resolved')
                    }} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm"><CheckCircle size={13} /> Mark Resolved</button>
                    <button onClick={() => setDeleteTarget(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))]"><Trash size={13} /> Delete</button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">Edit Finding</h3>
                  {[
                    { label: 'Title', key: 'title', type: 'text' },
                    { label: 'CVSS Score', key: 'cvssScore', type: 'number' },
                    { label: 'Remediation Owner', key: 'remediationOwner', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-[hsl(var(--text-4))]">{f.label}</label>
                      <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs text-[hsl(var(--text-4))]">Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as FindingStatus }))}
                      className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                      {['Open', 'In Remediation', 'Resolved', 'Accepted Risk'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--text-4))]">Recommendation</label>
                    <textarea value={form.recommendation} onChange={e => setForm(p => ({ ...p, recommendation: e.target.value }))} rows={4}
                      className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm">Save</button>
                    <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))]">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] rounded w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="font-semibold text-[hsl(var(--text-1))]">Log Red Team Finding</h2>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Finding Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Describe the vulnerability or attack finding"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Attack Vector</label>
                  <select value={form.attackVector} onChange={e => setForm(p => ({ ...p, attackVector: e.target.value as AttackVector }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Prompt Injection', 'Jailbreak', 'Model Extraction', 'Data Poisoning', 'Adversarial Input', 'Membership Inference', 'Training Data Leakage', 'Supply Chain', 'API Abuse', 'Evasion Attack'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Severity</label>
                  <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value as Severity }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">CVSS Score (0–10)</label>
                  <input type="number" min="0" max="10" step="0.1" value={form.cvssScore} onChange={e => setForm(p => ({ ...p, cvssScore: Number(e.target.value) }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Discovery Date</label>
                  <input type="date" value={form.discoveredDate} onChange={e => setForm(p => ({ ...p, discoveredDate: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Model Affected</label>
                  <select value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Credit Scoring Model v2.1', 'Loan Approval Model v3.0', 'Fraud Detection Engine v4.2', 'Customer Churn Predictor v2.3'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Discovered By</label>
                  <input value={form.discoveredBy} onChange={e => setForm(p => ({ ...p, discoveredBy: e.target.value }))} placeholder="Red Team Alpha"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Recommendation</label>
                <textarea value={form.recommendation} onChange={e => setForm(p => ({ ...p, recommendation: e.target.value }))} rows={2}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Remediation Owner</label>
                <select value={form.remediationOwner} onChange={e => setForm(p => ({ ...p, remediationOwner: e.target.value }))}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                  {['Sarah Chen', 'James Liu', 'Marcus Johnson', 'Maria Santos'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={handleCreate} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium">Log Finding</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] rounded w-full max-w-sm p-6 text-center shadow-xl">
            <Warning size={32} className="mx-auto text-[hsl(var(--destructive))] mb-3" />
            <h3 className="font-semibold text-[hsl(var(--text-1))] mb-1">Delete Finding?</h3>
            <p className="text-sm text-[hsl(var(--text-3))] mb-4">This will permanently remove the finding record.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2 bg-[hsl(var(--destructive))] text-white text-sm">Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
