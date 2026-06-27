import { useState } from 'react'
import { Plugs, Plus, X, Warning, ArrowClockwise, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'


type IntegrationStatus = 'Connected' | 'Disconnected' | 'Error' | 'Pending Setup'
type IntegrationCategory = 'AI Provider' | 'Data Source' | 'Compliance Tool' | 'Monitoring' | 'Identity' | 'Notification' | 'Ticketing'

interface Integration {
  id: string
  name: string
  category: IntegrationCategory
  status: IntegrationStatus
  description: string
  lastSync?: string
  dataFlows: string[]
  apiVersion?: string
  healthCheck?: 'passing' | 'failing' | 'degraded'
  authMethod: string
  connectedDate?: string
  error?: string
}

const SEED: Integration[] = [
  { id: 'INT-001', name: 'OpenAI', category: 'AI Provider', status: 'Connected', description: 'GPT-4o and GPT-4o-mini APIs for LoanProcessorAgent and other production agents', lastSync: '2026-04-10 09:15:00', dataFlows: ['Model inference requests', 'Usage metering', 'Safety logs'], apiVersion: 'v1', healthCheck: 'passing', authMethod: 'API Key (rotated every 90 days)', connectedDate: '2025-08-15' },
  { id: 'INT-002', name: 'Anthropic', category: 'AI Provider', status: 'Connected', description: 'Claude 3.5 Sonnet and Claude 3 Haiku for FraudInvestigatorAgent and DataQualityPatrolAgent', lastSync: '2026-04-10 08:55:00', dataFlows: ['Model inference requests', 'Safety filter events'], apiVersion: 'v1', healthCheck: 'passing', authMethod: 'API Key (rotated every 90 days)', connectedDate: '2026-01-10' },
  { id: 'INT-003', name: 'Experian Credit Bureau', category: 'Data Source', status: 'Connected', description: 'Real-time credit bureau data for Credit Scoring and Loan Approval models', lastSync: '2026-04-07 04:00:00', dataFlows: ['Credit reports', 'Score updates', 'Inquiry records'], healthCheck: 'degraded', authMethod: 'mTLS Certificate', connectedDate: '2024-06-01', error: 'API latency elevated (avg 4.2s vs SLA 2s) — contact Experian support' },
  { id: 'INT-004', name: 'Splunk', category: 'Monitoring', status: 'Connected', description: 'Security information and event management — AI system logs, anomaly detection, SIEM integration', lastSync: '2026-04-10 09:20:00', dataFlows: ['Audit logs', 'Security events', 'Model inference logs', 'Performance metrics'], healthCheck: 'passing', authMethod: 'Service Account Token', connectedDate: '2025-03-01' },
  { id: 'INT-005', name: 'Okta', category: 'Identity', status: 'Connected', description: 'SSO and MFA for all Sentinel platform users. SCIM provisioning for automated user lifecycle management.', lastSync: '2026-04-10 09:18:00', dataFlows: ['User authentication', 'Group sync', 'MFA events'], healthCheck: 'passing', authMethod: 'OAuth 2.0 / SAML 2.0', connectedDate: '2024-01-15' },
  { id: 'INT-006', name: 'Jira', category: 'Ticketing', status: 'Connected', description: 'Automatic ticket creation for compliance findings, risk items, HITL overflows, and remediation tasks', lastSync: '2026-04-10 09:10:00', dataFlows: ['Compliance tickets', 'Risk action items', 'Incident tickets', 'Audit findings'], healthCheck: 'passing', authMethod: 'API Token', connectedDate: '2025-09-01' },
  { id: 'INT-007', name: 'PagerDuty', category: 'Notification', status: 'Connected', description: 'On-call alerting for critical AI incidents, model performance degradation, and kill switch events', lastSync: '2026-04-10 09:00:00', dataFlows: ['Critical alerts', 'Incident escalations', 'On-call schedules'], healthCheck: 'passing', authMethod: 'Integration Key', connectedDate: '2025-09-01' },
  { id: 'INT-008', name: 'Hugging Face Hub', category: 'AI Provider', status: 'Error', description: 'Model repository and inference API for open-source model access', lastSync: '2026-04-08 14:00:00', dataFlows: ['Model downloads', 'Inference requests'], healthCheck: 'failing', authMethod: 'API Token', connectedDate: '2026-02-20', error: 'Authentication token expired — requires rotation. Click reconnect to update.' },
  { id: 'INT-009', name: 'AWS CloudWatch', category: 'Monitoring', status: 'Connected', description: 'Infrastructure monitoring for AWS-hosted AI compute workloads, cost tracking, and energy metrics', lastSync: '2026-04-10 09:15:00', dataFlows: ['Infrastructure metrics', 'Cost data', 'Energy consumption', 'GPU utilization'], healthCheck: 'passing', authMethod: 'IAM Role (cross-account)', connectedDate: '2024-06-01' },
  { id: 'INT-010', name: 'Slack', category: 'Notification', status: 'Pending Setup', description: 'Real-time notifications for compliance alerts, HITL reviews, and governance events to team channels', dataFlows: ['Compliance alerts', 'HITL notifications', 'Daily summaries'], authMethod: 'OAuth 2.0' },
]

const STATUS_STYLE: Record<IntegrationStatus, { bg: string; color: string }> = {
  Connected: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Disconnected: { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' },
  Error: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  'Pending Setup': { bg: 'hsl(220 90% 56% / 0.12)', color: 'hsl(var(--s-in-tx))' },
}

const HEALTH_DOT: Record<string, string> = {
  passing: 'hsl(var(--s-ok-tx))',
  degraded: 'hsl(45 85% 40%)',
  failing: 'hsl(var(--destructive))',
}

const CAT_COLORS: Record<IntegrationCategory, string> = {
  'AI Provider': 'hsl(var(--brand))',
  'Data Source': 'hsl(142 71% 45%)',
  'Compliance Tool': 'hsl(280 67% 56%)',
  Monitoring: 'hsl(220 90% 56%)',
  Identity: 'hsl(25 95% 53%)',
  Notification: 'hsl(45 93% 47%)',
  Ticketing: 'hsl(var(--text-3))',
}

const BLANK_INT = { name: '', category: 'AI Provider' as IntegrationCategory, description: '', authMethod: 'API Key', apiVersion: '', }

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(SEED)
  const [selected, setSelected] = useState<Integration | null>(null)
  const [catFilter, setCatFilter] = useState<string>('All')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(BLANK_INT)
  const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null)

  const filtered = catFilter === 'All' ? integrations : integrations.filter(i => i.category === catFilter)
  const categories = ['All', ...Array.from(new Set(integrations.map(i => i.category)))]

  const stats = {
    connected: integrations.filter(i => i.status === 'Connected').length,
    errors: integrations.filter(i => i.status === 'Error').length,
    pending: integrations.filter(i => i.status === 'Pending Setup').length,
    total: integrations.length,
  }

  function handleCreate() {
    if (!form.name || !form.category) { toast.error('Name and category are required'); return }
    const newInt: Integration = {
      id: `INT-${String(integrations.length + 1).padStart(3, '0')}`,
      name: form.name, category: form.category, description: form.description || 'No description provided.',
      status: 'Pending Setup', dataFlows: [], authMethod: form.authMethod || 'API Key',
      apiVersion: form.apiVersion || undefined, connectedDate: undefined, healthCheck: undefined,
    }
    setIntegrations(p => [...p, newInt])
    setShowCreate(false)
    setForm(BLANK_INT)
    toast.success(`${newInt.name} integration added — complete setup to connect`)
  }

  function handleDelete() {
    if (!deleteTarget) return
    setIntegrations(p => p.filter(i => i.id !== deleteTarget.id))
    if (selected?.id === deleteTarget.id) setSelected(null)
    toast.success(`${deleteTarget.name} integration removed`)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Plugs size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Integrations
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Connected systems — AI providers, data sources, monitoring, identity, and notification services</p>
        </div>
        <button onClick={() => { setForm(BLANK_INT); setShowCreate(true) }} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90"><Plus size={14} /> Add Integration</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Integrations', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Connected', value: stats.connected, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Errors', value: stats.errors, color: 'hsl(var(--destructive))' },
          { label: 'Pending Setup', value: stats.pending, color: 'hsl(var(--s-in-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-surface p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className="text-[11px] px-2.5 py-1 border transition-colors" style={catFilter === c ? { background: 'hsl(var(--brand))', color: 'white', borderColor: 'hsl(var(--brand))' } : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(int => (
          <div key={int.id} className="rounded border border-[hsl(var(--border))] bg-surface p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)] transition-colors" onClick={() => setSelected(int)}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center border border-[hsl(var(--border))] bg-raised">
                  <Plugs size={18} style={{ color: CAT_COLORS[int.category] }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{int.name}</h3>
                  <span className="text-[10px]" style={{ color: CAT_COLORS[int.category] }}>{int.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {int.healthCheck && <div className="w-2 h-2 rounded-full" style={{ background: HEALTH_DOT[int.healthCheck] }} title={int.healthCheck} />}
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[int.status]}>{int.status}</span>
              </div>
            </div>
            <p className="text-xs text-[hsl(var(--text-4))] mb-2 line-clamp-2">{int.description}</p>
            {int.error && (
              <div className="flex items-start gap-1.5 p-2 bg-[hsl(0_72%_51%/0.06)] border border-[hsl(var(--destructive)/0.3)] mb-2">
                <Warning size={12} className="text-[hsl(var(--destructive))] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[hsl(var(--destructive))]">{int.error}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[hsl(var(--text-4))]">{int.lastSync ? `Last sync: ${int.lastSync}` : 'Not connected'}</p>
              <div className="flex gap-1 items-center">
                {int.status === 'Error' && (
                  <button onClick={e => { e.stopPropagation(); toast.success(`${int.name} reconnected`) }} className="text-[10px] px-2 py-0.5 bg-[hsl(var(--brand))] text-white hover:opacity-90">Reconnect</button>
                )}
                {int.status === 'Pending Setup' && (
                  <button onClick={e => { e.stopPropagation(); toast.info(`Setting up ${int.name}`) }} className="text-[10px] px-2 py-0.5 bg-[hsl(var(--brand))] text-white hover:opacity-90">Set Up</button>
                )}
                <button onClick={e => { e.stopPropagation(); setDeleteTarget(int) }} className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--destructive))]"><Trash size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[440px] bg-surface border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="text-[10px] text-[hsl(var(--text-4))]">{selected.category}</p><h2 className="text-base font-semibold text-[hsl(var(--text-1))]">{selected.name}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                {selected.healthCheck && <span className="text-[11px] px-2 py-0.5 font-medium flex items-center gap-1" style={{ background: selected.healthCheck === 'passing' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(0 72% 51% / 0.12)', color: HEALTH_DOT[selected.healthCheck] }}><div className="w-1.5 h-1.5 rounded-full" style={{ background: HEALTH_DOT[selected.healthCheck] }} />{selected.healthCheck}</span>}
              </div>
              <p className="text-sm text-[hsl(var(--text-2))] leading-relaxed">{selected.description}</p>
              {selected.error && <div className="flex items-start gap-2 p-3 bg-[hsl(0_72%_51%/0.06)] border border-[hsl(var(--destructive)/0.3)]"><Warning size={14} className="text-[hsl(var(--destructive))] flex-shrink-0 mt-0.5" /><p className="text-sm text-[hsl(var(--destructive))]">{selected.error}</p></div>}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Auth Method', value: selected.authMethod },
                  { label: 'API Version', value: selected.apiVersion ?? 'N/A' },
                  { label: 'Connected Date', value: selected.connectedDate ?? 'N/A' },
                  { label: 'Last Sync', value: selected.lastSync ?? 'Never' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-raised border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Data Flows</p><div className="space-y-1">{selected.dataFlows.map(f => <div key={f} className="text-xs text-[hsl(var(--text-2))] p-2 bg-raised border border-[hsl(var(--border))]">{f}</div>)}</div></div>
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => toast.success(`${selected.name} synced`)} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised"><ArrowClockwise size={14} /> Sync Now</button>
              {selected.status === 'Error' && <button onClick={() => { toast.success(`${selected.name} reconnected`); setSelected(null) }} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">Reconnect</button>}
              <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="px-3 py-2 border border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))] text-sm hover:bg-[hsl(0_72%_51%/0.06)]"><Trash size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Add Integration Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-surface border border-[hsl(var(--border))] w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <h2 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
                <Plugs size={15} className="text-[hsl(var(--brand))]" />
                Add Integration
              </h2>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Integration Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Vertex AI, Datadog, ServiceNow..." className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Category *</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as IntegrationCategory }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                  {['AI Provider', 'Data Source', 'Compliance Tool', 'Monitoring', 'Identity', 'Notification', 'Ticketing'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Auth Method</label>
                <select value={form.authMethod} onChange={e => setForm(p => ({ ...p, authMethod: e.target.value }))} className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))]">
                  {['API Key', 'OAuth 2.0', 'Service Account Token', 'mTLS Certificate', 'IAM Role', 'SAML 2.0', 'Integration Key'].map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-[hsl(var(--text-4))] uppercase tracking-wide mb-1 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe what this integration is used for..." className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] bg-raised text-[hsl(var(--text-1))] focus:outline-none focus:border-[hsl(var(--brand))] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[hsl(var(--border))]">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-raised">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 text-sm font-medium bg-[hsl(var(--brand))] text-white hover:opacity-90">Add Integration</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove integration?"
        description={`Disconnect and remove ${deleteTarget?.name}. Any data flows relying on this integration will stop.`}
        isDestructive
        confirmLabel="Remove"
      />
    </div>
  )
}
