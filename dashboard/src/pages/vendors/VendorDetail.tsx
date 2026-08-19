// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// VendorDetail — /vendors/:id, keyed on vendors.id (uuid).
//
// Rewritten in the 2026-08 TPRM rebuild. The previous page resolved `:id`
// against the seed array ('V-001'…'V-012'), so it rendered "Vendor not found"
// for 100% of live records. Everything below reads the real tables.
//
// Deleted rather than restyled — each of these was presented to a user as a
// fact about their own vendor when it was a literal in the source file:
//   * Contract terms. `contractExpiry '2026-12-31'`, "Liability Cap: 12 months
//     contract value", "Audit Rights: Annual — GDPR Art. 28", "SLA Uptime:
//     99.9% monthly" — identical for every vendor. Contract facts now come
//     from the vendor's own columns and render '—' when unset.
//   * Sub-processors. AWS / Datadog / Snowflake / Stripe with jurisdictions and
//     "SCCs in place" for EVERY vendor — that is GDPR Art. 28(2)/(4) content.
//     The Trust Center's real subprocessor list is read instead.
//   * The "immutable audit trail". `buildActivity()` did `void vendorId` and
//     returned ten identical events with named actors, offered for export. The
//     Activity tab now reads the real append-only `audit_log`, filtered to
//     this vendor's id, and shows an honest empty state when it is empty.
//   * Thirteen fake-success handlers and an "Upload Document" button with no
//     file input, which injected a synthetic row with status "Valid".

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Buildings, ClipboardText, Gauge, FileArrowUp, ShieldCheck,
  Cube, Globe, ClockCounterClockwise, Warning, Certificate, PencilSimple,
} from '@phosphor-icons/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/PageSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVendor } from '@/hooks/useVendorsData'
import { useVendorAssessments } from '@/hooks/useVendorAssessments'
import { useVendorSlas } from '@/hooks/useVendorSlas'
import { useVendorDocuments } from '@/hooks/useVendorDocuments'
import { useVendorQuestionnaires } from '@/hooks/useVendorQuestionnaires'
import { useAuditLogData } from '@/hooks/useAuditLogData'
import { useModelsData } from '@/hooks/useModelsData'
import { useAiApps, useTrustCenter } from '@/hooks/useGovernAddons'
import { useTiaRecords } from '@/hooks/useComplianceRecords'
import { useVendorBacklinks } from '@/hooks/useVendorBacklinks'
import type { BacklinkItem, BacklinkSource } from '@/hooks/useModelBacklinks'
import { VendorEditSheet } from './VendorEditSheet'
import {
  Pill, LinkPill, Fact, SectionTitle, tierTone, tierLabel, dpaTone, slaTone,
  assessmentTone, docTone, dash, fmtDate, fmtMoney, daysUntil, tone, type Tone,
} from './vendorUi'

/** Severity/derived-status pill tone for backlink rows. */
function backlinkTone(v: string | null): Tone {
  const s = (v ?? '').toLowerCase()
  if (['critical', 'high', 'revoked', 'expired', 'breached', 'failed'].includes(s)) return tone('err')
  if (['medium', 'expiring_soon', 'at_risk'].includes(s)) return tone('warn')
  if (['low', 'valid', 'verified', 'resolved', 'closed'].includes(s)) return tone('ok')
  return tone('neutral')
}

/**
 * One inbound-reference panel on the Linked tab. Counts and rows come straight
 * from the tenant-scoped tables via useVendorBacklinks; a failed source shows
 * an honest "unavailable" note, an empty source an honest "no records" — a
 * count is never invented and a raw uuid is never rendered.
 */
