import { useState } from 'react'
import { Notepad, MagnifyingGlass, Export, Eye, X, ShieldCheck, User, Gear, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'

type EventCategory = 'Authentication' | 'Authorization' | 'Data Access' | 'Configuration' | 'AI System' | 'Policy' | 'Compliance' | 'Security'
type EventSeverity = 'Info' | 'Warning' | 'Error' | 'Critical'

interface AuditEvent {
  id: string
  timestamp: string
  user: string
  userId: string
  action: string
  resource: string
  category: EventCategory
  severity: EventSeverity
  ipAddress: string
  userAgent: string
  outcome: 'Success' | 'Failure' | 'Partial'
  details: string
  sessionId: string
  tenantId: string
}

const SEED: AuditEvent[] = [
  { id: 'AUD-20260410-001', timestamp: '2026-04-10 09:23:41 UTC', user: 'Sarah Chen', userId: 'USR-001', action: 'MODEL_POLICY_UPDATE', resource: 'Credit Scoring Model v2.1 / Guardrail Config', category: 'AI System', severity: 'Warning', ipAddress: '10.0.1.45', userAgent: 'Chrome/124 Mac', outcome: 'Success', details: 'Injection block threshold changed from 0.78 to 0.85. Previous value logged. Change triggered redeployment of guardrail layer.', sessionId: 'SID-a4f2c', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-002', timestamp: '2026-04-10 09:15:22 UTC', user: 'James Liu', userId: 'USR-002', action: 'BULK_EXPORT', resource: 'Model Registry / All Records', category: 'Data Access', severity: 'Warning', ipAddress: '10.0.2.88', userAgent: 'Chrome/124 Windows', outcome: 'Success', details: 'Bulk export of 47 model records to CSV. Includes training metadata and performance metrics. Export flagged for DLP review.', sessionId: 'SID-b7e1a', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-003', timestamp: '2026-04-10 08:57:19 UTC', user: 'External API', userId: 'SVC-api-gateway', action: 'API_AUTH_FAILURE', resource: '/api/v1/models/predict', category: 'Authentication', severity: 'Critical', ipAddress: '185.220.101.47', userAgent: 'python-httpx/0.27', outcome: 'Failure', details: 'Invalid API key — 23 consecutive failures from same IP. IP added to temporary blocklist. SOC alerted. Possible credential stuffing attack.', sessionId: 'N/A', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-004', timestamp: '2026-04-10 08:44:33 UTC', user: 'Marcus Johnson', userId: 'USR-003', action: 'RISK_SCORE_OVERRIDE', resource: 'Risk Register / RSK-001', category: 'Compliance', severity: 'Warning', ipAddress: '10.0.1.201', userAgent: 'Firefox/125 Linux', outcome: 'Success', details: 'Risk score manually overridden from 20/25 (Critical) to 15/25 (High). Override reason: "Interim controls reduce immediate impact". Approved by Sarah Chen.', sessionId: 'SID-c9d4f', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-005', timestamp: '2026-04-10 08:31:07 UTC', user: 'Maria Santos', userId: 'USR-004', action: 'USER_ROLE_CHANGE', resource: 'RBAC / USR-008 (David Kim)', category: 'Authorization', severity: 'Info', ipAddress: '10.0.1.155', userAgent: 'Chrome/124 Mac', outcome: 'Success', details: 'User David Kim role changed from "Analyst" to "Senior Compliance Officer". Access to Audit Trail and Evidence Vault modules granted.', sessionId: 'SID-d2b8e', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-006', timestamp: '2026-04-10 07:58:44 UTC', user: 'System', userId: 'SYS-scheduler', action: 'SCHEDULED_AUDIT_RUN', resource: 'Bias Audit Engine / Loan Approval Model v3.0', category: 'AI System', severity: 'Info', ipAddress: '10.0.0.1', userAgent: 'Sentinel Scheduler v2.1', outcome: 'Partial', details: 'Scheduled bias audit completed with warnings. Demographic parity gap: 18.3% (threshold: 10%). Audit result flagged for human review. Report ID: BAR-2026-089.', sessionId: 'SID-sys-001', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-007', timestamp: '2026-04-10 07:44:21 UTC', user: 'Sarah Chen', userId: 'USR-001', action: 'POLICY_APPROVED', resource: 'AI Risk Policy v3.1', category: 'Policy', severity: 'Info', ipAddress: '10.0.1.45', userAgent: 'Chrome/124 Mac', outcome: 'Success', details: 'AI Risk Policy v3.1 approved and published. Supersedes v3.0. Notification sent to 42 policy stakeholders. Effective date: 2026-05-01.', sessionId: 'SID-a4f2c', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-008', timestamp: '2026-04-10 07:21:55 UTC', user: 'James Liu', userId: 'USR-002', action: 'MODEL_DEPLOYED', resource: 'Credit Scoring Model v2.2-beta', category: 'AI System', severity: 'Warning', ipAddress: '10.0.2.88', userAgent: 'Sentinel CI/CD v1.4', outcome: 'Success', details: 'Model v2.2-beta deployed to staging environment. Deployment gate checks passed. Bias evaluation pending. Production deployment blocked until bias audit complete.', sessionId: 'SID-b7e1a', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-009', timestamp: '2026-04-10 06:55:18 UTC', user: 'System', userId: 'SYS-monitor', action: 'ALERT_TRIGGERED', resource: 'Customer Churn Predictor v2.3 / Performance Monitor', category: 'AI System', severity: 'Critical', ipAddress: '10.0.0.1', userAgent: 'Sentinel Monitor v3.0', outcome: 'Success', details: 'CRITICAL: Model accuracy dropped below 75% threshold (current: 71.2%). Automatic incident created: INC-2026-034. On-call ML Engineer paged via PagerDuty.', sessionId: 'SID-sys-002', tenantId: 'acme-financial' },
  { id: 'AUD-20260410-010', timestamp: '2026-04-10 06:33:44 UTC', user: 'Marcus Johnson', userId: 'USR-003', action: 'EVIDENCE_UPLOADED', resource: 'Evidence Vault / SOC2-CC6.2', category: 'Compliance', severity: 'Info', ipAddress: '10.0.1.201', userAgent: 'Chrome/124 Mac', outcome: 'Success', details: 'Evidence artifact uploaded: "Authentication_Control_Evidence_Q1_2026.pdf" (2.4 MB). Tagged to SOC 2 CC6.2 control. Hash: sha256:a4b3c...', sessionId: 'SID-c9d4f', tenantId: 'acme-financial' },
]

const SEV_STYLE: Record<EventSeverity, { bg: string; color: string }> = {
  Info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
  Warning: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Error: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' },
  Critical: { bg: 'hsl(0 72% 51% / 0.18)', color: 'hsl(var(--destructive))' },
}

const CAT_ICON: Record<EventCategory, any> = {
  Authentication: ShieldCheck,
  Authorization: ShieldCheck,
  'Data Access': Eye,
  Configuration: Gear,
  'AI System': Warning,
  Policy: Notepad,
  Compliance: ShieldCheck,
  Security: Warning,
}

export default function SystemAuditLog() {
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('All')
  const [catFilter, setCatFilter] = useState('All')
  const [selected, setSelected] = useState<AuditEvent | null>(null)

  const filtered = SEED.filter(e => {
    const ms = e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.user.toLowerCase().includes(search.toLowerCase()) ||
      e.resource.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase())
    return ms && (sevFilter === 'All' || e.severity === sevFilter) && (catFilter === 'All' || e.category === catFilter)
  })

  const stats = {
    total: SEED.length,
    critical: SEED.filter(e => e.severity === 'Critical').length,
    failures: SEED.filter(e => e.outcome === 'Failure').length,
    today: SEED.length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Notepad size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            System Audit Log
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Immutable, tamper-evident log of all platform actions, access events, and AI system changes</p>
        </div>
        <button onClick={() => toast.success('Audit log exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
          <Export size={14} /> Export Log
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Events Today', value: stats.today, color: 'hsl(var(--text-1))' },
          { label: 'Critical Events', value: stats.critical, color: 'hsl(var(--destructive))' },
          { label: 'Auth Failures', value: stats.failures, color: 'hsl(var(--destructive))' },
          { label: 'Integrity Status', value: 'Verified', color: 'hsl(var(--s-ok-tx))' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" className="w-full pl-9 pr-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:border-[hsl(var(--brand))]" />
        </div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Info', 'Warning', 'Error', 'Critical'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Authentication', 'Authorization', 'Data Access', 'Configuration', 'AI System', 'Policy', 'Compliance', 'Security'].map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))]">
              {['Timestamp', 'User', 'Action', 'Resource', 'Category', 'Outcome', 'Severity', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const CatIcon = CAT_ICON[e.category] || Notepad
              return (
                <tr key={e.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] cursor-pointer" onClick={() => setSelected(e)}>
                  <td className="px-4 py-3 font-mono text-[11px] text-[hsl(var(--text-3))] whitespace-nowrap">{e.timestamp}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-[hsl(var(--text-4))]" />
                      <span className="text-xs text-[hsl(var(--text-2))]">{e.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-[hsl(var(--brand))]">{e.action}</td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))] max-w-[180px] truncate">{e.resource}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-4))]">
                      <CatIcon size={11} />
                      {e.category}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-1.5 py-0.5" style={{
                      background: e.outcome === 'Success' ? 'hsl(142 71% 45% / 0.12)' : e.outcome === 'Failure' ? 'hsl(0 72% 51% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                      color: e.outcome === 'Success' ? 'hsl(var(--s-ok-tx))' : e.outcome === 'Failure' ? 'hsl(var(--destructive))' : 'hsl(45 85% 40%)',
                    }}>{e.outcome}</span>
                  </td>
                  <td className="px-4 py-3"><span className="text-[11px] px-1.5 py-0.5 font-medium" style={SEV_STYLE[e.severity]}>{e.severity}</span></td>
                  <td className="px-4 py-3"><Eye size={14} className="text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]" /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-[hsl(var(--text-4))] text-sm">No events match filters</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--brand))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.action}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={SEV_STYLE[selected.severity]}>{selected.severity}</span>
                <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.category}</span>
                <span className="text-[11px] px-2 py-0.5 font-medium" style={{ background: selected.outcome === 'Success' ? 'hsl(142 71% 45% / 0.12)' : 'hsl(0 72% 51% / 0.12)', color: selected.outcome === 'Success' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))' }}>{selected.outcome}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'User', value: selected.user },
                  { label: 'User ID', value: selected.userId },
                  { label: 'Timestamp', value: selected.timestamp },
                  { label: 'IP Address', value: selected.ipAddress },
                  { label: 'Session ID', value: selected.sessionId },
                  { label: 'Tenant', value: selected.tenantId },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-mono text-[hsl(var(--text-1))] mt-0.5 break-all">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Resource</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.resource}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">Event Details</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] leading-relaxed">{selected.details}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-1">User Agent</p><p className="text-xs font-mono text-[hsl(var(--text-3))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{selected.userAgent}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
