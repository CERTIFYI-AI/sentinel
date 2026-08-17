// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// demoImportService — the one-button demo dataset for the CURRENT org.
//
// Replaces the retired /import-data page, which upserted raw seed arrays with
// hardcoded ids and business codes straight into tables — the exact pattern
// the platform has spent three waves removing. This importer:
//
//   * writes through the REAL service layer (writes THROW, org scoping is
//     filled DB-side by current_user_org_id() / tenant defaults — never here);
//   * hardcodes NO uuids — every id is captured from the insert that created
//     it and threaded forward, so every interlink RESOLVES by construction;
//   * imports in dependency order (models → vendors → risks → incidents →
//     … → tasks) so a record never references something that does not exist;
//   * is honestly FICTIONAL: names carry a "(Demo)" label, vendors live on
//     .example domains, owners are role labels (never named people), and every
//     row's metadata carries the { demo_seed: true } marker;
//   * never fabricates assurance: attestations stay 'pending', the AIBOM stays
//     'draft' and unscanned, the ESG report stays 'draft' with no scores and
//     no approver, SLA statuses are DERIVED by the DB view from a recorded
//     measurement, and carbon/energy figures are 'estimated' and cite a real
//     emission_factors row — if the catalog is empty the step is SKIPPED with
//     an explicit message rather than inserting uncited estimates;
//   * stops at the first failure and reports which step failed and why —
//     partial success is never presented as full success.
//
// removeDemoData() deletes ONLY rows carrying the { demo_seed: true } marker,
// in reverse dependency order. Both directions write a settings/demo_import
// audit entry via logAction (EU AI Act Art. 12).

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

import { upsertModel } from './modelService'
import { createVendor } from './vendorService'
import { upsertRisk } from './riskService'
import { upsertIncident } from './incidentService'
import { fetchAllControls } from './controlService'
import { createVendorAssessment } from './vendorAssessmentService'
import { createVendorSla, recordSlaMeasurement } from './vendorSlaService'
import { uploadVendorDocument, updateVendorDocument, fetchVendorDocuments, deleteVendorDocument } from './vendorDocumentService'
import { createAibomRecord, createAibomComponent } from './aibomService'
import { createAttestation } from './attestationService'
import { createProvenanceNode, createProvenanceEdge } from './provenanceService'
import { fetchEmissionFactors, type EmissionFactor } from './emissionFactorService'
import { upsertCarbonRecord } from './carbonRecordsService'
import { upsertEnergyMetric } from './energyService'
import { upsertEsgReport } from './esgService'
import { upsertTask } from './taskService'

/** The marker every demo row carries in its jsonb metadata column. */
export const DEMO_MARKER = { demo_seed: true } as const

const DEMO_META = {
  demo_seed: true,
  demo_note: 'Fictional demo record created by the Settings demo import. Safe to remove.',
}

// ── Progress reporting ──────────────────────────────────────────────────────

export type DemoStepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'failed'

export interface DemoImportStep {
  key: string
  label: string
  status: DemoStepStatus
  /** Human-readable outcome ("3 models", "skipped — no emission factors"). */
  detail?: string
}

export type DemoProgress = (steps: DemoImportStep[]) => void

export const IMPORT_STEPS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'models', label: 'AI models' },
  { key: 'vendors', label: 'Vendors (linked to models)' },
  { key: 'risks', label: 'Risks (linked to models & vendors)' },
  { key: 'incidents', label: 'Incidents (linked to vendor & risk)' },
  { key: 'control-links', label: 'Control links on risks' },
  { key: 'vendor-assessments', label: 'Vendor assessments' },
  { key: 'vendor-slas', label: 'Vendor SLAs (with real measurement)' },
  { key: 'vendor-documents', label: 'Vendor document upload' },
  { key: 'aibom', label: 'AIBOM record & components' },
  { key: 'attestations', label: 'Supply-chain attestations' },
  { key: 'provenance', label: 'Provenance graph' },
  { key: 'carbon-energy', label: 'Carbon & energy (cited estimates)' },
  { key: 'esg-report', label: 'ESG report draft' },
  { key: 'tasks', label: 'Governance tasks' },
]

