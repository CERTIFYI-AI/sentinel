// SPDX-License-Identifier: Apache-2.0
// Enterprise Sidebar — Phase 5 — Sentinel GRC Platform

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  SquaresFour, Bell, ChartPieSlice, CheckSquare, Robot, Brain,
  Scales, FileMagnifyingGlass, Briefcase, ChatTeardropText,
  Gauge, ShieldCheck,
  ChartBar, BookOpen, ListChecks, Scroll, FolderOpen, ClipboardText,
  Target, Globe, Scan, FileText,
  Warning, ShieldWarning, ClockCounterClockwise, HandCoins, ShieldStar,
  BuildingOffice, UserCircleCheck, FlowArrow, UserList,
  Package, Plugs, DownloadSimple,
  Database, Table, ChartLine,
  Leaf, Lightning, TreeStructure as EsgIcon,
  Lock, Users, GraduationCap, Lifebuoy,
  Gear, SealCheck as AdvisorIcon,
  CaretDown, List, SidebarSimple as SidebarCollapseIcon,
  Sun, Moon, Monitor, SignOut,
  X,
  Eye, ArrowsLeftRight, CheckCircle, Megaphone,
  Storefront, Certificate, TreeStructure,
  PresentationChart, Gavel, Buildings, Play,
  Flask, Funnel, Sparkle, Compass, BatteryCharging, Broadcast,
  Rocket, ChartDonut, Signature, GitBranch, Pulse,
  MagnifyingGlass,
} from '@phosphor-icons/react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '../lib/utils'
import { useTheme, type Theme } from '../providers/theme'
import { useIsMobile } from '../hooks/use-mobile'
import { useAuthStore } from '../store/authStore'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavSubItem {
  label: string
  to: string
}

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  badge?: number
  children?: NavSubItem[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

// ── Navigation Structure ───────────────────────────────────────────────────────

const NAV: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard',             to: '/overview',          icon: SquaresFour },
      { label: 'Tasks',                 to: '/tasks',             icon: CheckSquare },
      // Hidden from the sidebar (routes remain available directly):
      // { label: 'Notifications',         to: '/notifications',     icon: Bell },
      // { label: 'Reporting',             to: '/reporting',         icon: ChartPieSlice },
      {
        label: 'CISO Dashboard', to: '/ciso', icon: ShieldStar,
        children: [
          { label: 'Board Report', to: '/ciso/report' },
        ],
      },
      { label: 'Executive Center',      to: '/executive-center',  icon: PresentationChart },
      // { label: 'ROI & Value',           to: '/roi',               icon: HandCoins },
    ],
  },
  {
    title: 'AI GOVERNANCE',
    items: [
      {
        label: 'Model Governance', to: '/models/inventory', icon: Robot,
        children: [
          { label: 'Model Registry',      to: '/models/inventory' },
          { label: 'Model Lifecycle',     to: '/models/lifecycle' },
          { label: 'Model DNA & Lineage', to: '/models/dna' },
          { label: 'Prompt Registry',     to: '/prompt-registry' },
        ],
      },
      {
        label: 'Impact & Risk (AIIA)', to: '/aiia', icon: FileMagnifyingGlass,
        children: [
          { label: 'Impact Assessments (AIIA)', to: '/aiia' },
          { label: 'Use Case Registry',         to: '/use-cases' },
          { label: 'Risk Classification',        to: '/ai-risk-tiering' },
          { label: 'Model Risk Committee (MRC)', to: '/mrc' },
        ],
      },
      {
        label: 'Validation & Evals', to: '/model-validation', icon: Flask,
        children: [
          { label: 'Validation Lab',       to: '/model-validation' },
          { label: 'Explainability Center', to: '/explainability' },
          { label: 'Bias Audits',          to: '/bias-audits' },
          { label: 'Metric Studio',        to: '/evals/metric-studio' },
          { label: 'Dataset Wizard',       to: '/evals/dataset-create' },
          { label: 'Data Explorer',        to: '/evals/dataset-preview' },
          { label: 'Scenario Editor',      to: '/evals/multi-turn' },
          { label: 'Session Trace Viewer', to: '/evals/conversation' },
        ],
      },
      {
        label: 'Agent Control', to: '/agents', icon: Brain, badge: 3,
        children: [
          { label: 'Shadow AI Discovery',    to: '/agents/shadow-ai' },
          { label: 'Agent Registry',         to: '/agent-registry' },
          { label: 'Agent Permissions (IAM)', to: '/agent-iam' },
          { label: 'Choreography Canvas',    to: '/multi-agent' },
          { label: 'Emergency Kill Switch',  to: '/kill-switch' },
        ],
      },
      {
        label: 'Runtime Trust', to: '/trust-engine', icon: Gauge,
        children: [
          { label: 'Performance Monitoring', to: '/performance-monitoring' },
          { label: 'Model Efficiency',       to: '/model-efficiency' },
          { label: 'GenAI Risk Profiles',    to: '/genai-risks' },
          { label: 'Active Guardrails',      to: '/trust-engine/guardrails' },
          { label: 'Live Inference Traces',  to: '/trust-engine/traces' },
          { label: 'Trust Costs & Tokens',   to: '/trust-engine/costs' },
          { label: 'Fallback Failovers',     to: '/trust-engine/fallback' },
          { label: 'Tool Monitor',           to: '/trust-engine/tools' },
          { label: 'Configuration',          to: '/trust-engine/config' },
        ],
      },
    ],
  },
  {
    title: 'AI GATEWAY',
    items: [
      { label: 'Analytics',         to: '/ai-gateway/analytics', icon: ChartLine },
      { label: 'Endpoints',         to: '/ai-gateway/endpoints', icon: Plugs },
      { label: 'Playground',        to: '/ai-gateway/playground', icon: Sparkle },
      { label: 'Prompts',           to: '/ai-gateway/prompts', icon: ChatTeardropText },
      { label: 'Guardrails',        to: '/ai-gateway/guardrails', icon: ShieldCheck },
      { label: 'Logs',              to: '/ai-gateway/logs', icon: Scroll },
      { label: 'Virtual Keys',      to: '/ai-gateway/keys', icon: Lock },
      { label: 'Models Catalog',    to: '/ai-gateway/models', icon: Robot },
      { label: 'Gateway Settings',  to: '/ai-gateway/settings', icon: Gear },
    ],
  },
  {
    title: 'MCP GATEWAY',
    items: [
      { label: 'Overview',          to: '/mcp-gateway/overview', icon: ChartPieSlice },
      { label: 'MCP Servers',       to: '/mcp-gateway/servers', icon: Database },
      { label: 'Tool Catalog',      to: '/mcp-gateway/tools', icon: Briefcase },
      { label: 'Agent Keys',        to: '/mcp-gateway/keys', icon: Lock },
      { label: 'Audit Log',         to: '/mcp-gateway/logs', icon: Scroll },
      { label: 'HITL Approvals',    to: '/mcp-gateway/approvals', icon: UserCircleCheck },
      { label: 'MCP Guardrails',    to: '/mcp-gateway/guardrails', icon: ShieldCheck },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      {
        label: 'Threats & Scans', to: '/security/scans', icon: ShieldCheck,
        children: [
          { label: 'Threat Feed',       to: '/security/threats' },
          { label: 'Scan Center',       to: '/security/scans' },
          { label: 'Attack Surface',    to: '/security/attack-surface' },
          { label: 'Vulnerabilities',   to: '/security/vulnerabilities' },
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
          { label: 'Policy Firewall',   to: '/security/policies' },
          { label: 'Keys Vault',        to: '/security/keys' },
          { label: 'Security Reports',   to: '/security/reports' },
        ],
      },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'Overview', to: '/compliance', icon: ChartDonut },
      {
        label: 'Standards & Controls', to: '/frameworks', icon: BookOpen,
        children: [
          { label: 'Frameworks Catalog', to: '/frameworks' },
          { label: 'Controls Registry',   to: '/compliance/controls' },
          { label: 'Gap Analysis',        to: '/compliance/gap-analysis' },
          { label: 'Control Testing',     to: '/control-testing' },
        ],
      },
      {
        label: 'Evidence & Audits', to: '/compliance/evidence', icon: FolderOpen,
        children: [
          { label: 'Evidence Hub',        to: '/compliance/evidence' },
          { label: 'Evidence Vault',      to: '/evidence-vault' },
          { label: 'Evidence Chain',      to: '/evidence-chain' },
          { label: 'Audit Trail',         to: '/audit-trail' },
          { label: 'System Audit Log',    to: '/system-audit-log' },
          { label: 'Compliance Calendar', to: '/calendar' },
        ],
      },
      {
        label: 'Policies & Docs', to: '/policies', icon: Scroll,
        children: [
          { label: 'Policy Templates',  to: '/compliance/policy-templates' },
          { label: 'Policy Editor',     to: '/policy-editor' },
          { label: 'Document Management', to: '/documents' },
        ],
      },
      {
        label: 'Privacy & Frameworks', to: '/reg-radar', icon: Globe,
        children: [
          { label: 'Reg Radar',             to: '/reg-radar' },
          { label: 'Gov. Framework',        to: '/governance-framework' },
          { label: 'Governance Mesh',       to: '/governance-mesh' },
          { label: 'DPIA Workflow',         to: '/dpia' },
          { label: 'Transfer Impact (TIA)', to: '/tia' },
          { label: 'RoPA Registry',         to: '/ropa' },
          { label: 'Transparency Reports',  to: '/transparency-reports' },
          { label: 'Framework Mapping',     to: '/framework-mapping' },
          { label: 'Conformity',            to: '/conformity' },
        ],
      },
    ],
  },
  {
    title: 'RISK & RESPONSE',
    items: [
      {
        label: 'Risk Management', to: '/risks', icon: Warning,
        children: [
          { label: 'Risks Registry',     to: '/risks' },
          { label: 'Risk Matrix',        to: '/risk/matrix' },
          { label: 'Risk Intelligence',  to: '/risk-intelligence' },
          { label: 'Financial Risk',     to: '/financial-risk' },
        ],
      },
      {
        label: 'Incident Response', to: '/risk/incidents', icon: ShieldWarning,
        children: [
          { label: 'Incidents Log',      to: '/risk/incidents' },
          { label: 'Incident Workflow',  to: '/incident-workflow' },
          { label: 'Incident Playbooks', to: '/incidents/playbooks' },
          { label: 'Tabletop Exercises', to: '/tabletop' },
        ],
      },
      {
        label: 'Remediation & Exempts', to: '/remediation-tracker', icon: ClockCounterClockwise,
        children: [
          { label: 'Remediation Tracker', to: '/remediation-tracker' },
          { label: 'Exception Management', to: '/exceptions' },
        ],
      },
      {
        label: 'Operations & Flows', to: '/hitl', icon: UserCircleCheck, badge: 3,
        children: [
          { label: 'HITL Reviews',      to: '/hitl' },
          { label: 'Approval Workflows', to: '/workflows' },
          { label: 'Automation Studio',  to: '/automation-studio' },
          { label: 'Regulator Filings',  to: '/regulator-filings' },
        ],
      },
    ],
  },
  {
    title: 'VENDORS & PRIVACY',
    items: [
      {
        label: 'Third-Party Risk (TPRM)', to: '/vendors', icon: BuildingOffice,
        children: [
          { label: 'Vendor Registry', to: '/vendors' },
          { label: 'TPRM Assessments', to: '/vendors/assessments' },
          { label: 'SLA Monitoring',   to: '/vendors/sla' },
          { label: 'TPRM Workspace',  to: '/vendors/tprm' },
        ],
      },
      {
        label: 'Privacy & Rights', to: '/dsr', icon: UserList,
        children: [
          { label: 'DSR / Rights Management', to: '/dsr' },
          { label: 'Consent Registry',        to: '/consent-management' },
        ],
      },
      {
        label: 'AI Supply Chain (AIBOM)', to: '/supply-chain', icon: Package,
        children: [
          { label: 'Supply Chain Attestations', to: '/supply-chain' },
          { label: 'Provenance Graph',          to: '/provenance' },
          { label: 'Supply Chain Graph',        to: '/supply-chain/graph' },
          { label: 'Vendor Upload',             to: '/vendor-upload' },
        ],
      },
      { label: 'Marketplace',   to: '/marketplace',   icon: Storefront },
      { label: 'Integrations',  to: '/integrations',  icon: Plugs },
      { label: 'Export Center', to: '/export',         icon: DownloadSimple },
    ],
  },
  {
    title: 'DATA & SUSTAINABILITY',
    items: [
      {
        label: 'Data Trust & Gov', to: '/datasets', icon: Database,
        children: [
          { label: 'Datasets Registry', to: '/datasets' },
          { label: 'Data Governance',   to: '/data-governance' },
          { label: 'Data Lineage',      to: '/data-lineage' },
          { label: 'Data Quality',      to: '/data-quality' },
        ],
      },
      {
        label: 'Sustainability & ESG', to: '/esg-reports', icon: Leaf,
        children: [
          { label: 'Carbon Ledger',     to: '/carbon-ledger' },
          { label: 'Energy Efficiency', to: '/energy-efficiency' },
          { label: 'ESG Reports',       to: '/esg-reports' },
        ],
      },
    ],
  },
  {
    title: 'ENTERPRISE INTELLIGENCE',
    items: [
      { label: 'Peer Benchmarking',    to: '/peer-intelligence', icon: ChartBar },
      { label: 'Compliance Autopilot', to: '/autopilot',         icon: Rocket },
      { label: 'Narrative Engine',     to: '/narrative-engine',  icon: Brain },
      { label: 'Knowledge Graph',      to: '/knowledge-graph',   icon: TreeStructure },
      { label: 'Regulatory Velocity',  to: '/reg-velocity',      icon: Gauge },
    ],
  },
  {
    title: 'ORGANIZATION',
    items: [
      {
        label: 'IAM & Roles', to: '/access-control', icon: Lock,
        children: [
          { label: 'Access Control', to: '/access-control' },
          { label: 'Users Registry',  to: '/access-control/users' },
          { label: 'Roles Management', to: '/access-control/roles' },
          { label: 'Departments',     to: '/access-control/departments' },
          { label: 'Identity Governance', to: '/iga' },
        ],
      },
      {
        label: 'Operational Resilience', to: '/continuity', icon: Lifebuoy,
        children: [
          { label: 'Business Continuity', to: '/continuity' },
          { label: 'Business Impact (BIA)', to: '/bia' },
          { label: 'Asset Registry',      to: '/assets' },
        ],
      },
      {
        label: 'Ethics & Governance', to: '/ethics-reporting', icon: Megaphone,
        children: [
          { label: 'Ethics Reporting',    to: '/ethics-reporting' },
          { label: 'Training & Awareness', to: '/training' },
          { label: 'Committee Management', to: '/committee' },
          { label: 'GRC Maturity',        to: '/maturity' },
          { label: 'Licensing',           to: '/admin/licensing' },
        ],
      },
    ],
  },
]

