import { useState, useMemo } from 'react'
import {
  Lightning, Plus, X, Play, Pause, Copy, MagnifyingGlass,
  CheckCircle, Warning, Clock, ArrowRight, Gear, FlowArrow,
  Bell, Shield, FileText, Robot, Code, Download, Eye,
  Trash, PencilSimple, CaretDown, CaretUp, ArrowDown, Check,
  Timer,
} from '@phosphor-icons/react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import {

  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────────────
type WorkflowStatus = 'Active' | 'Paused' | 'Draft' | 'Error'
type TriggerType = 'Risk Threshold' | 'Control Failure' | 'Model Drift' | 'Regulatory Deadline' | 'Incident Created' | 'Evidence Gap' | 'Approval Required' | 'Scheduled' | 'API/Webhook' | 'CI/CD Gate'
type ActionType = 'Create Task' | 'Notify Slack' | 'Open Jira Ticket' | 'ServiceNow Incident' | 'Email Stakeholder' | 'Block Deployment' | 'Request Approval' | 'Generate Report' | 'Remediation Task' | 'Regulatory Notification'
type NodeType = 'trigger' | 'condition' | 'action'

interface WorkflowNode {
  id: string
  type: NodeType
  nodeType: string
  label: string
  config: Record<string, string>
}

interface RunLog {
  time: string
  status: 'Success' | 'Failed' | 'Running'
  duration: string
  trigger: string
  actionsRun: number
  message?: string
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
  runLogs: RunLog[]
  createdDate: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TRIGGER_TYPES: TriggerType[] = [
  'CI/CD Gate', 'Model Drift', 'Risk Threshold', 'Regulatory Deadline',
  'Incident Created', 'Evidence Gap', 'Control Failure', 'Approval Required',
  'Scheduled', 'API/Webhook',
]

const ACTION_TYPES: ActionType[] = [
  'Block Deployment', 'Create Task', 'Notify Slack', 'Open Jira Ticket',
  'ServiceNow Incident', 'Email Stakeholder', 'Request Approval',
  'Generate Report', 'Remediation Task', 'Regulatory Notification',
]

const CATEGORIES = ['Compliance Automation', 'Model Risk', 'Incident Response', 'Evidence Automation', 'Financial Risk', 'Security', 'Custom']

const TRIGGER_DEFAULT_CONFIG: Record<TriggerType, Record<string, string>> = {
  'CI/CD Gate': { pipeline: 'GitHub Actions', event: 'pull_request:main' },
  'Model Drift': { metric: 'fairness_score', direction: 'drops_below', threshold: '75' },
  'Risk Threshold': { metric: 'risk_score', operator: '>', threshold: '20' },
  'Regulatory Deadline': { days_before: '60,30,7', regulations: 'EU AI Act' },
  'Incident Created': { severity: 'P0,P1', category: 'AI Model Failure' },
  'Evidence Gap': { gap_age_days: '14', frameworks: 'EU AI Act, ISO 42001' },
  'Control Failure': { control_type: 'Technical', severity: 'High' },
  'Approval Required': { approval_type: 'Model Deployment', sla_hours: '24' },
  'Scheduled': { cron: '0 8 * * MON', timezone: 'UTC' },
  'API/Webhook': { endpoint: '/api/webhooks/trigger', auth: 'Bearer' },
}

const ACTION_DEFAULT_CONFIG: Record<ActionType, Record<string, string>> = {
  'Block Deployment': { reason: 'Governance check failed', severity: 'P1' },
  'Create Task': { owner: 'compliance_lead', priority: 'High', due_days: '7' },
  'Notify Slack': { channel: '#ai-compliance', message: 'Governance alert triggered' },
  'Open Jira Ticket': { project: 'AICOMP', priority: 'High', assignee: 'compliance-team' },
  'ServiceNow Incident': { category: 'AI Governance', priority: 'P1', assignment_group: 'AI Risk' },
  'Email Stakeholder': { recipients: 'CISO, CRO', subject: 'Governance alert' },
  'Request Approval': { approvers: 'CISO, DPO', sla_hours: '4' },
  'Generate Report': { format: 'PDF', recipients: 'board_distribution' },
  'Remediation Task': { assignee: 'risk_owner', due_days: '14', priority: 'High' },
  'Regulatory Notification': { deadline_eu: '72h', deadline_us: '4d', attach_evidence: 'true' },
}

const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  'Block Deployment': Shield,
  'Create Task': CheckCircle,
  'Notify Slack': Bell,
  'Open Jira Ticket': FileText,
  'ServiceNow Incident': Warning,
  'Email Stakeholder': Bell,
  'Request Approval': Eye,
  'Generate Report': FileText,
  'Remediation Task': Gear,
  'Regulatory Notification': Warning,
}

