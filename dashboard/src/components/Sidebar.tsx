import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
} from '@phosphor-icons/react'
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
// Duplicates removed: Conformity (was in Model Inventory + Compliance → kept in Compliance only)
// Model DNA (was in Model Inventory + Enterprise Intelligence → kept in Model Inventory only)
// Evaluations moved: SECURITY → AI GOVERNANCE
// Red Team Findings merged: standalone → child of Security
// Risk Intelligence moved: OVERVIEW → RISK & RESPONSE
// Compliance "Dashboard" renamed to "Overview" to avoid confusion

const NAV: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard',             to: '/overview',          icon: SquaresFour },
      { label: 'Tasks',                 to: '/tasks',             icon: CheckSquare },
      { label: 'Notifications',         to: '/notifications',     icon: Bell },
      { label: 'Reporting',             to: '/reporting',         icon: ChartPieSlice },
      {
        label: 'CISO Dashboard', to: '/ciso', icon: ShieldStar,
        children: [
          { label: 'Board Report', to: '/ciso/report' },
        ],
      },
      { label: 'Executive Center',      to: '/executive-center',  icon: PresentationChart },
      { label: 'ROI & Value',           to: '/roi',               icon: HandCoins },
    ],
  },
  {
    title: 'AI GOVERNANCE',
    items: [
      {
        label: 'Model Inventory', to: '/models/inventory', icon: Robot,
        children: [
          { label: 'Model Lifecycle',  to: '/models/lifecycle' },
          { label: 'Validation Lab',   to: '/model-validation' },
          { label: 'Explainability',   to: '/explainability' },
          { label: 'Model Efficiency', to: '/model-efficiency' },
          { label: 'Model DNA',        to: '/models/dna' },
        ],
      },
      {
        label: 'Agent Discovery', to: '/agents', icon: Brain, badge: 3,
        children: [
          { label: 'Shadow AI',    to: '/agents/shadow-ai' },
          { label: 'Registry',     to: '/agent-registry' },
          { label: 'Agent IAM',    to: '/agent-iam' },
          { label: 'Choreography', to: '/multi-agent' },
          { label: 'Kill Switch',  to: '/kill-switch' },
          { label: 'Performance',  to: '/performance-monitoring' },
        ],
      },
      {
        label: 'Trust Engine', to: '/trust-engine', icon: Gauge,
        children: [
          { label: 'Guardrails',    to: '/trust-engine/guardrails' },
          { label: 'Live Traces',   to: '/trust-engine/traces' },
          { label: 'Cost & Tokens', to: '/trust-engine/costs' },
          { label: 'Fallback Log',  to: '/trust-engine/fallback' },
          { label: 'Tool Monitor',  to: '/trust-engine/tools' },
          { label: 'Configuration', to: '/trust-engine/config' },
        ],
      },
      {
        label: 'Evaluations', to: '/evals', icon: Flask,
        children: [
          { label: 'Results Viewer',  to: '/evals/results' },
          { label: 'Eval Techniques', to: '/evals/techniques' },
          { label: 'Benchmark',       to: '/evals/benchmark' },
        ],
      },
      { label: 'Bias Audits',              to: '/bias-audits',      icon: Scales },
      { label: 'AI Impact',                to: '/aiia',             icon: FileMagnifyingGlass },
      { label: 'Use Cases',                to: '/use-cases',        icon: Briefcase },
      { label: 'Prompt Registry',          to: '/prompt-registry',  icon: ChatTeardropText },
      { label: 'AI Risk Classification',   to: '/ai-risk-tiering',  icon: Funnel },
      { label: 'Post-Market Surveillance', to: '/post-market',      icon: Pulse },
      { label: 'GenAI Risk Profiles',      to: '/genai-risks',      icon: Sparkle },
      { label: 'Model Risk Committee',     to: '/mrc',              icon: Gavel },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      {
        label: 'Security', to: '/security', icon: ShieldCheck,
        children: [
          { label: 'Threat Feed',       to: '/security/threats' },
          { label: 'Scan Center',       to: '/security/scans' },
          { label: 'Attack Surface',    to: '/security/attack-surface' },
          { label: 'Vulnerabilities',   to: '/security/vulnerabilities' },
          { label: 'Red Team Lab',      to: '/security/red-team' },
          { label: 'Red Team Findings', to: '/red-team-findings' },
          { label: 'Policy Firewall',   to: '/security/policies' },
          { label: 'Keys Vault',        to: '/security/keys' },
          { label: 'Model Arena',       to: '/security/model-arena' },
          { label: 'Reports',           to: '/security/reports' },
        ],
      },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'Overview',         to: '/compliance',                icon: ChartDonut },
      { label: 'Frameworks',       to: '/frameworks',                icon: BookOpen },
      { label: 'Controls',         to: '/compliance/controls',       icon: ListChecks },
      { label: 'Reg Radar',        to: '/reg-radar',                 icon: Globe },
      {
        label: 'Policies', to: '/policies', icon: Scroll,
        children: [
          { label: 'Policy Templates', to: '/compliance/policy-templates' },
          { label: 'Policy Editor',    to: '/policy-editor' },
        ],
      },
      {
        label: 'Evidence', to: '/evidence-sync', icon: FolderOpen,
        children: [
          { label: 'Evidence Hub',   to: '/compliance/evidence' },
          { label: 'Evidence Vault', to: '/evidence-vault' },
          { label: 'Evidence Chain', to: '/evidence-chain' },
        ],
      },
      {
        label: 'Audits', to: '/audits', icon: ClipboardText,
        children: [
          { label: 'Audit Trail',         to: '/audit-trail' },
          { label: 'System Audit Log',    to: '/system-audit-log' },
          { label: 'Compliance Calendar', to: '/calendar' },
        ],
      },
      { label: 'Gap Analysis',         to: '/compliance/gap-analysis', icon: Target },
      { label: 'Document Mgmt',        to: '/documents',               icon: FileText },
      { label: 'Conformity',           to: '/conformity',              icon: Scan },
      { label: 'DPIA Workflow',        to: '/dpia',                    icon: Eye },
      { label: 'Transparency Reports', to: '/transparency-reports',    icon: Broadcast },
      { label: 'Framework Mapping',    to: '/framework-mapping',       icon: ArrowsLeftRight },
      { label: 'Gov. Framework',       to: '/governance-framework',    icon: Compass },
      { label: 'Governance Mesh',      to: '/governance-mesh',         icon: Compass },
      // { label: 'Exam Manager',         to: '/examination-manager',     icon: Buildings },
      { label: 'Control Testing',      to: '/control-testing',         icon: Play },
      { label: 'RoPA', icon: ClipboardText,             to: '/ropa' },
      { label: 'Transfer Impact', icon: Globe,   to: '/tia' },
    ],
  },
  {
    title: 'RISK & RESPONSE',
    items: [
      {
        label: 'Risk Register', to: '/risks', icon: Warning,
        children: [
          { label: 'Risk Matrix', to: '/risk/matrix' },
        ],
      },
      { label: 'Risk Intelligence', to: '/risk-intelligence', icon: ChartLine },
      {
        label: 'Incidents', to: '/risk/incidents', icon: ShieldWarning,
        children: [
          { label: 'Incident Workflow', to: '/incident-workflow' },
          { label: 'Incident Playbooks', to: '/incidents/playbooks' },
        ],
      },
      { label: 'Remediation',       to: '/remediation-tracker',  icon: ClockCounterClockwise },
      { label: 'Exception Mgmt',    to: '/exceptions',            icon: ShieldStar },
      { label: 'Financial Risk',    to: '/financial-risk',        icon: HandCoins },
      { label: 'HITL Reviews',      to: '/hitl',                  icon: UserCircleCheck, badge: 3 },
      { label: 'Approval Flows',    to: '/workflows',             icon: FlowArrow },
      { label: 'Automation Studio', to: '/automation-studio',     icon: Lightning },
      { label: 'Regulator Filings', icon: FileText, to: '/regulator-filings' },
      { label: 'Tabletop Exercises', icon: Target, to: '/tabletop' },
    ],
  },
  {
    title: 'VENDORS & PRIVACY',
    items: [
      {
        label: 'Vendors', to: '/vendors', icon: BuildingOffice,
        children: [
          { label: 'Assessments',    to: '/vendors/assessments' },
          { label: 'SLA Monitor',    to: '/vendors/sla' },
          { label: 'TPRM Workspace', to: '/vendors/tprm' },
        ],
      },
      { label: 'DSR / Rights',   to: '/dsr',                icon: UserList },
      { label: 'Consent Mgmt',   to: '/consent-management', icon: Signature },
      {
        label: 'Supply Chain', to: '/aibom', icon: Package,
        children: [
          { label: 'Provenance Graph',   to: '/provenance' },
          { label: 'Supply Chain Graph', to: '/supply-chain/graph' },
          { label: 'Vendor Upload',      to: '/vendor-upload' },
          { label: 'Attestations',       to: '/supply-chain' },
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
      { label: 'Datasets',          to: '/datasets',          icon: Database },
      { label: 'Data Governance',   to: '/data-governance',   icon: Table },
      { label: 'Data Lineage',      to: '/data-lineage',      icon: GitBranch },
      { label: 'Data Quality',      to: '/data-quality',      icon: CheckCircle },
      { label: 'Carbon Ledger',     to: '/carbon-ledger',     icon: Leaf },
      { label: 'Energy Efficiency', to: '/energy-efficiency', icon: BatteryCharging },
      { label: 'ESG Reports',       to: '/esg-reports',       icon: EsgIcon },
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
      { label: 'Access Control', to: '/access-control', icon: Lock, children: [
        { label: 'Users',       to: '/access-control/users' },
        { label: 'Roles',       to: '/access-control/roles' },
        { label: 'Departments', to: '/access-control/departments' },
      ]},
      { label: 'Committee Mgmt',  to: '/committee',        icon: Users },
      { label: 'Training',        to: '/training',          icon: GraduationCap },
      { label: 'Maturity',        to: '/maturity',          icon: ChartBar },
      { label: 'Continuity',      to: '/continuity',        icon: Lifebuoy },
      { label: 'Ethics Reporting', to: '/ethics-reporting', icon: Megaphone },
      { label: 'Licensing',       to: '/admin/licensing',   icon: Certificate },
      { label: 'Asset Registry', icon: Database,       to: '/assets' },
      { label: 'Identity Governance', icon: UserList, to: '/iga' },
      { label: 'Business Impact', icon: ChartLine,     to: '/bia' },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const SIDEBAR_STATE_KEY = 'sentinel-sidebar-state'

function loadSidebarState(): 'expanded' | 'icon-only' {
  try {
    const v = localStorage.getItem(SIDEBAR_STATE_KEY)
    if (v === 'expanded' || v === 'icon-only') return v
    return 'expanded'
  } catch { return 'expanded' }
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

// ── Theme ─────────────────────────────────────────────────────────────────────

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark:   <Moon size={13} weight='duotone' />,
  light:  <Sun size={13} weight='duotone' />,
  system: <Monitor size={13} weight='duotone' />,
}

const THEME_NEXT_LABEL: Record<Theme, string> = {
  dark:   'Dark mode — click for Light',
  light:  'Light mode — click for System',
  system: 'System mode — click for Dark',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const { theme, cycleTheme } = useTheme()
  const user   = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'AI'

  const handleSignOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const [sidebarState, setSidebarState] = useState<'expanded' | 'icon-only'>(loadSidebarState)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(
    () => findActiveSection(location.pathname)
  )
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const activeItemTo = findActiveItemTo(location.pathname)
    return activeItemTo ? [activeItemTo] : []
  })

  const collapsed = !isMobile && sidebarState === 'icon-only'

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, sidebarState)
  }, [sidebarState])

  // Auto-expand active section & close mobile on nav
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

  const toggleSection = (title: string) =>
    setExpandedSection(prev => prev === title ? null : title)

  const toggleItem = (to: string) =>
    setExpandedItems(prev =>
      prev.includes(to) ? prev.filter(t => t !== to) : [...prev, to]
    )

  const toggleSidebar = () =>
    setSidebarState(prev => prev === 'expanded' ? 'icon-only' : 'expanded')

  // ── Sidebar Panel ─────────────────────────────────────────────────────────

  const panel = (
    <aside className={cn(
      'flex flex-col h-screen bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] border-r border-[hsl(var(--border))] transition-all duration-200 flex-shrink-0 overflow-hidden',
      isMobile
        ? 'w-[220px]'
        : collapsed ? 'w-14' : 'w-[220px]'
    )}>
      {/* Logo + Toggle */}
      {collapsed ? (
        <div className='flex flex-col items-center border-b border-[hsl(var(--border))] flex-shrink-0' style={{ minHeight: '56px' }}>
          <button
            onClick={toggleSidebar}
            className='flex flex-col items-center justify-center w-full gap-1 py-3 text-[hsl(var(--text-3))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-raised))] transition-colors group'
            title='Expand sidebar'
            aria-label='Expand sidebar'
          >
            <List size={18} className='group-hover:text-[hsl(var(--brand))]' />
            <span className='text-[9px] font-semibold uppercase tracking-wider opacity-60 group-hover:opacity-100'>Menu</span>
          </button>
        </div>
      ) : (
        <div className='flex items-center gap-2.5 px-3 h-14 border-b border-[hsl(var(--border))] flex-shrink-0'>
          <img
            src='/sentinel-icon.svg'
            alt='Sentinel'
            className='w-7 h-7 flex-shrink-0'
          />
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate leading-tight'>Sentinel AI</p>
            <p className='text-[10px] text-[hsl(var(--text-4))] leading-tight'>GRC Platform</p>
          </div>
          {isMobile ? (
            <button
              onClick={() => setMobileOpen(false)}
              className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] flex-shrink-0 p-1 transition-colors'
              aria-label='Close sidebar'
            >
              <X size={16} />
            </button>
          ) : (
            <button
              onClick={toggleSidebar}
              className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] flex-shrink-0 p-1 transition-colors'
              title='Collapse sidebar'
              aria-label='Collapse sidebar'
            >
              <SidebarCollapseIcon size={14} />
            </button>
          )}
        </div>
      )}

      {/* Nav items — scrollable body */}
      <div className='flex-1 overflow-y-auto py-2 scrollbar-thin'>
        {NAV.map(section => {
          const sectionActive = isSectionActive(section.items, location.pathname)
          const isExpanded    = expandedSection === section.title

          return (
            <div key={section.title} className='px-2 mb-0.5'>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
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
                    className={cn(
                      'text-[hsl(var(--text-4))] transition-transform duration-150',
                      isExpanded ? 'rotate-0' : '-rotate-90'
                    )}
                  />
                </button>
              )}

              {(collapsed || isExpanded) && (
                <div className='space-y-0.5 mt-0.5'>
                  {section.items.map(item => {
                    const Icon          = item.icon
                    const active        = isItemActive(item.to, location.pathname)
                    const childActive   = item.children?.some(c => isItemActive(c.to, location.pathname))
                    const hasChildren   = !!(item.children && item.children.length > 0)
                    const childrenExpanded = expandedItems.includes(item.to)
                    const isHighlighted = active || (!!childActive && !active)

                    return (
                      <div key={item.to}>
                        {hasChildren ? (
                          <button
                            onClick={() => {
                              if (collapsed) {
                                navigate(item.to)
                              } else {
                                toggleItem(item.to)
                                if (!childrenExpanded) navigate(item.to)
                              }
                            }}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-2 py-1.5 text-[13px] transition-colors group',
                              isHighlighted
                                ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-l-2 border-[hsl(var(--brand))]'
                                : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]',
                              collapsed && 'justify-center px-0'
                            )}
                            title={collapsed ? item.label : undefined}
                          >
                            <Icon
                              size={16}
                              weight={isHighlighted ? 'fill' : 'regular'}
                              className={cn(
                                'flex-shrink-0 transition-colors',
                                isHighlighted
                                  ? 'text-[hsl(var(--brand))]'
                                  : 'text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--text-2))]'
                              )}
                            />
                            {!collapsed && (
                              <>
                                <span className='flex-1 text-left truncate font-[450]'>{item.label}</span>
                                {item.badge != null && (
                                  <span className='bg-[hsl(var(--brand))] text-white text-[10px] px-1.5 py-0.5 font-semibold min-w-[18px] text-center leading-none'>
                                    {item.badge}
                                  </span>
                                )}
                                <CaretDown
                                  size={10}
                                  className={cn(
                                    'flex-shrink-0 transition-transform duration-150',
                                    childrenExpanded ? 'rotate-0' : '-rotate-90'
                                  )}
                                />
                              </>
                            )}
                          </button>
                        ) : (
                          <NavLink
                            to={item.to}
                            className={({ isActive: _isActive }) => cn(
                              'flex items-center gap-2.5 px-2 py-1.5 text-[13px] transition-colors group',
                              isHighlighted
                                ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-l-2 border-[hsl(var(--brand))]'
                                : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]',
                              collapsed && 'justify-center px-0'
                            )}
                            title={collapsed ? item.label : undefined}
                          >
                            <Icon
                              size={16}
                              weight={isHighlighted ? 'fill' : 'regular'}
                              className={cn(
                                'flex-shrink-0 transition-colors',
                                isHighlighted
                                  ? 'text-[hsl(var(--brand))]'
                                  : 'text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--text-2))]'
                              )}
                            />
                            {!collapsed && (
                              <>
                                <span className='flex-1 truncate font-[450]'>{item.label}</span>
                                {item.badge != null && (
                                  <span className='bg-[hsl(var(--brand))] text-white text-[10px] px-1.5 py-0.5 font-semibold min-w-[18px] text-center leading-none'>
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </NavLink>
                        )}

                        {/* Children */}
                        {hasChildren && childrenExpanded && !collapsed && (
                          <div className='ml-6 mt-0.5 space-y-0.5 border-l border-[hsl(var(--border))] pl-2'>
                            {item.children!.map(child => {
                              const childIsActive = isItemActive(child.to, location.pathname)
                              return (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  className={cn(
                                    'flex items-center px-2 py-1 text-[12px] transition-colors',
                                    childIsActive
                                      ? 'text-[hsl(var(--brand))] font-medium'
                                      : 'text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]'
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
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className='border-t border-[hsl(var(--border))] px-3 py-2.5 flex-shrink-0 space-y-1'>
          {/* User row */}
          <div className='flex items-center gap-2 min-w-0'>
            <div className='w-6 h-6 rounded-full bg-[hsl(var(--brand-subtle))] flex items-center justify-center flex-shrink-0'>
              <span className='text-[10px] font-bold text-[hsl(var(--brand))]'>{initials}</span>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-[11px] font-medium text-[hsl(var(--text-2))] truncate leading-tight'>
                {user?.name ?? 'User'}
              </p>
              <p className='text-[10px] text-[hsl(var(--text-4))] truncate leading-tight'>
                {user?.role ?? 'Member'}
              </p>
            </div>
            <div className='flex items-center gap-1 flex-shrink-0'>
              {/* Theme toggle */}
              <button
                onClick={cycleTheme}
                className='p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
                title={THEME_NEXT_LABEL[theme]}
                aria-label={THEME_NEXT_LABEL[theme]}
              >
                {THEME_ICONS[theme]}
              </button>
              {/* Settings */}
              <NavLink
                to='/settings'
                className='p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
                title='Settings'
              >
                <Gear size={13} />
              </NavLink>
              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className='p-1 text-[hsl(var(--text-4))] hover:text-red-500 hover:bg-[hsl(var(--bg-raised))] transition-colors'
                title='Sign out'
                aria-label='Sign out'
              >
                <SignOut size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed footer */}
      {collapsed && (
        <div className='border-t border-[hsl(var(--border))] py-2 flex flex-col items-center gap-1 flex-shrink-0'>
          <button
            onClick={cycleTheme}
            className='p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
            title={THEME_NEXT_LABEL[theme]}
          >
            {THEME_ICONS[theme]}
          </button>
          <NavLink
            to='/settings'
            className='p-1.5 text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
            title='Settings'
          >
            <Gear size={13} />
          </NavLink>
          <button
            onClick={handleSignOut}
            className='p-1.5 text-[hsl(var(--text-4))] hover:text-red-500 hover:bg-[hsl(var(--bg-raised))] transition-colors'
            title='Sign out'
          >
            <SignOut size={13} />
          </button>
        </div>
      )}
    </aside>
  )

  // ── Mobile overlay ─────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <>
        {/* Hamburger button */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className='fixed top-3 left-3 z-50 p-2 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] shadow-md text-[hsl(var(--text-2))] hover:text-[hsl(var(--brand))] transition-colors'
            aria-label='Open menu'
          >
            <List size={18} />
          </button>
        )}

        {/* Overlay */}
        {mobileOpen && (
          <>
            <div
              className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm'
              onClick={() => setMobileOpen(false)}
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
