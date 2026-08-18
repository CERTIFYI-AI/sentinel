// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// navigation — the platform's ONE navigation structure.
//
// This module is the single source of truth for the left-hand menu. It is
// consumed by `components/Sidebar.tsx` (which renders it) and by
// `data/userGuide.ts` (which mirrors it, so the User guide is organised by the
// same sections the user actually sees). Keeping one definition is what stops
// the guide from drifting out of step with the menu — the failure mode where a
// module is renamed or moved and the documentation silently describes a
// product that no longer exists.
//
// Add a module HERE and it appears in the menu and in the guide together.

import type React from 'react'
import {
  AppWindow, ArrowsLeftRight, BatteryCharging, BookOpen, Brain, Briefcase,
  BuildingOffice, CalendarBlank, ChartBar, ChartDonut, ChartLine,
  ChatTeardropText, CheckCircle, CheckSquare, ClipboardText,
  ClockCounterClockwise, Compass, Database, DownloadSimple, Eye,
  FileMagnifyingGlass, Flask, FlowArrow, FolderOpen, Funnel, Gauge, Gavel,
  Gear, Globe, GraduationCap, HandCoins, Leaf, Lifebuoy, Lightning,
  ListChecks, Lock, Megaphone, Package, Plugs, Pulse, Robot, Rocket,
  Scales, Scan, Scroll, SealCheck as AdvisorIcon, ShieldCheck, ShieldStar,
  ShieldWarning, Sparkle, SquaresFour, Table, Target, TreeStructure,
  UserCircleCheck, UserList, Warning
} from '@phosphor-icons/react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface NavSubItem {
  label: string
  to: string
}

export interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  badge?: number
  children?: NavSubItem[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// ── Navigation structure ─────────────────────────────────────────────────────

export const NAV: NavSection[] = [
  {
    title: 'HOME',
    items: [
      { label: 'Dashboard',         to: '/overview',          icon: SquaresFour },
      { label: 'Tasks',             to: '/tasks',             icon: CheckSquare },
      {
        label: 'CISO Dashboard', to: '/ciso', icon: ShieldStar,
        children: [
          { label: 'Board Report', to: '/ciso/report' },
        ],
      },
      { label: 'Peer Benchmarking', to: '/peer-intelligence', icon: ChartBar },
    ],
  },
  {
    title: 'AI ASSETS',
    items: [
      {
        label: 'Model Registry', to: '/models/inventory', icon: Robot,
        children: [
          { label: 'Lifecycle',     to: '/models/lifecycle' },
          { label: 'DNA & Lineage', to: '/models/dna' },
        ],
      },
      { label: 'Use Cases', to: '/use-cases', icon: Briefcase },
      {
        label: 'Agents', to: '/agents', icon: Brain,
        children: [
          { label: 'Permissions',  to: '/agent-iam' },
          { label: 'Choreography', to: '/multi-agent' },
          { label: 'Kill Switch',  to: '/kill-switch' },
        ],
      },
      {
        label: 'Datasets', to: '/datasets', icon: Database,
        children: [
          { label: 'Data Governance', to: '/data-governance' },
          { label: 'Data Lineage',    to: '/data-lineage' },
          { label: 'Data Quality',    to: '/data-quality' },
        ],
      },
      { label: 'Prompt Registry', to: '/prompt-registry', icon: ChatTeardropText },
      { label: 'AI Apps',         to: '/ai-apps',         icon: AppWindow },
      { label: 'Knowledge Graph', to: '/knowledge-graph', icon: TreeStructure },
    ],
  },
  {
    title: 'ASSESS & VALIDATE',
    items: [
      { label: 'Impact Assessments',   to: '/aiia',            icon: FileMagnifyingGlass },
      { label: 'Risk Classification',  to: '/ai-risk-tiering', icon: Funnel },
      { label: 'Model Risk Committee', to: '/mrc',             icon: Gavel },
      {
        label: 'Validation Lab', to: '/model-validation', icon: Flask,
        children: [
          { label: 'Metric Studio',        to: '/evals/metric-studio' },
          { label: 'Dataset Wizard',       to: '/evals/dataset-create' },
          { label: 'Data Explorer',        to: '/evals/dataset-preview' },
          { label: 'Scenario Editor',      to: '/evals/multi-turn' },
          { label: 'Session Trace Viewer', to: '/evals/conversation' },
          { label: 'Benchmarks',           to: '/evals/benchmark' },
          { label: 'Eval Techniques',      to: '/evals/techniques' },
        ],
      },
      { label: 'Bias Audits',    to: '/bias-audits',    icon: Scales },
      { label: 'Explainability', to: '/explainability', icon: Eye },
    ],
  },
  {
    title: 'TRUST ENGINE & GATEWAYS',
    items: [
      { label: 'Runtime Trust',          to: '/trust-engine',            icon: Gauge },
      { label: 'Active Guardrails',      to: '/trust-engine/guardrails', icon: ShieldCheck },
      { label: 'Live Inference Traces',  to: '/trust-engine/traces',     icon: Pulse },
      { label: 'Trust Costs & Tokens',   to: '/trust-engine/costs',      icon: HandCoins },
      { label: 'Fallback Failovers',     to: '/trust-engine/fallback',   icon: ArrowsLeftRight },
      { label: 'Tool Monitor',           to: '/trust-engine/tools',      icon: Scan },
      { label: 'Performance Monitoring', to: '/performance-monitoring',  icon: ChartLine },
      { label: 'Model Efficiency',       to: '/model-efficiency',        icon: BatteryCharging },
      { label: 'GenAI Risk Profiles',    to: '/genai-risks',             icon: Warning },
      { label: 'Playground',             to: '/ai-gateway/playground',   icon: Sparkle },
      {
        label: 'MCP Servers', to: '/mcp-gateway/servers', icon: Plugs,
        children: [
          { label: 'MCP Overview', to: '/mcp-gateway' },
          { label: 'Tool Catalog', to: '/mcp-gateway/tools' },
          { label: 'Policy Decisions', to: '/mcp-gateway/decisions' },
        ],
      },
      { label: 'Configuration', to: '/trust-engine/config', icon: Gear },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      {
        label: 'Threats & Scans', to: '/security/scans', icon: ShieldCheck,
        children: [
          { label: 'Threat Feed',     to: '/security/threats' },
          { label: 'Scan Center',     to: '/security/scans' },
          { label: 'Attack Surface',  to: '/security/attack-surface' },
          { label: 'Vulnerabilities', to: '/security/vuln-tracker' },
        ],
      },
      {
        label: 'Red Teaming', to: '/security/red-team', icon: Flask,
        children: [
          { label: 'Red Team Lab',      to: '/security/red-team' },
          { label: 'Red Team Findings', to: '/red-team-findings' },
          { label: 'Model Arena',       to: '/security/model-arena' },
        ],
      },
      {
        label: 'Defense & Policies', to: '/security/policies', icon: Scroll,
        children: [
          { label: 'Policy Firewall',  to: '/security/policies' },
          { label: 'Keys Vault',       to: '/security/keys' },
          { label: 'JIT Elevation',    to: '/security/jit' },
          { label: 'MFA Enrollment',   to: '/security/mfa' },
          { label: 'Security Reports', to: '/security/reports' },
        ],
      },
    ],
  },
  {
    title: 'RISK & INCIDENTS',
    items: [
      { label: 'Risk Register',     to: '/risks',             icon: Warning },
      { label: 'Risk Matrix',       to: '/risk/matrix',       icon: Target },
      { label: 'Risk Intelligence', to: '/risk-intelligence', icon: Compass },
      { label: 'Financial Risk',    to: '/financial-risk',    icon: HandCoins },
      {
        label: 'Incidents', to: '/risk/incidents', icon: ShieldWarning,
        children: [
          { label: 'Workflow',  to: '/incident-workflow' },
          { label: 'Playbooks', to: '/incidents/playbooks' },
          { label: 'Tabletop',  to: '/tabletop' },
        ],
      },
      { label: 'Remediation',        to: '/remediation-tracker', icon: ClockCounterClockwise },
      { label: 'Exceptions',         to: '/exceptions',          icon: ListChecks },
      { label: 'HITL',               to: '/hitl',                icon: UserCircleCheck },
      { label: 'Approval Workflows', to: '/workflows',           icon: FlowArrow },
      { label: 'Automation Studio',  to: '/automation-studio',   icon: Lightning },
    ],
  },
  {
    title: 'COMPLIANCE & REGULATORY',
    items: [
      { label: 'Overview',   to: '/compliance', icon: ChartDonut },
      { label: 'Frameworks', to: '/frameworks', icon: BookOpen },
      { label: 'Conformity', to: '/conformity', icon: AdvisorIcon },
      {
        label: 'Controls', to: '/compliance/controls', icon: ListChecks,
        children: [
          { label: 'Control Drift',   to: '/compliance/drift' },
          { label: 'Gap Analysis',    to: '/compliance/gap-analysis' },
          { label: 'Control Testing', to: '/control-testing' },
        ],
      },
      { label: 'Evidence',            to: '/evidence-vault', icon: FolderOpen },
      { label: 'Audit Trail',         to: '/audit-trail',    icon: ClockCounterClockwise },
      { label: 'Audit Management',    to: '/audits',         icon: ClipboardText },
      { label: 'Compliance Calendar', to: '/calendar',       icon: CalendarBlank },
      {
        label: 'Policies', to: '/policies', icon: Scroll,
        children: [
          { label: 'Templates', to: '/compliance/policy-templates' },
          { label: 'Editor',    to: '/policy-editor' },
          { label: 'Documents', to: '/documents' },
        ],
      },
      {
        label: 'Reg Radar', to: '/reg-radar', icon: Globe,
        children: [
          { label: 'Reg Velocity',         to: '/reg-velocity' },
          { label: 'Regulator Filings',    to: '/regulator-filings' },
          { label: 'Transparency Reports', to: '/transparency-reports' },
          { label: 'Post-Market',          to: '/post-market' },
        ],
      },
      { label: 'AI Literacy',  to: '/ai-literacy',  icon: GraduationCap },
      { label: 'Trust Center', to: '/trust-center', icon: Megaphone },
      { label: 'Autopilot',    to: '/autopilot',    icon: Rocket },
    ],
  },
  {
    title: 'PRIVACY',
    items: [
      { label: 'DSR',     to: '/dsr',                icon: UserList },
      { label: 'Consent', to: '/consent-management', icon: CheckCircle },
      { label: 'DPIA',    to: '/dpia',               icon: FileMagnifyingGlass },
      { label: 'TIA',     to: '/tia',                icon: ArrowsLeftRight },
      { label: 'RoPA',    to: '/ropa',               icon: Table },
    ],
  },
  {
    title: 'VENDORS & SUPPLY CHAIN',
    items: [
      {
        label: 'Vendor Registry', to: '/vendors', icon: BuildingOffice,
        children: [
          { label: 'Assessments',    to: '/vendors/assessments' },
          { label: 'SLA',            to: '/vendors/sla' },
          { label: 'TPRM Workspace', to: '/vendors/tprm' },
          { label: 'Vendor Upload',  to: '/vendor-upload' },
        ],
      },
      {
        label: 'Supply Chain', to: '/supply-chain', icon: Package,
        children: [
          { label: 'AIBOM',      to: '/aibom' },
          { label: 'Provenance', to: '/provenance' },
          { label: 'Graph',      to: '/supply-chain/graph' },
        ],
      },
      {
        label: 'Sustainability & ESG', to: '/esg-reports', icon: Leaf,
        children: [
          { label: 'Carbon',      to: '/carbon-ledger' },
          { label: 'Energy',      to: '/energy-efficiency' },
          { label: 'ESG Reports', to: '/esg-reports' },
        ],
      },
    ],
  },
  {
    title: 'ADMIN',
    items: [
      {
        label: 'IAM & Roles', to: '/access-control', icon: Lock,
        children: [
          { label: 'Users Registry',      to: '/access-control/users' },
          { label: 'Roles Management',    to: '/access-control/roles' },
          { label: 'Departments',         to: '/access-control/departments' },
          { label: 'Identity Governance', to: '/iga' },
        ],
      },
      {
        label: 'Resilience', to: '/continuity', icon: Lifebuoy,
        children: [
          { label: 'Business Continuity',   to: '/continuity' },
          { label: 'Business Impact (BIA)', to: '/bia' },
          { label: 'Asset Registry',        to: '/assets' },
        ],
      },
      {
        label: 'People & Ethics', to: '/ethics-reporting', icon: Megaphone,
        children: [
          { label: 'Ethics Reporting',     to: '/ethics-reporting' },
          { label: 'Training & Awareness', to: '/training' },
          { label: 'GRC Maturity',         to: '/maturity' },
        ],
      },
      { label: 'Governance Mesh',  to: '/governance-mesh',  icon: TreeStructure },
      { label: 'Narrative Engine', to: '/narrative-engine', icon: Brain },
      { label: 'Integrations',     to: '/integrations',     icon: Plugs },
      { label: 'Export Center',    to: '/export',           icon: DownloadSimple },
      { label: 'Settings',         to: '/settings',         icon: Gear },
    ],
  },
]

// ── Derived helpers ──────────────────────────────────────────────────────────

/** Stable slug for a section title ("RISK & INCIDENTS" -> "risk-incidents"). */
export const sectionId = (title: string): string =>
  title
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** One flat destination in the menu, carrying the section it belongs to. */
export interface NavDestination {
  label: string
  to: string
  sectionTitle: string
  sectionId: string
  /** Parent item label when this is a child entry, else null. */
  parentLabel: string | null
}

/**
 * Every reachable destination in the menu, parents and children alike, in menu
 * order. The User guide builds its article list from this, so a module that is
 * in the menu is always in the guide.
 */
export function flattenNav(nav: NavSection[] = NAV): NavDestination[] {
  const out: NavDestination[] = []
  for (const section of nav) {
    const sid = sectionId(section.title)
    for (const item of section.items) {
      out.push({
        label: item.label,
        to: item.to,
        sectionTitle: section.title,
        sectionId: sid,
        parentLabel: null,
      })
      for (const child of item.children ?? []) {
        out.push({
          label: child.label,
          to: child.to,
          sectionTitle: section.title,
          sectionId: sid,
          parentLabel: item.label,
        })
      }
    }
  }
  return out
}
