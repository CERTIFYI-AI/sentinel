import { useState, useMemo } from 'react'
import { Lightning, Plus, X, Play, Pause, Copy, MagnifyingGlass, CheckCircle, Warning, Clock, ArrowRight, Gear, FlowArrow, Bell, Shield, FileText, Robot, Code, Download, Eye } from '@phosphor-icons/react'
import { toast } from 'sonner'

type WorkflowStatus = 'Active' | 'Paused' | 'Draft' | 'Error'
type TriggerType = 'Risk Threshold' | 'Control Failure' | 'Model Drift' | 'Regulatory Deadline' | 'Incident Created' | 'Evidence Gap' | 'Approval Required' | 'Scheduled' | 'API/Webhook' | 'CI/CD Gate'
type ActionType = 'Create Task' | 'Notify Slack' | 'Open Jira Ticket' | 'ServiceNow Incident' | 'Email Stakeholder' | 'Block Deployment' | 'Request Approval' | 'Generate Report' | 'Remediation Task' | 'Regulatory Notification'

interface WorkflowNode {
  id: string
  type: 'trigger' | 'condition' | 'action'
  nodeType: TriggerType | string | ActionType
  label: string
  config: Record<string, string>
}

interface Workflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus
  trigger: TriggerType
  actions: ActionType[]
  lastRun: string
  runCount: number
  successRate: number
  category: string
  integrations: string[]
  isTemplate?: boolean
  nodes: WorkflowNode[]
}