export const REMOVE_STEPS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'tasks', label: 'Governance tasks' },
  { key: 'esg-report', label: 'ESG report draft' },
  { key: 'carbon-energy', label: 'Carbon & energy records' },
  { key: 'provenance', label: 'Provenance graph' },
  { key: 'attestations', label: 'Supply-chain attestations' },
  { key: 'aibom', label: 'AIBOM record & components' },
  { key: 'vendor-documents', label: 'Vendor documents (incl. stored files)' },
  { key: 'vendor-slas', label: 'Vendor SLAs' },
  { key: 'vendor-assessments', label: 'Vendor assessments' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'risks', label: 'Risks' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'models', label: 'AI models' },
]

class StepRunner {
  steps: DemoImportStep[]
  private onProgress?: DemoProgress

  constructor(defs: ReadonlyArray<{ key: string; label: string }>, onProgress?: DemoProgress) {
    this.steps = defs.map((d) => ({ ...d, status: 'pending' as DemoStepStatus }))
    this.onProgress = onProgress
    this.emit()
  }

  private emit() {
    this.onProgress?.(this.steps.map((s) => ({ ...s })))
  }

  private set(key: string, patch: Partial<DemoImportStep>) {
    const s = this.steps.find((x) => x.key === key)
    if (s) Object.assign(s, patch)
    this.emit()
  }

  /**
   * Run one step. On failure the step is marked failed with the verbatim
   * error, and a wrapping error naming the step is thrown — the caller stops
   * there and never claims partial success as full.
   */
  async run<T>(key: string, fn: () => Promise<{ result: T; detail?: string; skipped?: boolean }>): Promise<T> {
    const def = this.steps.find((s) => s.key === key)
    this.set(key, { status: 'running' })
    try {
      const { result, detail, skipped } = await fn()
      this.set(key, { status: skipped ? 'skipped' : 'done', detail })
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      this.set(key, { status: 'failed', detail: msg })
      throw new Error(`Import stopped at step "${def?.label ?? key}": ${msg}`)
    }
  }
}

// ── Status / idempotency ────────────────────────────────────────────────────

export interface DemoDataStatus {
  imported: boolean
  /** Demo-marked ai_models rows found for this org. */
  modelCount: number
}

/**
 * Cheap idempotency probe: demo-marked models are the head of the dependency
 * graph, so their presence means the dataset is (at least partially) in place.
 */
export async function fetchDemoDataStatus(): Promise<DemoDataStatus> {
  if (!isSupabaseConfigured() || !supabase) return { imported: false, modelCount: 0 }
  const { count, error } = await supabase
    .from('ai_models')
    .select('id', { count: 'exact', head: true })
    .contains('metadata', DEMO_MARKER)
  if (error) throw new Error(error.message)
  return { imported: (count ?? 0) > 0, modelCount: count ?? 0 }
}

// ── Import ──────────────────────────────────────────────────────────────────

const iso = (daysFromNow: number) => {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}
const dateOnly = (daysFromNow: number) => iso(daysFromNow).slice(0, 10)

/**
 * Seed the current org with the fictional demo dataset. Throws on the first
 * failing step (the progress callback shows exactly where and why), and throws
 * up front when demo data is already present — never double-imports.
 */
