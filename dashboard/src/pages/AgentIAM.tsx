import { useState } from 'react'
import { IdentificationCard, MagnifyingGlass, Plus, Eye, X, Export, Key, ShieldCheck, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AgentIdentity {
  id: string
  agentId: string
  agentName: string
  principalType: 'Service Account' | 'API Key' | 'OAuth Client' | 'mTLS Certificate'
  principalId: string
  roles: string[]
  scopes: string[]
  created: string
  expires: string
  lastUsed: string
  status: 'Active' | 'Revoked' | 'Expired' | 'Pending Rotation'
  mfaRequired: boolean
  ipAllowlist: string[]
  rotationPolicy: string
  auditRequired: boolean
}

const SEED: AgentIdentity[] = [
  { id: 'IAM-001', agentId: 'AGT-001', agentName: 'LoanProcessorAgent', principalType: 'Service Account', principalId: 'svc-loan-processor@acme-ai.iam.prod', roles: ['LoanProcessor', 'CreditReporter', 'AuditWriter'], scopes: ['credit:read', 'loans:write', 'documents:read', 'audit:write'], created: '2026-01-15', expires: '2026-07-15', lastUsed: '2026-04-10 09:18:00', status: 'Active', mfaRequired: false, ipAllowlist: ['10.0.0.0/8', '172.16.0.0/12'], rotationPolicy: 'Every 90 days — next: 2026-04-15', auditRequired: true },
  { id: 'IAM-002', agentId: 'AGT-001', agentName: 'LoanProcessorAgent', principalType: 'API Key', principalId: 'sk-prod-lpa-...f4a2', roles: ['CreditBureauCaller'], scopes: ['credit_bureau:read'], created: '2026-01-15', expires: '2026-04-15', lastUsed: '2026-04-10 09:18:00', status: 'Pending Rotation', mfaRequired: false, ipAllowlist: ['10.0.1.0/24'], rotationPolicy: 'Every 90 days — OVERDUE by 2 days', auditRequired: true },
  { id: 'IAM-003', agentId: 'AGT-002', agentName: 'FraudInvestigatorAgent', principalType: 'OAuth Client', principalId: 'oauth-fraud-inv-prod-7a3f', roles: ['FraudInvestigator', 'CaseManager'], scopes: ['transactions:read', 'customers:read', 'cases:write', 'enrichment:call'], created: '2026-02-01', expires: '2027-02-01', lastUsed: '2026-04-10 08:55:00', status: 'Active', mfaRequired: true, ipAllowlist: ['10.0.2.0/24', '10.0.3.0/24'], rotationPolicy: 'Annually — next: 2027-02-01', auditRequired: true },
  { id: 'IAM-004', agentId: 'AGT-003', agentName: 'ComplianceMonitorAgent', principalType: 'mTLS Certificate', principalId: 'CN=compliance-monitor,O=AcmeFinancial,C=US', roles: ['ComplianceReader', 'ReportWriter', 'AlertSender'], scopes: ['compliance:read', 'reports:write', 'alerts:send', 'regulatory:fetch'], created: '2026-01-20', expires: '2027-01-20', lastUsed: '2026-04-10 07:00:00', status: 'Active', mfaRequired: false, ipAllowlist: ['10.0.0.0/8'], rotationPolicy: 'Annually — auto-renewed via PKI', auditRequired: false },
  { id: 'IAM-005', agentId: 'AGT-004', agentName: 'CustomerServiceOrchestrator', principalType: 'Service Account', principalId: 'svc-cs-orchestrator@acme-ai.iam.prod', roles: ['AgentOrchestrator', 'ConversationManager'], scopes: ['agents:spawn', 'conversations:write', 'customers:read'], created: '2026-03-01', expires: '2026-09-01', lastUsed: '2026-04-07 14:20:00', status: 'Revoked', mfaRequired: false, ipAllowlist: ['10.0.5.0/24'], rotationPolicy: 'N/A — suspended', auditRequired: true },
  { id: 'IAM-006', agentId: 'AGT-006', agentName: 'DataQualityPatrolAgent', principalType: 'API Key', principalId: 'sk-prod-dqp-...b8f1', roles: ['DataReader', 'AlertWriter'], scopes: ['pipelines:read', 'schemas:read', 'alerts:write'], created: '2025-12-01', expires: '2026-06-01', lastUsed: '2026-04-10 09:20:00', status: 'Active', mfaRequired: false, ipAllowlist: ['10.0.0.0/8'], rotationPolicy: 'Every 180 days — next: 2026-06-01', auditRequired: false },
]

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  Revoked: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Expired: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
  'Pending Rotation': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
}

