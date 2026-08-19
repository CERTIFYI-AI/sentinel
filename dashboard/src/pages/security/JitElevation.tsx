// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// AC-06 + WS4 — JIT Elevation: request temporary privileged access.
import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { supabase } from '../../lib/supabase'
import { useTenant } from '../../hooks/useTenant'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { CANONICAL_ROLES, ROLE_DISPLAY, type OrgRole } from '../../lib/rbac'
import { Button } from '../../components/ui/button'
import { toast } from 'sonner'
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'

interface JitRow {
  id: string
  elevated_role: string
  reason: string
  ticket_ref: string | null
  requested_at: string
  approved_at: string | null
  expires_at: string
  revoked_at: string | null
}

// The table has no `status` column — derive it from the timestamp columns.
function deriveStatus(r: JitRow): 'pending' | 'active' | 'expired' | 'revoked' {
  if (r.revoked_at) return 'revoked'
  if (new Date(r.expires_at).getTime() <= Date.now()) return 'expired'
  if (r.approved_at) return 'active'
  return 'pending'
}

// The table CHECK requires expires_at <= requested_at + 8h → cap at 480 min.
const DURATIONS = [15, 30, 60, 120, 240, 480]

export default function JitElevation() {
  // Defensive tenancy guard (matches MfaEnrollment): never throw while the
  // tenant context is still resolving — render a skeleton below instead.
  const { orgId, status: tenantStatus } = useTenant()
  const [requests, setRequests] = useState<JitRow[]>([])
  const [form, setForm] = useState({ role: '', reason: '', ticket: '', duration: 60 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!orgId) {
      // Tenancy resolved without an org (e.g. demo mode) — show the honest
      // empty state instead of an eternal loading row.
      if (tenantStatus !== 'loading') { setRequests([]); setLoading(false) }
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('jit_elevations')
      .select('id, elevated_role, reason, ticket_ref, requested_at, approved_at, expires_at, revoked_at')
      .eq('org_id', orgId)
      .order('requested_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setError(error.message); setLoading(false); return }
        setRequests((data ?? []) as JitRow[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [orgId, tenantStatus])

  async function submitRequest() {
    if (!form.role || !form.reason.trim()) { toast.error('Role and reason are required'); return }
    if (!orgId) { toast.error('Your organization could not be resolved — sign in again before requesting elevation.'); return }
    setSubmitting(true)
    const { data: user } = await supabase.auth.getUser()
    const requestedAt = new Date()
    const expiresAt = new Date(requestedAt.getTime() + form.duration * 60_000)
    const { data, error } = await supabase.from('jit_elevations').insert({
      org_id: orgId,
      user_id: user.user?.id,
      elevated_role: form.role,
      reason: form.reason,
      ticket_ref: form.ticket || null,
      expires_at: expiresAt.toISOString(),
    }).select('id, elevated_role, reason, ticket_ref, requested_at, approved_at, expires_at, revoked_at').single()
    setSubmitting(false)
    if (error) { toast.error(error.message); return }
    setRequests(prev => [data as JitRow, ...prev])
    setShowForm(false)
    setForm({ role: '', reason: '', ticket: '', duration: 60 })
    toast.success('JIT elevation request submitted')
  }

  const statusColor = (s: string) => ({
    pending: 'bg-[hsl(var(--s-wn-bg))] text-[hsl(var(--s-wn-tx))]',
    active: 'bg-[hsl(var(--s-ok-bg))] text-[hsl(var(--s-ok-tx))]',
    expired: 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]',
    revoked: 'bg-[hsl(var(--s-er-bg))] text-[hsl(var(--s-er-tx))]',
  } as Record<string, string>)[s] ?? 'bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-3))]'

  const roleLabel = (slug: string) => ROLE_DISPLAY[slug as OrgRole]?.label ?? slug

  if (tenantStatus === 'loading') {
    return <PageSkeleton title="JIT Elevation" showStats={false} rows={5} />
  }

  return (
    <main id="main-content" className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="JIT Elevation"
        subtitle="Request time-boxed privileged access. Every grant is org-scoped and auto-expires."
        icon={ShieldCheck}
        actions={<Button onClick={() => setShowForm(true)} size="sm">Request Elevation</Button>}
      />

      {/* Info banner — reflects what the schema actually enforces */}
      <div className="flex items-start gap-3 p-3 bg-[hsl(var(--s-in-bg))] border border-[hsl(var(--s-in-br))] rounded text-sm text-[hsl(var(--s-in-tx))]">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <p>Elevations are org-scoped, recorded with a requested/expiry timestamp, and automatically expire. Maximum duration is 8 hours. Approval and revocation are performed by org or security admins.</p>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="border border-[hsl(var(--border))] rounded p-5 bg-[hsl(var(--bg-muted))] space-y-4">
          <h2 className="font-medium text-[hsl(var(--text-1))]">New Elevation Request</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[hsl(var(--text-3))]" htmlFor="jit-role">Requested Role</label>
              <Select value={form.role || undefined} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {CANONICAL_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_DISPLAY[r].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[hsl(var(--text-3))]" htmlFor="jit-duration">Duration (minutes)</label>
              <Select value={String(form.duration)} onValueChange={v => setForm(f => ({ ...f, duration: +v }))}>
                <SelectTrigger className="w-full" style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min {d >= 60 ? `(${d / 60}h)` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[hsl(var(--text-3))]" htmlFor="jit-ticket">Ticket Reference (optional)</label>
            <input id="jit-ticket" value={form.ticket} onChange={e => setForm(f => ({ ...f, ticket: e.target.value }))}
              placeholder="e.g. INC-1234"
              className="w-full border border-[hsl(var(--border))] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#368F4D]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[hsl(var(--text-3))]" htmlFor="jit-reason">Business Justification</label>
            <textarea id="jit-reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Describe the business need for this elevated access..."
              rows={3}
              className="w-full border border-[hsl(var(--border))] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#368F4D] resize-none" />
          </div>
          <div className="flex gap-2">
            <Button onClick={submitRequest} disabled={submitting} size="sm">{submitting ? 'Submitting...' : 'Submit Request'}</Button>
            <Button onClick={() => setShowForm(false)} variant="outline" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      {/* Request history */}
      <div className="border border-[hsl(var(--border))] rounded">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h2 className="font-medium text-[hsl(var(--text-1))]">Elevation Request History</h2>
        </div>
        {loading ? (
          <p className="p-6 text-center text-[hsl(var(--text-4))] text-sm">Loading elevation requests…</p>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-sm font-medium text-[hsl(var(--s-er-tx))]">Failed to load elevation requests</p>
            <p className="text-xs text-[hsl(var(--text-4))] mt-1">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <p className="p-6 text-center text-[hsl(var(--text-4))] text-sm">No JIT elevation requests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[hsl(var(--bg-muted))] text-xs text-[hsl(var(--text-3))]">
              <tr>{['Role', 'Ticket', 'Reason', 'Status', 'Requested', 'Expires'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {requests.map(r => {
                const status = deriveStatus(r)
                return (
                  <tr key={r.id} className="border-t border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-muted))]">
                    <td className="px-4 py-2.5 text-xs text-[hsl(var(--text-2))]">{roleLabel(r.elevated_role)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-[hsl(var(--text-3))]">{r.ticket_ref || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-[hsl(var(--text-3))] max-w-[200px] truncate">{r.reason}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${statusColor(status)}`}>{status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[hsl(var(--text-4))]">{new Date(r.requested_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-[hsl(var(--text-4))]">
                      <span className="flex items-center gap-1"><Clock size={11} />{new Date(r.expires_at).toLocaleString()}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
