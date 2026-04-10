import { useState } from 'react'
import { Swap, Plus, Eye, X, Export, CheckCircle, Warning, Clock, ArrowRight, MagnifyingGlass } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

type WorkflowStatus = 'Running' | 'Completed' | 'Failed' | 'Paused' | 'Awaiting Approval'

interface AgentWorkflow {
  id: string
  name: string
  description: string
  status: WorkflowStatus
  trigger: string
  orchestratorAgent: string
  workerAgents: string[]
  startedAt: string
  completedAt?: string
  duration?: string
  stepsTotal: number
  stepsCompleted: number
  currentStep: string
  inputTokens: number
  outputTokens: number
  cost: number
  hitlRequired: boolean
  hitlStep?: string
  lastError?: string
  owner: string
}

const SEED: AgentWorkflow[] = [
  { id: 'WF-2026-0047', name: 'Loan Application — End-to-End Processing', description: 'Full automated pipeline: document ingestion → identity verification → credit scoring → risk assessment → preliminary decision → HITL review', status: 'Awaiting Approval', trigger: 'New loan application submitted (APP-2026-2847)', orchestratorAgent: 'LoanProcessorAgent v2.3.1', workerAgents: ['DocumentVerifier', 'IdentityChecker', 'CreditScorer', 'RiskEvaluator', 'DecisionFormatter'], startedAt: '2026-04-10 09:15:00', stepsTotal: 5, stepsCompleted: 4, currentStep: 'Step 5: HITL Review — Awaiting underwriter approval for borderline decision (score: 0.63)', inputTokens: 12450, outputTokens: 3280, cost: 0.89, hitlRequired: true, hitlStep: 'Step 5 — Decision score below auto-approval threshold', owner: 'James Liu' },
  { id: 'WF-2026-0046', name: 'Fraud Investigation — Transaction Cluster INC-2026-034', description: 'Automated investigation of flagged transaction cluster: evidence gathering, enrichment, timeline reconstruction, report generation', status: 'Completed', trigger: 'Fraud alert triggered (FRAL-9821)', orchestratorAgent: 'FraudInvestigatorAgent v1.8.0', workerAgents: ['TransactionAnalyzer', 'DeviceFingerprinter', 'GeolocChecker', 'RiskScorer', 'ReportGenerator'], startedAt: '2026-04-10 08:30:00', completedAt: '2026-04-10 08:47:23', duration: '17m 23s', stepsTotal: 5, stepsCompleted: 5, currentStep: 'Complete', inputTokens: 8230, outputTokens: 5140, cost: 1.24, hitlRequired: false, owner: 'Sarah Chen' },
  { id: 'WF-2026-0045', name: 'Regulatory Obligation Mapping — SEC AI Guidance 2026', description: 'Parse new SEC AI guidance, extract obligations, map to existing controls, identify gaps, create remediation tasks', status: 'Running', trigger: 'Regulatory feed update (SEC-AI-GUIDANCE-2026-04)', orchestratorAgent: 'ComplianceMonitorAgent v3.1.0', workerAgents: ['RegDocParser', 'ObligationExtractor', 'ControlMapper', 'GapAnalyzer', 'TaskCreator'], startedAt: '2026-04-10 09:00:00', stepsTotal: 5, stepsCompleted: 3, currentStep: 'Step 4: Gap analysis — comparing extracted obligations to 847 existing controls', inputTokens: 24100, outputTokens: 8920, cost: 2.87, hitlRequired: false, owner: 'Maria Santos' },
  { id: 'WF-2026-0044', name: 'Bias Audit — Loan Approval Model v3.0 Monthly', description: 'Automated monthly bias audit: data sampling, fairness metric computation, statistical testing, report generation', status: 'Failed', trigger: 'Scheduled — monthly bias audit (SCHED-BIAS-LAM-001)', orchestratorAgent: 'BiasAuditOrchestrator v1.2.0', workerAgents: ['DataSampler', 'FairnessMetricEngine', 'StatisticalTester', 'ReportGenerator'], startedAt: '2026-04-10 06:00:00', stepsTotal: 4, stepsCompleted: 2, currentStep: 'Failed at Step 3: StatisticalTester — timeout after 8min (dataset too large for current compute allocation)', inputTokens: 4500, outputTokens: 890, cost: 0.34, hitlRequired: false, lastError: 'TIMEOUT: StatisticalTester agent exceeded 8-minute execution limit. Dataset size 4.2GB exceeds agent memory budget. Recommend increasing compute tier.', owner: 'Maria Santos' },
  { id: 'WF-2026-0043', name: 'Customer Onboarding — KYC/AML Check', description: 'KYC verification, AML screening, risk scoring, document verification, account setup recommendation', status: 'Completed', trigger: 'New customer application (CUST-APP-84721)', orchestratorAgent: 'CustomerServiceOrchestrator v1.2.0', workerAgents: ['KYCVerifier', 'AMLScreener', 'DocumentVerifier', 'RiskProfiler', 'OnboardingDecider'], startedAt: '2026-04-09 16:45:00', completedAt: '2026-04-09 16:52:11', duration: '7m 11s', stepsTotal: 5, stepsCompleted: 5, currentStep: 'Complete', inputTokens: 6700, outputTokens: 2100, cost: 0.67, hitlRequired: false, owner: 'James Liu' },
  { id: 'WF-2026-0042', name: 'Data Quality Remediation — Pipeline DP-019', description: 'Detected PII in pipeline DP-019: quarantine, scrub, validate, re-ingest, notify stakeholders', status: 'Paused', trigger: 'PII detection alert from DataQualityPatrolAgent', orchestratorAgent: 'DataQualityPatrolAgent v2.0.1', workerAgents: ['PIIQuarantiner', 'DataScrubber', 'SchemaValidator', 'ReIngester', 'StakeholderNotifier'], startedAt: '2026-04-10 07:30:00', stepsTotal: 5, stepsCompleted: 2, currentStep: 'Paused at Step 3 — awaiting DPO approval before re-ingestion', inputTokens: 2100, outputTokens: 890, cost: 0.18, hitlRequired: true, hitlStep: 'DPO must approve data re-ingestion after PII scrubbing', owner: 'Maria Santos' },
]