// ── Constants ─────────────────────────────────────────────────────────────────

const SIDEBAR_STORAGE_KEY = 'sentinel:sidebar-collapsed'

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function isItemActive(to: string, pathname: string): boolean {
  if (to === '/overview') return pathname === '/' || pathname === '/overview'
  if (pathname === to) return true
  return pathname.startsWith(to + '/')
}

function isSectionActive(items: NavItem[], pathname: string): boolean {
  return items.some(item => {
    if (isItemActive(item.to, pathname)) return true
    if (item.children?.some(c => isItemActive(c.to, pathname))) return true
    return false
  })
}

function findActiveSection(pathname: string): string | null {
  for (const section of NAV) {
    if (isSectionActive(section.items, pathname)) return section.title
  }
  return null
}

function findActiveItemTo(pathname: string): string | null {
  for (const section of NAV) {
    for (const item of section.items) {
      if (item.children?.some(c => isItemActive(c.to, pathname))) return item.to
    }
  }
  return null
}

function getInitials(name?: string, email?: string): string {
  if (name) return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (email) return email[0].toUpperCase()
  return 'AI'
}

// ── Theme helpers ─────────────────────────────────────────────────────────────

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark:   <Moon size={13} weight='duotone' aria-hidden='true' />,
  light:  <Sun size={13} weight='duotone' aria-hidden='true' />,
  system: <Monitor size={13} weight='duotone' aria-hidden='true' />,
}