export default function AgentIAM() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AgentIdentity | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')

  const filtered = SEED.filter(i => {
    const ms = i.agentName.toLowerCase().includes(search.toLowerCase()) || i.principalId.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase())
    return ms && (statusFilter === 'All' || i.status === statusFilter)
  })

  const stats = {
    total: SEED.length,
    active: SEED.filter(i => i.status === 'Active').length,
    pendingRotation: SEED.filter(i => i.status === 'Pending Rotation').length,
    auditRequired: SEED.filter(i => i.auditRequired).length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <IdentificationCard size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Agent IAM
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Identity and access management for AI agents — credentials, roles, scopes, and rotation policies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button onClick={() => toast.info('Credential provisioning wizard')} className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--brand))] text-white text-sm hover:opacity-90">
            <Plus size={14} /> Provision Identity
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Identities', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Active', value: stats.active, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Pending Rotation', value: stats.pendingRotation, color: 'hsl(45 85% 40%)' },
          { label: 'Audit Required', value: stats.auditRequired, color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {stats.pendingRotation > 0 && (
        <div className="flex items-center gap-3 p-3 border border-[hsl(45_93%_47%/0.5)] bg-[hsl(45_93%_47%/0.08)]">
          <Warning size={16} className="text-[hsl(45_85%_40%)] flex-shrink-0" />
          <p className="text-sm text-[hsl(var(--text-2))]"><span className="font-semibold">{stats.pendingRotation} credential(s)</span> pending rotation. Rotate immediately to maintain security posture.</p>
          <button onClick={() => toast.success('Rotation initiated for all pending credentials')} className="ml-auto text-sm px-3 py-1 bg-[hsl(var(--brand))] text-white hover:opacity-90 flex-shrink-0">Rotate Now</button>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search identities…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Active', 'Pending Rotation', 'Revoked', 'Expired'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['ID', 'Agent', 'Principal Type', 'Principal ID', 'Roles', 'Expires', 'MFA', 'Audit', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(i)}>
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--brand))]">{i.id}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-2))] font-medium">{i.agentName}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-3))]">
                    <Key size={11} />
                    {i.principalType}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-[hsl(var(--text-4))] max-w-[160px] truncate">{i.principalId}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{i.roles.slice(0, 2).join(', ')}{i.roles.length > 2 ? ` +${i.roles.length - 2}` : ''}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{i.expires}</td>
                <td className="px-4 py-3">
                  <ShieldCheck size={14} className={i.mfaRequired ? 'text-[hsl(var(--s-ok-tx))]' : 'text-[hsl(var(--text-4))]'} weight={i.mfaRequired ? 'fill' : 'regular'} />
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-1.5 py-0.5 ${i.auditRequired ? 'bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))]'}`}>{i.auditRequired ? 'Required' : 'Optional'}</span>
                </td>
                <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[i.status]}>{i.status}</span></td>
                <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No identities match filters</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.agentName} — {selected.principalType}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Principal ID</p><p className="font-mono text-xs text-[hsl(var(--text-2))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] break-all">{selected.principalId}</p></div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Created', value: selected.created },
                  { label: 'Expires', value: selected.expires },
                  { label: 'Last Used', value: selected.lastUsed },
                  { label: 'MFA Required', value: selected.mfaRequired ? 'Yes' : 'No' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Roles</p><div className="flex flex-wrap gap-1">{selected.roles.map(r => <span key={r} className="text-[10px] px-2 py-0.5 bg-[hsl(var(--brand)/0.1)] text-[hsl(var(--brand))] border border-[hsl(var(--brand)/0.2)]">{r}</span>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">OAuth Scopes</p><div className="space-y-0.5">{selected.scopes.map(s => <div key={s} className="font-mono text-[10px] text-[hsl(var(--text-2))] p-1.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{s}</div>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">IP Allowlist</p><div className="space-y-0.5">{selected.ipAllowlist.map(ip => <div key={ip} className="font-mono text-[10px] text-[hsl(var(--text-2))] p-1.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{ip}</div>)}</div></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Rotation Policy</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.rotationPolicy}</p></div>
            </div>
            <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
              <button onClick={() => { toast.success('Credential rotated successfully'); setSelected(null) }} className="flex-1 py-2 bg-[hsl(var(--brand))] text-white text-sm font-medium hover:opacity-90">Rotate Credential</button>
              {selected.status === 'Active' && <button onClick={() => { toast.success('Credential revoked'); setSelected(null) }} className="px-4 py-2 border border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] text-sm hover:bg-[hsl(0_72%_51%/0.05)]">Revoke</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