const STATUS_STYLE: Record<WorkflowStatus, { bg: string; color: string }> = {
  Running: { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
  Completed: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Failed: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Paused: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  'Awaiting Approval': { bg: 'hsl(280 67% 56% / 0.12)', color: 'hsl(280 60% 55%)' },
}

export default function MultiAgentChoreography() {
  const [selected, setSelected] = useState<AgentWorkflow | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [workflows, setWorkflows] = useState(SEED)
  const [terminateTarget, setTerminateTarget] = useState<AgentWorkflow | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newWfName, setNewWfName] = useState('')
  const [newWfTrigger, setNewWfTrigger] = useState('Manual')
  const [newWfOrch, setNewWfOrch] = useState('')

  const filtered = workflows.filter(w => {
    const q = search.toLowerCase()
    const ms = w.name.toLowerCase().includes(q) || w.id.toLowerCase().includes(q) || w.orchestratorAgent.toLowerCase().includes(q) || w.owner.toLowerCase().includes(q)
    return ms && (statusFilter === 'All' || w.status === statusFilter)
  })

  const stats = {
    total: workflows.length,
    running: workflows.filter(w => w.status === 'Running').length,
    failed: workflows.filter(w => w.status === 'Failed').length,
    totalCost: workflows.reduce((s, w) => s + w.cost, 0).toFixed(2),
  }

  const handleApprove = (id: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: 'Running' as WorkflowStatus } : w))
    setSelected(null)
    toast.success('Workflow approved — resuming execution')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Swap size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Multi-Agent Choreography
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Live view of multi-agent workflows, orchestration state, and HITL intervention points</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => toast.info('Workflow designer')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> New Workflow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Running', value: stats.running, color: 'hsl(var(--s-in-tx))' },
          { label: 'Failed', value: stats.failed, color: 'hsl(var(--destructive))' },
          { label: 'Total AI Cost', value: `$${stats.totalCost}`, color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows…" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Running', 'Completed', 'Failed', 'Paused', 'Awaiting Approval'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(w => {
          const progress = (w.stepsCompleted / w.stepsTotal) * 100
          const ss = STATUS_STYLE[w.status]
          return (
            <div key={w.id} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors" onClick={() => setSelected(w)}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[10px] text-[hsl(var(--brand))]">{w.id}</span>
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={ss}>{w.status}</span>
                    {w.hitlRequired && <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(280_67%_56%/0.12)] text-[hsl(280_60%_55%)]">HITL</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] truncate">{w.name}</h3>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 truncate">{w.trigger}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-[hsl(var(--text-4))]">{w.startedAt}</p>
                  {w.duration && <p className="text-xs font-medium text-[hsl(var(--s-ok-tx))]">{w.duration}</p>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-[hsl(var(--text-4))]">{w.stepsCompleted}/{w.stepsTotal} steps</p>
                  <p className="text-[10px] text-[hsl(var(--text-4))]">{Math.round(progress)}%</p>
                </div>
                <div className="h-1.5 bg-[hsl(var(--border))] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${progress}%`,
                    background: w.status === 'Failed' ? 'hsl(var(--destructive))' : w.status === 'Completed' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--brand))',
                  }} />
                </div>
              </div>

              {/* Current step */}
              <p className="text-[11px] text-[hsl(var(--text-3))] mb-3 italic">{w.currentStep}</p>

              {/* Agent chain */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] border border-[hsl(var(--brand)/0.2)]">{w.orchestratorAgent.split(' ')[0]}</span>
                {w.workerAgents.map((a, i) => (
                  <div key={a} className="flex items-center gap-1">
                    <ArrowRight size={10} className="text-[hsl(var(--text-4))]" />
                    <span className="text-[10px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{a}</span>
                  </div>
                ))}
              </div>

              {/* Cost + tokens */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-[hsl(var(--border))]">
                <span className="text-[11px] text-[hsl(var(--text-4))]">In: {w.inputTokens.toLocaleString()} tok</span>
                <span className="text-[11px] text-[hsl(var(--text-4))]">Out: {w.outputTokens.toLocaleString()} tok</span>
                <span className="text-[11px] text-[hsl(var(--text-4))]">Cost: ${w.cost.toFixed(2)}</span>
                <span className="ml-auto text-[11px] text-[hsl(var(--text-4))]">Owner: {w.owner}</span>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.name}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                {selected.hitlRequired && <span className="text-[11px] px-2 py-0.5 bg-[hsl(280_67%_56%/0.12)] text-[hsl(280_60%_55%)]">HITL Required</span>}
              </div>
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">{selected.description}</p>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Trigger</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.trigger}</p></div>
              {selected.lastError && (
                <div><p className="text-[11px] font-semibold text-[hsl(var(--destructive))] uppercase tracking-wide mb-1">Error</p><p className="text-xs text-[hsl(var(--destructive))] p-3 bg-[hsl(0_72%_51%/0.06)] border border-[hsl(var(--destructive)/0.3)] leading-relaxed">{selected.lastError}</p></div>
              )}
              {selected.hitlStep && (
                <div><p className="text-[11px] font-semibold text-[hsl(280_60%_55%)] uppercase tracking-wide mb-1">HITL Step</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(280_67%_56%/0.06)] border border-[hsl(280_67%_56%/0.3)]">{selected.hitlStep}</p></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Started', value: selected.startedAt },
                  { label: 'Duration', value: selected.duration ?? 'In progress' },
                  { label: 'Input Tokens', value: selected.inputTokens.toLocaleString() },
                  { label: 'Output Tokens', value: selected.outputTokens.toLocaleString() },
                  { label: 'Total Cost', value: `$${selected.cost.toFixed(2)}` },
                  { label: 'Owner', value: selected.owner },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            {(selected.status === 'Awaiting Approval' || selected.status === 'Paused') && (
              <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                <button onClick={() => handleApprove(selected.id)} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">Approve & Resume</button>
                <button onClick={() => setTerminateTarget(selected)} className="px-4 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm hover:bg-[hsl(0_72%_51%/0.05)]">Terminate</button>
              </div>
            )}
            {selected.status === 'Running' && (
              <div className="p-4 border-t border-[hsl(var(--border))]">
                <button onClick={() => setTerminateTarget(selected)} className="w-full py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm hover:bg-[hsl(0_72%_51%/0.05)]">Terminate Workflow</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!terminateTarget}
        title="Terminate Workflow"
        description={`Terminate "${terminateTarget?.name}"? All in-progress agent steps will be stopped immediately. This action cannot be undone.`}
        confirmLabel="Terminate"
        type="danger"
        onConfirm={() => {
          if (!terminateTarget) return
          setWorkflows(prev => prev.map(w => w.id === terminateTarget.id ? { ...w, status: 'Failed' as WorkflowStatus, currentStep: 'Terminated by operator', lastError: 'Workflow manually terminated by operator.' } : w))
          toast.error(`Workflow ${terminateTarget.id} terminated`)
          setTerminateTarget(null)
          setSelected(null)
        }}
        onClose={() => setTerminateTarget(null)}
      />
    </div>
  )
}
