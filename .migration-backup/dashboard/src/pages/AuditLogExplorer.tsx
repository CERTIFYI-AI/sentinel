/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * AuditLogExplorer — read-only browser for the append-only audit_log.
 * Mounted at /audit-log. Provides filter, pagination, chain-verify
 * button, and one-click export in CEF / LEEF / Syslog / Splunk / NDJSON.
 *
 * UX notes:
 *   - Every interactive element is keyboard-reachable and has an aria-label.
 *   - Empty, loading, and error states are explicit (never silent).
 *   - Hash-chain column is monospaced and truncated with a title tooltip
 *     so operators can compare visually without blowing up the layout.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRequiredOrgId, useTenant } from '../hooks/useTenant'

interface AuditRow {
  id: string
  sequence_no: number
  occurred_at: string
  actor_id: string | null
  actor_type: string
  action: string
  resource_type: string
  resource_id: string | null
  outcome: 'success' | 'failure' | 'denied'
  severity: string
  previous_hash: string | null
  row_hash: string
}

type ExportFormat = 'cef' | 'leef' | 'syslog' | 'splunk' | 'ndjson'

const SEVERITY_COLOR: Record<string, string> = {
  debug: 'hsl(var(--text-4))',
  info: 'hsl(var(--text-2))',
  notice: 'hsl(var(--brand))',
  warning: 'hsl(45 90% 45%)',
  error: 'hsl(var(--s-er-tx))',
  critical: 'hsl(0 80% 50%)',
}

function short(h: string | null): string {
  if (!h) return '—'
  return `${h.slice(0, 8)}…${h.slice(-6)}`
}

