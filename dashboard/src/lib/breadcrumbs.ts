// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Unified breadcrumb system — single source of truth for every page.
//
// Three render surfaces consume this: <Breadcrumbs/> (standalone), PageHeader
// (route-aware default), and useBreadcrumbs() for detail pages. Canonical
// labels are aligned to the sidebar's section → module wording so the trail,
// the nav, and the page title always agree.

import { useLocation } from 'react-router-dom'

export interface Crumb {
  label: string
  href?: string
}

// Canonical module trails (section + module), keyed by the longest-matching
// route prefix. Section crumbs are non-navigable (no href); module crumbs link.
const MODULE_TRAILS: Record<string, Crumb[]> = {
  // Overview
  '/overview':           [{ label: 'Overview', href: '/overview' }],
  '/tasks':              [{ label: 'Overview' }, { label: 'Tasks', href: '/tasks' }],
  '/notifications':      [{ label: 'Overview' }, { label: 'Notifications', href: '/notifications' }],
  '/reporting':          [{ label: 'Exports & Reports' }, { label: 'Reporting', href: '/reporting' }],

  // AI Governance — Model
  '/models/inventory':   [{ label: 'AI Governance' }, { label: 'Model Registry', href: '/models/inventory' }],
  '/models':             [{ label: 'AI Governance' }, { label: 'Model Registry', href: '/models' }],
  '/prompt-registry':    [{ label: 'AI Governance' }, { label: 'Prompt Registry', href: '/prompt-registry' }],

  // Impact & Risk
  '/risks':              [{ label: 'Impact & Risk' }, { label: 'Risk Register', href: '/risks' }],
  '/risk/matrix':        [{ label: 'Impact & Risk' }, { label: 'Risk Matrix', href: '/risk/matrix' }],
  '/aiia':               [{ label: 'Impact & Risk' }, { label: 'Impact Assessments', href: '/aiia' }],
  '/use-cases':          [{ label: 'Impact & Risk' }, { label: 'Use Case Registry', href: '/use-cases' }],

  // Validation & Evals
  '/bias-audits':        [{ label: 'Validation & Evals' }, { label: 'Bias Audits', href: '/bias-audits' }],
  '/explainability':     [{ label: 'Validation & Evals' }, { label: 'Explainability', href: '/explainability' }],
  '/evals':              [{ label: 'Validation & Evals' }, { label: 'Evaluations', href: '/evals' }],
  '/evals/datasets':     [{ label: 'Validation & Evals' }, { label: 'Datasets', href: '/evals/datasets' }],

  // Runtime Trust
  '/risk/incidents':     [{ label: 'Runtime Trust' }, { label: 'Incidents', href: '/risk/incidents' }],
  '/hitl':               [{ label: 'Runtime Trust' }, { label: 'HITL Queue', href: '/hitl' }],
  '/trust-engine':       [{ label: 'Runtime Trust' }, { label: 'Trust Engine', href: '/trust-engine' }],
  '/guardrails':         [{ label: 'Runtime Trust' }, { label: 'Guardrails', href: '/guardrails' }],

  // Compliance
  '/compliance':         [{ label: 'Compliance' }, { label: 'Compliance', href: '/compliance' }],
  '/frameworks':         [{ label: 'Compliance' }, { label: 'Frameworks', href: '/frameworks' }],
  '/controls':           [{ label: 'Compliance' }, { label: 'Controls', href: '/controls' }],
  '/compliance/controls': [{ label: 'Compliance' }, { label: 'Controls', href: '/compliance/controls' }],
  '/compliance/drift':   [{ label: 'Compliance' }, { label: 'Control Drift', href: '/compliance/drift' }],
  '/policies':           [{ label: 'Compliance' }, { label: 'Policies', href: '/policies' }],
  '/audit-trail':        [{ label: 'Compliance' }, { label: 'Audit Trail', href: '/audit-trail' }],

  // Third-Party & Exports
  '/vendors':            [{ label: 'Third-Party' }, { label: 'Vendors', href: '/vendors' }],
  '/export':             [{ label: 'Exports & Reports' }, { label: 'Export Center', href: '/export' }],
  '/evidence-vault':     [{ label: 'Exports & Reports' }, { label: 'Evidence Vault', href: '/evidence-vault' }],

  // Organization
  '/access-control':     [{ label: 'Organization' }, { label: 'Access Control', href: '/access-control' }],
  '/settings':           [{ label: 'Organization' }, { label: 'Settings', href: '/settings' }],
}

