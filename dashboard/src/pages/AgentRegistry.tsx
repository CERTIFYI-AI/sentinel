import { useState } from 'react'
import { Cpu, MagnifyingGlass, Plus, Eye, X, Export, Warning, CheckCircle, Power } from '@phosphor-icons/react'
import { toast } from 'sonner'

type AgentStatus = 'Active' | 'Suspended' | 'Quarantined' | 'Decommissioned' | 'Pending Approval'
type AgentType = 'Autonomous' | 'Semi-Autonomous' | 'Tool-Using' | 'Multi-Modal' | 'Orchestrator' | 'Worker'
type RiskTier = 'Critical' | 'High' | 'Medium' | 'Low'

interface AgentRegistryItem {
  id: string
  name: string
  version: string
  type: AgentType
  status: AgentStatus
  riskTier: RiskTier
  owner: string
  team: string
  purpose: string
  tools: string[]
  permissions: string[]
  model: string
  maxBudget: number
  dailyCallCount: number
  lastActivity: string
  registeredDate: string
  approvedBy: string
  trustScore: number
  escalationPolicy: string
  killSwitchEnabled: boolean
}

const SEED: AgentRegistryItem[] = [
  { id: 'AGT-001', name: 'LoanProcessorAgent', version: '2.3.1', type: 'Autonomous', status: 'Active', riskTier: 'Critical', owner: 'James Liu', team: 'Lending AI', purpose: 'End-to-end loan application processing including document verification, credit scoring queries, and preliminary decision generation.', tools: ['CreditAPI', 'DocumentVerifier', 'CustomerDB', 'NotificationService', 'AuditLogger'], permissions: ['READ:customer_data', 'WRITE:loan_decisions', 'CALL:credit_bureau_api', 'READ:policy_rules'], model: 'GPT-4o via OpenAI', maxBudget: 5000, dailyCallCount: 1247, lastActivity: '2026-04-10 09:18:00', registeredDate: '2026-01-15', approvedBy: 'Sarah Chen', trustScore: 72, escalationPolicy: 'HITL on decisions > $500K or score < 0.65', killSwitchEnabled: true },
  { id: 'AGT-002', name: 'FraudInvestigatorAgent', version: '1.8.0', type: 'Semi-Autonomous', status: 'Active', riskTier: 'High', owner: 'Sarah Chen', team: 'Fraud & Security', purpose: 'Investigates flagged transactions by gathering evidence, querying internal databases, and generating investigation reports for human review.', tools: ['TransactionDB', 'DeviceFingerprinter', 'IPGeolocation', 'CustomerHistory', 'CaseManagement'], permissions: ['READ:transaction_data', 'READ:customer_pii', 'WRITE:case_notes', 'CALL:third_party_enrichment'], model: 'Claude 3.5 Sonnet via Anthropic', maxBudget: 2000, dailyCallCount: 342, lastActivity: '2026-04-10 08:55:00', registeredDate: '2026-02-01', approvedBy: 'Sarah Chen', trustScore: 85, escalationPolicy: 'Auto-escalate cases > $50K to Senior Investigator', killSwitchEnabled: true },
  { id: 'AGT-003', name: 'ComplianceMonitorAgent', version: '3.1.0', type: 'Autonomous', status: 'Active', riskTier: 'High', owner: 'Maria Santos', team: 'GRC', purpose: 'Continuously monitors regulatory feeds, identifies applicable obligations, and maps them to controls. Generates compliance gap reports.', tools: ['RegulatoryFeed', 'ControlsDB', 'PolicyEngine', 'ReportGenerator', 'NotificationService'], permissions: ['READ:compliance_data', 'WRITE:gap_reports', 'CALL:external_regulatory_api', 'READ:policy_library'], model: 'GPT-4o via OpenAI', maxBudget: 1500, dailyCallCount: 89, lastActivity: '2026-04-10 07:00:00', registeredDate: '2026-01-20', approvedBy: 'Maria Santos', trustScore: 91, escalationPolicy: 'Alert human on new Critical obligations within 4 hours', killSwitchEnabled: false },
  { id: 'AGT-004', name: 'CustomerServiceOrchestrator', version: '1.2.0', type: 'Orchestrator', status: 'Suspended', riskTier: 'Medium', owner: 'James Liu', team: 'Digital Banking', purpose: 'Orchestrates sub-agents for customer service: routes queries, manages context, coordinates handoffs between specialist agents.', tools: ['ConversationRouter', 'ContextStore', 'SubAgentSpawner', 'CustomerDB'], permissions: ['READ:customer_profile', 'SPAWN:worker_agents', 'WRITE:conversation_logs'], model: 'GPT-4o-mini via OpenAI', maxBudget: 800, dailyCallCount: 0, lastActivity: '2026-04-07 14:20:00', registeredDate: '2026-03-01', approvedBy: 'Sarah Chen', trustScore: 68, escalationPolicy: 'Suspend on error rate > 5%', killSwitchEnabled: true },
  { id: 'AGT-005', name: 'RiskAssessmentAgent', version: '0.9.0-beta', type: 'Tool-Using', status: 'Pending Approval', riskTier: 'Critical', owner: 'Marcus Johnson', team: 'Risk Management', purpose: 'Automated risk scoring for new financial products. Integrates with risk models and generates board-ready risk reports.', tools: ['RiskModelAPI', 'FinancialDataWarehouse', 'ScenariosEngine', 'ReportGenerator'], permissions: ['READ:financial_data', 'CALL:risk_models', 'WRITE:risk_scores', 'WRITE:board_reports'], model: 'GPT-4 via Azure OpenAI', maxBudget: 3000, dailyCallCount: 0, lastActivity: 'Never', registeredDate: '2026-04-08', approvedBy: 'Pending', trustScore: 0, escalationPolicy: 'All outputs require human sign-off during beta', killSwitchEnabled: true },
  { id: 'AGT-006', name: 'DataQualityPatrolAgent', version: '2.0.1', type: 'Worker', status: 'Active', riskTier: 'Low', owner: 'Maria Santos', team: 'Data Engineering', purpose: 'Continuously scans data pipelines for quality issues, schema drift, and PII. Triggers remediation workflows automatically.', tools: ['DataPipelineMonitor', 'PIIScanner', 'SchemaValidator', 'AlertingService'], permissions: ['READ:data_pipelines', 'READ:schema_registry', 'WRITE:quality_alerts'], model: 'Claude 3 Haiku via Anthropic', maxBudget: 500, dailyCallCount: 4521, lastActivity: '2026-04-10 09:20:00', registeredDate: '2025-12-01', approvedBy: 'James Liu', trustScore: 96, escalationPolicy: 'Alert on PII detection or schema breaking changes', killSwitchEnabled: false },
]

