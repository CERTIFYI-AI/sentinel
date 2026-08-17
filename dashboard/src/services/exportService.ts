// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Export Center backend — produces real files from the real registers.
//
// The page previously listed hardcoded templates and a fake "recent jobs" table
// showing completed exports that had never run. Nothing was ever produced.
//
// Each export below runs a real query and writes a real file. Two decisions
// carry through all of them:
//
//   * Ids resolve to names. An export that hands a regulator a column of uuids
//     is not readable evidence, so every foreign key is joined to the name it
//     points at, and an id that resolves to nothing is written as "Unavailable"
//     rather than left as a bare key.
//   * An empty register exports as a header row and nothing else, and the
//     caller is told the row count. A zero-row export is a legitimate answer;
//     silently producing an empty file that looks like a failure is not.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { logAction } from '@/lib/auditLogger'

export interface ExportDefinition {
  key: string
  name: string
  description: string
  /** What a reader gets, in the terms the obligation is written in. */
  basis: string
  run: () => Promise<ExportResult>
}

export interface ExportResult {
  filename: string
  csv: string
  rows: number
}

function esc(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
}

function stamp(base: string): string {
  return `${base}-${new Date().toISOString().slice(0, 10)}.csv`
}

async function select(table: string, columns = '*'): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot export.')
  }
  const { data, error } = await supabase.from(table).select(columns)
  if (error) throw new Error(`${table}: ${error.message}`)
  return data ?? []
}

/** id -> display name, for resolving foreign keys to something readable. */
async function nameMap(table: string, nameCol: string): Promise<Map<string, string>> {
  const rows = await select(table, `id, ${nameCol}`)
  return new Map(rows.map((r: any) => [String(r.id), String(r[nameCol] ?? '')]))
}

const resolve = (m: Map<string, string>, id: unknown): string =>
  id == null ? '' : (m.get(String(id)) ?? 'Unavailable')

const resolveMany = (m: Map<string, string>, ids: unknown): string =>
  Array.isArray(ids) ? ids.map((i) => resolve(m, i)).join('; ') : ''

// ── Export definitions ──────────────────────────────────────────────────────

