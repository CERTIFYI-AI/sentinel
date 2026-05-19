// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// AC-06 + WS4 — JIT Elevation: request temporary privileged access with MFA gate.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRequiredOrgId } from '../../hooks/useTenant'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { toast } from 'sonner'
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react'

interface JitRequest {
  id: string
  requested_role: string
  reason: string
  status: string
  duration_mins: number
  created_at: string
  expires_at: string
}

interface SentinelRole {
  slug: string
  display_name: string
  tier: number
}

export default function JitElevation() {
  const orgId = useRequiredOrgId()
  const [requests, setRequests] = useState<JitRequest[]>([])
  const [roles, setRoles] = useState<SentinelRole[]>([])
  const [form, setForm] = useState({ role: '', reason: '', duration: 60 })
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!orgId) return
    Promise.all([
      supabase.from('jit_elevation_requests').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(20),
      supabase.from('sentinel_roles').select('*').order('tier').limit(20),
    ]).then(([reqs, rls]) => {
      setRequests(reqs.data ?? [])
      setRoles((rls.data ?? []).filter((r: SentinelRole) => r.tier <= 3))
    })
  }, [orgId])

  async function submitRequest() {
    if (!form.role || !form.reason) { toast.error('Role and reason are required'); return }
    setLoading(true)
    const { data: user } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('jit_elevation_requests').insert({
      org_id: orgId,
      requester_id: user.user?.id,
      requested_role: form.role,
      reason: form.reason,
      duration_mins: form.duration,
      status: 'pending',
    }).select().single()
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setRequests(prev => [data, ...prev])
    setShowForm(false)
    setForm({ role: '', reason: '', duration: 60 })
    toast.success('JIT elevation request submitted — awaiting approval')
  }

  const statusColor = (s: string) => ({
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    denied: 'bg-red-100 text-red-700',
    expired: 'bg-zinc-100 text-zinc-500',
    revoked: 'bg-orange-100 text-orange-700',
  } as Record<string, string>)[s] ?? 'bg-zinc-100 text-zinc-600'

  return (
    <main id="main-content" className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-2">
            <ShieldCheck className="text-[#368F4D]" size={22} />
            JIT Elevation
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Request temporary privileged access with MFA verification and audit trail.</p>
        </div>
        <Button onClick={() => setShowForm(true)} size="sm">Request Elevation</Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <p>All JIT elevations are MFA-verified, audit-logged, and automatically expire. Maximum duration: 8 hours. Tier 1 roles require CISO approval.</p>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="border border-zinc-200 rounded p-5 bg-zinc-50 space-y-4">
          <h2 className="font-medium text-zinc-900">New Elevation Request</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600" htmlFor="jit-role">Requested Role</label>
              <select id="jit-role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#368F4D]">
                <option value="">Select role...</option>
                {roles.map(r => <option key={r.slug} value={r.slug}>{r.display_name} (Tier {r.tier})</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-600" htmlFor="jit-duration">Duration (minutes)</label>
              <select id="jit-duration" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#368F4D]">
                {[15, 30, 60, 120, 240, 480].map(d => <option key={d} value={d}>{d} min {d >= 60 ? `(${d/60}h)` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-600" htmlFor="jit-reason">Business Justification</label>
            <textarea id="jit-reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Describe the business need for this elevated access..."
              rows={3}
              className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#368F4D] resize-none" />
          </div>
          <div className="flex gap-2">
            <Button onClick={submitRequest} disabled={loading} size="sm">{loading ? 'Submitting...' : 'Submit Request'}</Button>
            <Button onClick={() => setShowForm(false)} variant="outline" size="sm">Cancel</Button>
          </div>
        </div>
      )}

      {/* Request history */}
      <div className="border border-zinc-200 rounded">
        <div className="p-4 border-b border-zinc-100">
          <h2 className="font-medium text-zinc-900">Elevation Request History</h2>
        </div>
        {requests.length === 0 ? (
          <p className="p-6 text-center text-zinc-400 text-sm">No JIT elevation requests yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600">
              <tr>{['Role','Duration','Reason','Status','Requested','Expires'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-700">{r.requested_role}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="flex items-center gap-1"><Clock size={11} />{r.duration_mins}m</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-500 max-w-[200px] truncate">{r.reason}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${statusColor(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">{new Date(r.expires_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
