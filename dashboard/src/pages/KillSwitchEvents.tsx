import { useState } from 'react'
import { Power, Warning, MagnifyingGlass, Plus, Eye, X, Export, ShieldWarning, CheckCircle, Siren, ClipboardText, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

type KillSwitchTrigger = 'Manual' | 'Automated — Trust Score' | 'Automated — Error Rate' | 'Automated — Bias Threshold' | 'Regulatory Order' | 'Security Incident'
type KSStatus = 'Active — Agent Suspended' | 'Resolved' | 'Under Investigation' | 'Escalated'

interface KillSwitchEvent {
  id: string
  agentId: string
  agentName: string
  triggeredAt: string
  triggeredBy: string
  trigger: KillSwitchTrigger
  status: KSStatus
  reason: string
  impactedSystems: string[]
  impactedUsers: number
  resumedAt?: string
  resolutionNotes?: string
  approvedBy?: string
  regulatoryNotificationRequired: boolean
  regulatoryNotificationSent?: boolean
}

const SEED: KillSwitchEvent[] = [
  { id: 'KSE-2026-012', agentId: 'AGT-004', agentName: 'CustomerServiceOrchestrator', triggeredAt: '2026-04-07 14:20:00', triggeredBy: 'Sarah Chen (CISO)', trigger: 'Manual', status: 'Active — Agent Suspended', reason: 'Agent spawned 847 sub-agents in 90 seconds during an unexpected recursive loop. Memory usage exceeded 94% of cluster capacity. Emergency suspension to prevent cascade failure.', impactedSystems: ['Customer Service Portal', 'Chat API', 'Worker Agent Pool'], impactedUsers: 1240, regulatoryNotificationRequired: false },
  { id: 'KSE-2026-011', agentId: 'AGT-001', agentName: 'LoanProcessorAgent', triggeredAt: '2026-03-28 11:45:00', triggeredBy: 'Automated — Trust Score Drop', trigger: 'Automated — Trust Score', status: 'Resolved', reason: 'Trust score dropped below kill switch threshold (configured: 60, actual: 47) due to 23 consecutive HITL overrides indicating systematic decision errors.', impactedSystems: ['Loan Processing Pipeline', 'Underwriter Queue'], impactedUsers: 0, resumedAt: '2026-03-29 09:00:00', resolutionNotes: 'Root cause: outdated credit bureau data causing scoring errors. Updated data pipeline. Manual review of 23 affected applications completed. All decisions validated.', approvedBy: 'James Liu', regulatoryNotificationRequired: true, regulatoryNotificationSent: true },
  { id: 'KSE-2026-010', agentId: 'AGT-002', agentName: 'FraudInvestigatorAgent', triggeredAt: '2026-03-15 03:22:00', triggeredBy: 'Automated — Error Rate', trigger: 'Automated — Error Rate', status: 'Resolved', reason: 'API error rate spiked to 34% (threshold: 10%) due to third-party enrichment provider outage. Agent suspended to prevent incomplete fraud investigations.', impactedSystems: ['Fraud Investigation Queue', 'Case Management'], impactedUsers: 0, resumedAt: '2026-03-15 06:45:00', resolutionNotes: 'Enrichment provider restored. Failover to backup enrichment source configured. 18 queued investigations resumed.', approvedBy: 'Sarah Chen', regulatoryNotificationRequired: false },
  { id: 'KSE-2026-008', agentId: 'AGT-001', agentName: 'LoanProcessorAgent', triggeredAt: '2026-02-14 09:30:00', triggeredBy: 'Automated — Bias Threshold', trigger: 'Automated — Bias Threshold', status: 'Resolved', reason: 'Real-time bias monitoring detected demographic parity gap exceeding 25% threshold for gender attribute. Automatic suspension per EU AI Act Article 10 compliance policy.', impactedSystems: ['Loan Processing Pipeline'], impactedUsers: 0, resumedAt: '2026-02-17 14:00:00', resolutionNotes: 'Emergency bias audit completed. Re-weighting applied to training data. Gap reduced to 8.2%. EC notified per Article 62 incident reporting requirement.', approvedBy: 'Maria Santos', regulatoryNotificationRequired: true, regulatoryNotificationSent: true },
  { id: 'KSE-2026-005', agentId: 'AGT-005', agentName: 'RiskAssessmentAgent (beta)', triggeredAt: '2026-04-09 16:00:00', triggeredBy: 'Regulatory Order', trigger: 'Regulatory Order', status: 'Under Investigation', reason: 'Pre-emptive kill switch engaged per internal AI governance policy: new agent must pass all beta validation checks before production activation. Pending security review.', impactedSystems: ['Risk Scoring API'], impactedUsers: 0, regulatoryNotificationRequired: false },
]

const STATUS_STYLE: Record<KSStatus, { bg: string; color: string }> = {
  'Active — Agent Suspended': { bg: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))' },
  Resolved: { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' },
  'Under Investigation': { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' },
  Escalated: { bg: 'hsl(280 67% 56% / 0.12)', color: 'hsl(280 60% 55%)' },
}

export default function KillSwitchEvents() {
  const [selected, setSelected] = useState<KillSwitchEvent | null>(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [events, setEvents] = useState(SEED)
  const [killAllOpen, setKillAllOpen] = useState(false)
  const [killAllCode, setKillAllCode] = useState('')
  const [killAllStep, setKillAllStep] = useState<'confirm' | 'mfa' | 'done'>('confirm')
  const [mfaInput, setMfaInput] = useState('')
  const [postMortemOpen, setPostMortemOpen] = useState<KillSwitchEvent | null>(null)
  const [resumeTarget, setResumeTarget] = useState<KillSwitchEvent | null>(null)

  const filtered = events.filter(e =>
    (statusFilter === 'All' || e.status === statusFilter) &&
    (!search || e.agentName.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase()) || e.reason.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    total: events.length,
    active: events.filter(e => e.status === 'Active — Agent Suspended').length,
    resolved: events.filter(e => e.status === 'Resolved').length,
    pendingNotification: events.filter(e => e.regulatoryNotificationRequired && !e.regulatoryNotificationSent).length,
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <Power size={20} weight="fill" className="text-[hsl(var(--destructive))]" />
            Kill Switch Events
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Audit log of all agent suspension events — manual, automated, and regulatory</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.success('Exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
            <Export size={14} /> Export
          </button>
          <button
            onClick={() => { setKillAllOpen(true); setKillAllStep('confirm'); setKillAllCode(''); setMfaInput(''); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white hover:opacity-90"
            style={{ background: 'hsl(0 72% 51%)' }}>
            <Siren size={14} /> KILL ALL AGENTS
          </button>
        </div>
      </div>

      {/* Blast Radius Analysis */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-3">
          <ShieldWarning size={15} className="text-[hsl(var(--s-wn-tx))]" weight="duotone" />
          Blast Radius Analysis — If All Active Agents Are Suspended
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Agents Affected', value: '4 active', color: 'hsl(var(--destructive))' },
            { label: 'Est. Users Impacted', value: '12,500+', color: '#f97316' },
            { label: 'Downstream Services', value: '6', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="p-3 border border-[hsl(var(--border))] text-center">
              <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">{s.label}</p>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {[
            { agent: 'LoanProcessorAgent', impact: 'Loan applications paused — manual review queue activated', users: '3,200' },
            { agent: 'FraudInvestigatorAgent', impact: 'Fraud alerts manual-only — investigation backlog risk', users: '0 direct' },
            { agent: 'ComplianceMonitorAgent', impact: 'Automated compliance checks paused — regulatory risk', users: '0 direct' },
            { agent: 'DataQualityPatrolAgent', impact: 'Data pipeline quality monitoring offline — drift risk', users: '0 direct' },
          ].map(r => (
            <div key={r.agent} className="p-2 border border-[hsl(var(--border))]">
              <p className="font-medium text-[hsl(var(--text-1))]">{r.agent}</p>
              <p className="text-[hsl(var(--text-3))] mt-0.5">{r.impact}</p>
              <p className="text-[hsl(var(--text-4))] mt-0.5">~{r.users} users impacted</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: stats.total, color: 'hsl(var(--text-1))' },
          { label: 'Active Suspensions', value: stats.active, color: 'hsl(var(--destructive))' },
          { label: 'Resolved', value: stats.resolved, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Reg. Notification Pending', value: stats.pendingNotification, color: 'hsl(45 85% 40%)' },
        ].map(s => (
          <div key={s.label} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
            <p className="text-[11px] text-[hsl(var(--text-4))] uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {stats.active > 0 && (
        <div className="flex items-center gap-3 p-3 border border-[hsl(var(--destructive)/0.4)] bg-[hsl(0_72%_51%/0.06)]">
          <Power size={16} className="text-[hsl(var(--destructive))] flex-shrink-0" weight="fill" />
          <p className="text-sm text-[hsl(var(--text-2))]"><span className="font-semibold text-[hsl(var(--destructive))]">{stats.active} agent(s) currently suspended.</span> Review suspension reasons and coordinate remediation before resuming.</p>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-xs border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] px-3">
          <MagnifyingGlass size={14} className="text-[hsl(var(--text-4))] flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" className="flex-1 py-2 text-sm bg-transparent text-[hsl(var(--text-1))] placeholder-[hsl(var(--text-4))] focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] focus:outline-none">
          {['All', 'Active — Agent Suspended', 'Resolved', 'Under Investigation', 'Escalated'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map(e => {
          const ss = STATUS_STYLE[e.status]
          return (
            <div key={e.id} className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4 cursor-pointer hover:border-[hsl(var(--brand)/0.4)]" onClick={() => setSelected(e)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] text-[hsl(var(--destructive))]">{e.id}</span>
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={ss}>{e.status}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-4))]">{e.trigger}</span>
                    {e.regulatoryNotificationRequired && (
                      <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(280 67% 56% / 0.12)', color: 'hsl(280 60% 55%)' }}>Reg. Required</span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--text-1))]">{e.agentName} <span className="text-[hsl(var(--text-4))] font-normal font-mono text-xs">({e.agentId})</span></h3>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-0.5">{e.triggeredAt} · By: {e.triggeredBy}</p>
                  <p className="text-xs text-[hsl(var(--text-3))] mt-2 line-clamp-2">{e.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {e.impactedUsers > 0 && <p className="text-xs font-semibold text-[hsl(var(--destructive))]">{e.impactedUsers.toLocaleString()} users affected</p>}
                  {e.resumedAt && <p className="text-xs text-[hsl(var(--s-ok-tx))] mt-1">Resumed: {e.resumedAt}</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Post-mortem Templates ─────────────────────────────────────────── */}
      <div className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] p-4">
        <h3 className="text-sm font-semibold text-[hsl(var(--text-1))] flex items-center gap-2 mb-3">
          <ClipboardText size={15} className="text-[hsl(var(--brand))]" />
          Post-mortem Templates
        </h3>
        <p className="text-xs text-[hsl(var(--text-4))] mb-3">Select a resolved incident to auto-generate a structured post-mortem report for regulatory submission and internal review.</p>
        <div className="space-y-2">
          {events.filter(e => e.status === 'Resolved').map(e => (
            <div key={e.id} className="p-3 border border-[hsl(var(--border))] flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-[hsl(var(--brand))]">{e.id}</span>
                <span className="text-xs text-[hsl(var(--text-2))] ml-2">{e.agentName}</span>
                <span className="text-[10px] text-[hsl(var(--text-4))] ml-2">· {e.triggeredAt}</span>
              </div>
              <button
                onClick={() => setPostMortemOpen(e)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">
                <ClipboardText size={12} /> Generate Post-mortem
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Kill All 2FA Dialog ────────────────────────────────────────────── */}
      {killAllOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setKillAllOpen(false)} />
          <div className="relative w-[480px] bg-[hsl(var(--bg-surface))] border border-[hsl(var(--destructive)/0.5)]" style={{ boxShadow: '0 0 40px hsl(0 72% 51% / 0.3)' }}>
            <div className="p-5 border-b border-[hsl(var(--destructive)/0.3)] bg-[hsl(0_72%_51%/0.08)]">
              <div className="flex items-center gap-3">
                <Siren size={22} className="text-[hsl(var(--destructive))]" weight="fill" />
                <div>
                  <h2 className="text-sm font-bold text-[hsl(var(--destructive))] uppercase tracking-wide">Emergency: Kill All Agents</h2>
                  <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">This will immediately suspend ALL active AI agents across all production systems.</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {killAllStep === 'confirm' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Agents Suspended', value: '4', color: 'hsl(var(--destructive))' },
                      { label: 'Users Impacted', value: '12,500+', color: '#f97316' },
                      { label: 'Services Offline', value: '6', color: '#f59e0b' },
                    ].map(s => (
                      <div key={s.label} className="p-2 border border-[hsl(var(--border))]">
                        <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{s.label}</p>
                        <p className="text-lg font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1.5">Step 1 of 2 — Type <strong className="text-[hsl(var(--destructive))] font-mono">KILLALL</strong> to proceed to MFA verification</p>
                    <input
                      autoFocus
                      value={killAllCode}
                      onChange={e => setKillAllCode(e.target.value.toUpperCase())}
                      placeholder="Type KILLALL"
                      className="w-full px-3 py-2 text-sm border font-mono bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none"
                      style={{ borderColor: killAllCode === 'KILLALL' ? 'hsl(var(--destructive))' : 'hsl(var(--border))' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setKillAllOpen(false)} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Cancel</button>
                    <button
                      disabled={killAllCode !== 'KILLALL'}
                      onClick={() => setKillAllStep('mfa')}
                      className="flex-1 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'hsl(0 72% 51%)' }}>
                      Continue to MFA →
                    </button>
                  </div>
                </div>
              )}
              {killAllStep === 'mfa' && (
                <div className="space-y-4">
                  <div className="p-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-center">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase mb-1">Simulated MFA Code</p>
                    <p className="text-2xl font-mono font-bold tracking-[0.3em] text-[hsl(var(--brand))]">847293</p>
                    <p className="text-[10px] text-[hsl(var(--text-4))] mt-1">Enter the 6-digit code from your authenticator app</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--text-4))] mb-1.5">Step 2 of 2 — Enter your MFA code</p>
                    <input
                      autoFocus
                      value={mfaInput}
                      onChange={e => setMfaInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-3 py-2 text-xl font-mono text-center border bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] focus:outline-none tracking-[0.3em]"
                      style={{ borderColor: mfaInput.length === 6 ? 'hsl(var(--destructive))' : 'hsl(var(--border))' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setKillAllStep('confirm')} className="flex-1 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">← Back</button>
                    <button
                      disabled={mfaInput.length !== 6}
                      onClick={() => {
                        if (mfaInput !== '847293') { toast.error('Invalid MFA code — Kill All aborted.'); return; }
                        setKillAllStep('done');
                        setEvents(prev => prev.map(e => e.status === 'Active — Agent Suspended' ? e : e.status !== 'Resolved' ? { ...e, status: 'Active — Agent Suspended' as KSStatus } : e));
                        const newEvent: KillSwitchEvent = {
                          id: `KSE-EMERGENCY-${Date.now()}`, agentId: 'ALL', agentName: 'ALL AGENTS',
                          triggeredAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
                          triggeredBy: 'Sarah Chen (CISO) — MFA Verified', trigger: 'Manual',
                          status: 'Active — Agent Suspended', reason: 'Emergency Kill All triggered by authenticated operator. All 4 active agents suspended. Incident created.',
                          impactedSystems: ['All Production Systems'], impactedUsers: 12500,
                          regulatoryNotificationRequired: true,
                        };
                        setEvents(prev => [newEvent, ...prev]);
                        toast.error('🚨 KILL ALL activated — 4 agents suspended. INC-EMERGENCY created. Regulatory notifications queued.');
                        setTimeout(() => setKillAllOpen(false), 2000);
                      }}
                      className="flex-1 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
                      style={{ background: 'hsl(0 72% 51%)' }}>
                      EXECUTE KILL ALL
                    </button>
                  </div>
                </div>
              )}
              {killAllStep === 'done' && (
                <div className="text-center py-4">
                  <Siren size={36} className="text-[hsl(var(--destructive))] mx-auto mb-2 animate-pulse" weight="fill" />
                  <p className="text-sm font-bold text-[hsl(var(--destructive))]">KILL ALL Activated</p>
                  <p className="text-xs text-[hsl(var(--text-4))] mt-1">4 agents suspended · Incident created · Notifications queued</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Post-mortem Detail Modal ───────────────────────────────────────── */}
      {postMortemOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPostMortemOpen(null)} />
          <div className="relative w-[640px] max-h-[80vh] overflow-y-auto bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))]">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div>
                <span className="font-mono text-xs text-[hsl(var(--brand))]">{postMortemOpen.id}</span>
                <h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">Post-mortem Report — {postMortemOpen.agentName}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toast.success('Post-mortem exported as PDF')} className="px-3 py-1.5 text-xs border border-[hsl(var(--border))] text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Export PDF</button>
                <button onClick={() => setPostMortemOpen(null)}><X size={16} className="text-[hsl(var(--text-4))]" /></button>
              </div>
            </div>
            <div className="p-4 space-y-4 text-xs">
              {[
                { title: '1. Incident Summary', content: `Incident ${postMortemOpen.id} — ${postMortemOpen.agentName} was suspended on ${postMortemOpen.triggeredAt} via ${postMortemOpen.trigger} trigger. Root cause: ${postMortemOpen.reason}` },
                { title: '2. Timeline of Events', content: `${postMortemOpen.triggeredAt} — Kill switch triggered by ${postMortemOpen.triggeredBy}\n${postMortemOpen.resumedAt ? `${postMortemOpen.resumedAt} — Agent resumed after remediation. Approved by: ${postMortemOpen.approvedBy}` : 'Pending resolution.'}` },
                { title: '3. Impact Assessment', content: `Directly impacted users: ${postMortemOpen.impactedUsers.toLocaleString()}\nImpacted systems: ${postMortemOpen.impactedSystems.join(', ')}\nBusiness impact: Operations paused during suspension window.` },
                { title: '4. Root Cause Analysis', content: postMortemOpen.resolutionNotes || 'Investigation ongoing. Root cause analysis in progress.' },
                { title: '5. Corrective Actions', content: '• Immediate: Agent suspended and incident created\n• Short-term: Root cause identified and remediated\n• Long-term: Enhanced monitoring thresholds implemented\n• Preventive: Runbook updated with new detection criteria' },
                { title: '6. Regulatory Obligations', content: postMortemOpen.regulatoryNotificationRequired ? `Regulatory notification required: ${postMortemOpen.regulatoryNotificationSent ? '✓ Sent' : '⚠ PENDING — must be submitted within 72 hours per EU AI Act Art. 62'}` : 'No regulatory notification required for this incident.' },
                { title: '7. Approval & Sign-off', content: `Report prepared by: Sentinel AI GRC Platform\nApproved by: ${postMortemOpen.approvedBy || '[Pending]'}\nDate: ${new Date().toLocaleDateString()}\nNext review: ${new Date(Date.now() + 30 * 86400000).toLocaleDateString()}` },
              ].map(s => (
                <div key={s.title} className="p-3 border border-[hsl(var(--border))]">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-1))] mb-1.5">{s.title}</p>
                  <pre className="text-[hsl(var(--text-3))] whitespace-pre-wrap font-sans leading-relaxed">{s.content}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] bg-[hsl(var(--bg-surface))] border-l border-[hsl(var(--border))] flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
              <div><p className="font-mono text-xs text-[hsl(var(--destructive))]">{selected.id}</p><h2 className="text-sm font-semibold text-[hsl(var(--text-1))]">Kill Switch — {selected.agentName}</h2></div>
              <button onClick={() => setSelected(null)}><X size={18} className="text-[hsl(var(--text-4))]" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={STATUS_STYLE[selected.status]}>{selected.status}</span>
                <span className="text-[11px] px-2 py-0.5 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))]">{selected.trigger}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Triggered At', value: selected.triggeredAt },
                  { label: 'Triggered By', value: selected.triggeredBy },
                  { label: 'Impacted Users', value: selected.impactedUsers.toLocaleString() },
                  { label: 'Reg. Notification', value: selected.regulatoryNotificationRequired ? (selected.regulatoryNotificationSent ? 'Sent ✓' : 'PENDING') : 'Not Required' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">
                    <p className="text-[10px] text-[hsl(var(--text-4))] uppercase">{label}</p>
                    <p className="text-xs font-medium text-[hsl(var(--text-1))] mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--destructive))] uppercase tracking-wide mb-1">Suspension Reason</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(0_72%_51%/0.06)] border border-[hsl(var(--destructive)/0.3)] leading-relaxed">{selected.reason}</p></div>
              <div><p className="text-[11px] font-semibold text-[hsl(var(--text-3))] uppercase tracking-wide mb-2">Impacted Systems</p><div className="space-y-1">{selected.impactedSystems.map(s => <div key={s} className="text-xs text-[hsl(var(--text-2))] p-2 bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))]">{s}</div>)}</div></div>
              {selected.resolutionNotes && <div><p className="text-[11px] font-semibold text-[hsl(var(--s-ok-tx))] uppercase tracking-wide mb-1">Resolution Notes</p><p className="text-sm text-[hsl(var(--text-2))] p-3 bg-[hsl(142_71%_45%/0.06)] border border-[hsl(var(--s-ok-tx)/0.3)] leading-relaxed">{selected.resolutionNotes}</p></div>}
            </div>
            {selected.status === 'Active — Agent Suspended' && (
              <div className="p-4 border-t border-[hsl(var(--border))] flex gap-2">
                <button onClick={() => setResumeTarget(selected)} className="flex-1 py-2 bg-[hsl(var(--s-ok-tx))] text-white text-sm font-medium hover:opacity-90">Approve Resumption</button>
                <button onClick={() => toast.info('Escalation path opened')} className="px-4 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]">Escalate</button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!resumeTarget}
        title="Approve Agent Resumption"
        description={`Resume ${resumeTarget?.agentName} (${resumeTarget?.agentId})? The agent will restart and re-enter production. Ensure the root cause has been remediated before approving.`}
        confirmLabel="Approve Resumption"
        type="info"
        onConfirm={() => {
          if (!resumeTarget) return
          setEvents(prev => prev.map(e => e.id === resumeTarget.id ? { ...e, status: 'Resolved' as KSStatus, resumedAt: new Date().toISOString().replace('T', ' ').slice(0, 19), approvedBy: 'Sarah Chen' } : e))
          toast.success(`${resumeTarget.agentName} approved for resumption — agent restarting`)
          setResumeTarget(null)
          setSelected(null)
        }}
        onClose={() => setResumeTarget(null)}
      />
    </div>
  )
}