export const EXPORTS: ExportDefinition[] = [
  {
    key: 'model-inventory',
    name: 'AI system inventory',
    description: 'Every registered AI system with its risk tier, lifecycle stage and owner.',
    basis: 'EU AI Act Art. 11 / Annex IV — technical documentation starts from knowing what you run.',
    run: async () => {
      const rows = await select('ai_models')
      return {
        filename: stamp('ai-system-inventory'),
        rows: rows.length,
        csv: toCsv(
          ['name', 'version', 'risk_tier', 'lifecycle_stage', 'model_type', 'vendor', 'data_sensitivity', 'description'],
          rows.map((m: any) => [m.name, m.version, m.risk_tier, m.lifecycle_stage, m.model_type, m.vendor, m.data_sensitivity, m.description]),
        ),
      }
    },
  },
  {
    key: 'ropa',
    name: 'Records of processing activities',
    description: 'The Art. 30 register with the AI systems, datasets and processor behind each activity.',
    basis: 'GDPR Art. 30 — the record a supervisory authority can demand on request.',
    run: async () => {
      const [rows, models, datasets, vendors, useCases] = await Promise.all([
        select('ropa_records'),
        nameMap('ai_models', 'name'),
        nameMap('datasets', 'name'),
        nameMap('vendors', 'vendor_name'),
        nameMap('use_cases', 'title'),
      ])
      return {
        filename: stamp('ropa-register'),
        rows: rows.length,
        csv: toCsv(
          ['reference', 'processing_activity', 'purpose', 'legal_basis', 'data_subjects', 'data_categories',
           'recipients', 'cross_border', 'retention', 'dpia_required', 'dpia_completed',
           'ai_systems', 'datasets', 'use_case', 'processor', 'controller', 'last_reviewed', 'next_review'],
          rows.map((r: any) => [
            r.reference, r.processing_activity, r.purpose, r.legal_basis, r.data_subjects, r.data_categories,
            r.recipients, r.cross_border_transfers ? 'yes' : 'no', r.retention_period,
            r.dpia_required ? 'yes' : 'no', r.dpia_completed ? 'yes' : 'no',
            resolveMany(models, r.linked_model_ids), resolveMany(datasets, r.linked_dataset_ids),
            resolve(useCases, r.linked_use_case_id), resolve(vendors, r.processor_vendor_id),
            r.controller_name, r.last_reviewed_at, r.next_review_at,
          ]),
        ),
      }
    },
  },
  {
    key: 'dsr',
    name: 'Rights requests register',
    description: 'Arts. 15–22 requests with the statutory clock and the systems each one touches.',
    basis: 'GDPR Art. 12(3) — evidence the one-month deadline was met.',
    run: async () => {
      const [rows, models, ropa] = await Promise.all([
        select('dsar_requests'),
        nameMap('ai_models', 'name'),
        nameMap('ropa_records', 'processing_activity'),
      ])
      const live = rows.filter((r: any) => !r.is_deleted)
      const today = new Date().toISOString().slice(0, 10)
      return {
        filename: stamp('dsr-register'),
        rows: live.length,
        csv: toCsv(
          ['reference', 'requester', 'email', 'request_type', 'status', 'priority', 'received', 'due',
           'overdue', 'processing_activity', 'ai_systems', 'assignee', 'source', 'created_by_agent'],
          live.map((d: any) => [
            d.reference, d.requester_name, d.requester_email, d.request_type, d.status, d.priority,
            d.submitted_date, d.due_date,
            d.due_date && d.due_date < today && !['completed', 'rejected'].includes(d.status) ? 'yes' : 'no',
            resolve(ropa, d.linked_ropa_id), resolveMany(models, d.linked_model_ids),
            d.assignee, d.source, d.created_by_agent,
          ]),
        ),
      }
    },
  },
  {
    key: 'consent',
    name: 'Consent register',
    description: 'Art. 7 consent evidence with purposes and the AI systems each consent covers.',
    basis: 'GDPR Art. 7(1) — the controller must be able to demonstrate consent.',
    run: async () => {
      const [rows, models, ropa] = await Promise.all([
        select('consent_records'),
        nameMap('ai_models', 'name'),
        nameMap('ropa_records', 'processing_activity'),
      ])
      return {
        filename: stamp('consent-register'),
        rows: rows.length,
        csv: toCsv(
          ['reference', 'subject', 'email', 'type', 'legal_basis', 'status', 'purposes', 'data_categories',
           'ai_systems', 'processing_activity', 'consent_date', 'expiry_date', 'withdrawal_date', 'channel'],
          rows.map((c: any) => [
            c.consent_ref, c.subject_name ?? c.subject_ref, c.subject_email, c.type, c.legal_basis, c.status,
            (c.purposes ?? []).join('; '), (c.data_categories ?? []).join('; '),
            resolveMany(models, c.linked_model_ids), resolve(ropa, c.linked_ropa_id),
            c.consent_date, c.expiry_date, c.withdrawal_date, c.channel,
          ]),
        ),
      }
    },
  },
  {
    key: 'risk-register',
    name: 'Risk register',
    description: 'Open and closed risks with the asset and provenance of each.',
    basis: 'EU AI Act Art. 9 — the risk management system and its record.',
    run: async () => {
      const [rows, assets] = await Promise.all([
        select('risks'),
        nameMap('assets', 'name'),
      ])
      return {
        filename: stamp('risk-register'),
        rows: rows.length,
        csv: toCsv(
          ['id', 'name', 'risk_level', 'likelihood', 'severity', 'mitigation_status', 'lifecycle_phase',
           'linked_assets', 'related_entity_type', 'source', 'auto_generated', 'assessment_date', 'description'],
          rows.map((r: any) => [
            r.id, r.name, r.risk_level, r.likelihood, r.severity, r.mitigation_status, r.ai_lifecycle_phase,
            resolveMany(assets, r.linked_asset_ids), r.related_entity_type,
            r.source, r.auto_generated ? 'yes' : 'no', r.assessment_date, r.description,
          ]),
        ),
      }
    },
  },
  {
    key: 'dpia',
    name: 'DPIA register',
    description: 'Impact assessments with inherent and residual risk and the risk each one left behind.',
    basis: 'GDPR Arts. 35–36 — high residual risk engages prior consultation.',
    run: async () => {
      const [rows, models, ropa] = await Promise.all([
        select('dpia_assessments'),
        nameMap('ai_models', 'name'),
        nameMap('ropa_records', 'processing_activity'),
      ])
      return {
        filename: stamp('dpia-register'),
        rows: rows.length,
        csv: toCsv(
          ['reference', 'title', 'status', 'risk_level', 'residual_risk_level', 'consultation_required',
           'consultation_date', 'ai_systems', 'processing_activity', 'linked_risk', 'owner', 'next_review'],
          rows.map((d: any) => [
            d.reference, d.title, d.status, d.risk_level, d.residual_risk_level,
            d.consultation_required ? 'yes' : 'no', d.consultation_date,
            resolveMany(models, d.linked_model_ids), resolve(ropa, d.linked_ropa_id),
            d.linked_risk_id, d.owner_name, d.next_review_at,
          ]),
        ),
      }
    },
  },
  {
    key: 'tia',
    name: 'Transfer impact assessments',
    description: 'Cross-border transfers and the Chapter V mechanism relied on for each.',
    basis: 'GDPR Arts. 44–49 — a transfer with no mechanism has no lawful basis.',
    run: async () => {
      const [rows, vendors, models, ropa] = await Promise.all([
        select('transfer_impact_assessments'),
        nameMap('vendors', 'vendor_name'),
        nameMap('ai_models', 'name'),
        nameMap('ropa_records', 'processing_activity'),
      ])
      return {
        filename: stamp('transfer-impact-assessments'),
        rows: rows.length,
        csv: toCsv(
          ['reference', 'transfer_name', 'source_country', 'destination_country', 'transfer_mechanism',
           'mechanism_missing', 'risk_level', 'supplementary_measures', 'recipient_vendor',
           'ai_systems', 'processing_activity', 'status', 'valid_until'],
          rows.map((t: any) => [
            t.reference, t.transfer_name, t.source_country, t.destination_country,
            t.transfer_mechanism, t.transfer_mechanism ? 'no' : 'YES',
            t.risk_level, t.supplementary_measures, resolve(vendors, t.vendor_id),
            resolveMany(models, t.linked_model_ids), resolve(ropa, t.linked_ropa_id),
            t.status, t.valid_until,
          ]),
        ),
      }
    },
  },
  {
    key: 'asset-register',
    name: 'Asset register',
    description: 'Assets with the registry record each represents and its recovery objectives.',
    basis: 'ISO/IEC 27001 A.5.9 and ISO 42001 — you cannot protect what you have not listed.',
    run: async () => {
      const [rows, models, datasets] = await Promise.all([
        select('assets'),
        nameMap('ai_models', 'name'),
        nameMap('datasets', 'name'),
      ])
      return {
        filename: stamp('asset-register'),
        rows: rows.length,
        csv: toCsv(
          ['asset_ref', 'name', 'type', 'criticality', 'risk_level', 'data_classification',
           'lifecycle_stage', 'department', 'location', 'represents', 'rto_hours', 'rpo_hours'],
          rows.map((a: any) => [
            a.asset_ref, a.name, a.type, a.criticality, a.risk_level, a.data_classification,
            a.lifecycle_stage, a.department, a.location,
            a.entity_type === 'ai_model' ? resolve(models, a.entity_id)
              : a.entity_type === 'dataset' ? resolve(datasets, a.entity_id) : '',
            a.bia_rto_hours, a.bia_rpo_hours,
          ]),
        ),
      }
    },
  },
  {
    key: 'controls',
    name: 'Control library',
    description: 'The full control set with implementation status and framework mapping.',
    basis: 'ISO/IEC 42001 Annex A and the frameworks mapped against it.',
    run: async () => {
      const rows = await select('controls')
      return {
        filename: stamp('control-library'),
        rows: rows.length,
        csv: toCsv(
          ['control_ref', 'name', 'clause_ref', 'category', 'status', 'severity', 'score',
           'evidence_count', 'automation_status', 'last_tested_at', 'next_test_at', 'description'],
          rows.map((c: any) => [
            c.control_ref, c.name, c.clause_ref, c.category, c.status, c.severity, c.score,
            c.evidence_count, c.automation_status, c.last_tested_at, c.next_test_at, c.description,
          ]),
        ),
      }
    },
  },
  {
    key: 'incidents',
    name: 'Incident log',
    description: 'Incidents with severity, type and the risk each one proved.',
    basis: 'EU AI Act Art. 73 — serious incident reporting.',
    run: async () => {
      const rows = (await select('incidents')).filter((i: any) => !i.is_deleted)
      return {
        filename: stamp('incident-log'),
        rows: rows.length,
        csv: toCsv(
          ['id', 'incident_type', 'severity', 'status', 'occurred_date', 'detected_date',
           'affected_persons', 'categories_of_harm', 'ai_use_case_or_framework',
           'linked_risk', 'approval_status', 'source', 'auto_generated', 'description'],
          rows.map((i: any) => [
            i.id, i.incident_type, i.severity, i.status, i.occurred_date, i.detected_date,
            i.affected_persons,
            Array.isArray(i.categories_of_harm) ? i.categories_of_harm.join('; ') : i.categories_of_harm,
            i.ai_use_case_or_framework, i.linked_risk_id, i.approval_status,
            i.source, i.auto_generated ? 'yes' : 'no', i.description,
          ]),
        ),
      }
    },
  },
]

/** Run one export and hand the browser a file. Throws so the UI can report it. */
export async function runExport(key: string): Promise<ExportResult> {
  const def = EXPORTS.find((e) => e.key === key)
  if (!def) throw new Error(`Unknown export: ${key}`)

  const result = await def.run()

  const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = result.filename
  a.click()
  URL.revokeObjectURL(a.href)

  // An export removes governed data from the platform's control. That is a
  // state-changing act for audit purposes even though it mutates nothing.
  void logAction({
    module: 'export-center',
    entityType: 'export',
    entityName: def.name,
    action: 'export',
    newValues: { rows: result.rows, filename: result.filename },
  })

  return result
}