function BacklinkPanel({ title, source, loading, viewAllTo, viewAllLabel, itemTo }: {
  title: string
  source: BacklinkSource | undefined
  loading: boolean
  viewAllTo: string
  viewAllLabel: string
  /** Per-record deep link; omitted when the target page cannot open a record. */
  itemTo?: (item: BacklinkItem) => string
}) {
  const navigate = useNavigate()
  const count = source?.count ?? null
  const items = source?.items ?? []
  return (
    <div>
      <SectionTitle
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate(viewAllTo)}>
            {viewAllLabel}{count !== null && count > items.length ? ` (${count})` : ''}
          </Button>
        }
      >
        {title}
        {!loading && count !== null && (
          <span className="ml-2 text-xs font-normal" style={{ color: 'hsl(var(--text-4))' }}>{count}</span>
        )}
      </SectionTitle>
      {loading ? (
        <div role="status" aria-label={`Loading ${title}`} className="mt-2 h-10" />
      ) : count === null ? (
        <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
          Unavailable — this source could not be queried.
        </p>
      ) : count === 0 ? (
        <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
          No records reference this vendor.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.ref && (
                    <span className="font-mono text-[11px]" style={{ color: 'hsl(var(--text-4))' }}>{item.ref}</span>
                  )}
                  <span className="truncate text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{item.title}</span>
                  {item.severity && <Pill tone={backlinkTone(item.severity)}>{item.severity}</Pill>}
                  {item.status && <Pill tone={backlinkTone(item.status)}>{item.status.replace(/_/g, ' ')}</Pill>}
                </div>
                {item.note && (
                  <p className="mt-0.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{item.note}</p>
                )}
              </div>
              {itemTo && <LinkPill to={itemTo(item)}>Open</LinkPill>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)

  const { vendor, isLoading, isError, error, refetch } = useVendor(id)
  const assessments = useVendorAssessments(id)
  const slas = useVendorSlas(id)
  const documents = useVendorDocuments(id)
  const questionnaires = useVendorQuestionnaires(id)
  const { models } = useModelsData()
  const aiApps = useAiApps()
  const tias = useTiaRecords()
  const trust = useTrustCenter()
  // The audit trail is append-only and org-scoped; entity_id is the vendor uuid.
  const audit = useAuditLogData(200, { entityId: id })
  // Reverse interlinks — AIBOMs, attestations, provenance nodes, risks,
  // incidents and threats that reference this vendor (Linked tab).
  const { data: backlinks, isLoading: backlinksLoading } = useVendorBacklinks(id)

  const modelNames = useMemo(() => new Map(models.map((m) => [m.id, m.name])), [models])

  const suppliedApps = useMemo(
    () => (aiApps.data ?? []).filter((a) => a.vendorId === id),
    [aiApps.data, id],
  )
  const vendorTias = useMemo(
    () => (tias.data ?? []).filter((t) => t.vendorId === id),
    [tias.data, id],
  )
  const trustSubprocessorIds = trust.data?.doc?.subprocessors?.vendorIds ?? []
  const isPublishedSubprocessor = !!id && trustSubprocessorIds.includes(id)

  if (isLoading) return <PageSkeleton title="Vendor" rows={6} />

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
          <ArrowLeft size={14} /> Back to registry
        </Button>
        <ErrorState title="Could not load this vendor" error={error} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
          <ArrowLeft size={14} /> Back to registry
        </Button>
        <EmptyState
          icon={<Buildings size={32} weight="duotone" />}
          title="Vendor not found"
          description="No vendor with this id exists in your organisation. It may have been deleted, or the link may point at another tenant's record."
          action={<Button size="sm" onClick={() => navigate('/vendors')}>Open the vendor registry</Button>}
        />
      </div>
    )
  }

  const openAssessments = assessments.assessments.filter(
    (a) => !['approved', 'rejected', 'expired'].includes(a.status),
  )
  const breachedSlas = slas.slas.filter((s) => s.derivedStatus === 'breached')
  const unmeasuredSlas = slas.slas.filter((s) => s.derivedStatus === 'unmeasured')
  const reassessDays = daysUntil(vendor.reassessmentDueAt)

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.name || 'Unnamed vendor'}
        subtitle={vendor.services || vendor.description || 'Third-party vendor record'}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Vendors', href: '/vendors' },
          { label: vendor.name || 'Vendor' },
        ]}
        onBack={() => navigate('/vendors')}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={tierTone(vendor.riskTierLabel)}>{tierLabel(vendor.riskTierLabel)} tier</Pill>
            {vendor.criticality && <Pill tone={tierTone(vendor.criticality)}>{vendor.criticality} criticality</Pill>}
            {vendor.dpaStatus && <Pill tone={dpaTone(vendor.dpaStatus)}>DPA {vendor.dpaStatus.replace(/_/g, ' ')}</Pill>}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <PencilSimple size={14} /> Edit profile
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/vendors/${vendor.id}/questionnaire`)}>
              <ClipboardText size={14} /> Questionnaire
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/vendors/assessments?vendor=${vendor.id}`)}>
              Assessments
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/vendors/sla?vendor=${vendor.id}`)}>
              <Gauge size={14} /> SLAs
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/vendor-upload?vendor=${vendor.id}`)}>
              <FileArrowUp size={14} /> Documents
            </Button>
          </div>
        }
      />

      {/* Attention strip — every item here is a real, stored fact. */}
      {(breachedSlas.length > 0 || vendor.dpaStatus === 'not_signed' || (reassessDays !== null && reassessDays < 0)) && (
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3"
          style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}
        >
          <Warning size={16} style={{ color: 'hsl(var(--destructive))' }} />
          {breachedSlas.length > 0 && (
            <span className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>
              {breachedSlas.length} SLA{breachedSlas.length > 1 ? 's' : ''} in breach on the latest measurement
            </span>
          )}
          {vendor.dpaStatus === 'not_signed' && (
            <span className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>No signed DPA on record</span>
          )}
          {reassessDays !== null && reassessDays < 0 && (
            <span className="text-xs" style={{ color: 'hsl(var(--s-er-tx))' }}>
              Reassessment overdue by {Math.abs(reassessDays)} days
            </span>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk &amp; Data</TabsTrigger>
          <TabsTrigger value="contract">Contract</TabsTrigger>
          <TabsTrigger value="assessments">Assessments ({assessments.assessments.length})</TabsTrigger>
          <TabsTrigger value="sla">SLAs ({slas.slas.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.documents.length})</TabsTrigger>
          <TabsTrigger value="linked">Linked</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
            <CardContent className="grid grid-cols-2 gap-5 p-5 md:grid-cols-4">
              <Fact label="Category" value={vendor.category} />
              <Fact label="Status" value={vendor.status?.replace(/_/g, ' ')} />
              <Fact
                label="Website"
                value={vendor.website
                  ? <a href={vendor.website} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline" style={{ color: 'hsl(var(--brand))' }}>{vendor.website}</a>
                  : null}
              />
              <Fact label="Contact" value={vendor.contactEmail} />
              <Fact label="Business owner" value={vendor.businessOwner} />
              <Fact label="Vendor manager" value={vendor.vendorManager} />
              <Fact label="Vendor score" value={dash(vendor.score)} hint="0–100; blank until scored" />
              <Fact label="Last assessed" value={fmtDate(vendor.lastAssessedAt ?? vendor.lastAssessment)} />
              <Fact label="AI use" value={vendor.aiUse} />
              <Fact
                label="Reassessment due"
                value={fmtDate(vendor.reassessmentDueAt)}
                hint={vendor.reassessmentCadenceMonths ? `every ${vendor.reassessmentCadenceMonths} months` : undefined}
              />
              <Fact label="Open assessments" value={openAssessments.length || '—'} />
              <Fact
                label="Trust Center"
                value={trust.isLoading ? '—' : isPublishedSubprocessor ? 'Published as a sub-processor' : 'Not published'}
                hint="From the Trust Center sub-processor list"
              />
            </CardContent>
          </Card>

          {vendor.description && (
            <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <SectionTitle>What this vendor provides</SectionTitle>
                <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{vendor.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Risk & data ─────────────────────────────────────────────────── */}
        <TabsContent value="risk" className="mt-4 space-y-4">
          <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
            <CardContent className="grid grid-cols-2 gap-5 p-5 md:grid-cols-4">
              <Fact label="Inherent risk" value={vendor.inherentRisk} />
              <Fact label="Residual risk" value={vendor.residualRisk} hint="after controls & remediation" />
              <Fact label="Data classification" value={vendor.dataClassification} />
              <Fact label="Data access level" value={vendor.dataAccessLevel} />
              <Fact
                label="Data regions"
                value={vendor.dataRegions.length ? vendor.dataRegions.join(', ') : null}
              />
              <Fact label="Transfer mechanism" value={vendor.transferMechanism} hint="SCC / BCR / adequacy" />
              <Fact label="DPA signed" value={fmtDate(vendor.dpaSignedAt)} />
              <Fact label="DPA expires" value={fmtDate(vendor.dpaExpiresAt)} />
              <Fact
                label="SOC 2"
                value={vendor.soc2Certified === null || vendor.soc2Certified === undefined
                  ? null
                  : vendor.soc2Certified ? 'Certified' : 'Not certified'}
                hint={vendor.soc2ExpiresAt ? `expires ${fmtDate(vendor.soc2ExpiresAt)}` : undefined}
              />
              <Fact
                label="ISO"
                value={vendor.isoCertified === null || vendor.isoCertified === undefined
                  ? null
                  : vendor.isoCertified ? 'Certified' : 'Not certified'}
                hint={vendor.isoExpiresAt ? `expires ${fmtDate(vendor.isoExpiresAt)}` : undefined}
              />
              <Fact label="Last penetration test" value={fmtDate(vendor.lastPentestAt)} />
              <Fact label="Breaches recorded" value={dash(vendor.breachHistoryCount)} />
              <Fact label="Last breach" value={fmtDate(vendor.lastBreachAt)} />
              <Fact label="Sub-processors" value={dash(vendor.subprocessorCount)} hint="count declared by the vendor" />
              <Fact label="Fourth-party exposure" value={vendor.fourthPartyExposure} />
              <Fact
                label="Concentration"
                value={vendor.concentrationRisk === null || vendor.concentrationRisk === undefined
                  ? null
                  : `${Math.round(vendor.concentrationRisk * 100)}%`}
                hint="share of the model estate, computed by VendorRiskAgent"
              />
              <Fact label="Exit plan" value={vendor.exitPlanStatus} />
              <Fact label="Insurance" value={vendor.insuranceCoverage} />
            </CardContent>
          </Card>

          {vendor.lastBreachSummary && (
            <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <SectionTitle>Last breach summary</SectionTitle>
                <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{vendor.lastBreachSummary}</p>
              </CardContent>
            </Card>
          )}
          {vendor.exitPlanNotes && (
            <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-5">
                <SectionTitle>Exit / offboarding plan</SectionTitle>
                <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{vendor.exitPlanNotes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Contract. Real columns only; no default terms. ───────────────── */}
        <TabsContent value="contract" className="mt-4">
          <Card style={{ borderRadius: 0, border: '1px solid hsl(var(--border))' }}>
            <CardContent className="grid grid-cols-2 gap-5 p-5 md:grid-cols-4">
              <Fact label="Contract start" value={fmtDate(vendor.contractStart)} />
              <Fact label="Contract expiry" value={fmtDate(vendor.contractExpiry)} />
              <Fact label="Renewal notice" value={dash(vendor.renewalNoticeDays, ' days')} />
              <Fact label="Annual spend" value={fmtMoney(vendor.annualSpend, vendor.spendCurrency)} />
            </CardContent>
          </Card>
          <p className="mt-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            Liability caps, audit rights and contractual SLA clauses are not stored on the vendor record.
            Contractual SLA thresholds live on the vendor's SLA records, where they are numeric and measurable —
            see the SLAs tab.
          </p>
        </TabsContent>

        {/* ── Assessments ─────────────────────────────────────────────────── */}
        <TabsContent value="assessments" className="mt-4 space-y-3">
          <SectionTitle
            action={
              <Button variant="outline" size="sm" onClick={() => navigate(`/vendors/assessments?vendor=${vendor.id}`)}>
                Open in Assessments
              </Button>
            }
          >
            Assessments
          </SectionTitle>
          {assessments.isError ? (
            <ErrorState title="Could not load assessments" error={assessments.error} subject="vendor assessments" onRetry={() => assessments.refetch()} />
          ) : assessments.isLoading ? (
            <div role="status" aria-label="Loading assessments" className="h-20" />
          ) : assessments.assessments.length === 0 ? (
            <EmptyState
              icon={<ClipboardText size={28} weight="duotone" />}
              title="No assessments for this vendor"
              description="Assessments record the due-diligence decision, its approver and the evidence behind it."
              action={
                <Button size="sm" onClick={() => navigate(`/vendors/assessments?vendor=${vendor.id}`)}>
                  Create an assessment
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {assessments.assessments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill tone={assessmentTone(a.status)}>{a.status.replace(/_/g, ' ')}</Pill>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                        {a.assessmentType ?? 'Assessment'}{a.framework ? ` · ${a.framework}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      Owner {a.owner || '—'} · Approver {a.approver || '—'} · Due {fmtDate(a.dueAt)} · Score {dash(a.score)}
                    </p>
                  </div>
                  <LinkPill to={`/vendors/assessments?vendor=${vendor.id}&open=${a.id}`}>Open</LinkPill>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SLAs ────────────────────────────────────────────────────────── */}
        <TabsContent value="sla" className="mt-4 space-y-3">
          <SectionTitle
            action={
              <Button variant="outline" size="sm" onClick={() => navigate(`/vendors/sla?vendor=${vendor.id}`)}>
                Open in SLAs
              </Button>
            }
          >
            Service levels
          </SectionTitle>
          {slas.isError ? (
            <ErrorState title="Could not load SLAs" error={slas.error} subject="vendor SLAs" onRetry={() => slas.refetch()} />
          ) : slas.slas.length === 0 ? (
            <EmptyState
              icon={<Gauge size={28} weight="duotone" />}
              title="No SLAs recorded"
              description="Record the contractual thresholds as numbers so breach can be evaluated rather than asserted."
              action={<Button size="sm" onClick={() => navigate(`/vendors/sla?vendor=${vendor.id}`)}>Add an SLA</Button>}
            />
          ) : (
            <>
              <div className="space-y-2">
                {slas.slas.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <Pill tone={slaTone(s.derivedStatus)}>{s.derivedStatus.replace(/_/g, ' ')}</Pill>
                        <span className="text-sm font-medium capitalize" style={{ color: 'hsl(var(--text-1))' }}>
                          {s.metric.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        Target {dash(s.targetValue)} {s.unit} · Current {dash(s.currentValue)} {s.currentValue === null ? '' : s.unit}
                        {' · '}Measured {fmtDate(s.lastMeasuredAt)}
                      </p>
                    </div>
                    <LinkPill to={`/vendors/sla?vendor=${vendor.id}&open=${s.id}`}>Open</LinkPill>
                  </div>
                ))}
              </div>
              {unmeasuredSlas.length > 0 && (
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                  {unmeasuredSlas.length} SLA{unmeasuredSlas.length > 1 ? 's have' : ' has'} never been measured and
                  therefore carries no status.
                </p>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Documents ───────────────────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4 space-y-3">
          <SectionTitle
            action={
              <Button variant="outline" size="sm" onClick={() => navigate(`/vendor-upload?vendor=${vendor.id}`)}>
                <FileArrowUp size={14} /> Upload in the portal
              </Button>
            }
          >
            Evidence &amp; certificates
          </SectionTitle>
          {documents.isError ? (
            <ErrorState title="Could not load documents" error={documents.error} subject="vendor documents" onRetry={() => documents.refetch()} />
          ) : documents.documents.length === 0 ? (
            <EmptyState
              icon={<Certificate size={28} weight="duotone" />}
              title="No documents on file"
              description="SOC 2 reports, ISO certificates, DPAs and pentest reports uploaded through the vendor portal appear here."
              action={
                <Button size="sm" onClick={() => navigate(`/vendor-upload?vendor=${vendor.id}`)}>
                  Open the upload portal
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {documents.documents.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Pill tone={docTone(d.status)}>{d.status.replace(/_/g, ' ')}</Pill>
                      <span className="truncate text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                        {d.title || d.fileName || 'Untitled document'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                      {d.docType ?? '—'} · v{d.version} · expires {fmtDate(d.expiresAt)}
                    </p>
                  </div>
                  <LinkPill to={`/vendor-upload?vendor=${vendor.id}&open=${d.id}`}>Open</LinkPill>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Linked governance objects. Real inbound references only. ─────── */}
        <TabsContent value="linked" className="mt-4 space-y-5">
          <div>
            <SectionTitle>AI models supplied by this vendor</SectionTitle>
            {vendor.linkedModels.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                No model is attributed to this vendor.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {vendor.linkedModels.map((mid) => {
                  const name = modelNames.get(mid)
                  return name
                    ? <LinkPill key={mid} to={`/models/inventory/${mid}`}><Cube size={12} /> {name}</LinkPill>
                    : (
                      <span key={mid} className="px-2 py-0.5 text-[11px]" style={{ background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))' }}>
                        Unavailable
                      </span>
                    )
                })}
              </div>
            )}
          </div>

          <div>
            <SectionTitle
              action={<Button variant="ghost" size="sm" onClick={() => navigate(`/ai-apps?vendor=${vendor.id}`)}>Open AI Apps</Button>}
            >
              AI apps supplied by this vendor
            </SectionTitle>
            {aiApps.isError ? (
              <ErrorState title="Could not load AI apps" error={aiApps.error} />
            ) : suppliedApps.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                No governed AI app references this vendor.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {suppliedApps.map((a) => (
                  <LinkPill key={a.id} to={`/ai-apps?open=${a.id}`}>
                    <ShieldCheck size={12} /> {a.name} · {a.approvalStatus.replace(/_/g, ' ')}
                  </LinkPill>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle
              action={<Button variant="ghost" size="sm" onClick={() => navigate('/tia')}>Open TIAs</Button>}
            >
              Transfer impact assessments
            </SectionTitle>
            {tias.isError ? (
              <ErrorState title="Could not load transfer impact assessments" error={tias.error} />
            ) : vendorTias.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                No TIA references this vendor.
                {vendor.transferMechanism
                  ? ` The vendor record declares a ${vendor.transferMechanism} transfer mechanism.`
                  : ''}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {vendorTias.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{t.transferName}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {t.sourceCountry ?? '—'} → {t.destinationCountry ?? '—'} · {t.transferMechanism ?? '—'} · {t.status ?? '—'}
                      </p>
                    </div>
                    <LinkPill to={`/tia?open=${t.id}`}>Open</LinkPill>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle
              action={<Button variant="ghost" size="sm" onClick={() => navigate('/trust-center')}>Open Trust Center</Button>}
            >
              Trust Center sub-processor status
            </SectionTitle>
            {trust.isError ? (
              <ErrorState title="Could not load the Trust Center configuration" error={trust.error} />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--text-2))' }}>
                <Globe size={14} />
                {trust.isLoading
                  ? 'Checking…'
                  : isPublishedSubprocessor
                    ? 'This vendor is published on your Trust Center sub-processor list.'
                    : 'This vendor is not published on your Trust Center sub-processor list.'}
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Sub-processors your vendor engages (fourth parties) are the vendor's own disclosure —
              the register above records only what has actually been declared to you.
            </p>
          </div>

          <div>
            <SectionTitle>Questionnaires</SectionTitle>
            {questionnaires.questionnaires.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                No questionnaire has been submitted for this vendor.{' '}
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  style={{ color: 'hsl(var(--brand))' }}
                  onClick={() => navigate(`/vendors/${vendor.id}/questionnaire`)}
                >
                  Start one
                </button>.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {questionnaires.questionnaires.map((q) => (
                  <div key={q.id} className="flex items-center justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                        {q.template ?? 'Questionnaire'} {q.templateVersion ?? ''}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                        {q.score != null && q.maxScore ? `${Math.round((q.score / q.maxScore) * 100)}%` : '—'}
                        {' · '}respondent {q.respondent || '—'}
                        {' · '}reviewer {q.reviewer || '—'}
                        {' · '}{q.reviewDecision ? q.reviewDecision.replace(/_/g, ' ') : 'awaiting review'}
                      </p>
                    </div>
                    <LinkPill to={`/vendors/${vendor.id}/questionnaire?open=${q.id}`}>Open</LinkPill>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Inbound references — what points at this vendor. ──────────── */}
          <div className="space-y-1 pt-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <SectionTitle>Referenced by</SectionTitle>
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Records elsewhere on the platform that carry this vendor's id — read live from the
              org-scoped tables. A source that cannot be queried says so; nothing is invented.
            </p>
          </div>

          <BacklinkPanel
            title="AI bills of materials"
            source={backlinks?.aibomRecords}
            loading={backlinksLoading}
            viewAllTo={`/aibom?vendor=${vendor.id}`}
            viewAllLabel="Open AIBOM registry"
            itemTo={(i) => `/aibom?open=${i.id}`}
          />
          <BacklinkPanel
            title="Supply-chain attestations"
            source={backlinks?.attestations}
            loading={backlinksLoading}
            viewAllTo={`/supply-chain?vendor=${vendor.id}`}
            viewAllLabel="Open attestations"
            itemTo={(i) => `/supply-chain?open=${i.id}`}
          />
          <BacklinkPanel
            title="Provenance nodes"
            source={backlinks?.provenanceNodes}
            loading={backlinksLoading}
            viewAllTo="/provenance"
            viewAllLabel="Open provenance graph"
            itemTo={(i) => `/provenance?open=${i.id}`}
          />
          <BacklinkPanel
            title="Risk register entries"
            source={backlinks?.risks}
            loading={backlinksLoading}
            viewAllTo="/risks"
            viewAllLabel="Open risk register"
            itemTo={(i) => `/risks?open=${i.id}`}
          />
          <BacklinkPanel
            title="Incidents"
            source={backlinks?.incidents}
            loading={backlinksLoading}
            viewAllTo="/risk/incidents"
            viewAllLabel="Open incident log"
            itemTo={(i) => `/risk/incidents?open=${i.id}`}
          />
          <BacklinkPanel
            title="Security threats"
            source={backlinks?.securityThreats}
            loading={backlinksLoading}
            viewAllTo="/security/threats"
            viewAllLabel="Open threat feed"
          />
        </TabsContent>

        {/* ── Activity: the real append-only audit_log. ────────────────────── */}
        <TabsContent value="activity" className="mt-4 space-y-3">
          <SectionTitle>Activity</SectionTitle>
          <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            Read directly from the org-scoped <code>audit_log</code> table, filtered to this vendor's id.
            Entries are written by the platform when a state change succeeds; the table grants no update or
            delete, so the trail is append-only.
          </p>
          {audit.error ? (
            <ErrorState title="Could not load the audit trail" error={audit.error} />
          ) : audit.isLoading ? (
            <div role="status" aria-label="Loading activity" className="h-20" />
          ) : audit.logs.length === 0 ? (
            <EmptyState
              icon={<ClockCounterClockwise size={28} weight="duotone" />}
              title="No recorded activity for this vendor"
              description="Actions on this record — edits, assessments, SLA measurements, document reviews — will appear here as they happen."
            />
          ) : (
            <div className="space-y-2">
              {audit.logs.map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-4 p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>
                      <span className="font-medium">{l.actorName}</span>{' '}
                      <span style={{ color: 'hsl(var(--text-2))' }}>{l.action.replace(/[._]/g, ' ')}</span>{' '}
                      <span style={{ color: 'hsl(var(--text-4))' }}>{l.entityType}</span>
                    </p>
                    {l.entityName && (
                      <p className="mt-0.5 truncate text-xs" style={{ color: 'hsl(var(--text-4))' }}>{l.entityName}</p>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    {fmtDate(l.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit sheet — the write path for the TPRM field model + linked models. */}
      <VendorEditSheet
        vendor={vendor}
        models={models.map((m) => ({ id: m.id, name: m.name }))}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