const STATUS_STYLE: Record<AgentStatus, { bg: string; color: string }> = {
  Active: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Suspended: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Quarantined: { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  Decommissioned: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' },
  'Pending Approval': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
}

const TIER_STYLE: Record<RiskTier, { bg: string; color: string }> = {
  Critical: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  High: { bg: 'hsl(25 95% 53% / 0.12)', color: 'hsl(var(--s-wn-tx))' },
  Medium: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Low: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
}

export default function AgentRegistry() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tierFilter, setTierFilter] = useState('All')
  const [selected, setSelected] = useState<AgentRegistryItem | null>(null)
  const [agents, setAgents] = useState(SEED)

  const filtered = agents.filter(a => {
    const ms = a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()) || a.team.toLowerCase().includes(search.toLowerCase())
    return ms && (statusFilter === 'All' || a.status === statusFilter) && (tierFilter === 'All' || a.riskTier === tierFilter)
  })

  const stats = {
    total: agents.length,
    active: agents.filter(a => a.status === 'Active').length,
    critical: agents.filter(a => a.riskTier === 'Critical').length,
    avgTrust: Math.round(agents.filter(a => a.trustScore > 0).reduce((s, a) => s + a.trustScore, 0) / agents.filter(a => a.trustScore > 0).length),
  }

  const handleSuspend = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'Suspended' as AgentStatus } : a))
    setSelected(null)
    toast.success('Agent suspended')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Cpu size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Agent Registry
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Centralized registry of all autonomous and semi-autonomous AI agents with governance controls</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => toast.info('Agent registration wizard')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> Register Agent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Registered Agents', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Active', value: stats.active, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Critical Risk Tier', value: stats.critical, color: 'hsl(var(--destructive))' },
          { label: 'Avg Trust Score', value: `${stats.avgTrust}/100`, color: stats.avgTrust >= 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Active', 'Suspended', 'Quarantined', 'Pending Approval', 'Decommissioned'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['Agent ID', 'Name / Version', 'Type', 'Team', 'Model', 'Trust Score', 'Risk Tier', 'Status', 'Kill Switch', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(a)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{a.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[hsl(var(--text-1))] text-xs">{a.name}</p>
                  <p className="text-[10px] text-[hsl(var(--text-4))]">v{a.version}</p>
                </td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{a.type}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{a.team}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))] max-w-[120px] truncate">{a.model}</td>
                <td className="px-4 py-3">
                  {a.trustScore > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.trustScore}%`, background: a.trustScore >= 80 ? 'hsl(var(--s-ok-tx))' : a.trustScore >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }} />
                      </div>
                      <span className="text-xs font-mono text-[hsl(var(--text-2))]">{a.trustScore}</span>
                    </div>
                  ) : <span className="text-xs text-[hsl(var(--text-4))]">N/A</span>}
                </td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={TIER_STYLE[a.riskTier]}>{a.riskTier}</span></td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[a.status]}>{a.status}</span></td>
                <td className="px-4 py-3">
                  {a.killSwitchEnabled
                    ? <Power size={14} className="text-[hsl(var(--s-ok-tx))]" weight="fill" title="Kill switch enabled" />
                    : <Power size={14} className="text-[hsl(var(--text-4))]" weight="regular" title="Kill switch disabled" />
                  }
                </td>
                <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No agents match filters</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.name} <span className="text-[hsl(var(--text-4))] font-normal">v{selected.version}</span></h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                <span className="text-[11px] px-2 py-0.5 font-medium" style={TIER_STYLE[selected.riskTier]}>{selected.riskTier} Risk</span>
                <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.type}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Owner', value: selected.owner },
                  { label: 'Team', value: selected.team },
                  { label: 'Model', value: selected.model },
                  { label: 'Trust Score', value: `${selected.trustScore}/100` },
                  { label: 'Max Budget', value: `$${selected.maxBudget}/day` },
                  { label: 'Daily Calls', value: selected.dailyCallCount.toLocaleString() },
                  { label: 'Approved By', value: selected.approvedBy },
                  { label: 'Last Activity', value: selected.lastActivity },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Purpose</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.purpose}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Tools / Integrations</p>
                <div className="flex flex-wrap gap-1">{selected.tools.map(t => <span key={t} className="text-[10px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{t}</span>)}</div>
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Permissions</p>
                <div className="space-y-1">{selected.permissions.map(p => <div key={p} className="font-mono text-[10px] text-[hsl(var(--text-2))] p-1.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{p}</div>)}</div>
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Escalation Policy</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.escalationPolicy}</p></div>
            </div>
            {selected.status === 'Active' && (
              <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                <button onClick={() => handleSuspend(selected.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm font-medium hover:bg-[hsl(0_72%_51%/0.05)]">
                  <Power size={14} /> Suspend Agent
                </button>
                <button onClick={() => { toast.success('Viewing agent audit log'); setSelected(null) }} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
                  View Audit Log
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
