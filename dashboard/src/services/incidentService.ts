// SPDX-License-Identifier: Apache-2.0
// Legacy-compatible incident service over the canonical org-scoped
// `incidents` table. Kept for existing consumers (Overview, CISO dashboard,
// Agents shadow-AI escalation, Trust Engine tool monitor) that work with
// snake_case rows; new UI code should prefer incidentResponseService.
//
// Platform contract: no seed fallback (an empty org shows an honest empty
// state), writes THROW on failure, and creating an incident emits
// INCIDENT_CREATED on the governance bus so the mesh cascade fires.
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { governanceBus } from '../lib/governance/eventBus'
import { incidentCreatedPayload } from './incidentResponseService'

export type IncidentRecord = {
  id: string
  org_id?: string
  incident_id?: string
  title: string
  description?: string
  severity?: string
  status?: string
  incident_type?: string
  category?: string
  source?: string
  model_id?: string | null
  affected_models?: string[]
  detected_at?: string
  resolved_at?: string
  occurred_date?: string
  detected_date?: string
  reporter?: string
  assignee?: string
  sla_hours?: number
  playbook_id?: string | null
  regulatory_reportable?: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — incident data is unavailable')
  }
  return supabase
}

export async function fetchAllIncidents(filters: Record<string, any> = {}): Promise<IncidentRecord[]> {
  let q = client().from('incidents').select('*').order('created_at', { ascending: false })
  if (filters.severity) q = q.eq('severity', filters.severity)
  if (filters.status) q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) {
    console.warn('[incidentService] fetch failed: %s', error.message)
    throw new Error(`Could not load incidents: ${error.message}`)
  }
  return (data ?? []) as IncidentRecord[]
}

export async function upsertIncident(record: Partial<IncidentRecord>): Promise<IncidentRecord> {
  const isNew = !record.id
  const row: Record<string, unknown> = {
    ...record,
    // incidents.title is NOT NULL; legacy escalation callers only send a
    // description — derive an honest title rather than failing the write.
    title: record.title
      ?? (record.incident_type ? `${record.incident_type.replace(/_/g, ' ')} incident` : 'Untitled incident'),
    updated_at: new Date().toISOString(),
  }
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from('incidents').upsert(row).select().single()
  if (error) throw new Error(`The incident write did not persist: ${error.message}`)
  const saved = data as IncidentRecord
  if (isNew) {
    // Same declared IncidentCreatedPayload contract the cascade agents read.
    void governanceBus.emit('INCIDENT_CREATED', 'incident-service', incidentCreatedPayload({
      id: saved.id,
      title: saved.title,
      severity: (saved.severity ?? 'medium').toLowerCase(),
      status: saved.status ?? 'open',
      category: saved.category,
      incidentType: saved.incident_type,
      modelId: saved.model_id ?? null,
      incidentId: saved.incident_id,
      regulatoryReportable: saved.regulatory_reportable ?? false,
    }))
  }
  return saved
}

export async function deleteIncident(id: string): Promise<boolean> {
  const { error } = await client().from('incidents').delete().eq('id', id)
  if (error) throw new Error(`Delete failed: ${error.message}`)
  return true
}

export const fetchIncidents = fetchAllIncidents
export const saveIncident = upsertIncident