const TEMPLATES: Workflow[] = [
  {
    id: 'WF-T001', name: 'EU AI Act — Conformity Gate', description: 'Block model deployments that fail EU AI Act conformity checks. Auto-creates Jira ticket and notifies compliance team.', status: 'Active', trigger: 'CI/CD Gate', actions: ['Block Deployment', 'Open Jira Ticket', 'Notify Slack', 'Email Stakeholder'], lastRun: '2026-04-12T14:32:00Z', runCount: 847, successRate: 99.2, category: 'Compliance Automation', integrations: ['GitHub Actions', 'Jira', 'Slack'], isTemplate: true,
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'CI/CD Gate', label: 'CI/CD Pipeline Gate', config: { pipeline: 'GitHub Actions', event: 'pull_request:main' } },
      { id: 'n2', type: 'condition', nodeType: 'Risk Check', label: 'EU AI Act Conformity Score', config: { field: 'conformity_score', operator: '<', threshold: '80' } },
      { id: 'n3', type: 'action', nodeType: 'Block Deployment', label: 'Block Merge / Deployment', config: { reason: 'EU AI Act conformity check failed', severity: 'P1' } },
      { id: 'n4', type: 'action', nodeType: 'Open Jira Ticket', label: 'Create Jira Compliance Ticket', config: { project: 'AICOMP', priority: 'High', assignee: 'compliance-team' } },
      { id: 'n5', type: 'action', nodeType: 'Notify Slack', label: 'Alert #ai-compliance', config: { channel: '#ai-compliance', message: 'Deployment blocked: EU AI Act conformity check failed for {{model_name}}' } },
    ],
  },
  {
    id: 'WF-T002', name: 'Bias Drift → Regulatory Alert', description: 'When a model\'s fairness score drops below threshold, automatically pause the model, open a P1 JIRA, and notify the DPO via ServiceNow.', status: 'Active', trigger: 'Model Drift', actions: ['ServiceNow Incident', 'Request Approval', 'Notify Slack', 'Regulatory Notification'], lastRun: '2026-04-11T09:15:00Z', runCount: 12, successRate: 100, category: 'Model Risk', integrations: ['ServiceNow', 'Slack', 'Jira'], isTemplate: true,
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Model Drift', label: 'Fairness Score Alert', config: { metric: 'fairness_score', direction: 'drops_below', threshold: '75' } },
      { id: 'n2', type: 'condition', nodeType: 'Risk Check', label: 'High-Risk Category Check', config: { field: 'risk_tier', operator: 'in', values: 'HIGH,CRITICAL' } },
      { id: 'n3', type: 'action', nodeType: 'ServiceNow Incident', label: 'Create ServiceNow P1', config: { category: 'AI Model Risk', priority: 'P1', assignment_group: 'AI Governance' } },
      { id: 'n4', type: 'action', nodeType: 'Request Approval', label: 'HITL Approval Gate', config: { approvers: 'CISO, DPO', sla_hours: '4', decision: 'suspend_or_continue' } },
    ],
  },
  {
    id: 'WF-T003', name: 'Regulatory Deadline Escalation', description: 'Automatically escalate compliance tasks 60/30/7 days before regulatory deadlines. Creates board-level brief at T-7.', status: 'Active', trigger: 'Regulatory Deadline', actions: ['Create Task', 'Email Stakeholder', 'Generate Report'], lastRun: '2026-04-12T08:00:00Z', runCount: 156, successRate: 98.7, category: 'Compliance Automation', integrations: ['Email', 'Calendar'], isTemplate: true,
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Regulatory Deadline', label: 'Deadline Proximity Alert', config: { days_before: '60,30,7', regulations: 'EU AI Act, CFPB, SEC' } },
      { id: 'n2', type: 'action', nodeType: 'Create Task', label: 'Assign Remediation Tasks', config: { owner: 'compliance_lead', priority: 'based_on_days_remaining' } },
      { id: 'n3', type: 'action', nodeType: 'Email Stakeholder', label: 'Executive Escalation Email', config: { recipients: 'CISO, CFO, GC', template: 'regulatory_deadline_T-{{days}}' } },
      { id: 'n4', type: 'action', nodeType: 'Generate Report', label: 'Board Brief (T-7 only)', config: { condition: 'days_before == 7', format: 'PDF', recipients: 'board_distribution' } },
    ],
  },
  {
    id: 'WF-T004', name: 'AI Incident → Multi-Regulator Notify', description: 'P0/P1 AI incidents trigger automatic regulatory notification to SEC, FCA, and ICO within required timeframes. Full evidence package attached.', status: 'Active', trigger: 'Incident Created', actions: ['Regulatory Notification', 'Generate Report', 'ServiceNow Incident', 'Notify Slack'], lastRun: '2026-04-10T22:47:00Z', runCount: 3, successRate: 100, category: 'Incident Response', integrations: ['Regulatory APIs', 'ServiceNow', 'Slack'], isTemplate: true,
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Incident Created', label: 'P0/P1 Incident Trigger', config: { severity: 'P0,P1', category: 'AI Model Failure' } },
      { id: 'n2', type: 'condition', nodeType: 'Scope Check', label: 'Regulated Market Check', config: { markets: 'EU, UK, US', ai_act_high_risk: 'true' } },
      { id: 'n3', type: 'action', nodeType: 'Regulatory Notification', label: 'Auto-Notify SEC/FCA/ICO', config: { deadline_eu: '72h', deadline_us: '4d', deadline_uk: '72h', attach_evidence: 'true' } },
      { id: 'n4', type: 'action', nodeType: 'Generate Report', label: 'Evidence Package Generation', config: { include: 'chain_of_custody,model_card,incident_log', format: 'court_admissible' } },
    ],
  },
  {
    id: 'WF-T005', name: 'Evidence Gap → Auto-Collection', description: 'Detect compliance evidence gaps and auto-trigger evidence collection via integrations, then assign review task.', status: 'Paused', trigger: 'Evidence Gap', actions: ['Create Task', 'Notify Slack', 'Email Stakeholder'], lastRun: '2026-04-09T11:00:00Z', runCount: 44, successRate: 93.2, category: 'Evidence Automation', integrations: ['SharePoint', 'Jira', 'Slack'],
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Evidence Gap', label: 'Gap Detection Trigger', config: { gap_age_days: '14', frameworks: 'EU AI Act, ISO 42001' } },
      { id: 'n2', type: 'action', nodeType: 'Create Task', label: 'Assign Evidence Collection Task', config: { assignee: 'control_owner', due_days: '7' } },
    ],
  },
  {
    id: 'WF-T006', name: 'Risk Threshold Breach → CFO Alert', description: 'When total ALE breaches $5M threshold, alert CFO and trigger financial risk review workflow with Monte Carlo resimulation.', status: 'Draft', trigger: 'Risk Threshold', actions: ['Email Stakeholder', 'Generate Report', 'Create Task'], lastRun: 'Never', runCount: 0, successRate: 0, category: 'Financial Risk', integrations: ['Email', 'Calendar'],
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Risk Threshold', label: 'ALE Threshold Breach', config: { metric: 'total_ALE', operator: '>', threshold: '5000000', currency: 'USD' } },
      { id: 'n2', type: 'action', nodeType: 'Email Stakeholder', label: 'Alert CFO/CRO', config: { recipients: 'CFO, CRO, CISO', subject: 'ALERT: Total AI Risk ALE exceeds $5M' } },
    ],
  },
]

