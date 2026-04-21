# Sentinel Backend Integration — Shared Agent Context

## Repo path
/home/user/workspace/sentinel

## Design System (STRICT — never violate)
- Font: Outfit only — `* { font-family: 'Outfit', sans-serif; }`
- Border radius: 0 everywhere — `--radius: 0rem`
- Primary brand: #368F4D (--brand, --primary)
- Icons: Phosphor duotone default, fill on active/selected ONLY
- Component lib: shadcn/ui
- Colors: Zinc base, Emerald accent
- NO mock/seed data on any page — all data from Supabase

## Supabase Project
- Project ID: vhparvughsygyknblkzt
- URL pattern: https://vhparvughsygyknblkzt.supabase.co

## Critical Table Name Mapping (Supabase actual → service must use)
| Domain | Correct Table | Wrong/Old Table |
|--------|--------------|-----------------|
| Models | `ai_models` | `model_inventory`, `models`, `Model` |
| Risks | `risk_register` OR `RiskEntry` (has data) | `risks` (empty) |
| Frameworks | `frameworks` (snake_case, has data 8192) | `Framework` (PascalCase Prisma) |
| Controls | `controls` (has data 81920) | `Control` |
| Policies | `policies` OR `Policy` | — |
| Vendors | `vendors` (empty) OR `Vendor` (PascalCase, has data) | — |
| Incidents | `incidents` (empty) — needs seed | — |
| Evidence | `evidence` (empty) OR `Evidence` | — |
| Agents | `agents` (empty) OR `Agent` (has data) | — |
| HitlItems | `HitlItem` (has data) | `hitl_queue`, `hitl_items` |
| Bias Audits | `bias_audits` (empty) OR `BiasAudit` | — |
| Regulations | `Regulation` (PascalCase) | `regulations` |
| Guardrails | `GuardrailRule` OR `guardrail_rules` | `guardrails` |
| Trust Traces | `TrustTrace` | `trust_traces` |
| Audit Log | `AuditLog` (has data) OR `audit_log` | — |
| Carbon | `carbon_records` (has data 8192) | — |
| ESG Reports | No table yet — use `esg_reports` | — |
| Energy | No table yet — use `energy_metrics` | — |
| Model Efficiency | No table yet — use `model_efficiency` | — |

## Tables with confirmed data (size > 0)
ai_models, assets, attack_surface_assets, bcp_plans, bia_processes, carbon_records,
committees, consent_records, controls, custom_roles, departments, ethics_reports,
frameworks, identities, keys_vault, model_arena_runs, organizations, policy_firewall_rules,
policy_templates, red_team_findings, remediation_plans, risk_register, roles, 
sod_rules, supply_chain_attestations, tenants, training_courses, transparency_reports,
trust_traces, user_profiles, TrustTrace, AuditLog, BiasAudit, Agent, Vendor, 
HitlItem, RiskEntry, Control, Policy, Framework, Model, Dataset, Evidence, User, Tenant

## Standard Service Pattern (follow EXACTLY)
```typescript
// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type XxxRecord = {
  id: string
  org_id?: string
  // ... fields
  created_at: string
  updated_at: string
}

export async function fetchAllXxx(filters: Record<string,any> = {}): Promise<XxxRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('xxx_table').select('*').order('created_at', { ascending: false })
    // apply filters
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) { console.warn('[xxxService] fetch:', error.message); return [] }
    return (data ?? []) as XxxRecord[]
  } catch { return [] }
}

export async function upsertXxx(record: Partial<XxxRecord>): Promise<XxxRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('xxx_table')
      .upsert(record)
      .select()
      .single()
    if (error) { console.warn('[xxxService] upsert:', error.message); return null }
    return data as XxxRecord
  } catch { return null }
}

export async function deleteXxx(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('xxx_table').delete().eq('id', id)
    if (error) { console.warn('[xxxService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchXxx = fetchAllXxx // backward compat alias
export const saveXxx = upsertXxx
```

## Standard Hook Pattern
```typescript
// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllXxx, upsertXxx, deleteXxx } from '@/services/xxxService'
import { toast } from 'sonner'

export function useXxxData(filters = {}) {
  const qc = useQueryClient()
  
  const query = useQuery({
    queryKey: ['xxx', filters],
    queryFn: () => fetchAllXxx(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertXxx(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['xxx'] }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteXxx(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['xxx'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
```

## Page Pattern Requirements
Every page MUST:
1. Import and use its `useXxxData` hook — NO local useState for data
2. Show skeleton loader while loading: `if (isLoading) return <PageSkeleton />`
3. Use `useChartTheme()` for all charts
4. Use `ConfirmDialog` for all deletes (never window.confirm)
5. Use `toast.success/error` on all mutations
6. Have Export CSV button
7. Have real Recharts charts pulling from live aggregates
8. No SEED/mock arrays — remove them all
9. Every entity ID shown via text, not EntityChip (EntityChip is optional enhancement)

## Audit log entry pattern (after every mutation)
```typescript
import { supabase } from '@/lib/supabase'
async function logAudit(action: string, entity: string, entityId: string) {
  try {
    await supabase.from('AuditLog').insert({
      action, entity, entityId, tenantId: 'default',
      timestamp: new Date().toISOString(),
    })
  } catch {}
}
```

## Export CSV utility
```typescript
function exportCsv(rows: any[], filename: string) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
}
```

## Git workflow
- Work in /home/user/workspace/sentinel
- Stage all changes with git add -A
- Do NOT commit (parent will commit after all agents done)
- Write a summary of all files changed to /home/user/workspace/AGENT_REPORT_<N>.md
