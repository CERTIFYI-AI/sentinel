// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// C.1 — Seed 12 Sentinel roles with full permission matrix.
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-rbac.ts
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } }
)

const RESOURCES = [
  'risks','incidents','tasks','evidence','controls','policies',
  'vendors','models','agents','use_cases','prompts','bias_audits',
  'aiia','datasets','dsr','users','roles','departments','audits',
  'gaps','documents','committees','trainings','assets','bcp_plans',
  'ropa','tia','notifications','reports','webhooks','api_keys',
  'settings','audit_log','access_control','compliance','governance_events',
]

const ACTIONS = ['create','read','update','delete','approve','export']

function permSet(allow: Record<string, string[]>): Record<string, string[]> {
  return allow
}

const ROLES = [
  { slug: 'super_admin',          display: 'Super Admin',          tier: 1, perms: permSet({ '*': ['*'] }) },
  { slug: 'ciso',                 display: 'CISO',                 tier: 1, perms: permSet({ '*': ['read','export'], risks: ['*'], incidents: ['*'], reports: ['*'], settings: ['read','update'] }) },
  { slug: 'compliance_lead',      display: 'Compliance Lead',      tier: 2, perms: permSet({ compliance: ['*'], controls: ['*'], audits: ['*'], evidence: ['*'], gaps: ['*'], policies: ['*'], ropa: ['*'], tia: ['*'] }) },
  { slug: 'risk_manager',         display: 'Risk Manager',         tier: 2, perms: permSet({ risks: ['*'], incidents: ['*'], tasks: ['*'], bcp_plans: ['*'], aiia: ['*'] }) },
  { slug: 'ai_governance_lead',   display: 'AI Governance Lead',   tier: 2, perms: permSet({ models: ['*'], agents: ['*'], bias_audits: ['*'], use_cases: ['*'], prompts: ['*'], datasets: ['*'] }) },
  { slug: 'dpo',                  display: 'DPO',                  tier: 2, perms: permSet({ dsr: ['*'], ropa: ['*'], tia: ['*'], datasets: ['read','update'], vendors: ['read'] }) },
  { slug: 'security_analyst',     display: 'Security Analyst',     tier: 3, perms: permSet({ incidents: ['*'], evidence: ['*'], audit_log: ['read'], access_control: ['read'] }) },
  { slug: 'auditor_external',     display: 'External Auditor',     tier: 3, perms: permSet({ audits: ['read','create'], evidence: ['read'], controls: ['read'], risks: ['read'], audit_log: ['read'] }) },
  { slug: 'model_owner',          display: 'Model Owner',          tier: 3, perms: permSet({ models: ['read','update'], bias_audits: ['read','create'], datasets: ['read'], use_cases: ['read','update'] }) },
  { slug: 'vendor_manager',       display: 'Vendor Manager',       tier: 3, perms: permSet({ vendors: ['*'], ropa: ['read'] }) },
  { slug: 'dept_head',            display: 'Department Head',      tier: 4, perms: permSet({ tasks: ['read','update'], risks: ['read'], policies: ['read'], training: ['*'] }) },
  { slug: 'read_only',            display: 'Read Only',            tier: 5, perms: permSet({ '*': ['read'] }) },
]

async function main() {
  console.log('Seeding RBAC...')
  
  // Upsert roles
  const { error: roleErr } = await sb.from('sentinel_roles').upsert(
    ROLES.map(r => ({ slug: r.slug, display_name: r.display, tier: r.tier, is_system: true, permissions: r.perms })),
    { onConflict: 'slug' }
  )
  if (roleErr) console.error('Roles error:', roleErr.message)
  else console.log(`✓ ${ROLES.length} roles upserted`)

  console.log('✅ RBAC seed complete')
}

main().catch(e => { console.error(e); process.exit(1) })
