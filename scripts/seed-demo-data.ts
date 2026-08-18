// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// C.2 — Demo data: 8 personas + realistic data volumes for the demo tenant
// (org 00000000-...-0001). The organisation's NAME is not set here — it lives
// in `organizations.name` and is edited in Settings → General, which is the
// single source of truth the whole product reads through useOrgName().
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo-data.ts
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } }
)

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const TENANT = 'TNT-DEMO'

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

async function upsert(table: string, rows: Record<string, unknown>[], key: string, label: string) {
  if (!rows.length) return
  const { error } = await sb.from(table).upsert(rows, { onConflict: key, ignoreDuplicates: true })
  if (error) console.warn(`  ⚠ ${label}: ${error.message}`)
  else console.log(`  ✓ ${label}: ${rows.length} records`)
}

const DEPARTMENTS = [
  'Engineering','Compliance','Security','Data Science','Legal','Finance',
  'HR','Operations','Risk Management','Audit','Privacy','Product',
  'Sales','Marketing','Customer Success','IT'
]

const PERSONAS = [
  { email: 'admin@certifyi.ai',      name: 'Alex Admin',       role: 'super_admin',     dept: 'IT' },
  { email: 'ciso@demo.certifyi.ai',  name: 'Claire Chen',      role: 'ciso',            dept: 'Security' },
  { email: 'orgadmin@demo.certifyi.ai', name: 'Omar Ahmed',    role: 'ai_governance_lead', dept: 'Compliance' },
  { email: 'compliance@demo.certifyi.ai', name: 'Priya Sharma', role: 'compliance_lead', dept: 'Compliance' },
  { email: 'auditor@demo.certifyi.ai', name: 'James Wilson',   role: 'auditor_external', dept: 'Audit' },
  { email: 'dpo@demo.certifyi.ai',   name: 'Diana Reyes',      role: 'dpo',             dept: 'Privacy' },
  { email: 'modelowner@demo.certifyi.ai', name: 'Kenji Tanaka', role: 'model_owner',    dept: 'Data Science' },
  { email: 'riskowner@demo.certifyi.ai', name: 'Sarah Johnson', role: 'risk_manager',   dept: 'Risk Management' },
]

const RISK_TITLES = [
  'Generative AI Hallucination in Customer Portal',
  'Model Bias in Credit Scoring System',
  'Third-Party LLM Provider Data Leakage',
  'EU AI Act High-Risk Non-Compliance',
  'Training Data PII Exposure',
  'Shadow AI Deployment in Finance',
  'Model Performance Drift',
  'Insufficient Explainability for Audit',
  'Vendor Concentration: OpenAI Dependency',
  'Carbon Budget Overrun from LLM Inference',
  'GDPR Article 22 Automated Decision Risk',
  'Model Supply Chain Integrity Failure',
  'Insider Threat: Unauthorized Model Access',
  'Third-Party Training Data License Breach',
  'Model Serving Infrastructure CVE',
]

async function main() {
  console.log('🌱 Seeding demo data for the demo tenant...\n')

  // Risks: 500 records with trend data (N-13 fix)
  const risks = Array.from({ length: 500 }, (_, i) => ({
    id: uuid(),
    org_id: ORG_ID,
    title: `${RISK_TITLES[i % RISK_TITLES.length]} #${i + 1}`,
    category: ['AI Model Risk','Compliance Risk','Data Privacy Risk','Vendor Risk','Operational Risk','Reputational Risk'][i % 6],
    severity: ['CRITICAL','HIGH','HIGH','MEDIUM','MEDIUM','LOW'][i % 6],
    likelihood: (i % 5) + 1,
    impact: (i % 5) + 1,
    status: ['OPEN','OPEN','IN_PROGRESS','MITIGATED','ACCEPTED','CLOSED'][i % 6],
    description: `Risk record #${i + 1} — auto-seeded for Fortune 500 readiness demo.`,
    owner: PERSONAS[i % PERSONAS.length].name,
    source: ['auto-scan','manual','third-party-audit','regulatory-requirement'][i % 4],
    trend_direction: ['improving','worsening','stable','new'][i % 4] as string,
    trend_delta: ((i % 10) - 5) * 0.8,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }))
  await upsert('risks', risks, 'id', 'Risks (500)')

  // Incidents: 200 records
  const INCIDENT_TITLES = [
    'P0: AI Model Poison Detected in Production',
    'P1: Bias Drift in Hiring Recommendation Engine',
    'P2: Unauthorized PII Exposure via LLM Output',
    'P2: GDPR DSR Breach — Automated Decision',
    'P3: Model Performance Below SLA Threshold',
    'P3: Third-Party AI Service Outage',
    'P3: Shadow AI Tool Data Exfiltration Alert',
    'P4: EU AI Act Conformity Documentation Gap',
  ]
  const incidents = Array.from({ length: 200 }, (_, i) => ({
    id: uuid(),
    org_id: ORG_ID,
    title: `${INCIDENT_TITLES[i % INCIDENT_TITLES.length]} #${i + 1}`,
    severity: ['P0','P1','P2','P3','P4'][i % 5],
    status: ['OPEN','INVESTIGATING','CONTAINED','RESOLVED','CLOSED'][i % 5],
    category: ['Model Failure','Bias/Fairness','Privacy Breach','Security','Compliance'][i % 5],
    description: `Incident #${i + 1} — ${(i * 3 + 10)} users affected.`,
    reported_by: PERSONAS[i % PERSONAS.length].email,
    created_at: new Date(Date.now() - i * 43200000).toISOString(),
  }))
  await upsert('incidents', incidents, 'id', 'Incidents (200)')

  // Remediation: 300 tasks with trend/overdue data (N-12 fix)
  const REM_TITLES = [
    'Implement model output filtering for PII',
    'Update EU AI Act conformity documentation',
    'Retrain credit model with debiased dataset',
    'Add SHAP explanations to decision API',
    'Implement differential privacy in training',
    'Conduct red-team evaluation on LLM',
    'Update vendor DPA with OpenAI',
    'Deploy model monitoring alerting rules',
    'Complete ISO 42001 gap closure',
    'Implement carbon tracking for inference',
  ]
  const tasks = Array.from({ length: 300 }, (_, i) => {
    const overdue = i % 5 === 0  // 20% overdue
    const nearDue = i % 5 === 1  // 20% near due
    return {
      id: uuid(),
      org_id: ORG_ID,
      title: `${REM_TITLES[i % REM_TITLES.length]} #${i + 1}`,
      priority: ['CRITICAL','HIGH','HIGH','MEDIUM','LOW'][i % 5],
      status: ['OPEN','IN_PROGRESS','IN_REVIEW','COMPLETED','BLOCKED'][i % 5],
      due_date: overdue
        ? new Date(Date.now() - (i + 1) * 3600000).toISOString()  // past
        : nearDue
        ? new Date(Date.now() + 20 * 3600000).toISOString()         // < 24h
        : new Date(Date.now() + (i * 2 + 5) * 86400000).toISOString(),
      category: ['Technical','Process','Documentation','Training','Vendor'][i % 5],
      description: `Remediation task #${i + 1}`,
      tenant_id: TENANT,
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    }
  })
  await upsert('remediation_items', tasks, 'id', 'Remediation tasks (300)')

  console.log('\n✅ Demo seed complete')
  console.log('Personas created:', PERSONAS.map(p => p.email).join(', '))
  console.log('\nNote: Create auth.users rows via Supabase Dashboard > Authentication > Users')
  console.log('Use password: Demo#2026 for all demo accounts')
}

main().catch(e => { console.error(e); process.exit(1) })
