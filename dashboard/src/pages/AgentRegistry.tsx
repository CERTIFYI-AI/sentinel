// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// AgentRegistry — central registry for all agentic AI systems.
// Provides lifecycle tracking, permissions, trust scoring, and kill-switch controls.

import { useState } from 'react'
import { Cpu, Plus, Eye, X, Export, Warning, CheckCircle, Power, Pencil, Trash, Shield } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCardRow } from '@/components/ui/StatCardRow'
import { FilterBar } from '@/components/ui/FilterBar'


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
  totalCallsLifetime: number
  avgLatencyMs: number
}

const SEED: AgentRegistryItem[] = [
  { id: 'AGT-001', name: 'LoanProcessorAgent', version: '2.3.1', type: 'Autonomous', status: 'Active', riskTier: 'Critical', owner: 'James Liu', team: 'Lending AI', purpose: 'End-to-end loan application processing including document verification, credit scoring queries, and preliminary decision generation.', tools: ['CreditAPI', 'DocumentVerifier', 'CustomerDB', 'NotificationService', 'AuditLogger'], permissions: ['READ:customer_data', 'WRITE:loan_decisions', 'CALL:credit_bureau_api', 'READ:policy_rules'], model: 'GPT-4o via OpenAI', maxBudget: 5000, dailyCallCount: 1247, lastActivity: '2026-04-10 09:18:00', registeredDate: '2026-01-15', approvedBy: 'Sarah Chen', trustScore: 72, escalationPolicy: 'HITL on decisions > $500K or score < 0.65', killSwitchEnabled: true, totalCallsLifetime: 184291, avgLatencyMs: 1240 },
  { id: 'AGT-002', name: 'FraudInvestigatorAgent', version: '1.8.0', type: 'Semi-Autonomous', status: 'Active', riskTier: 'High', owner: 'Sarah Chen', team: 'Fraud & Security', purpose: 'Investigates flagged transactions by gathering evidence, querying internal databases, and generating investigation reports for human review.', tools: ['TransactionDB', 'DeviceFingerprinter', 'IPGeolocation', 'CustomerHistory', 'CaseManagement'], permissions: ['READ:transaction_data', 'READ:customer_pii', 'WRITE:case_notes', 'CALL:third_party_enrichment'], model: 'Claude 3.5 Sonnet via Anthropic', maxBudget: 2000, dailyCallCount: 342, lastActivity: '2026-04-10 08:55:00', registeredDate: '2026-02-01', approvedBy: 'Sarah Chen', trustScore: 85, escalationPolicy: 'Auto-escalate cases > $50K to Senior Investigator', killSwitchEnabled: true, totalCallsLifetime: 52340, avgLatencyMs: 2100 },
  { id: 'AGT-003', name: 'ComplianceMonitorAgent', version: '3.1.0', type: 'Autonomous', status: 'Active', riskTier: 'High', owner: 'Maria Santos', team: 'GRC', purpose: 'Continuously monitors regulatory feeds, identifies applicable obligations, and maps them to controls. Generates compliance gap reports.', tools: ['RegulatoryFeed', 'ControlsDB', 'PolicyEngine', 'ReportGenerator', 'NotificationService'], permissions: ['READ:compliance_data', 'WRITE:gap_reports', 'CALL:external_regulatory_api', 'READ:policy_library'], model: 'GPT-4o via OpenAI', maxBudget: 1500, dailyCallCount: 89, lastActivity: '2026-04-10 07:00:00', registeredDate: '2026-01-20', approvedBy: 'Maria Santos', trustScore: 91, escalationPolicy: 'Alert human on new Critical obligations within 4 hours', killSwitchEnabled: false, totalCallsLifetime: 21874, avgLatencyMs: 890 },
  { id: 'AGT-004', name: 'CustomerServiceOrchestrator', version: '1.2.0', type: 'Orchestrator', status: 'Suspended', riskTier: 'Medium', owner: 'James Liu', team: 'Digital Banking', purpose: 'Orchestrates sub-agents for customer service: routes queries, manages context, coordinates handoffs between specialist agents.', tools: ['ConversationRouter', 'ContextStore', 'SubAgentSpawner', 'CustomerDB'], permissions: ['READ:customer_profile', 'SPAWN:worker_agents', 'WRITE:conversation_logs'], model: 'GPT-4o-mini via OpenAI', maxBudget: 800, dailyCallCount: 0, lastActivity: '2026-04-07 14:20:00', registeredDate: '2026-03-01', approvedBy: 'Sarah Chen', trustScore: 68, escalationPolicy: 'Suspend on error rate > 5%', killSwitchEnabled: true, totalCallsLifetime: 8920, avgLatencyMs: 450 },
  { id: 'AGT-005', name: 'RiskAssessmentAgent', version: '0.9.0-beta', type: 'Tool-Using', status: 'Pending Approval', riskTier: 'Critical', owner: 'Marcus Johnson', team: 'Risk Management', purpose: 'Automated risk scoring for new financial products. Integrates with risk models and generates board-ready risk reports.', tools: ['RiskModelAPI', 'FinancialDataWarehouse', 'ScenariosEngine', 'ReportGenerator'], permissions: ['READ:financial_data', 'CALL:risk_models', 'WRITE:risk_scores', 'WRITE:board_reports'], model: 'GPT-4 via Azure OpenAI', maxBudget: 3000, dailyCallCount: 0, lastActivity: 'Never', registeredDate: '2026-04-08', approvedBy: 'Pending', trustScore: 0, escalationPolicy: 'All outputs require human sign-off during beta', killSwitchEnabled: true, totalCallsLifetime: 0, avgLatencyMs: 0 },
  { id: 'AGT-006', name: 'DataQualityPatrolAgent', version: '2.0.1', type: 'Worker', status: 'Active', riskTier: 'Low', owner: 'Maria Santos', team: 'Data Engineering', purpose: 'Continuously scans data pipelines for quality issues, schema drift, and PII. Triggers remediation workflows automatically.', tools: ['DataPipelineMonitor', 'PIIScanner', 'SchemaValidator', 'AlertingService'], permissions: ['READ:data_pipelines', 'READ:schema_registry', 'WRITE:quality_alerts'], model: 'Claude 3 Haiku via Anthropic', maxBudget: 500, dailyCallCount: 4521, lastActivity: '2026-04-10 09:20:00', registeredDate: '2025-12-01', approvedBy: 'James Liu', trustScore: 96, escalationPolicy: 'Alert on PII detection or schema breaking changes', killSwitchEnabled: false, totalCallsLifetime: 509124, avgLatencyMs: 145 },
  { id: 'AGT-007', name: 'BiasAuditOrchestrator', version: '1.2.0', type: 'Orchestrator', status: 'Active', riskTier: 'High', owner: 'Maria Santos', team: 'AI Governance', purpose: 'Orchestrates automated bias audits across AI models: data sampling, metric computation, statistical testing, report generation.', tools: ['DataSampler', 'FairnessMetricEngine', 'StatisticalTester', 'ReportGenerator', 'HITLRouter'], permissions: ['READ:training_data', 'CALL:fairness_models', 'WRITE:audit_reports', 'CALL:hitl_queue'], model: 'GPT-4o via OpenAI', maxBudget: 2000, dailyCallCount: 12, lastActivity: '2026-04-10 06:00:00', registeredDate: '2026-02-15', approvedBy: 'Sarah Chen', trustScore: 88, escalationPolicy: 'Escalate to DPO if fairness metric < 0.75', killSwitchEnabled: true, totalCallsLifetime: 1820, avgLatencyMs: 4200 },
  { id: 'AGT-008', name: 'MarketIntelligenceAgent', version: '1.0.0', type: 'Tool-Using', status: 'Active', riskTier: 'Low', owner: 'Emma Wilson', team: 'Strategy', purpose: 'Monitors competitive landscape, regulatory changes, and market conditions. Delivers daily intelligence briefings.', tools: ['WebSearch', 'RegulatoryFeed', 'NewsAPI', 'ReportGenerator', 'SlackNotifier'], permissions: ['CALL:external_web', 'CALL:regulatory_feed', 'WRITE:intelligence_reports', 'SEND:notifications'], model: 'Claude 3.5 Sonnet via Anthropic', maxBudget: 300, dailyCallCount: 45, lastActivity: '2026-04-10 07:30:00', registeredDate: '2026-03-10', approvedBy: 'Marcus Johnson', trustScore: 82, escalationPolicy: 'No auto-escalation — read-only', killSwitchEnabled: false, totalCallsLifetime: 1350, avgLatencyMs: 3100 },
  { id: 'AGT-009', name: 'IncidentResponseAgent', version: '2.1.0', type: 'Semi-Autonomous', status: 'Active', riskTier: 'High', owner: 'Sarah Chen', team: 'Security Operations', purpose: 'First-response AI for security incidents: triage, evidence collection, containment recommendation, and stakeholder notification.', tools: ['SIEMConnector', 'AssetDB', 'ThreatIntel', 'CommunicationHub', 'TicketingSystem'], permissions: ['READ:security_events', 'READ:asset_inventory', 'WRITE:incident_tickets', 'SEND:notifications'], model: 'GPT-4o via OpenAI', maxBudget: 1800, dailyCallCount: 28, lastActivity: '2026-04-10 03:22:00', registeredDate: '2026-01-05', approvedBy: 'Sarah Chen', trustScore: 79, escalationPolicy: 'Auto-escalate P1 incidents to SOC team immediately', killSwitchEnabled: true, totalCallsLifetime: 4127, avgLatencyMs: 1890 },
  { id: 'AGT-010', name: 'PolicyDraftingAgent', version: '0.8.0-beta', type: 'Tool-Using', status: 'Quarantined', riskTier: 'Medium', owner: 'Marcus Johnson', team: 'Legal & Compliance', purpose: 'Drafts AI governance policies, regulatory compliance documents, and control narratives based on framework templates and regulatory guidance.', tools: ['PolicyLibrary', 'RegulatoryDB', 'DocumentEditor', 'ReviewRouter'], permissions: ['READ:policy_library', 'READ:regulatory_db', 'WRITE:draft_policies'], model: 'Claude 3.5 Sonnet via Anthropic', maxBudget: 1000, dailyCallCount: 0, lastActivity: '2026-04-03 15:00:00', registeredDate: '2026-03-20', approvedBy: 'Pending Review', trustScore: 45, escalationPolicy: 'All drafts require legal review before publication', killSwitchEnabled: true, totalCallsLifetime: 284, avgLatencyMs: 5500 },
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

const BLANK = {
  name: '', version: '1.0.0', type: 'Tool-Using' as AgentType, status: 'Pending Approval' as AgentStatus,
  riskTier: 'Medium' as RiskTier, owner: '', team: '', purpose: '', tools: [] as string[],
  permissions: [] as string[], model: 'GPT-4o via OpenAI', maxBudget: 1000, dailyCallCount: 0,
  lastActivity: 'Never', registeredDate: '', approvedBy: 'Pending',
  trustScore: 0, escalationPolicy: '', killSwitchEnabled: true, totalCallsLifetime: 0, avgLatencyMs: 0,
}

export default function AgentRegistry() {
  const [agents, setAgents] = useState<AgentRegistryItem[]>(SEED)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tierFilter, setTierFilter] = useState('All')
  const [selected, setSelected] = useState<AgentRegistryItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filtered = agents.filter(a => {
    const ms = a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()) || a.team.toLowerCase().includes(search.toLowerCase())
    return ms && (statusFilter === 'All' || a.status === statusFilter) && (tierFilter === 'All' || a.riskTier === tierFilter)
  })

  const stats = {
    active: agents.filter(a => a.status === 'Active').length,
    critical: agents.filter(a => a.riskTier === 'Critical').length,
    pending: agents.filter(a => a.status === 'Pending Approval').length,
    avgTrust: Math.round(agents.filter(a => a.trustScore > 0).reduce((s, a) => s + a.trustScore, 0) / agents.filter(a => a.trustScore > 0).length),
  }

  const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (tierFilter !== 'All' ? 1 : 0)

  const handleCreate = () => {
    if (!form.name) { toast.error('Agent name is required'); return }
    const id = `AGT-${String(agents.length + 1).padStart(3, '0')}`
    setAgents(p => [{ ...form, id, registeredDate: '2026-04-10' }, ...p])
    setShowCreate(false)
    setForm(BLANK)
    toast.success(`${form.name} registered as ${id}`)
  }

  const handleEdit = () => {
    if (!selected) return
    setAgents(p => p.map(a => a.id === selected.id ? { ...a, ...form } : a))
    setSelected(prev => prev ? { ...prev, ...form } : null)
    setEditMode(false)
    toast.success('Agent record updated')
  }

  const handleDelete = (id: string) => {
    setAgents(p => p.filter(a => a.id !== id))
    setDeleteTarget(null)
    if (selected?.id === id) setSelected(null)
    toast.success('Agent deregistered')
  }

  const toggleKillSwitch = (id: string) => {
    setAgents(p => p.map(a => a.id === id ? { ...a, status: a.status === 'Active' ? 'Suspended' : 'Active' } : a))
    toast.success('Kill switch toggled')
  }

  // RegisterAgentButton rendered inline as an actions node
  const RegisterAgentButton = (
    <div className="flex gap-2">
      <button
        onClick={() => toast.success('Agent registry exported')}
        className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]"
      >
        <Export size={14} /> Export
      </button>
      <button
        onClick={() => { setForm(BLANK); setShowCreate(true) }}
        className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90"
      >
        <Plus size={14} weight="bold" /> Register Agent
      </button>
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agent Registry"
        subtitle="Register and govern autonomous AI agents — lifecycle tracking, permissions, trust scoring, and kill-switch controls"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Agents' }]}
        actions={RegisterAgentButton}
      />

      <StatCardRow
        cards={[
          {
            label: 'Total Agents',
            value: agents.length,
            description: `Total Agents: ${agents.length}`,
          },
          {
            label: 'Active',
            value: stats.active,
            description: `Active Agents: ${stats.active}`,
          },
          {
            label: 'Critical Risk Tier',
            value: stats.critical,
            description: `Critical Risk Tier Agents: ${stats.critical} — require enhanced oversight`,
          },
          {
            label: 'Avg Trust Score',
            value: `${stats.avgTrust}%`,
            description: `Average Trust Score: ${stats.avgTrust}% across active agents`,
          },
        ]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search agents, teams…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter === 'All' ? '' : statusFilter,
            onChange: v => setStatusFilter(v || 'All'),
            options: ['Active', 'Suspended', 'Quarantined', 'Pending Approval', 'Decommissioned'].map(s => ({ label: s, value: s })),
          },
          {
            key: 'tier',
            label: 'Risk Tier',
            value: tierFilter === 'All' ? '' : tierFilter,
            onChange: v => setTierFilter(v || 'All'),
            options: ['Critical', 'High', 'Medium', 'Low'].map(t => ({ label: t, value: t })),
          },
        ]}
        activeFilterCount={activeFilterCount}
        onClearAll={() => { setSearch(''); setStatusFilter('All'); setTierFilter('All') }}
        trailing={
          <span className="text-xs text-[hsl(var(--text-4))]">{filtered.length} agent{filtered.length !== 1 ? 's' : ''}</span>
        }
      />

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['Agent', 'Type', 'Model', 'Risk Tier', 'Status', 'Trust', 'Daily Calls', 'Kill Switch', 'Actions'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))]">
                <td className="px-3 py-2.5">
                  <p className="font-medium text-[hsl(var(--text-1))]">{a.name}</p>
                  <p className="text-xs text-[hsl(var(--text-4))]">{a.id} · v{a.version} · {a.team}</p>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))]">{a.type}</td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-3))] max-w-[120px] truncate">{a.model}</td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium" style={TIER_STYLE[a.riskTier]}>{a.riskTier}</span></td>
                <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={STATUS_STYLE[a.status]}>{a.status}</span></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-14 bg-[hsl(var(--bg-raised))] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.trustScore}%`, background: a.trustScore >= 80 ? 'hsl(var(--s-ok-tx))' : a.trustScore >= 60 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }} />
                    </div>
                    <span className="text-xs font-medium text-[hsl(var(--text-2))]">{a.trustScore}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-[hsl(var(--text-2))] font-medium">{a.dailyCallCount.toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  {a.killSwitchEnabled ? (
                    <button onClick={() => toggleKillSwitch(a.id)} className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${a.status === 'Active' ? 'border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(0_72%_51%/0.08)]' : 'border-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))] hover:bg-[hsl(142_71%_45%/0.08)]'}`}>
                      <Power size={10} />{a.status === 'Active' ? 'Suspend' : 'Resume'}
                    </button>
                  ) : <span className="text-xs text-[hsl(var(--text-4))]">N/A</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelected(a); setEditMode(false) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Eye size={13} /></button>
                    <button onClick={() => { setSelected(a); setForm({ ...a }); setEditMode(true) }} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(a.id)} className="p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-[hsl(var(--text-4))]">No agents match the current filters</div>}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setSelected(null); setEditMode(false) }} />
          <div className="w-[540px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] h-full overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] sticky top-0 bg-[hsl(var(--bg-surface))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))] font-semibold">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))] mt-0.5">{selected.name} <span className="text-xs font-normal text-[hsl(var(--text-4))]">v{selected.version}</span></h2>
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
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={TIER_STYLE[selected.riskTier]}>{selected.riskTier} Risk</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))]">{selected.type}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Owner', value: selected.owner },
                      { label: 'Team', value: selected.team },
                      { label: 'Model', value: selected.model },
                      { label: 'Approved By', value: selected.approvedBy },
                      { label: 'Daily Calls', value: selected.dailyCallCount.toLocaleString() },
                      { label: 'Lifetime Calls', value: selected.totalCallsLifetime.toLocaleString() },
                      { label: 'Avg Latency', value: selected.avgLatencyMs + ' ms' },
                      { label: 'Max Budget', value: '$' + selected.maxBudget.toLocaleString() + '/mo' },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-[hsl(var(--text-4))]">{f.label}</p>
                        <p className="text-sm text-[hsl(var(--text-1))] mt-0.5 font-medium">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Trust Score</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[hsl(var(--bg-raised))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${selected.trustScore}%`, background: selected.trustScore >= 80 ? 'hsl(var(--s-ok-tx))' : selected.trustScore >= 60 ? 'hsl(45 85% 40%)' : 'hsl(var(--destructive))' }} />
                      </div>
                      <span className="text-lg font-bold text-[hsl(var(--text-1))]">{selected.trustScore}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Purpose</p>
                    <p className="text-sm text-[hsl(var(--text-2))] bg-[hsl(var(--bg-raised))] p-3 rounded">{selected.purpose}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">Tools ({selected.tools.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.tools.map(t => <span key={t} className="px-2 py-0.5 text-xs bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-3))] rounded">{t}</span>)}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-2">Permissions ({selected.permissions.length})</p>
                    <div className="space-y-1">
                      {selected.permissions.map(p => (
                        <div key={p} className="flex items-center gap-2 text-xs text-[hsl(var(--text-2))]">
                          <Shield size={10} className="text-[hsl(var(--brand))]" />
                          <code className="font-mono">{p}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1">Escalation Policy</p>
                    <p className="text-sm text-[hsl(var(--text-2))] bg-[hsl(var(--bg-raised))] p-3 rounded">{selected.escalationPolicy}</p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-[hsl(var(--border))]">
                    {selected.killSwitchEnabled && (
                      <button onClick={() => { toggleKillSwitch(selected.id); setSelected(p => p ? { ...p, status: p.status === 'Active' ? 'Suspended' : 'Active' } : null) }}
                        className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))]">
                        <Power size={13} /> {selected.status === 'Active' ? 'Suspend' : 'Resume'}
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(selected.id)} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--destructive))]"><Trash size={13} /> Deregister</button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Edit Agent</h3>
                  {[
                    { label: 'Agent Name', key: 'name' },
                    { label: 'Version', key: 'version' },
                    { label: 'Owner', key: 'owner' },
                    { label: 'Team', key: 'team' },
                    { label: 'Escalation Policy', key: 'escalationPolicy' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-[hsl(var(--text-4))]">{f.label}</label>
                      <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} // any: dynamic key access
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Status</label>
                      <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as AgentStatus }))}
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                        {['Active', 'Suspended', 'Quarantined', 'Decommissioned', 'Pending Approval'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[hsl(var(--text-4))]">Risk Tier</label>
                      <select value={form.riskTier} onChange={e => setForm(p => ({ ...p, riskTier: e.target.value as RiskTier }))}
                        className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                        {['Critical', 'High', 'Medium', 'Low'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[hsl(var(--text-4))]">Trust Score (0–100)</label>
                    <input type="number" min="0" max="100" value={form.trustScore} onChange={e => setForm(p => ({ ...p, trustScore: Number(e.target.value) }))}
                      className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm">Save</button>
                    <button onClick={() => setEditMode(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
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
              <h2 className="font-semibold text-[hsl(var(--text-1))]">Register New Agent</h2>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Agent Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="MyComplianceAgent"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Version</label>
                  <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} placeholder="1.0.0"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as AgentType }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Autonomous', 'Semi-Autonomous', 'Tool-Using', 'Multi-Modal', 'Orchestrator', 'Worker'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Risk Tier</label>
                  <select value={form.riskTier} onChange={e => setForm(p => ({ ...p, riskTier: e.target.value as RiskTier }))}
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                    {['Critical', 'High', 'Medium', 'Low'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Owner</label>
                  <input value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} placeholder="John Smith"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
                <div>
                  <label className="text-xs text-[hsl(var(--text-4))]">Team</label>
                  <input value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} placeholder="AI Platform"
                    className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">LLM / Model</label>
                <select value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none">
                  {['GPT-4o via OpenAI', 'GPT-4o-mini via OpenAI', 'Claude 3.5 Sonnet via Anthropic', 'Claude 3 Haiku via Anthropic', 'GPT-4 via Azure OpenAI', 'Llama 3 70B via Groq'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Purpose</label>
                <textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} rows={3} placeholder="Describe what this agent does…"
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none resize-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div>
                <label className="text-xs text-[hsl(var(--text-4))]">Max Monthly Budget (USD)</label>
                <input type="number" value={form.maxBudget} onChange={e => setForm(p => ({ ...p, maxBudget: Number(e.target.value) }))}
                  className="w-full mt-0.5 px-3 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-sm outline-none focus:border-[hsl(var(--brand))]" />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={handleCreate} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium">Register Agent</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ConfirmDialog for destructive delete action */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] rounded w-full max-w-sm p-6 text-center shadow-xl">
            <Warning size={32} className="mx-auto text-[hsl(var(--destructive))] mb-3" />
            <h3 className="font-semibold text-[hsl(var(--text-1))] mb-1">Deregister Agent?</h3>
            <p className="text-sm text-[hsl(var(--text-3))] mb-4">This will permanently remove the agent from the registry. This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2 bg-[hsl(var(--destructive))] text-white text-sm">Deregister</button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