// Per-segment canonical labels for the route-derived fallback path.
const SEGMENT_LABELS: Record<string, string> = {
  overview: 'Overview', compliance: 'Compliance', 'gap-analysis': 'Gap Analysis',
  controls: 'Controls', evidence: 'Evidence Hub', frameworks: 'Frameworks',
  policies: 'Policies', 'policy-templates': 'Policy Templates', risk: 'Risk',
  matrix: 'Risk Matrix', vendors: 'Vendors', incidents: 'Incidents',
  remediation: 'Remediation', models: 'Model Registry', inventory: 'Model Registry',
  lifecycle: 'Lifecycle', agents: 'Agent Discovery', 'shadow-ai': 'Shadow AI',
  'trust-engine': 'Trust Engine', guardrails: 'Guardrails', traces: 'Live Traces',
  'access-control': 'Access Control', roles: 'Roles', users: 'Users',
  'audit-log': 'Audit Log', 'audit-trail': 'Audit Trail', 'evidence-vault': 'Evidence Vault',
  export: 'Export Center', settings: 'Settings', reporting: 'Reporting',
  'bias-audits': 'Bias Audits', datasets: 'Datasets', hitl: 'HITL Queue',
  explainability: 'Explainability', evals: 'Evaluations', security: 'Security',
  tasks: 'Tasks', notifications: 'Notifications', 'use-cases': 'Use Case Registry',
  aiia: 'Impact Assessments', 'prompt-registry': 'Prompt Registry',
}

// Resource-id heuristics: keep canonical IDs intact (MDL-001, RSK-002, INC-12),
// truncate UUIDs, otherwise title-case a slug. NEVER lowercases an ID.
const ID_RE = /^[A-Za-z]{2,6}-\d+[A-Za-z0-9-]*$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i

export function formatCrumb(segment: string): string {
  const seg = decodeURIComponent(segment)
  if (ID_RE.test(seg)) return seg.toUpperCase()
  if (UUID_RE.test(seg)) return seg.slice(0, 8) + '…'
  return SEGMENT_LABELS[seg] ?? seg.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Build the canonical crumb trail for a pathname (longest module-prefix match). */
export function trailForPath(pathname: string): Crumb[] {
  const segs = pathname.split('/').filter(Boolean)
  if (segs.length === 0) return []

  for (let n = segs.length; n >= 1; n--) {
    const prefix = '/' + segs.slice(0, n).join('/')
    const base = MODULE_TRAILS[prefix]
    if (base) {
      const rest = segs.slice(n)
      const detailCrumbs: Crumb[] = rest.map((s, i) => ({
        label: formatCrumb(s),
        href: i < rest.length - 1 ? '/' + segs.slice(0, n + i + 1).join('/') : undefined,
      }))
      return [...base, ...detailCrumbs]
    }
  }

  // Fallback: derive from segments with correct label/ID formatting.
  return segs.map((s, i) => ({
    label: formatCrumb(s),
    href: i < segs.length - 1 ? '/' + segs.slice(0, i + 1).join('/') : undefined,
  }))
}

/**
 * Route-aware breadcrumb trail for the current location. Pass `detail` to
 * override the final (resource) crumb with a human label, e.g.
 * `useBreadcrumbs(model?.name ?? id)` on a detail page.
 */
export function useBreadcrumbs(detail?: string | Crumb | null): Crumb[] {
  const { pathname } = useLocation()
  const trail = trailForPath(pathname)
  if (!detail) return trail
  const crumb: Crumb = typeof detail === 'string' ? { label: detail } : detail
  // Replace the auto last crumb (the raw id) with the friendly detail label.
  if (trail.length > 1) return [...trail.slice(0, -1), crumb]
  return [...trail, crumb]
}