export async function importDemoData(onProgress?: DemoProgress): Promise<DemoImportStep[]> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot import demo data.')
  }
  const status = await fetchDemoDataStatus()
  if (status.imported) {
    throw new Error('Demo data is already imported for this organization. Remove it first to re-import.')
  }

  const runner = new StepRunner(IMPORT_STEPS, onProgress)
  const counts: Record<string, number> = {}

  try {
    // 1. Models — the head of the id-space. Ids are captured, never invented.
    const [mLoan, mSupport, mChurn] = await runner.run('models', async () => {
      const loan = await upsertModel({
        name: 'Loan Triage Assistant (Demo)',
        slug: 'demo-loan-triage-assistant',
        description: 'Fictional demo model: LLM-assisted triage of consumer loan applications. All attributes are illustrative, not measured.',
        model_type: 'llm',
        provider: 'Northwind AI',
        version: 'v1.4.0',
        lifecycle_stage: 'production',
        risk_tier: 'high',
        risk_score: 62,
        trust_score: 78,
        use_case: 'Consumer lending triage (demo)',
        business_owner: 'Credit Operations Lead (demo role)',
        technical_owner: 'ML Platform Engineer (demo role)',
        is_regulated: true,
        tags: ['demo'],
        metadata: { ...DEMO_META },
      })
      const support = await upsertModel({
        name: 'Support Reply Drafter (Demo)',
        slug: 'demo-support-reply-drafter',
        description: 'Fictional demo model: drafts customer-support replies for agent review. All attributes are illustrative, not measured.',
        model_type: 'llm',
        provider: 'Meridian Labs',
        version: 'v0.9.2',
        lifecycle_stage: 'staging',
        risk_tier: 'medium',
        risk_score: 34,
        trust_score: 84,
        use_case: 'Agent-assist reply drafting (demo)',
        business_owner: 'Customer Care Lead (demo role)',
        technical_owner: 'Applied AI Engineer (demo role)',
        is_regulated: false,
        tags: ['demo'],
        metadata: { ...DEMO_META },
      })
      const churn = await upsertModel({
        name: 'Churn Signal Ranker (Demo)',
        slug: 'demo-churn-signal-ranker',
        description: 'Fictional demo model: ranks accounts by churn likelihood, hosted on the Cirrus ML Platform. All attributes are illustrative, not measured.',
        model_type: 'classification',
        provider: 'Internal',
        version: 'v2.1.0',
        lifecycle_stage: 'production',
        risk_tier: 'medium',
        risk_score: 28,
        trust_score: 81,
        use_case: 'Customer retention targeting (demo)',
        business_owner: 'Growth Analytics Lead (demo role)',
        technical_owner: 'Data Science Engineer (demo role)',
        is_regulated: false,
        tags: ['demo'],
        metadata: { ...DEMO_META },
      })
      counts.models = 3
      return { result: [loan, support, churn], detail: '3 models' }
    })

    // 2. Vendors — linked_models carries the captured model uuids.
    const [vNorthwind, vMeridian, vCirrus, vIronvale] = await runner.run('vendors', async () => {
      const northwind = await createVendor({
        name: 'Northwind AI (Demo)',
        category: 'Foundation Model',
        description: 'Fictional demo vendor: hosted LLM APIs consumed by the Loan Triage Assistant (Demo).',
        status: 'approved',
        website: 'https://northwind-ai.example',
        contactEmail: 'enterprise@northwind-ai.example',
        riskTierLabel: 'high',
        criticality: 'critical',
        dpaStatus: 'signed',
        dataClassification: 'confidential',
        dataRegions: ['US', 'EU'],
        aiUse: 'model_provider',
        services: 'Hosted LLM inference APIs (fictional)',
        businessOwner: 'AI Platform Owner (demo role)',
        vendorManager: 'Vendor Risk Manager (demo role)',
        linkedModels: [mLoan.id],
        metadata: { ...DEMO_META },
      })
      const meridian = await createVendor({
        name: 'Meridian Labs (Demo)',
        category: 'Foundation Model',
        description: 'Fictional demo vendor: base model behind the Support Reply Drafter (Demo).',
        status: 'approved',
        website: 'https://meridian-labs.example',
        contactEmail: 'sales@meridian-labs.example',
        riskTierLabel: 'medium',
        criticality: 'high',
        dpaStatus: 'signed',
        dataClassification: 'confidential',
        dataRegions: ['US'],
        aiUse: 'model_provider',
        services: 'Foundation model licensing (fictional)',
        businessOwner: 'AI Platform Owner (demo role)',
        vendorManager: 'Vendor Risk Manager (demo role)',
        linkedModels: [mSupport.id],
        metadata: { ...DEMO_META },
      })
      const cirrus = await createVendor({
        name: 'Cirrus ML Platform (Demo)',
        category: 'Infrastructure',
        description: 'Fictional demo vendor: ML hosting platform running the Loan Triage Assistant (Demo) and Churn Signal Ranker (Demo).',
        status: 'approved',
        website: 'https://cirrus-ml.example',
        contactEmail: 'support@cirrus-ml.example',
        riskTierLabel: 'medium',
        criticality: 'critical',
        dpaStatus: 'signed',
        dataClassification: 'regulated',
        dataRegions: ['US', 'EU'],
        aiUse: 'ai_feature',
        services: 'Model hosting and inference infrastructure (fictional)',
        businessOwner: 'Infrastructure Lead (demo role)',
        vendorManager: 'Vendor Risk Manager (demo role)',
        linkedModels: [mLoan.id, mChurn.id],
        metadata: { ...DEMO_META },
      })
      const ironvale = await createVendor({
        name: 'Ironvale Analytics (Demo)',
        category: 'Analytics Platform',
        description: 'Fictional demo vendor: analytics platform under enhanced due diligence — no models linked yet.',
        status: 'in_review',
        website: 'https://ironvale.example',
        contactEmail: 'sales@ironvale.example',
        riskTierLabel: 'high',
        criticality: 'high',
        dpaStatus: 'pending',
        dataClassification: 'regulated',
        dataRegions: ['US', 'EU', 'UK'],
        aiUse: 'high_risk_dependency',
        services: 'Enterprise analytics (fictional)',
        businessOwner: 'Data Office Lead (demo role)',
        vendorManager: 'Vendor Risk Manager (demo role)',
        linkedModels: [],
        metadata: { ...DEMO_META },
      })
      counts.vendors = 4
      return { result: [northwind, meridian, cirrus, ironvale], detail: '4 vendors' }
    })

    // 3. Risks — linked to models and vendors by captured uuid.
    const [rConcentration, rDrift] = await runner.run('risks', async () => {
      const concentration = await upsertRisk({
        title: 'Concentration risk on Northwind AI (Demo)',
        description: 'Fictional demo risk: the lending workflow depends on a single hosted-LLM vendor with no qualified fallback.',
        category: 'Third-Party',
        likelihood: 3,
        impact: 4,
        status: 'open',
        treatment: 'mitigate',
        owner: 'Vendor Risk Manager (demo role)',
        mitigation: 'Qualify Meridian Labs (Demo) as fallback provider; abstract the LLM interface layer. (Fictional demo plan.)',
        frameworks: ['EU AI Act', 'ISO 42001'],
        linked_model_ids: [mLoan.id],
        linked_vendor_ids: [vNorthwind.id],
        metadata: { ...DEMO_META },
      })
      const drift = await upsertRisk({
        title: 'Feature drift in Churn Signal Ranker (Demo)',
        description: 'Fictional demo risk: upstream schema changes can silently shift ranking behaviour between retrains.',
        category: 'Operational',
        likelihood: 3,
        impact: 3,
        status: 'open',
        treatment: 'mitigate',
        owner: 'Data Science Engineer (demo role)',
        mitigation: 'Add drift monitors on the top features and a retrain gate. (Fictional demo plan.)',
        frameworks: ['ISO 42001'],
        linked_model_ids: [mChurn.id],
        metadata: { ...DEMO_META },
      })
      counts.risks = 2
      return { result: [concentration, drift], detail: '2 risks' }
    })

    // 4. Incident — names the vendor and the risk; the risk is then linked
    //    back so the interlink resolves in BOTH directions.
    const incident = await runner.run('incidents', async () => {
      const saved = await upsertIncident({
        title: 'Northwind API latency degradation (Demo)',
        description: 'Fictional demo incident: elevated p95 latency on the hosted LLM API slowed loan triage for ~2 hours. Resolved by the vendor.',
        severity: 'medium',
        status: 'resolved',
        category: 'Availability',
        incident_type: 'performance_degradation',
        source: 'demo-import',
        model_id: mLoan.id,
        detected_at: iso(-10),
        resolved_at: iso(-10),
        reporter: 'Platform On-call (demo role)',
        assignee: 'Incident Manager (demo role)',
        regulatory_reportable: false,
        metadata: { ...DEMO_META },
        // Interlink columns from 20260824000001 (vendor hub) / 20260819000001.
        vendor_id: vNorthwind.id,
        linked_risk_ids: [rConcentration.id],
      })
      // Back-link: the risk now reaches its incident too. The full record is
      // re-sent (not just the patch) because risks.title is NOT NULL and the
      // upsert's insert tuple is constraint-checked before conflict resolution.
      await upsertRisk({ ...rConcentration, linked_incident_ids: [saved.id] })
      counts.incidents = 1
      return { result: saved, detail: '1 incident, back-linked to its risk' }
    })
    void incident

    // 5. Control links — link the demo risk to EXISTING org controls (no demo
    //    controls are invented). Skipped honestly when the org has none.
    await runner.run('control-links', async () => {
      const controls = await fetchAllControls()
      const targets = controls.filter((c) => c.id).slice(0, 2)
      if (targets.length === 0) {
        return { result: null, skipped: true, detail: 'skipped — this org has no controls to link' }
      }
      await upsertRisk({
        ...rConcentration,
        linked_control_ids: targets.map((c) => c.id!),
      })
      return { result: null, detail: `risk linked to ${targets.length} existing control${targets.length > 1 ? 's' : ''}` }
    })

    // 6. Vendor assessments — in-flight statuses only; an approval needs a
    //    real named approver, which a demo import must not fabricate.
    await runner.run('vendor-assessments', async () => {
      await createVendorAssessment({
        assessmentRef: 'VA-DEMO-001',
        vendorId: vNorthwind.id,
        assessmentType: 'periodic',
        framework: 'SIG Lite',
        scope: 'Hosted LLM API service (fictional demo scope)',
        status: 'under_review',
        owner: 'Vendor Risk Analyst (demo role)',
        dueAt: iso(30),
        submittedAt: iso(-3),
        notes: 'Fictional demo assessment awaiting review — no decision recorded.',
        evidenceIds: [],
        findingsCritical: 0, findingsHigh: 1, findingsMedium: 2, findingsLow: 3,
        metadata: { ...DEMO_META },
      })
      await createVendorAssessment({
        assessmentRef: 'VA-DEMO-002',
        vendorId: vIronvale.id,
        assessmentType: 'initial',
        framework: 'CAIQ',
        scope: 'Analytics platform onboarding (fictional demo scope)',
        status: 'in_progress',
        owner: 'Vendor Risk Analyst (demo role)',
        dueAt: iso(45),
        notes: 'Fictional demo assessment in progress.',
        evidenceIds: [],
        findingsCritical: 0, findingsHigh: 0, findingsMedium: 0, findingsLow: 0,
        metadata: { ...DEMO_META },
      })
      counts.vendorAssessments = 2
      return { result: null, detail: '2 assessments (in-flight, no fabricated approvals)' }
    })

    // 7. Vendor SLAs — status is never authored: a measurement is recorded and
    //    the vendor_sla_status view derives health from the numbers.
    await runner.run('vendor-slas', async () => {
      const uptime = await createVendorSla({
        slaRef: 'SLA-DEMO-001',
        vendorId: vNorthwind.id,
        metric: 'uptime',
        unit: 'percent',
        targetValue: 99.9,
        warningValue: 99.5,
        breachValue: 99.0,
        higherIsBetter: true,
        measurementWindow: 'monthly',
        owner: 'Vendor Risk Manager (demo role)',
        notes: 'Fictional demo SLA. The recorded measurement is illustrative.',
        linkedIncidentIds: [],
        consecutiveBreaches: 0,
        metadata: { ...DEMO_META },
      })
      await recordSlaMeasurement(uptime.id, 99.72)
      const latency = await createVendorSla({
        slaRef: 'SLA-DEMO-002',
        vendorId: vCirrus.id,
        metric: 'response_time',
        unit: 'hours',
        targetValue: 4,
        warningValue: 8,
        breachValue: 12,
        higherIsBetter: false,
        measurementWindow: 'monthly',
        owner: 'Infrastructure Lead (demo role)',
        notes: 'Fictional demo SLA. The recorded measurement is illustrative.',
        linkedIncidentIds: [],
        consecutiveBreaches: 0,
        metadata: { ...DEMO_META },
      })
      await recordSlaMeasurement(latency.id, 2.4)
      counts.vendorSlas = 2
      return { result: null, detail: '2 SLAs, each with a recorded measurement (status derived by the DB view)' }
    })

    // 8. Vendor document — a REAL upload of a clearly-fictional text file, so
    //    the storage path, size and sha-256 digest are all genuine.
    await runner.run('vendor-documents', async () => {
      const body = [
        'FICTIONAL DEMO DOCUMENT — created by the Sentinel demo import.',
        '',
        'This file stands in for a vendor DPA summary for "Northwind AI (Demo)",',
        'a fictional vendor on the .example domain. It contains no real data and',
        'may be deleted at any time via Settings → Demo data → Remove.',
      ].join('\n')
      const file = new File([body], 'northwind-dpa-summary-demo.txt', { type: 'text/plain' })
      const doc = await uploadVendorDocument({
        file,
        vendorId: vNorthwind.id,
        docType: 'DPA',
        title: 'DPA summary (fictional demo document)',
        validFrom: dateOnly(-30),
        expiresAt: dateOnly(180),
        confidentiality: 'internal',
      })
      await updateVendorDocument(doc.id, { metadata: { ...DEMO_META } })
      counts.vendorDocuments = 1
      return { result: doc, detail: '1 document uploaded (real file, real digest, fictional content)' }
    })

    // 9. AIBOM — a DRAFT record with components. Never scanned, never
    //    verified, no fabricated CVEs or signatures.
    await runner.run('aibom', async () => {
      const record = await createAibomRecord({
        aibomRef: 'AIBOM-DEMO-001',
        modelId: mSupport.id,
        modelVersion: 'v0.9.2',
        vendorId: vMeridian.id,
        format: 'CycloneDX',
        specVersion: '1.5',
        status: 'draft',
        notes: 'Fictional demo AIBOM. Draft, unscanned and unverified — no assurance is asserted.',
        metadata: { ...DEMO_META },
      })
      await createAibomComponent({
        aibomId: record.id,
        componentType: 'model',
        name: 'meridian-base-8b (demo)',
        version: '2026.1',
        supplier: 'Meridian Labs (Demo)',
        vendorId: vMeridian.id,
        isDirect: true,
        metadata: { ...DEMO_META },
      })
      await createAibomComponent({
        aibomId: record.id,
        componentType: 'library',
        name: 'torch',
        version: '2.3.1',
        purl: 'pkg:pypi/torch@2.3.1',
        licenseSpdx: 'BSD-3-Clause',
        isDirect: true,
        metadata: { ...DEMO_META },
      })
      await createAibomComponent({
        aibomId: record.id,
        componentType: 'dataset',
        name: 'Synthetic support transcripts (demo)',
        version: '2026-06',
        isDirect: true,
        metadata: { ...DEMO_META },
      })
      counts.aibomRecords = 1
      counts.aibomComponents = 3
      return { result: record, detail: '1 draft AIBOM with 3 components (unscanned, unverified)' }
    })

    // 10. Attestations — PENDING only. A completed attestation would assert an
    //     assessment that never happened.
    await runner.run('attestations', async () => {
      await createAttestation({
        attestationRef: 'ATT-DEMO-001',
        attestationType: 'bias_audit',
        status: 'pending',
        subjectType: 'model',
        subjectId: mLoan.id,
        modelId: mLoan.id,
        scope: 'Fairness review of lending triage outputs (fictional demo scope)',
        attestorOrg: 'Ironvale Analytics (Demo)',
        attestorIsIndependent: true,
        validUntil: dateOnly(365),
        frameworkControlIds: [],
        evidenceIds: [],
        metadata: { ...DEMO_META },
      })
      await createAttestation({
        attestationRef: 'ATT-DEMO-002',
        attestationType: 'security_review',
        status: 'pending',
        subjectType: 'vendor',
        subjectId: vNorthwind.id,
        vendorId: vNorthwind.id,
        scope: 'Hosted API security posture (fictional demo scope)',
        attestorOrg: 'Ironvale Analytics (Demo)',
        attestorIsIndependent: true,
        validUntil: dateOnly(365),
        frameworkControlIds: [],
        evidenceIds: [],
        metadata: { ...DEMO_META },
      })
      counts.attestations = 2
      return { result: null, detail: '2 pending attestations (no fabricated findings)' }
    })

    // 11. Provenance — a small DAG on the one id-space. Verification stays at
    //     the DB default 'unverified'.
    await runner.run('provenance', async () => {
      const nVendor = await createProvenanceNode({
        nodeType: 'vendor', label: 'Northwind AI (Demo)', vendorId: vNorthwind.id, metadata: { ...DEMO_META },
      })
      const nDataset = await createProvenanceNode({
        nodeType: 'dataset', label: 'Synthetic loan applications (demo)', version: '2026-05', metadata: { ...DEMO_META },
      })
      const nPipeline = await createProvenanceNode({
        nodeType: 'pipeline', label: 'Loan triage fine-tune pipeline (demo)', metadata: { ...DEMO_META },
      })
      const nModel = await createProvenanceNode({
        nodeType: 'model', label: 'Loan Triage Assistant (Demo)', modelId: mLoan.id, version: 'v1.4.0', metadata: { ...DEMO_META },
      })
      await createProvenanceEdge({ sourceNodeId: nVendor.id, targetNodeId: nPipeline.id, edgeType: 'feeds', metadata: { ...DEMO_META } })
      await createProvenanceEdge({ sourceNodeId: nDataset.id, targetNodeId: nPipeline.id, edgeType: 'feeds', metadata: { ...DEMO_META } })
      await createProvenanceEdge({ sourceNodeId: nPipeline.id, targetNodeId: nModel.id, edgeType: 'produces', metadata: { ...DEMO_META } })
      counts.provenanceNodes = 4
      counts.provenanceEdges = 3
      return { result: null, detail: '4 nodes, 3 edges' }
    })

    // 12. Carbon & energy — 'estimated' figures citing a REAL emission factor
    //     resolved from the catalog by factor_ref. If no grid factor exists,
    //     the step is skipped: an uncited estimate must never be inserted.
    const { carbonId, energyId } = await runner.run('carbon-energy', async () => {
      const factors: EmissionFactor[] = await fetchEmissionFactors()
      const grid = (ref: string) => factors.find((f) => f.factorRef === ref && f.factorUnit === 'kgCO2e/kWh')
      const usFactor = grid('EF-GRID-US') ?? factors.find((f) => f.factorUnit === 'kgCO2e/kWh')
      const euFactor = grid('EF-GRID-EU') ?? usFactor
      if (!usFactor) {
        return {
          result: { carbonId: null as string | null, energyId: null as string | null },
          skipped: true,
          detail: 'skipped — emission factor catalog is empty, so no citable estimate can be recorded',
        }
      }
      const carbonKwh = 1840
      const carbon = await upsertCarbonRecord({
        modelId: mChurn.id,
        period: '2026-Q2',
        periodStart: '2026-04-01',
        periodEnd: '2026-06-30',
        energyKwh: carbonKwh,
        totalEmissions: Number(((carbonKwh * usFactor.factorValue) / 1000).toFixed(3)), // tCO2e via cited factor
        measurementMethod: 'estimated',
        emissionFactorId: usFactor.id,
        ghgScope: 'scope_2_location',
        gpuHours: 610,
        region: usFactor.region ?? 'US',
        computeProvider: 'Cirrus ML Platform (Demo)',
        verified: false,
        notes: 'Fictional demo estimate. Derived from the cited grid emission factor — not a measurement.',
        metadata: { ...DEMO_META },
      })
      const energyKwh = 920
      const energyFactor = euFactor ?? usFactor
      const energy = await upsertEnergyMetric({
        modelId: mSupport.id,
        modelName: null,
        period: '2026-07',
        kwh: energyKwh,
        gpuHours: 310,
        measurementSource: 'Estimated',
        emissionFactorId: energyFactor.id,
        gridIntensityGPerKwh: energyFactor.gridIntensityGPerKwh,
        co2eKg: Number((energyKwh * energyFactor.factorValue).toFixed(1)),
        region: energyFactor.region ?? null,
        computeProvider: 'Meridian Labs (Demo)',
        recordedAt: dateOnly(0),
        notes: 'Fictional demo estimate. CO2e derived from the cited grid emission factor.',
        metadata: { ...DEMO_META },
      })
      counts.carbonRecords = 1
      counts.energyMetrics = 1
      return {
        result: { carbonId: carbon.id as string | null, energyId: energy.id as string | null },
        detail: `1 carbon record + 1 energy reading, both 'estimated' citing ${usFactor.factorRef ?? usFactor.name}`,
      }
    })

    // 13. ESG report — DRAFT with no scores and no approver: a published
    //     disclosure needs a real human approval path.
    await runner.run('esg-report', async () => {
      await upsertEsgReport({
        title: 'AI Sustainability Disclosure (Demo draft)',
        period: '2026-H1',
        periodStart: '2026-01-01',
        periodEnd: '2026-06-30',
        framework: 'GRI',
        status: 'draft',
        author: 'Sustainability Lead (demo role)',
        highlights: [],
        materialityTopics: ['ai_energy_use'],
        carbonRecordIds: carbonId ? [carbonId] : [],
        energyMetricIds: energyId ? [energyId] : [],
        modelIds: [mSupport.id, mChurn.id],
        methodology: 'Fictional demo draft. Any derived figures cite emission_factors rows and are labelled estimates. No scores are asserted and no approver is recorded.',
        metadata: { ...DEMO_META },
      })
      counts.esgReports = 1
      return {
        result: null,
        detail: carbonId
          ? '1 draft citing the demo carbon & energy records'
          : '1 draft (no carbon/energy evidence — that step was skipped)',
      }
    })

    // 14. Tasks — the work queue points back into the demo entities.
    await runner.run('tasks', async () => {
      await upsertTask({
        title: 'Review Northwind AI (Demo) DPA renewal',
        description: 'Fictional demo task: confirm the demo vendor DPA summary before its illustrative expiry date.',
        status: 'todo',
        priority: 'high',
        assignee: 'Vendor Risk Analyst (demo role)',
        dueDate: iso(14),
        linkedEntityType: 'vendor',
        linkedEntityId: vNorthwind.id,
        source: 'Northwind AI (Demo)',
        sourceType: 'vendor',
        sourceLink: `/vendors/${vNorthwind.id}`,
        metadata: { ...DEMO_META },
      })
      await upsertTask({
        title: 'Stand up drift monitors for Churn Signal Ranker (Demo)',
        description: 'Fictional demo task: implement the mitigation plan on the demo drift risk.',
        status: 'in_progress',
        priority: 'medium',
        assignee: 'Data Science Engineer (demo role)',
        dueDate: iso(21),
        linkedEntityType: 'risk',
        linkedEntityId: rDrift.id,
        source: 'Feature drift in Churn Signal Ranker (Demo)',
        sourceType: 'risk',
        sourceLink: `/risks?open=${rDrift.id}`,
        metadata: { ...DEMO_META },
      })
      counts.tasks = 2
      return { result: null, detail: '2 tasks linked to the demo vendor and risk' }
    })
  } catch (e) {
    // Record the failed attempt so the trail shows what happened (Art. 12);
    // the individual successful writes above each logged themselves already.
    void logAction({
      module: 'settings',
      entityType: 'demo_import',
      entityName: 'Demo dataset',
      action: 'import',
      newValues: { outcome: 'failed', error: e instanceof Error ? e.message : String(e), counts },
    })
    throw e
  }

  void logAction({
    module: 'settings',
    entityType: 'demo_import',
    entityName: 'Demo dataset',
    action: 'import',
    newValues: { outcome: 'success', counts },
  })
  return runner.steps
}