const STATUS_STYLE: Record<WorkflowStatus, React.CSSProperties> = {
  Active: { background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(142 71% 35%)' },
  Paused: { background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Draft: { background: 'hsl(220 13% 50% / 0.12)', color: 'hsl(var(--text-4))' },
  Error: { background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
}

const NODE_COLOR: Record<NodeType, string> = {
  trigger: 'hsl(220 90% 56%)',
  condition: 'hsl(45 85% 40%)',
  action: 'hsl(142 71% 45%)',
}

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

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_WORKFLOWS: Workflow[] = [
  {
    id: 'WF-T001', name: 'EU AI Act — Conformity Gate',
    description: 'Block model deployments that fail EU AI Act conformity checks. Auto-creates Jira ticket and notifies compliance team.',
    status: 'Active', trigger: 'CI/CD Gate', actions: ['Block Deployment', 'Open Jira Ticket', 'Notify Slack', 'Email Stakeholder'],
    lastRun: '2026-04-12T14:32:00Z', runCount: 847, successRate: 99.2, category: 'Compliance Automation',
    integrations: ['GitHub Actions', 'Jira', 'Slack'], isTemplate: true, createdDate: '2025-11-15',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'CI/CD Gate', label: 'CI/CD Pipeline Gate', config: { pipeline: 'GitHub Actions', event: 'pull_request:main' } },
      { id: 'n2', type: 'condition', nodeType: 'Risk Check', label: 'EU AI Act Conformity Score', config: { field: 'conformity_score', operator: '<', threshold: '80' } },
      { id: 'n3', type: 'action', nodeType: 'Block Deployment', label: 'Block Merge / Deployment', config: { reason: 'EU AI Act conformity check failed', severity: 'P1' } },
      { id: 'n4', type: 'action', nodeType: 'Open Jira Ticket', label: 'Create Jira Compliance Ticket', config: { project: 'AICOMP', priority: 'High', assignee: 'compliance-team' } },
      { id: 'n5', type: 'action', nodeType: 'Notify Slack', label: 'Alert #ai-compliance', config: { channel: '#ai-compliance', message: 'Deployment blocked: EU AI Act conformity check failed for {{model_name}}' } },
    ],
    runLogs: [
      { time: '2026-04-12 14:32:11', status: 'Success', duration: '1.2s', trigger: 'Automated', actionsRun: 4 },
      { time: '2026-04-12 11:15:04', status: 'Success', duration: '0.9s', trigger: 'Automated', actionsRun: 4 },
      { time: '2026-04-11 09:44:38', status: 'Success', duration: '2.1s', trigger: 'Manual', actionsRun: 4 },
      { time: '2026-04-10 17:22:55', status: 'Success', duration: '0.4s', trigger: 'Automated', actionsRun: 2 },
    ],
  },
  {
    id: 'WF-T002', name: 'Bias Drift → Regulatory Alert',
    description: "When a model's fairness score drops below threshold, pause the model, open a P1 JIRA, and notify the DPO via ServiceNow.",
    status: 'Active', trigger: 'Model Drift', actions: ['ServiceNow Incident', 'Request Approval', 'Notify Slack', 'Regulatory Notification'],
    lastRun: '2026-04-11T09:15:00Z', runCount: 12, successRate: 100, category: 'Model Risk',
    integrations: ['ServiceNow', 'Slack', 'Jira'], isTemplate: true, createdDate: '2025-12-01',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Model Drift', label: 'Fairness Score Alert', config: { metric: 'fairness_score', direction: 'drops_below', threshold: '75' } },
      { id: 'n2', type: 'condition', nodeType: 'Risk Check', label: 'High-Risk Category Check', config: { field: 'risk_tier', operator: 'in', values: 'HIGH,CRITICAL' } },
      { id: 'n3', type: 'action', nodeType: 'ServiceNow Incident', label: 'Create ServiceNow P1', config: { category: 'AI Model Risk', priority: 'P1', assignment_group: 'AI Governance' } },
      { id: 'n4', type: 'action', nodeType: 'Request Approval', label: 'HITL Approval Gate', config: { approvers: 'CISO, DPO', sla_hours: '4', decision: 'suspend_or_continue' } },
    ],
    runLogs: [
      { time: '2026-04-11 09:15:22', status: 'Success', duration: '3.4s', trigger: 'Automated', actionsRun: 4, message: 'Bias drift detected on CreditScore-v3: fairness 71.2% (threshold 75%)' },
      { time: '2026-03-28 14:02:11', status: 'Success', duration: '2.8s', trigger: 'Automated', actionsRun: 4 },
    ],
  },
  {
    id: 'WF-T003', name: 'Regulatory Deadline Escalation',
    description: 'Automatically escalate compliance tasks 60/30/7 days before regulatory deadlines. Creates board-level brief at T-7.',
    status: 'Active', trigger: 'Regulatory Deadline', actions: ['Create Task', 'Email Stakeholder', 'Generate Report'],
    lastRun: '2026-04-12T08:00:00Z', runCount: 156, successRate: 98.7, category: 'Compliance Automation',
    integrations: ['Email', 'Calendar'], isTemplate: true, createdDate: '2025-10-01',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Regulatory Deadline', label: 'Deadline Proximity Alert', config: { days_before: '60,30,7', regulations: 'EU AI Act, CFPB, SEC' } },
      { id: 'n2', type: 'action', nodeType: 'Create Task', label: 'Assign Remediation Tasks', config: { owner: 'compliance_lead', priority: 'based_on_days_remaining' } },
      { id: 'n3', type: 'action', nodeType: 'Email Stakeholder', label: 'Executive Escalation Email', config: { recipients: 'CISO, CFO, GC', template: 'regulatory_deadline_T-{{days}}' } },
      { id: 'n4', type: 'action', nodeType: 'Generate Report', label: 'Board Brief (T-7 only)', config: { condition: 'days_before == 7', format: 'PDF', recipients: 'board_distribution' } },
    ],
    runLogs: [
      { time: '2026-04-12 08:00:01', status: 'Success', duration: '0.7s', trigger: 'Scheduled', actionsRun: 3 },
      { time: '2026-04-11 08:00:02', status: 'Success', duration: '0.6s', trigger: 'Scheduled', actionsRun: 2 },
      { time: '2026-04-10 08:00:01', status: 'Success', duration: '0.8s', trigger: 'Scheduled', actionsRun: 3 },
    ],
  },
  {
    id: 'WF-T004', name: 'AI Incident → Multi-Regulator Notify',
    description: 'P0/P1 AI incidents trigger automatic regulatory notification to SEC, FCA, and ICO within required timeframes.',
    status: 'Active', trigger: 'Incident Created', actions: ['Regulatory Notification', 'Generate Report', 'ServiceNow Incident', 'Notify Slack'],
    lastRun: '2026-04-10T22:47:00Z', runCount: 3, successRate: 100, category: 'Incident Response',
    integrations: ['Regulatory APIs', 'ServiceNow', 'Slack'], isTemplate: true, createdDate: '2026-01-10',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Incident Created', label: 'P0/P1 Incident Trigger', config: { severity: 'P0,P1', category: 'AI Model Failure' } },
      { id: 'n2', type: 'condition', nodeType: 'Scope Check', label: 'Regulated Market Check', config: { markets: 'EU, UK, US', ai_act_high_risk: 'true' } },
      { id: 'n3', type: 'action', nodeType: 'Regulatory Notification', label: 'Auto-Notify SEC/FCA/ICO', config: { deadline_eu: '72h', deadline_us: '4d', deadline_uk: '72h', attach_evidence: 'true' } },
      { id: 'n4', type: 'action', nodeType: 'Generate Report', label: 'Evidence Package Generation', config: { include: 'chain_of_custody,model_card,incident_log', format: 'court_admissible' } },
    ],
    runLogs: [
      { time: '2026-04-10 22:47:31', status: 'Success', duration: '8.3s', trigger: 'Automated', actionsRun: 4, message: 'P1 incident INC-0034: Credit model misclassification event' },
    ],
  },
  {
    id: 'WF-T005', name: 'Evidence Gap → Auto-Collection',
    description: 'Detect compliance evidence gaps and auto-trigger evidence collection via integrations, then assign review task.',
    status: 'Paused', trigger: 'Evidence Gap', actions: ['Create Task', 'Notify Slack', 'Email Stakeholder'],
    lastRun: '2026-04-09T11:00:00Z', runCount: 44, successRate: 93.2, category: 'Evidence Automation',
    integrations: ['SharePoint', 'Jira', 'Slack'], createdDate: '2025-09-20',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Evidence Gap', label: 'Gap Detection Trigger', config: { gap_age_days: '14', frameworks: 'EU AI Act, ISO 42001' } },
      { id: 'n2', type: 'action', nodeType: 'Create Task', label: 'Assign Evidence Collection Task', config: { assignee: 'control_owner', due_days: '7' } },
    ],
    runLogs: [
      { time: '2026-04-09 11:00:04', status: 'Success', duration: '1.1s', trigger: 'Scheduled', actionsRun: 2 },
      { time: '2026-04-02 11:00:03', status: 'Failed', duration: '0.3s', trigger: 'Scheduled', actionsRun: 0, message: 'SharePoint connection timeout' },
    ],
  },
  {
    id: 'WF-T006', name: 'Risk Threshold Breach → CFO Alert',
    description: 'When total ALE breaches $5M threshold, alert CFO and trigger financial risk review workflow.',
    status: 'Draft', trigger: 'Risk Threshold', actions: ['Email Stakeholder', 'Generate Report', 'Create Task'],
    lastRun: 'Never', runCount: 0, successRate: 0, category: 'Financial Risk',
    integrations: ['Email', 'Calendar'], createdDate: '2026-03-01',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'Risk Threshold', label: 'ALE Threshold Breach', config: { metric: 'total_ALE', operator: '>', threshold: '5000000', currency: 'USD' } },
      { id: 'n2', type: 'action', nodeType: 'Email Stakeholder', label: 'Alert CFO/CRO', config: { recipients: 'CFO, CRO, CISO', subject: 'ALERT: Total AI Risk ALE exceeds $5M' } },
    ],
    runLogs: [],
  },
]

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  const el = document.createElement('div')
  el.textContent = msg
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '9999',
    background: type === 'success' ? 'hsl(142 71% 45% / 0.15)' : type === 'error' ? 'hsl(0 72% 51% / 0.15)' : 'hsl(var(--bg-surface))',
    color: type === 'success' ? 'hsl(142 71% 35%)' : type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))',
    border: `1px solid ${type === 'success' ? 'hsl(142 71% 45% / 0.3)' : type === 'error' ? 'hsl(var(--destructive)/0.3)' : 'hsl(var(--border))'}`,
    padding: '10px 20px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  })
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}

