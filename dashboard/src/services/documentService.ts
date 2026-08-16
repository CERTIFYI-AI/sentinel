// SPDX-License-Identifier: Apache-2.0
// Documents on the platform contract (CLAUDE.md): the real org-scoped
// `documents` table (RLS; tenant_id filled by the DB default — never sent
// from the client), camelCase↔snake_case mapping at this boundary, and
// writes that THROW on failure so the UI can never report a false success.
// Files live in Supabase storage (evidence bucket, documents/ folder) with
// storage_path / file_size / mime_type recorded on the row; external
// references use external_link. Interlinks: linked_entity_type/id points at
// a governed entity (model | policy | use_case) and linked_model_ids carries
// ai_models.id uuids — ids only, names resolved at render time.
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — document data is unavailable')
  }
  return supabase
}

export interface DocumentRecord {
  id?: string                   // uuid, DB default — never client-minted
  title: string
  docType?: string | null       // policy | procedure | standard | guideline | template
  version?: string | null
  status: string                // draft | in_review | approved | published | archived | expired
  description?: string | null
  owner?: string | null
  category?: string | null
  frameworks?: string[]
  expiryDate?: string | null
  externalLink?: string | null
  storagePath?: string | null
  fileSize?: number | null
  linkedEntityType?: string | null  // model | policy | use_case
  linkedEntityId?: string | null    // uuid of the governed entity
  linkedModelIds?: string[]         // → ai_models.id
  uri?: string | null
  mimeType?: string | null
  sha256?: string | null
  createdAt?: string
}

const mapDocument = (r: any): DocumentRecord => ({
  id: r.id,
  title: r.title ?? '',
  docType: r.doc_type ?? null,
  version: r.version ?? null,
  status: (r.status ?? 'draft').toLowerCase(),
  description: r.description ?? null,
  owner: r.owner ?? null,
  category: r.category ?? null,
  frameworks: r.frameworks ?? [],
  expiryDate: r.expiry_date ?? null,
  externalLink: r.external_link ?? null,
  storagePath: r.storage_path ?? null,
  fileSize: r.file_size ?? null,
  linkedEntityType: r.linked_entity_type ?? null,
  linkedEntityId: r.linked_entity_id ?? null,
  linkedModelIds: r.linked_model_ids ?? [],
  uri: r.uri ?? null,
  mimeType: r.mime_type ?? null,
  sha256: r.sha256 ?? null,
  createdAt: r.created_at,
})

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const { data, error } = await client()
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[documentService] fetch failed: %s', error.message)
    throw new Error(`Could not load documents: ${error.message}`)
  }
  return (data ?? []).map(mapDocument)
}

// Upsert without an id lets the uuid DB default assign one; tenant_id is
// always filled by the DB default under RLS.
export async function saveDocument(d: DocumentRecord): Promise<DocumentRecord> {
  const row: Record<string, unknown> = {
    id: d.id,
    title: d.title,
    doc_type: d.docType,
    version: d.version,
    status: d.status?.toLowerCase(),
    description: d.description,
    owner: d.owner,
    category: d.category,
    frameworks: d.frameworks,
    expiry_date: d.expiryDate || null,
    external_link: d.externalLink || null,
    storage_path: d.storagePath || null,
    file_size: d.fileSize ?? null,
    linked_entity_type: d.linkedEntityType || null,
    linked_entity_id: d.linkedEntityId || null,
    linked_model_ids: d.linkedModelIds,
    uri: d.uri || null,
    mime_type: d.mimeType || null,
    sha256: d.sha256 || null,
  }
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from('documents').upsert(row).select().single()
  if (error) {
    console.warn('[documentService] upsert failed: %s', error.message)
    throw new Error(`The document did not persist: ${error.message}`)
  }
  return mapDocument(data)
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await client().from('documents').delete().eq('id', id)
  if (error) {
    console.warn('[documentService] delete failed: %s', error.message)
    throw new Error(`Delete failed: ${error.message}`)
  }
}