const INTEGRATIONS = [
  { name: 'GitHub Actions', icon: '⚙️', status: 'Connected', category: 'CI/CD', description: 'Gate model deployments in GitHub Actions pipelines' },
  { name: 'Jira', icon: '🎯', status: 'Connected', category: 'Ticketing', description: 'Auto-create compliance tickets with risk context' },
  { name: 'Slack', icon: '💬', status: 'Connected', category: 'Notification', description: 'Real-time alerts to compliance and risk channels' },
  { name: 'ServiceNow', icon: '🔧', status: 'Connected', category: 'ITSM', description: 'Create P0/P1 incidents for AI governance failures' },
  { name: 'GitLab CI', icon: '🦊', status: 'Available', category: 'CI/CD', description: 'Gate deployments in GitLab pipelines' },
  { name: 'Azure DevOps', icon: '☁️', status: 'Available', category: 'CI/CD', description: 'Integration with Azure Pipelines' },
  { name: 'PagerDuty', icon: '🚨', status: 'Available', category: 'Alerting', description: 'Critical AI incidents routed to on-call' },
  { name: 'Microsoft Teams', icon: '📋', status: 'Available', category: 'Notification', description: 'Compliance alerts to Teams channels' },
]

const STATUS_STYLE: Record<WorkflowStatus, React.CSSProperties> = {
  Active:  { background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(142 71% 35%)' },
  Paused:  { background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Draft:   { background: 'hsl(220 13% 50% / 0.12)', color: 'hsl(var(--text-4))' },
  Error:   { background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
}

const NODE_COLOR: Record<string, string> = {
  trigger:   'hsl(220 90% 56%)',
  condition: 'hsl(45 85% 40%)',
  action:    'hsl(142 71% 45%)',
}

export default function AutomationStudio() {
  const [tab, setTab] = useState<'workflows' | 'integrations'>('workflows')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'builder' | 'logs'>('overview')
  const [workflows, setWorkflows] = useState<Workflow[]>(TEMPLATES)

  const categories = ['All', ...Array.from(new Set(TEMPLATES.map(w => w.category)))]
  const filtered = useMemo(() => workflows.filter(w => {
    const m = !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase())
    const c = catFilter === 'All' || w.category === catFilter
    return m && c
  }), [search, catFilter, workflows])

  const toggleStatus = (wf: Workflow) => {
    setWorkflows(prev => prev.map(w => w.id === wf.id
      ? { ...w, status: w.status === 'Active' ? 'Paused' : 'Active' }
      : w
    ))
    toast.success(`${wf.name} ${wf.status === 'Active' ? 'paused' : 'activated'}`)
  }

  const cloneWorkflow = (wf: Workflow) => {
    const clone = { ...wf, id: `WF-C${Date.now()}`, name: `${wf.name} (Copy)`, status: 'Draft' as WorkflowStatus, runCount: 0, successRate: 0, lastRun: 'Never', isTemplate: false }
    setWorkflows(prev => [clone, ...prev])
    toast.success('Workflow cloned as draft')
  }

  const activeCount = workflows.filter(w => w.status === 'Active').length
  const totalRuns = workflows.reduce((s, w) => s + w.runCount, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Lightning size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Governance Automation Studio
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">
            No-code governance workflow builder — Sentinel becomes the gate in your CI/CD pipeline and the mirror in Jira/ServiceNow
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('New workflow created — configure trigger and actions')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Code size={14} /> Import from YAML
          </button>
          <button onClick={() => toast.success('New blank workflow created')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> New Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Workflows', value: activeCount, sub: 'Running governance automations', color: 'hsl(142 71% 35%)' },
          { label: 'Total Executions', value: totalRuns.toLocaleString(), sub: 'Across all workflows', color: 'hsl(var(--brand))' },
          { label: 'Integrations', value: INTEGRATIONS.filter(i => i.status === 'Connected').length, sub: 'CI/CD + ITSM connected', color: 'hsl(var(--text-1))' },
          { label: 'Deployments Gated', value: '847', sub: 'Blocked via CI/CD this month', color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex border-b border-[hsl(var(--border))]">
        {([['workflows', 'Workflow Library'], ['integrations', 'Integration Hub']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 text-sm font-medium transition-colors" style={tab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>{l}</button>
        ))}
      </div>

      {tab === 'workflows' && (
        <>
          <div className="flex items-center gap-3 p-3 rounded border border-[hsl(220_90%_56%/0.3)] bg-[hsl(220_90%_56%/0.06)]">
            <Lightning size={14} className="text-[hsl(220_90%_56%)] flex-shrink-0" />
            <p className="text-xs text-[hsl(var(--text-2))]">
              <span className="font-semibold text-[hsl(220_90%_56%)]">Sentinel as CI/CD Gate:</span> Workflows with "CI/CD Gate" trigger block deployments that fail AI governance checks directly in GitHub Actions, GitLab CI, or Azure DevOps — before code reaches production.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {filtered.map(wf => (
              <div key={wf.id} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 hover:border-[hsl(var(--brand)/0.3)] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelected(wf); setDrawerTab('overview') }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] text-[hsl(var(--text-4))]">{wf.id}</span>
                      <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[wf.status]}>{wf.status}</span>
                      <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{wf.category}</span>
                      {wf.trigger === 'CI/CD Gate' && <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(220_90%_56%/0.12)] text-[hsl(220_90%_56%)] font-semibold">CI/CD Gate</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{wf.name}</h3>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 line-clamp-1">{wf.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[hsl(var(--text-4))]">
                      <span>Trigger: <span className="text-[hsl(var(--text-3))] font-medium">{wf.trigger}</span></span>
                      <span>{wf.actions.length} actions</span>
                      <span>{wf.runCount > 0 ? `${wf.runCount.toLocaleString()} runs` : 'Not run'}</span>
                      {wf.runCount > 0 && <span className="text-[hsl(142_71%_35%)] font-medium">{wf.successRate}% success</span>}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {wf.integrations.map(i => <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{i}</span>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => cloneWorkflow(wf)} title="Clone workflow" className="p-2 border border-[hsl(var(--border))] text-[hsl(var(--text-4))] hover:bg-[hsl(var(--bg-raised))]">
                      <Copy size={13} />
                    </button>
                    <button onClick={() => toggleStatus(wf)} className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border ${wf.status === 'Active' ? 'border-[hsl(45_93%_47%/0.4)] text-[hsl(45_85%_40%)] hover:bg-[hsl(45_93%_47%/0.1)]' : 'border-[hsl(142_71%_45%/0.4)] text-[hsl(142_71%_35%)] hover:bg-[hsl(142_71%_45%/0.1)]'}`}>
                      {wf.status === 'Active' ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Activate</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'integrations' && (
        <>
          <div className="flex items-center gap-3 p-3 rounded border border-[hsl(220_90%_56%/0.3)] bg-[hsl(220_90%_56%/0.06)]">
            <FlowArrow size={14} className="text-[hsl(220_90%_56%)] flex-shrink-0" />
            <p className="text-xs text-[hsl(var(--text-2))]">
              <span className="font-semibold text-[hsl(220_90%_56%)]">Sentinel as Workflow Mirror:</span> When Sentinel is connected to Jira and ServiceNow, every compliance finding, risk update, and incident automatically creates tickets in your existing toolchain — and vice versa. Removing Sentinel breaks all automated governance ticketing.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{int.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{int.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{int.category}</span>
                      </div>
                      <p className="text-xs text-[hsl(var(--text-4))]">{int.description}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {int.status === 'Connected'
                      ? <span className="text-[11px] px-2 py-0.5 bg-[hsl(142_71%_45%/0.12)] text-[hsl(142_71%_35%)] font-medium flex items-center gap-1"><CheckCircle size={10} /> Connected</span>
                      : <button onClick={() => toast.success(`${int.name} integration initiated — follow OAuth flow`)} className="text-[11px] px-2 py-1 bg-[hsl(var(--brand))] text-white hover:opacity-90">Connect</button>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] p-4">
            <p className="text-sm font-semibold text-[hsl(var(--text-1))] mb-2">Webhook / REST API</p>
            <p className="text-xs text-[hsl(var(--text-4))] mb-3">Trigger any workflow via webhook or use Sentinel's REST API to integrate with any system not listed above.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[11px] font-mono text-[hsl(var(--brand))] truncate">
                POST https://api.sentinel.ai/v1/workflows/trigger
              </code>
              <button onClick={() => { navigator.clipboard.writeText('POST https://api.sentinel.ai/v1/workflows/trigger'); toast.success('Endpoint copied') }} className="px-3 py-2 border border-[hsl(var(--border))] text-xs text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-surface))]">Copy</button>
            </div>
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[540px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p>
                <h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.name}</h2>
                <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{selected.category} · {selected.trigger}</p>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="flex border-b border-[hsl(var(--border))]">
              {([['overview', 'Overview'], ['builder', 'Flow Builder'], ['logs', 'Run Logs']] as const).map(([t, l]) => (
                <button key={t} onClick={() => setDrawerTab(t)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors" style={drawerTab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>{l}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {drawerTab === 'overview' && (
                <>
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                  <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">{selected.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Trigger', value: selected.trigger },
                      { label: 'Category', value: selected.category },
                      { label: 'Total Runs', value: selected.runCount.toLocaleString() },
                      { label: 'Success Rate', value: selected.runCount > 0 ? `${selected.successRate}%` : 'N/A' },
                      { label: 'Last Run', value: selected.lastRun === 'Never' ? 'Never' : selected.lastRun.slice(0, 10) },
                      { label: 'Actions', value: `${selected.actions.length} configured` },
                    ].map(f => (
                      <div key={f.label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{f.label}</p>
                        <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase mb-2">Actions</p>
                    <div className="space-y-1.5">
                      {selected.actions.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                          <span className="text-[10px] text-[hsl(var(--text-4))] w-4">{i + 1}.</span>
                          <Lightning size={11} className="text-[hsl(var(--brand))]" />
                          <span className="text-xs text-[hsl(var(--text-2))]">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase mb-2">Integrations</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {selected.integrations.map(i => <span key={i} className="text-[11px] px-2 py-1 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-2))]">{i}</span>)}
                    </div>
                  </div>
                </>
              )}
              {drawerTab === 'builder' && (
                <>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide">{selected.nodes.length} Steps in pipeline</p>
                  <div className="relative">
                    <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-[hsl(var(--border))]" />
                    <div className="space-y-3">
                      {selected.nodes.map((node, idx) => (
                        <div key={node.id} className="relative pl-12">
                          <div className="absolute left-[17px] top-4 w-3.5 h-3.5 rounded-full border-2 z-10" style={{ borderColor: NODE_COLOR[node.type], background: 'hsl(var(--bg-surface))' }} />
                          <div className="p-3 rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] px-1.5 py-0.5 font-semibold uppercase" style={{ background: NODE_COLOR[node.type] + '20', color: NODE_COLOR[node.type] }}>{node.type}</span>
                              <span className="text-xs font-medium text-[hsl(var(--text-1))]">{node.label}</span>
                            </div>
                            <div className="space-y-1 mt-2">
                              {Object.entries(node.config).map(([k, v]) => (
                                <div key={k} className="flex items-start gap-2 text-[10px]">
                                  <span className="text-[hsl(var(--text-4))] uppercase w-24 flex-shrink-0">{k.replace(/_/g, ' ')}</span>
                                  <span className="text-[hsl(var(--text-2))] font-mono">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {idx < selected.nodes.length - 1 && (
                            <div className="flex items-center pl-6 py-1">
                              <ArrowRight size={10} className="text-[hsl(var(--text-4))]" style={{ transform: 'rotate(90deg)' }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => toast.info('Visual flow editor coming soon — YAML editing available now')} className="w-full py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
                    Edit in Visual Builder
                  </button>
                </>
              )}
              {drawerTab === 'logs' && (
                <>
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase">Recent Executions</p>
                  {selected.runCount === 0
                    ? <div className="text-center py-8 text-[hsl(var(--text-4))] text-sm">No executions yet</div>
                    : (
                      <div className="space-y-2">
                        {[
                          { time: '2026-04-12 14:32:11', status: 'Success', duration: '1.2s', trigger: 'Automated', actions: selected.actions.length },
                          { time: '2026-04-12 11:15:04', status: 'Success', duration: '0.9s', trigger: 'Automated', actions: selected.actions.length },
                          { time: '2026-04-11 09:44:38', status: 'Success', duration: '2.1s', trigger: 'Manual', actions: selected.actions.length },
                          { time: '2026-04-10 17:22:55', status: selected.successRate < 95 ? 'Failed' : 'Success', duration: '0.4s', trigger: 'Automated', actions: 1 },
                        ].slice(0, Math.min(4, selected.runCount)).map((run, i) => (
                          <div key={i} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${run.status === 'Success' ? 'bg-[hsl(142_71%_45%)]' : 'bg-[hsl(var(--destructive))]'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[hsl(var(--text-1))]">{run.status}</p>
                              <p className="text-[10px] text-[hsl(var(--text-4))]">{run.time} · {run.duration} · {run.actions} action{run.actions > 1 ? 's' : ''} · {run.trigger}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </>
              )}
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => toggleStatus(selected)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
                {selected.status === 'Active' ? 'Pause' : 'Activate'}
              </button>
              <button onClick={() => cloneWorkflow(selected)} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">Clone & Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