// ── Node Row (editable) ───────────────────────────────────────────────────────
function NodeRow({ node, index, total, onUpdate, onDelete }: {
  node: WorkflowNode
  index: number
  total: number
  onUpdate: (id: string, config: Record<string, string>) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [localConfig, setLocalConfig] = useState({ ...node.config })

  const save = () => {
    onUpdate(node.id, localConfig)
    setEditing(false)
    showToast('Node configuration saved')
  }

  return (
    <div className="relative pl-12">
      <div className="absolute left-[17px] top-4 w-3.5 h-3.5 rounded-full border-2 z-10"
        style={{ borderColor: NODE_COLOR[node.type], background: 'hsl(var(--bg-surface))' }} />
      <div className="border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 font-semibold uppercase"
              style={{ background: NODE_COLOR[node.type] + '20', color: NODE_COLOR[node.type] }}>
              {node.type}
            </span>
            <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{node.label}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { setLocalConfig({ ...node.config }); setEditing(e => !e) }}
              className="p-1.5 hover:bg-surface transition-colors"
              title={editing ? 'Collapse' : 'Edit config'}>
              <PencilSimple size={11} style={{ color: 'hsl(var(--text-4))' }} />
            </button>
            <button onClick={() => onDelete(node.id)}
              className="p-1.5 hover:bg-surface transition-colors" title="Remove step">
              <Trash size={11} style={{ color: 'hsl(var(--s-er-tx))' }} />
            </button>
            <button onClick={() => { setLocalConfig({ ...node.config }); setEditing(e => !e) }}
              className="p-1.5 hover:bg-surface transition-colors">
              {editing ? <CaretUp size={11} style={{ color: 'hsl(var(--text-4))' }} /> : <CaretDown size={11} style={{ color: 'hsl(var(--text-4))' }} />}
            </button>
          </div>
        </div>

        {editing ? (
          <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-[10px] font-semibold uppercase mt-2 mb-1" style={{ color: 'hsl(var(--text-4))' }}>Configuration</p>
            {Object.entries(localConfig).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="text-[10px] font-mono w-28 flex-shrink-0" style={{ color: 'hsl(var(--text-4))' }}>{k}</span>
                <input
                  value={v}
                  onChange={e => setLocalConfig(c => ({ ...c, [k]: e.target.value }))}
                  className="flex-1 px-2 py-1 text-xs border bg-surface text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]"
                  style={{ borderColor: 'hsl(var(--border))' }}
                />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button onClick={save} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90">
                <Check size={11} /> Save
              </button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs border hover:bg-surface" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-2.5 flex flex-wrap gap-x-4 gap-y-0.5">
            {Object.entries(node.config).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1 text-[10px]">
                <span style={{ color: 'hsl(var(--text-4))' }}>{k.replace(/_/g, ' ')}:</span>
                <span className="font-mono" style={{ color: 'hsl(var(--text-2))' }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {index < total - 1 && (
        <div className="flex justify-start pl-5 py-1">
          <ArrowDown size={10} style={{ color: 'hsl(var(--text-4))' }} />
        </div>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AutomationStudio() {
  const [tab, setTab] = useState<'workflows' | 'integrations'>('workflows')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [selected, setSelected] = useState<Workflow | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'builder' | 'logs'>('overview')
  const [workflows, setWorkflows] = useState<Workflow[]>(SEED_WORKFLOWS)

  // New Workflow dialog
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState({
    name: '', description: '', trigger: '' as TriggerType | '', category: 'Custom',
    selectedActions: [] as ActionType[],
  })

  // YAML Import dialog
  const [yamlOpen, setYamlOpen] = useState(false)
  const [yamlText, setYamlText] = useState('')

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null)

  // Test run simulation
  const [testRunning, setTestRunning] = useState<string | null>(null)

  const categories = ['All', ...Array.from(new Set(SEED_WORKFLOWS.map(w => w.category)))]
  const filtered = useMemo(() => workflows.filter(w => {
    const m = !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase())
    const c = catFilter === 'All' || w.category === catFilter
    return m && c
  }), [search, catFilter, workflows])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleStatus = (wf: Workflow) => {
    const next = wf.status === 'Active' ? 'Paused' : 'Active'
    setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, status: next } : w))
    if (selected?.id === wf.id) setSelected(prev => prev ? { ...prev, status: next } : prev)
    showToast(`${wf.name} ${next === 'Active' ? 'activated' : 'paused'}`)
  }

  const cloneWorkflow = (wf: Workflow) => {
    const clone: Workflow = {
      ...wf,
      id: `WF-C${Date.now().toString().slice(-4)}`,
      name: `${wf.name} (Copy)`,
      status: 'Draft',
      runCount: 0,
      successRate: 0,
      lastRun: 'Never',
      isTemplate: false,
      runLogs: [],
      createdDate: new Date().toISOString().split('T')[0],
    }
    setWorkflows(prev => [clone, ...prev])
    showToast('Workflow cloned as draft')
  }

  const deleteWorkflow = (wf: Workflow) => {
    setWorkflows(prev => prev.filter(w => w.id !== wf.id))
    if (selected?.id === wf.id) setSelected(null)
    setDeleteTarget(null)
    showToast(`${wf.name} deleted`)
  }

  const updateNodeConfig = (wfId: string, nodeId: string, config: Record<string, string>) => {
    setWorkflows(prev => prev.map(w =>
      w.id === wfId ? { ...w, nodes: w.nodes.map(n => n.id === nodeId ? { ...n, config } : n) } : w
    ))
    setSelected(prev => prev && prev.id === wfId
      ? { ...prev, nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, config } : n) }
      : prev
    )
  }

  const deleteNode = (wfId: string, nodeId: string) => {
    setWorkflows(prev => prev.map(w =>
      w.id === wfId ? { ...w, nodes: w.nodes.filter(n => n.id !== nodeId) } : w
    ))
    setSelected(prev => prev && prev.id === wfId
      ? { ...prev, nodes: prev.nodes.filter(n => n.id !== nodeId) }
      : prev
    )
  }

  const addActionNode = (wfId: string, actionType: ActionType) => {
    const node: WorkflowNode = {
      id: `n${Date.now()}`,
      type: 'action',
      nodeType: actionType,
      label: actionType,
      config: { ...ACTION_DEFAULT_CONFIG[actionType] },
    }
    setWorkflows(prev => prev.map(w =>
      w.id === wfId ? { ...w, nodes: [...w.nodes, node], actions: [...w.actions, actionType] } : w
    ))
    setSelected(prev => prev && prev.id === wfId
      ? { ...prev, nodes: [...prev.nodes, node], actions: [...prev.actions, actionType] }
      : prev
    )
    showToast(`${actionType} step added`)
  }

  const handleTestRun = (wf: Workflow) => {
    setTestRunning(wf.id)
    setTimeout(() => {
      const success = Math.random() > 0.1
      const newLog: RunLog = {
        time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: success ? 'Success' : 'Failed',
        duration: `${(Math.random() * 3 + 0.5).toFixed(1)}s`,
        trigger: 'Manual Test',
        actionsRun: success ? wf.actions.length : Math.floor(Math.random() * wf.actions.length),
        message: success ? undefined : 'Simulated test failure — check integration config',
      }
      setWorkflows(prev => prev.map(w =>
        w.id === wf.id ? { ...w, runCount: w.runCount + 1, lastRun: new Date().toISOString(), runLogs: [newLog, ...w.runLogs] } : w
      ))
      setSelected(prev => prev && prev.id === wf.id
        ? { ...prev, runCount: prev.runCount + 1, lastRun: new Date().toISOString(), runLogs: [newLog, ...prev.runLogs] }
        : prev
      )
      setTestRunning(null)
      showToast(success ? 'Test run completed successfully' : 'Test run failed — see logs', success ? 'success' : 'error')
    }, 2000)
  }

  const handleCreateWorkflow = () => {
    if (!newForm.name.trim() || !newForm.trigger) {
      showToast('Name and trigger type are required', 'error'); return
    }
    const id = `WF-${Date.now().toString().slice(-4)}`
    const triggerNode: WorkflowNode = {
      id: 'n1',
      type: 'trigger',
      nodeType: newForm.trigger,
      label: newForm.trigger,
      config: { ...TRIGGER_DEFAULT_CONFIG[newForm.trigger] },
    }
    const actionNodes: WorkflowNode[] = newForm.selectedActions.map((a, i) => ({
      id: `n${i + 2}`,
      type: 'action' as NodeType,
      nodeType: a,
      label: a,
      config: { ...ACTION_DEFAULT_CONFIG[a] },
    }))
    const wf: Workflow = {
      id,
      name: newForm.name,
      description: newForm.description || `${newForm.trigger} workflow with ${newForm.selectedActions.length} action(s)`,
      status: 'Draft',
      trigger: newForm.trigger,
      actions: newForm.selectedActions,
      lastRun: 'Never',
      runCount: 0,
      successRate: 0,
      category: newForm.category,
      integrations: [],
      isTemplate: false,
      nodes: [triggerNode, ...actionNodes],
      runLogs: [],
      createdDate: new Date().toISOString().split('T')[0],
    }
    setWorkflows(prev => [wf, ...prev])
    setNewOpen(false)
    setNewForm({ name: '', description: '', trigger: '', category: 'Custom', selectedActions: [] })
    showToast(`Workflow "${wf.name}" created as Draft`)
    setSelected(wf)
    setDrawerTab('builder')
  }

  const handleYamlImport = () => {
    if (!yamlText.trim()) { showToast('Paste YAML content first', 'error'); return }
    const id = `WF-YAML-${Date.now().toString().slice(-4)}`
    const importedWf: Workflow = {
      id,
      name: 'Imported Workflow',
      description: 'Imported from YAML. Review and configure before activating.',
      status: 'Draft',
      trigger: 'API/Webhook',
      actions: ['Create Task'],
      lastRun: 'Never',
      runCount: 0,
      successRate: 0,
      category: 'Custom',
      integrations: [],
      isTemplate: false,
      createdDate: new Date().toISOString().split('T')[0],
      nodes: [
        { id: 'n1', type: 'trigger', nodeType: 'API/Webhook', label: 'Webhook Trigger', config: { endpoint: '/api/webhooks/trigger', auth: 'Bearer' } },
      ],
      runLogs: [],
    }
    setWorkflows(prev => [importedWf, ...prev])
    setYamlOpen(false)
    setYamlText('')
    showToast(`YAML imported as "${importedWf.name}" — review configuration in the builder`)
    setSelected(importedWf)
    setDrawerTab('builder')
  }

  const toggleAction = (a: ActionType) => {
    setNewForm(f => ({
      ...f,
      selectedActions: f.selectedActions.includes(a)
        ? f.selectedActions.filter(x => x !== a)
        : [...f.selectedActions, a],
    }))
  }

  const activeCount = workflows.filter(w => w.status === 'Active').length
  const totalRuns = workflows.reduce((s, w) => s + w.runCount, 0)

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Lightning size={20} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            Governance Automation Studio
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
            No-code governance workflow builder — Sentinel becomes the gate in your CI/CD pipeline and the mirror in Jira/ServiceNow
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setYamlOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 border text-sm transition-colors hover:bg-raised"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
            <Code size={14} /> Import YAML
          </button>
          <button onClick={() => setNewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium hover:opacity-90"
            style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
            <Plus size={14} /> New Workflow
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Workflows', value: activeCount, sub: 'Running automations', color: 'hsl(142 71% 35%)' },
          { label: 'Total Executions', value: totalRuns.toLocaleString(), sub: 'Across all workflows', color: 'hsl(var(--brand))' },
          { label: 'Integrations', value: INTEGRATIONS.filter(i => i.status === 'Connected').length, sub: 'CI/CD + ITSM connected', color: 'hsl(var(--text-1))' },
          { label: 'Deployments Gated', value: '847', sub: 'Blocked via CI/CD', color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="border p-4" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'hsl(var(--border))' }}>
        {([['workflows', 'Workflow Library'], ['integrations', 'Integration Hub']] as const).map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} className="px-5 py-2.5 text-sm font-medium transition-colors"
            style={tab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Workflows tab */}
      {tab === 'workflows' && (
        <>
          <div className="flex items-center gap-2 p-3 border"
            style={{ borderColor: 'hsl(220 90% 56% / 0.3)', background: 'hsl(220 90% 56% / 0.06)' }}>
            <Lightning size={14} style={{ color: 'hsl(220 90% 56%)' }} className="flex-shrink-0" />
            <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
              <span className="font-semibold" style={{ color: 'hsl(220 90% 56%)' }}>Sentinel as CI/CD Gate:</span>{' '}
              Workflows with "CI/CD Gate" trigger block deployments that fail AI governance checks directly in GitHub Actions, GitLab CI, or Azure DevOps — before code reaches production.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows…"
                className="w-full pl-9 pr-3 py-2 text-sm border bg-surface text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]"
                style={{ borderColor: 'hsl(var(--border))' }} />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="px-3 py-2 text-sm border bg-surface text-[hsl(var(--text-1))] focus:outline-none"
              style={{ borderColor: 'hsl(var(--border))' }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <span className="flex items-center text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>
              {filtered.length} of {workflows.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {filtered.map(wf => (
              <div key={wf.id} className="border transition-colors hover:border-[hsl(var(--brand)/0.3)]"
                style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', borderLeft: `3px solid ${wf.status === 'Active' ? 'hsl(142 71% 45%)' : wf.status === 'Error' ? 'hsl(var(--destructive))' : 'transparent'}` }}>
                <div className="flex items-start gap-4 p-4">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelected(wf); setDrawerTab('overview') }}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{wf.id}</span>
                      <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[wf.status] || { background: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{wf.status}</span>
                      <span className="text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{wf.category}</span>
                      {wf.trigger === 'CI/CD Gate' && (
                        <span className="text-[10px] px-1.5 py-0.5 font-semibold"
                          style={{ background: 'hsl(220 90% 56% / 0.12)', color: 'hsl(220 90% 56%)' }}>CI/CD Gate</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{wf.name}</h3>
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'hsl(var(--text-4))' }}>{wf.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      <span>Trigger: <span className="font-medium" style={{ color: 'hsl(var(--text-3))' }}>{wf.trigger}</span></span>
                      <span>{wf.actions.length} action{wf.actions.length !== 1 ? 's' : ''}</span>
                      <span>{wf.runCount > 0 ? `${wf.runCount.toLocaleString()} runs` : 'Not run'}</span>
                      {wf.runCount > 0 && <span className="font-medium" style={{ color: 'hsl(142 71% 35%)' }}>{wf.successRate}% success</span>}
                      {wf.lastRun !== 'Never' && <span>Last: {wf.lastRun.slice(0, 10)}</span>}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {wf.integrations.map(i => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 border"
                          style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>{i}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleTestRun(wf)} disabled={testRunning === wf.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] border transition-colors hover:bg-raised"
                      style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}
                      title="Test run">
                      {testRunning === wf.id ? <Timer size={11} className="animate-spin" /> : <Play size={11} />}
                      {testRunning === wf.id ? 'Running…' : 'Test'}
                    </button>
                    <button onClick={() => cloneWorkflow(wf)} title="Clone" className="p-2 border hover:bg-raised"
                      style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
                      <Copy size={13} />
                    </button>
                    <button onClick={() => toggleStatus(wf)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border transition-colors"
                      style={wf.status === 'Active'
                        ? { borderColor: 'hsl(45 93% 47% / 0.4)', color: 'hsl(45 85% 40%)' }
                        : { borderColor: 'hsl(142 71% 45% / 0.4)', color: 'hsl(142 71% 35%)' }}>
                      {wf.status === 'Active' ? <><Pause size={11} /> Pause</> : <><Play size={11} /> Activate</>}
                    </button>
                    <button onClick={() => setDeleteTarget(wf)} className="p-2 border hover:bg-[hsl(var(--s-er-bg))]"
                      style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--s-er-tx))' }} title="Delete">
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>No workflows match your search.</div>
            )}
          </div>
        </>
      )}

      {/* Integrations tab */}
      {tab === 'integrations' && (
        <>
          <div className="flex items-center gap-2 p-3 border"
            style={{ borderColor: 'hsl(220 90% 56% / 0.3)', background: 'hsl(220 90% 56% / 0.06)' }}>
            <FlowArrow size={14} style={{ color: 'hsl(220 90% 56%)' }} className="flex-shrink-0" />
            <p className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>
              <span className="font-semibold" style={{ color: 'hsl(220 90% 56%)' }}>Sentinel as Workflow Mirror:</span>{' '}
              When connected to Jira and ServiceNow, every compliance finding, risk update, and incident automatically creates tickets in your existing toolchain — and vice versa.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="border p-4" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{int.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{int.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{int.category}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{int.description}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {int.status === 'Connected'
                      ? <span className="text-[11px] px-2 py-0.5 flex items-center gap-1 font-medium"
                        style={{ background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(142 71% 35%)' }}>
                        <CheckCircle size={10} /> Connected
                      </span>
                      : <button onClick={() => showToast(`${int.name} integration initiated — follow OAuth flow`)}
                        className="text-[11px] px-2 py-1 hover:opacity-90 font-medium"
                        style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
                        Connect
                      </button>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border p-4" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>Webhook / REST API</p>
            <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-4))' }}>Trigger any workflow via webhook or use Sentinel's REST API to integrate with any system not listed above.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 border text-[11px] font-mono truncate"
                style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--brand))' }}>
                POST https://api.sentinel.ai/v1/workflows/trigger
              </code>
              <button onClick={() => { navigator.clipboard.writeText('POST https://api.sentinel.ai/v1/workflows/trigger'); showToast('Endpoint copied') }}
                className="px-3 py-2 border text-xs hover:bg-surface"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                Copy
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[560px] flex flex-col h-full border-l"
            style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>

            {/* Header */}
            <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-mono text-[10px]" style={{ color: 'hsl(var(--brand))' }}>{selected.id}</p>
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status] || { background: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{selected.status}</span>
                  <span className="text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{selected.category}</span>
                </div>
                <h2 className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selected.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>Trigger: {selected.trigger} · Created {selected.createdDate}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 flex-shrink-0">
                <X size={18} style={{ color: 'hsl(var(--text-4))' }} />
              </button>
            </div>

            {/* Drawer tabs */}
            <div className="flex border-b" style={{ borderColor: 'hsl(var(--border))' }}>
              {([['overview', 'Overview'], ['builder', 'Flow Builder'], ['logs', 'Run Logs']] as const).map(([t, l]) => (
                <button key={t} onClick={() => setDrawerTab(t)} className="flex-1 py-2.5 text-[11px] font-medium transition-colors"
                  style={drawerTab === t ? { color: 'hsl(var(--brand))', borderBottom: '2px solid hsl(var(--brand))' } : { color: 'hsl(var(--text-4))' }}>
                  {l}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Overview */}
              {drawerTab === 'overview' && (
                <>
                  <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Trigger', value: selected.trigger },
                      { label: 'Category', value: selected.category },
                      { label: 'Total Runs', value: selected.runCount.toLocaleString() },
                      { label: 'Success Rate', value: selected.runCount > 0 ? `${selected.successRate}%` : 'N/A' },
                      { label: 'Last Run', value: selected.lastRun === 'Never' ? 'Never' : selected.lastRun.slice(0, 10) },
                      { label: 'Actions', value: `${selected.actions.length} configured` },
                      { label: 'Created', value: selected.createdDate },
                      { label: 'Nodes', value: `${selected.nodes.length} steps` },
                    ].map(f => (
                      <div key={f.label} className="p-3 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                        <p className="text-[10px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>{f.label}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: 'hsl(var(--text-3))' }}>Actions</p>
                    <div className="space-y-1.5">
                      {selected.actions.map((a, i) => {
                        const Icon = ACTION_ICONS[a] || Lightning
                        return (
                          <div key={i} className="flex items-center gap-2 p-2 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                            <span className="text-[10px] w-4" style={{ color: 'hsl(var(--text-4))' }}>{i + 1}.</span>
                            <Icon size={11} style={{ color: 'hsl(var(--brand))' }} />
                            <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {selected.integrations.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: 'hsl(var(--text-3))' }}>Integrations</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {selected.integrations.map(i => (
                          <span key={i} className="text-[11px] px-2 py-1 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>{i}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Flow Builder — editable */}
              {drawerTab === 'builder' && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-3))' }}>
                      {selected.nodes.length} Step{selected.nodes.length !== 1 ? 's' : ''} — click <PencilSimple size={10} className="inline" /> to edit any config
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute left-5 top-4 bottom-4 w-px" style={{ background: 'hsl(var(--border))' }} />
                    <div className="space-y-0">
                      {selected.nodes.map((node, idx) => (
                        <NodeRow
                          key={node.id}
                          node={node}
                          index={idx}
                          total={selected.nodes.length}
                          onUpdate={(nodeId, config) => updateNodeConfig(selected.id, nodeId, config)}
                          onDelete={(nodeId) => deleteNode(selected.id, nodeId)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Add action step */}
                  <div className="border border-dashed p-3" style={{ borderColor: 'hsl(var(--border))' }}>
                    <p className="text-[10px] font-semibold uppercase mb-2" style={{ color: 'hsl(var(--text-4))' }}>Add Action Step</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ACTION_TYPES.map(a => (
                        <button key={a} onClick={() => addActionNode(selected.id, a)}
                          className="text-[10px] px-2 py-1 border transition-colors hover:border-[hsl(var(--brand)/0.4)] hover:text-[hsl(var(--brand))]"
                          style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
                          + {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Run Logs */}
              {drawerTab === 'logs' && (
                <>
                  <p className="text-[11px] font-semibold uppercase" style={{ color: 'hsl(var(--text-3))' }}>
                    Recent Executions {selected.runLogs.length > 0 ? `(${selected.runLogs.length})` : ''}
                  </p>
                  {selected.runLogs.length === 0 ? (
                    <div className="text-center py-10 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      No executions yet. Click <strong>Test</strong> to simulate a run.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selected.runLogs.map((run, i) => (
                        <div key={i} className="p-3 border flex items-start gap-3"
                          style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1`}
                            style={{ background: run.status === 'Success' ? 'hsl(142 71% 45%)' : run.status === 'Running' ? 'hsl(220 90% 56%)' : 'hsl(var(--destructive))' }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{run.status}</p>
                              <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{run.duration} · {run.actionsRun} action{run.actionsRun !== 1 ? 's' : ''}</span>
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{run.time} · {run.trigger}</p>
                            {run.message && (
                              <p className="text-[10px] mt-1 italic" style={{ color: run.status === 'Failed' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>{run.message}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t flex gap-2" style={{ borderColor: 'hsl(var(--border))' }}>
              <button onClick={() => handleTestRun(selected)} disabled={testRunning === selected.id}
                className="flex-1 py-2 border text-sm transition-colors hover:bg-raised flex items-center justify-center gap-1.5"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                {testRunning === selected.id ? <Timer size={13} className="animate-spin" /> : <Play size={13} />}
                {testRunning === selected.id ? 'Running…' : 'Test Run'}
              </button>
              <button onClick={() => toggleStatus(selected)}
                className="flex-1 py-2 border text-sm transition-colors hover:bg-raised"
                style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                {selected.status === 'Active' ? 'Pause' : 'Activate'}
              </button>
              <button onClick={() => cloneWorkflow(selected)}
                className="flex-1 py-2 text-sm font-medium hover:opacity-90"
                style={{ background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}>
                Clone & Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Workflow Dialog ───────────────────────────────────────────────── */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Configure the trigger and select actions. You can edit individual step configs in the Flow Builder after creation.
            </p>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Workflow Name <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <Input placeholder="e.g., GDPR Breach → Regulator Notify" value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea placeholder="Describe what this workflow automates and when it fires…" rows={2}
                value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} style={{ borderRadius: 0 }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Trigger Type <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
                <Select value={newForm.trigger} onValueChange={v => setNewForm(f => ({ ...f, trigger: v as TriggerType }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}>
                    <SelectValue placeholder="Select trigger…" />
                  </SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={newForm.category} onValueChange={v => setNewForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                  <SelectContent style={{ borderRadius: 0 }}>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newForm.trigger && (
              <div className="p-3 border" style={{ background: 'hsl(220 90% 56% / 0.06)', borderColor: 'hsl(220 90% 56% / 0.25)' }}>
                <p className="text-[10px] font-semibold uppercase mb-1.5" style={{ color: 'hsl(220 90% 56%)' }}>Default Trigger Config</p>
                {Object.entries(TRIGGER_DEFAULT_CONFIG[newForm.trigger]).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-[10px]">
                    <span className="w-28 flex-shrink-0" style={{ color: 'hsl(var(--text-4))' }}>{k}</span>
                    <span className="font-mono" style={{ color: 'hsl(var(--text-2))' }}>{v}</span>
                  </div>
                ))}
                <p className="text-[10px] mt-2" style={{ color: 'hsl(var(--text-4))' }}>Edit these in the Flow Builder after creation.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Actions <span style={{ color: 'hsl(var(--s-er-tx))' }}>*</span></Label>
              <p className="text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>Select one or more actions to perform when the trigger fires:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ACTION_TYPES.map(a => {
                  const selected = newForm.selectedActions.includes(a)
                  const Icon = ACTION_ICONS[a] || Lightning
                  return (
                    <button key={a} type="button" onClick={() => toggleAction(a)}
                      className="flex items-center gap-2 p-2.5 border text-left text-xs transition-colors"
                      style={{
                        background: selected ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-raised))',
                        borderColor: selected ? 'hsl(var(--brand)/0.3)' : 'hsl(var(--border))',
                        color: selected ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                      }}>
                      <Icon size={12} />
                      <span className="flex-1">{a}</span>
                      {selected && <Check size={11} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={handleCreateWorkflow}>
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── YAML Import Dialog ────────────────────────────────────────────────── */}
      <Dialog open={yamlOpen} onOpenChange={setYamlOpen}>
        <DialogContent className="max-w-xl" style={{ borderRadius: 0 }}>
          <DialogHeader>
            <DialogTitle>Import Workflow from YAML</DialogTitle>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Paste your workflow YAML definition below. The workflow will be imported as a Draft for review before activation.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 border text-xs font-mono leading-relaxed"
              style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
              {`name: "My Workflow"\ndescription: "Auto-escalate on risk threshold breach"\ntrigger:\n  type: risk_threshold\n  config:\n    metric: risk_score\n    operator: ">\"\n    threshold: "20"\nactions:\n  - type: notify_slack\n    channel: "#compliance"\n  - type: create_task\n    assignee: risk_owner`}
            </div>
            <Textarea
              placeholder="Paste your YAML here…"
              rows={10}
              value={yamlText}
              onChange={e => setYamlText(e.target.value)}
              className="font-mono text-xs"
              style={{ borderRadius: 0 }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setYamlOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={handleYamlImport}>
              Import & Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. All run history will be lost. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              style={{ borderRadius: 0, background: 'hsl(var(--destructive))', color: 'hsl(var(--bg-surface))' }}
              onClick={() => deleteTarget && deleteWorkflow(deleteTarget)}>
              Delete Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