// ── Removal ─────────────────────────────────────────────────────────────────

/** Delete rows carrying the marker from one table; returns the count. */
async function deleteMarked(table: string): Promise<number> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from(table)
    .delete()
    .contains('metadata', DEMO_MARKER)
    .select('id')
  if (error) throw new Error(`${table}: ${error.message}`)
  return (data ?? []).length
}

/**
 * Remove ONLY rows carrying the { demo_seed: true } marker, children before
 * parents (reverse dependency order). RLS keeps this org-scoped. Stops and
 * reports on the first failure.
 */
export async function removeDemoData(onProgress?: DemoProgress): Promise<DemoImportStep[]> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot remove demo data.')
  }
  const runner = new StepRunner(REMOVE_STEPS, onProgress)
  const deleted: Record<string, number> = {}

  const simple = (key: string, tables: string[]) =>
    runner.run(key, async () => {
      let n = 0
      for (const t of tables) n += await deleteMarked(t)
      deleted[key] = n
      return { result: n, detail: `${n} row${n === 1 ? '' : 's'} removed` }
    })

  try {
    await simple('tasks', ['tasks'])
    await simple('esg-report', ['esg_reports'])
    await simple('carbon-energy', ['energy_metrics', 'carbon_records'])
    await simple('provenance', ['provenance_edges', 'provenance_nodes'])
    await simple('attestations', ['supply_chain_attestations'])
    await simple('aibom', ['aibom_components', 'aibom_records'])

    // Documents go through the service so the stored object is removed too.
    await runner.run('vendor-documents', async () => {
      const docs = await fetchVendorDocuments()
      const marked = docs.filter((d) => (d.metadata as Record<string, unknown> | undefined)?.demo_seed === true)
      for (const d of marked) await deleteVendorDocument(d.id)
      deleted['vendor-documents'] = marked.length
      return { result: marked.length, detail: `${marked.length} document${marked.length === 1 ? '' : 's'} removed (incl. stored files)` }
    })

    await simple('vendor-slas', ['vendor_slas'])
    await simple('vendor-assessments', ['vendor_assessments'])
    await simple('incidents', ['incidents'])
    await simple('risks', ['risks'])
    await simple('vendors', ['vendors'])
    await simple('models', ['ai_models'])
  } catch (e) {
    void logAction({
      module: 'settings',
      entityType: 'demo_import',
      entityName: 'Demo dataset',
      action: 'remove',
      newValues: { outcome: 'failed', error: e instanceof Error ? e.message : String(e), deleted },
    })
    throw e
  }

  void logAction({
    module: 'settings',
    entityType: 'demo_import',
    entityName: 'Demo dataset',
    action: 'remove',
    oldValues: { deleted },
    newValues: { outcome: 'success' },
  })
  return runner.steps
}