export default function AuditLogExplorer() {
  const orgId = useRequiredOrgId()
  const { status } = useTenant()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<'' | AuditRow['outcome']>('')
  const [page, setPage] = useState(0)
  const [verifyState, setVerifyState] = useState<
    | { kind: 'idle' }
    | { kind: 'running' }
    | { kind: 'ok' }
    | { kind: 'fail'; seq: number; reason: string }
  >({ kind: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const pageSize = 50

  const load = useCallback(() => {
    if (status !== 'ready' || !supabase) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    setLoading(true)
    setErr(null)
    let q = supabase
      .from('audit_log')
      .select(
        'id, sequence_no, occurred_at, actor_id, actor_type, action, resource_type, resource_id, outcome, severity, previous_hash, row_hash',
        { count: 'exact' },
      )
      .eq('org_id', orgId)
      .order('sequence_no', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1)
      .abortSignal(signal)
    if (actionFilter) q = q.ilike('action', `%${actionFilter}%`)
    if (outcomeFilter) q = q.eq('outcome', outcomeFilter)
    void q.then(({ data, error }) => {
      if (signal.aborted) return
      if (error) {
        setErr(error.message)
        setRows([])
      } else {
        setRows((data ?? []) as AuditRow[])
      }
      setLoading(false)
    })
  }, [status, orgId, actionFilter, outcomeFilter, page])

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
  }, [load])

  async function runVerify(): Promise<void> {
    if (!supabase) return
    setVerifyState({ kind: 'running' })
    const { data, error } = await supabase.rpc('audit_log_verify_chain', {
      p_org_id: orgId,
    })
    if (error) {
      setVerifyState({ kind: 'fail', seq: -1, reason: error.message })
      return
    }
    const first = Array.isArray(data) ? data[0] : data
    if (first?.ok === true) {
      setVerifyState({ kind: 'ok' })
    } else {
      setVerifyState({
        kind: 'fail',
        seq: Number(first?.failed_at_sequence ?? -1),
        reason: String(first?.failed_reason ?? 'unknown'),
      })
    }
  }

  async function runExport(format: ExportFormat): Promise<void> {
    if (!supabase) return
    const session = (await supabase.auth.getSession()).data.session
    const token = session?.access_token
    if (!token) {
      setErr('Session expired. Please re-authenticate.')
      return
    }
    // supabase.functions.url is protected; derive base URL from env instead
    const fnBase = import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1`
      : `https://${location.hostname}/functions/v1`
    const url = `${fnBase}/audit-export?org_id=${encodeURIComponent(
      orgId,
    )}&format=${format}&limit=10000`
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) {
      setErr(`Export failed: ${resp.status} ${await resp.text()}`)
      return
    }
    const blob = await resp.blob()
    const a = document.createElement('a')
    const objUrl = URL.createObjectURL(blob)
    a.href = objUrl
    a.download = `sentinel-audit-${Date.now()}.${format === 'splunk' || format === 'ndjson' ? 'ndjson' : format}`
    a.click()
    URL.revokeObjectURL(objUrl)
  }

  const headerCell = useMemo(
    () => 'text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))] font-semibold px-3 py-2',
    [],
  )
  const bodyCell = 'px-3 py-2 text-xs text-[hsl(var(--text-2))] border-t border-[hsl(var(--border))]'

  if (status === 'loading') {
    return <div className="p-6 text-sm">Loading tenant…</div>
  }
  if (status === 'unauthenticated') {
    return <div className="p-6 text-sm">Please sign in.</div>
  }

  return (
    <div className="p-6 max-w-[1400px]">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Audit Log</h1>
        <p className="text-sm text-[hsl(var(--text-4))]">
          Append-only, hash-chained record of every governance event in
          your organization. Rows are immutable by database policy.
        </p>
      </header>

      <div
        role="toolbar"
        aria-label="Audit log controls"
        className="flex flex-wrap items-end gap-2 mb-3"
      >
        <label className="text-xs flex flex-col">
          <span className="text-[hsl(var(--text-4))]">Action contains</span>
          <input
            value={actionFilter}
            onChange={e => {
              setActionFilter(e.target.value)
              setPage(0)
            }}
            placeholder="model.approved"
            className="mt-1 border border-[hsl(var(--border))] px-2 py-1 text-xs bg-[hsl(var(--bg-raised))] w-48"
            aria-label="Filter by action substring"
          />
        </label>
        <label className="text-xs flex flex-col">
          <span className="text-[hsl(var(--text-4))]">Outcome</span>
          <select
            value={outcomeFilter}
            onChange={e => {
              setOutcomeFilter(e.target.value as typeof outcomeFilter)
              setPage(0)
            }}
            className="mt-1 border border-[hsl(var(--border))] px-2 py-1 text-xs bg-[hsl(var(--bg-raised))]"
            aria-label="Filter by outcome"
          >
            <option value="">All</option>
            <option value="success">success</option>
            <option value="failure">failure</option>
            <option value="denied">denied</option>
          </select>
        </label>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => void runVerify()}
          className="text-xs border border-[hsl(var(--border))] px-3 py-1.5 hover:bg-[hsl(var(--bg-raised))]"
          aria-label="Verify hash chain integrity"
          disabled={verifyState.kind === 'running'}
        >
          {verifyState.kind === 'running' ? 'Verifying…' : 'Verify chain'}
        </button>

        <div className="flex items-center gap-1" role="group" aria-label="Export">
          {(['cef', 'leef', 'syslog', 'splunk', 'ndjson'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => void runExport(f)}
              className="text-xs border border-[hsl(var(--border))] px-2 py-1.5 hover:bg-[hsl(var(--bg-raised))]"
              aria-label={`Export as ${f.toUpperCase()}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {verifyState.kind === 'ok' && (
        <div
          role="status"
          className="mb-3 text-xs px-3 py-2 border border-[hsl(var(--brand))] text-[hsl(var(--brand))]"
        >
          Chain verified: every row's hash matches and links to its predecessor.
        </div>
      )}
      {verifyState.kind === 'fail' && (
        <div
          role="alert"
          className="mb-3 text-xs px-3 py-2 border border-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))]"
        >
          Chain verification failed at sequence #{verifyState.seq}: {verifyState.reason}.
          Escalate to security immediately.
        </div>
      )}

      <div className="border border-[hsl(var(--border))] overflow-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[hsl(var(--bg-raised))]">
            <tr>
              <th scope="col" className={headerCell}>#</th>
              <th scope="col" className={headerCell}>When</th>
              <th scope="col" className={headerCell}>Actor</th>
              <th scope="col" className={headerCell}>Action</th>
              <th scope="col" className={headerCell}>Resource</th>
              <th scope="col" className={headerCell}>Outcome</th>
              <th scope="col" className={headerCell}>Sev</th>
              <th scope="col" className={headerCell}>Prev → Hash</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-xs text-[hsl(var(--text-4))] text-center">
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-xs text-[hsl(var(--s-er-tx))] text-center">
                  {err}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-xs text-[hsl(var(--text-4))] text-center">
                  No audit events match the current filters yet. Adjust filters
                  or wait for the next governance event.
                </td>
              </tr>
            ) : (
              rows.map(r => (
                <tr key={r.id} className="hover:bg-[hsl(var(--bg-raised))]">
                  <td className={`${bodyCell} font-mono`}>{r.sequence_no}</td>
                  <td className={bodyCell}>{new Date(r.occurred_at).toLocaleString()}</td>
                  <td className={bodyCell}>
                    <span className="text-[10px] text-[hsl(var(--text-4))] mr-1">
                      {r.actor_type}
                    </span>
                    {r.actor_id ? r.actor_id.slice(0, 8) : '—'}
                  </td>
                  <td className={`${bodyCell} font-mono`}>{r.action}</td>
                  <td className={bodyCell}>
                    {r.resource_type}
                    {r.resource_id ? (
                      <span className="text-[hsl(var(--text-4))]">/{r.resource_id}</span>
                    ) : null}
                  </td>
                  <td className={bodyCell}>
                    <span
                      style={{
                        color:
                          r.outcome === 'success'
                            ? 'hsl(var(--brand))'
                            : r.outcome === 'denied'
                            ? 'hsl(var(--s-er-tx))'
                            : 'hsl(45 90% 45%)',
                      }}
                    >
                      {r.outcome}
                    </span>
                  </td>
                  <td className={bodyCell} style={{ color: SEVERITY_COLOR[r.severity] }}>
                    {r.severity}
                  </td>
                  <td className={`${bodyCell} font-mono text-[10px]`} title={`prev=${r.previous_hash ?? '(genesis)'}\nrow=${r.row_hash}`}>
                    {short(r.previous_hash)} → {short(r.row_hash)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="flex items-center justify-between mt-3 text-xs" aria-label="Pagination">
        <span className="text-[hsl(var(--text-4))]">
          Page {page + 1} · showing up to {pageSize}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border border-[hsl(var(--border))] px-3 py-1 disabled:opacity-40"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={rows.length < pageSize}
            className="border border-[hsl(var(--border))] px-3 py-1 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </nav>
    </div>
  )
}
