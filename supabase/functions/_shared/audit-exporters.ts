/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * Audit log exporter helpers — convert a row from `audit_log` into
 * third-party SIEM formats.
 *
 *   - CEF  (ArcSight Common Event Format, rev 25) — key-value pipe form.
 *   - LEEF (IBM QRadar Log Event Extended Format, v2.0).
 *   - Syslog RFC 5424 structured data.
 *   - Splunk HEC JSON envelope.
 */

export interface AuditLogRow {
  id: string
  org_id: string
  sequence_no: number
  occurred_at: string
  actor_id: string | null
  actor_type: string
  action: string
  resource_type: string
  resource_id: string | null
  outcome: string
  severity: string
  metadata: Record<string, unknown>
  previous_hash: string | null
  row_hash: string
  ip_address: string | null
  user_agent: string | null
  trace_id: string | null
}

const SEVERITY_TO_CEF: Record<string, number> = {
  debug: 0,
  info: 3,
  notice: 4,
  warning: 6,
  error: 8,
  critical: 10,
}

/** Escape CEF header fields — only `|` and `\` per spec rev 25 §4.1. */
function cefEscapeHeader(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
}

/** Escape CEF extension values — `=`, `\`, and newlines. */
function cefEscapeExt(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/=/g, '\\=')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
}

export function toCef(row: AuditLogRow): string {
  const sev = SEVERITY_TO_CEF[row.severity] ?? 3
  const header =
    `CEF:0|CERTIFYI-AI|Sentinel|1.0|${cefEscapeHeader(row.action)}|` +
    `${cefEscapeHeader(row.action)}|${sev}`
  const kv: Record<string, string> = {
    rt: String(new Date(row.occurred_at).getTime()),
    outcome: row.outcome,
    suid: row.actor_id ?? '',
    sourceUserName: row.actor_type,
    cs1Label: 'org_id',
    cs1: row.org_id,
    cs2Label: 'resource_type',
    cs2: row.resource_type,
    cs3Label: 'resource_id',
    cs3: row.resource_id ?? '',
    cs4Label: 'row_hash',
    cs4: row.row_hash,
    cs5Label: 'sequence_no',
    cs5: String(row.sequence_no),
    src: row.ip_address ?? '',
    request: row.user_agent ?? '',
  }
  const ext = Object.entries(kv)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${cefEscapeExt(v)}`)
    .join(' ')
  return `${header}|${ext}`
}

export function toLeef(row: AuditLogRow): string {
  const delim = '\t'
  const header = `LEEF:2.0|CERTIFYI-AI|Sentinel|1.0|${row.action}|${delim}|`
  const fields: Record<string, string> = {
    devTime: row.occurred_at,
    devTimeFormat: 'yyyy-MM-ddTHH:mm:ss.SSSXXX',
    sev: String(SEVERITY_TO_CEF[row.severity] ?? 3),
    usrName: row.actor_id ?? '',
    src: row.ip_address ?? '',
    resource: row.resource_type,
    resourceId: row.resource_id ?? '',
    outcome: row.outcome,
    orgId: row.org_id,
    seq: String(row.sequence_no),
    rowHash: row.row_hash,
  }
  const body = Object.entries(fields)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${v}`)
    .join(delim)
  return header + body
}

/** RFC 5424 structured-data element. PEN 61868 is a placeholder; assign
 *  a real Private Enterprise Number with IANA before GA. */
export function toSyslog5424(row: AuditLogRow, host: string): string {
  const sev = SEVERITY_TO_CEF[row.severity] ?? 3
  // facility = 10 (security/audit); PRI = facility*8 + severity
  const pri = 10 * 8 + Math.min(sev, 7)
  const ts = row.occurred_at
  const app = 'sentinel'
  const procid = row.trace_id ?? '-'
  const msgid = row.action
  const sd =
    `[audit@61868 ` +
    `org="${row.org_id}" ` +
    `seq="${row.sequence_no}" ` +
    `actor="${row.actor_id ?? ''}" ` +
    `resource="${row.resource_type}/${row.resource_id ?? ''}" ` +
    `outcome="${row.outcome}" ` +
    `hash="${row.row_hash}"]`
  return `<${pri}>1 ${ts} ${host} ${app} ${procid} ${msgid} ${sd} ${row.action}`
}

export function toSplunkHec(row: AuditLogRow, host: string): string {
  return JSON.stringify({
    time: new Date(row.occurred_at).getTime() / 1000,
    host,
    source: 'sentinel:audit',
    sourcetype: '_json',
    index: 'sentinel',
    event: {
      id: row.id,
      org_id: row.org_id,
      sequence_no: row.sequence_no,
      action: row.action,
      actor: { id: row.actor_id, type: row.actor_type },
      resource: { type: row.resource_type, id: row.resource_id },
      outcome: row.outcome,
      severity: row.severity,
      metadata: row.metadata,
      chain: { previous_hash: row.previous_hash, row_hash: row.row_hash },
      client: { ip: row.ip_address, ua: row.user_agent },
      trace_id: row.trace_id,
    },
  })
}