const THEME_NEXT_LABEL: Record<Theme, string> = {
  dark:   'Dark mode — click for Light',
  light:  'Light mode — click for System',
  system: 'System mode — click for Dark',
}

// ── Tooltip wrapper (shows only in icon-only mode) ────────────────────────────

interface NavTooltipProps {
  label: string
  enabled: boolean
  children: React.ReactNode
}

function NavTooltip({ label, enabled, children }: NavTooltipProps) {
  if (!enabled) return <>{children}</>
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>
        {children as React.ReactElement}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side='right'
          sideOffset={8}
          className={cn(
            'z-[200] px-2.5 py-1.5 text-[11px] font-medium',
            'bg-raised text-[hsl(var(--text-1))]',
            'border border-[hsl(var(--border))]',
            'shadow-md select-none',
          )}
        >
          {label}
          <TooltipPrimitive.Arrow className='fill-[hsl(var(--border))]' />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const { theme, cycleTheme } = useTheme()
  const user   = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const initials = getInitials(user?.name, user?.email)

  const searchRef = useRef<HTMLInputElement>(null)

  // ── State ──────────────────────────────────────────────────────────────────

  const [collapsed, setCollapsed] = useState<boolean>(() => !isMobile && loadCollapsed())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(
    () => findActiveSection(location.pathname)
  )
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const activeItemTo = findActiveItemTo(location.pathname)
    return activeItemTo ? [activeItemTo] : []
  })
  const [search, setSearch] = useState('')

  // ── Persistence ────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
    } catch {
      // localStorage unavailable
    }
  }, [collapsed])

  // ── Auto-expand active section on route change ─────────────────────────────

  useEffect(() => {
    const active = findActiveSection(location.pathname)
    if (active) setExpandedSection(active)
    const activeItemTo = findActiveItemTo(location.pathname)
    if (activeItemTo) {
      setExpandedItems(prev =>
        prev.includes(activeItemTo) ? prev : [...prev, activeItemTo]
      )
    }
    if (isMobile) setMobileOpen(false)
  }, [location.pathname, isMobile])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // [ — toggle collapse (only on desktop)
    if (e.key === '[' && !isMobile && !isEditableTarget(e.target)) {
      e.preventDefault()
      setCollapsed(prev => !prev)
      return
    }
    // Cmd+K or / — focus search
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isEditableTarget(e.target))) {
      e.preventDefault()
      if (collapsed && !isMobile) {
        setCollapsed(false)
        // Focus after expand animation
        setTimeout(() => searchRef.current?.focus(), 210)
      } else {
        searchRef.current?.focus()
      }
    }
  }, [collapsed, isMobile])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleCollapse = useCallback(() => setCollapsed(prev => !prev), [])

  const toggleSection = useCallback((title: string) =>
    setExpandedSection(prev => prev === title ? null : title), [])

  const toggleItem = useCallback((to: string) =>
    setExpandedItems(prev =>
      prev.includes(to) ? prev.filter(t => t !== to) : [...prev, to]
    ), [])

  const handleSignOut = useCallback(async () => {
    await logout()
    navigate('/login', { replace: true })
  }, [logout, navigate])

  // ── Search filtering ───────────────────────────────────────────────────────

  const searchQuery = search.trim().toLowerCase()

  function getFilteredSections(): NavSection[] {
    if (!searchQuery) return NAV
    return NAV.map(section => {
      const items = section.items.filter(item => {
        if (item.label.toLowerCase().includes(searchQuery)) return true
        if (item.children?.some(c => c.label.toLowerCase().includes(searchQuery))) return true
        return false
      })
      return { ...section, items }
    }).filter(s => s.items.length > 0)
  }

  const visibleSections = getFilteredSections()

  // ── Sidebar Panel ──────────────────────────────────────────────────────────

  const effectiveCollapsed = !isMobile && collapsed

  const panel = (
    <TooltipPrimitive.Provider>
      <aside
        role='navigation'
        aria-label='Main navigation'
        className={cn(
          'flex flex-col h-screen bg-surface text-[hsl(var(--text-1))]',
          'border-r border-[hsl(var(--border))] flex-shrink-0 overflow-hidden',
          'transition-[width] duration-200 ease-in-out',
          isMobile
            ? 'w-[280px]'
            : effectiveCollapsed ? 'w-[72px]' : 'w-[280px]'
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className={cn(
          'flex items-center h-14 border-b border-[hsl(var(--border))] flex-shrink-0',
          effectiveCollapsed ? 'justify-center px-0' : 'px-4 gap-3'
        )}>
          {effectiveCollapsed ? (
            <NavTooltip label='Expand sidebar ([ )' enabled>
              <button
                onClick={toggleCollapse}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full gap-1',
                  'text-[hsl(var(--text-3))] hover:text-[hsl(var(--brand))]',
                  'hover:bg-raised transition-colors group',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]',
                )}
                aria-label='Expand sidebar'
              >
                <List size={18} aria-hidden='true' className='group-hover:text-[hsl(var(--brand))]' />
                <span className='text-[9px] font-semibold uppercase tracking-wider opacity-60 group-hover:opacity-100'>
                  Menu
                </span>
              </button>
            </NavTooltip>
          ) : (
            <>
              <img src='/sentinel-icon.svg' alt='Sentinel' className='w-7 h-7 flex-shrink-0' />
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate leading-tight'>
                  Sentinel AI
                </p>
                <p className='text-[10px] text-[hsl(var(--text-4))] leading-tight'>GRC Platform</p>
              </div>
              {isMobile ? (
                <button
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex-shrink-0 p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]',
                  )}
                  aria-label='Close sidebar'
                >
                  <X size={16} aria-hidden='true' />
                </button>
              ) : (
                <button
                  onClick={toggleCollapse}
                  className={cn(
                    'flex-shrink-0 p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]',
                  )}
                  title='Collapse sidebar ([ )'
                  aria-label='Collapse sidebar'
                >
                  <SidebarCollapseIcon size={14} aria-hidden='true' />
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Search ─────────────────────────────────────────────────────── */}
        {!effectiveCollapsed && (
          <div className='px-3 py-2 flex-shrink-0 border-b border-[hsl(var(--border))]'>
            <div className='relative'>
              <MagnifyingGlass
                size={13}
                aria-hidden='true'
                className='absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))] pointer-events-none'
              />
              <input
                ref={searchRef}
                type='search'
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder='Jump to module…'
                aria-label='Search navigation modules'
                className={cn(
                  'w-full h-7 pl-7 pr-2 text-[12px] bg-[hsl(var(--bg-muted))]',
                  'border border-[hsl(var(--border))] text-[hsl(var(--text-1))]',
                  'placeholder:text-[hsl(var(--text-4))]',
                  'focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))] focus:border-[hsl(var(--brand))]',
                  'transition-colors',
                )}
              />
            </div>
          </div>
        )}

        {/* ── Nav items — scrollable body ─────────────────────────────────── */}
        <div className='flex-1 overflow-y-auto py-2 scrollbar-thin' role='list'>
          {visibleSections.map(section => {
            const sectionActive = isSectionActive(section.items, location.pathname)
            const isExpanded = searchQuery
              ? true // auto-expand all sections when searching
              : expandedSection === section.title

            return (
              <div key={section.title} className='px-2 mb-0.5' role='listitem'>
                {/* Section header */}
                {!effectiveCollapsed && (
                  <button
                    onClick={() => toggleSection(section.title)}
                    aria-expanded={isExpanded}
                    className='flex items-center justify-between w-full px-1.5 py-1 group'
                  >
                    <span className={cn(
                      'text-[10px] font-semibold tracking-wider uppercase',
                      sectionActive
                        ? 'text-[hsl(var(--brand))]'
                        : 'text-[hsl(var(--text-4))]'
                    )}>
                      {section.title}
                    </span>
                    <CaretDown
                      size={9}
                      aria-hidden='true'
                      className={cn(
                        'text-[hsl(var(--text-4))] transition-transform duration-150',
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </button>
                )}

                {/* Section items */}
                {(effectiveCollapsed || isExpanded) && (
                  <div className='space-y-0.5 mt-0.5'>
                    {section.items.map(item => {
                      const Icon             = item.icon
                      const active           = isItemActive(item.to, location.pathname)
                      const childActive      = item.children?.some(c => isItemActive(c.to, location.pathname))
                      const hasChildren      = !!(item.children && item.children.length > 0)
                      const childrenExpanded = expandedItems.includes(item.to)
                      const isHighlighted    = active || (!!childActive && !active)

                      const itemBaseClass = cn(
                        'w-full flex items-center gap-2.5 text-[13px] transition-colors group relative',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))] focus-visible:ring-inset',
                        effectiveCollapsed
                          ? 'justify-center px-0 py-2'
                          : 'px-2 py-1.5',
                        isHighlighted
                          ? [
                              'bg-[hsl(var(--brand)/0.08)] text-[hsl(var(--brand))]',
                              !effectiveCollapsed && 'border-l-[3px] border-[hsl(var(--brand))] pl-[5px]',
                            ]
                          : 'text-[hsl(var(--text-3))] hover:bg-raised hover:text-[hsl(var(--text-1))]'
                      )

                      const iconEl = (
                        <Icon
                          size={effectiveCollapsed ? 18 : 16}
                          weight={isHighlighted ? 'fill' : 'regular'}
                          aria-hidden='true'
                          className={cn(
                            'flex-shrink-0 transition-colors',
                            isHighlighted
                              ? 'text-[hsl(var(--brand))]'
                              : 'text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--text-2))]'
                          )}
                        />
                      )

                      return (
                        <div key={item.to}>
                          {hasChildren ? (
                            <NavTooltip label={item.label} enabled={effectiveCollapsed}>
                              <button
                                onClick={() => {
                                  if (effectiveCollapsed) {
                                    navigate(item.to)
                                  } else {
                                    toggleItem(item.to)
                                    if (!childrenExpanded) navigate(item.to)
                                  }
                                }}
                                aria-expanded={!effectiveCollapsed ? childrenExpanded : undefined}
                                aria-label={effectiveCollapsed ? item.label : undefined}
                                className={itemBaseClass}
                              >
                                {iconEl}
                                {!effectiveCollapsed && (
                                  <>
                                    <span className='flex-1 text-left truncate font-[450]'>
                                      {item.label}
                                    </span>
                                    {item.badge != null && (
                                      <span
                                        className='bg-[hsl(var(--brand))] text-white text-[10px] px-1.5 py-0.5 font-semibold min-w-[18px] text-center leading-none'
                                        aria-label={`${item.badge} items`}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                    <CaretDown
                                      size={10}
                                      aria-hidden='true'
                                      className={cn(
                                        'flex-shrink-0 transition-transform duration-150',
                                        childrenExpanded ? 'rotate-0' : '-rotate-90'
                                      )}
                                    />
                                  </>
                                )}
                              </button>
                            </NavTooltip>
                          ) : (
                            <NavTooltip label={item.label} enabled={effectiveCollapsed}>
                              <NavLink
                                to={item.to}
                                aria-current={active ? 'page' : undefined}
                                className={itemBaseClass}
                                aria-label={effectiveCollapsed ? item.label : undefined}
                              >
                                {iconEl}
                                {!effectiveCollapsed && (
                                  <>
                                    <span className='flex-1 truncate font-[450]'>{item.label}</span>
                                    {item.badge != null && (
                                      <span
                                        className='bg-[hsl(var(--brand))] text-white text-[10px] px-1.5 py-0.5 font-semibold min-w-[18px] text-center leading-none'
                                        aria-label={`${item.badge} items`}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                  </>
                                )}
                              </NavLink>
                            </NavTooltip>
                          )}

                          {/* Sub-items */}
                          {hasChildren && childrenExpanded && !effectiveCollapsed && (
                            <div className='ml-6 mt-0.5 space-y-0.5 border-l border-[hsl(var(--border))] pl-2'>
                              {item.children!.map(child => {
                                const childIsActive = isItemActive(child.to, location.pathname)
                                return (
                                  <NavLink
                                    key={child.to}
                                    to={child.to}
                                    aria-current={childIsActive ? 'page' : undefined}
                                    className={cn(
                                      'flex items-center px-2 py-1 text-[12px] transition-colors',
                                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))] focus-visible:ring-inset',
                                      childIsActive
                                        ? 'text-[hsl(var(--brand))] font-medium'
                                        : 'text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] hover:bg-raised'
                                    )}
                                  >
                                    {child.label}
                                  </NavLink>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {/* No results state */}
          {searchQuery && visibleSections.length === 0 && (
            <div className='px-4 py-8 text-center text-[12px] text-[hsl(var(--text-4))]'>
              No modules match "{search}"
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!effectiveCollapsed ? (
          <div className='border-t border-[hsl(var(--border))] px-3 py-2.5 flex-shrink-0 space-y-1'>
            <div className='flex items-center gap-2 min-w-0'>
              {/* Avatar */}
              <div
                className='w-6 h-6 rounded-full bg-[hsl(var(--brand-subtle))] flex items-center justify-center flex-shrink-0'
                aria-hidden='true'
              >
                <span className='text-[10px] font-bold text-[hsl(var(--brand))]'>{initials}</span>
              </div>
              {/* User info */}
              <div className='flex-1 min-w-0'>
                <p className='text-[11px] font-medium text-[hsl(var(--text-2))] truncate leading-tight'>
                  {user?.email ?? user?.name ?? 'User'}
                </p>
                <p className='text-[10px] text-[hsl(var(--text-4))] truncate leading-tight capitalize'>
                  {user?.role ?? 'Member'}
                </p>
              </div>
              {/* Controls */}
              <div className='flex items-center gap-1 flex-shrink-0'>
                <button
                  onClick={cycleTheme}
                  className={cn(
                    'p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]',
                    'hover:bg-raised transition-colors',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]',
                  )}
                  title={THEME_NEXT_LABEL[theme]}
                  aria-label={THEME_NEXT_LABEL[theme]}
                >
                  {THEME_ICONS[theme]}
                </button>
                <NavLink
                  to='/settings'
                  className={cn(
                    'p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]',
                    'hover:bg-raised transition-colors',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]',
                  )}
                  title='Settings'
                  aria-label='Settings'
                >
                  <Gear size={13} aria-hidden='true' />
                </NavLink>
                <button
                  onClick={handleSignOut}
                  className={cn(
                    'p-1 text-[hsl(var(--text-4))] hover:text-red-500',
                    'hover:bg-raised transition-colors',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]',
                  )}
                  title='Sign out'
                  aria-label='Sign out'
                >
                  <SignOut size={13} aria-hidden='true' />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className='border-t border-[hsl(var(--border))] py-2 flex flex-col items-center gap-1 flex-shrink-0'>
            <NavTooltip label={THEME_NEXT_LABEL[theme]} enabled>
              <button
                onClick={cycleTheme}
                className={cn(
                  'p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]',
                  'hover:bg-raised transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]',
                )}
                aria-label={THEME_NEXT_LABEL[theme]}
              >
                {THEME_ICONS[theme]}
              </button>
            </NavTooltip>
            <NavTooltip label='Settings' enabled>
              <NavLink
                to='/settings'
                className={cn(
                  'p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))]',
                  'hover:bg-raised transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]',
                )}
                aria-label='Settings'
              >
                <Gear size={13} aria-hidden='true' />
              </NavLink>
            </NavTooltip>
            <NavTooltip label='Sign out' enabled>
              <button
                onClick={handleSignOut}
                className={cn(
                  'p-1.5 text-[hsl(var(--text-4))] hover:text-red-500',
                  'hover:bg-raised transition-colors',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]',
                )}
                aria-label='Sign out'
              >
                <SignOut size={13} aria-hidden='true' />
              </button>
            </NavTooltip>
          </div>
        )}
      </aside>
    </TooltipPrimitive.Provider>
  )

  // ── Mobile overlay ─────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <>
        {/* Hamburger button — shown when sidebar is closed */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              'fixed top-3 left-3 z-50 p-2',
              'bg-surface border border-[hsl(var(--border))] shadow-md',
              'text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]',
            )}
            aria-label='Open navigation menu'
            aria-expanded={mobileOpen}
          >
            <List size={18} aria-hidden='true' />
          </button>
        )}

        {/* Overlay + panel */}
        {mobileOpen && (
          <>
            <div
              className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm'
              onClick={() => setMobileOpen(false)}
              aria-hidden='true'
            />
            <div className='fixed left-0 top-0 h-full z-50'>
              {panel}
            </div>
          </>
        )}
      </>
    )
  }

  return panel
}

// ── Utility ───────────────────────────────────────────────────────────────────

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}
