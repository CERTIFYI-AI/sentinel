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
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { useTheme, type Theme } from '../providers/theme'
import { useIsMobile } from '../hooks/use-mobile'

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

// ── Navigation Structure (7 sections, was 13) ─────────────────────────────────

const NAV: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard',    to: '/overview',   icon: SquaresFour },
      { label: 'Tasks',        to: '/tasks',       icon: CheckSquare },
      { label: 'Notifications',to: '/notifications',icon: Bell },
      { label: 'Reporting',    to: '/reporting',   icon: ChartPieSlice },
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
          { label: 'Conformity',       to: '/conformity' },
          { label: 'Model Efficiency', to: '/model-efficiency' },
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
      { label: 'Bias Audits',         to: '/bias-audits', icon: Scales },
      { label: 'AI Impact',           to: '/aiia',         icon: FileMagnifyingGlass },
      { label: 'Use Cases',           to: '/use-cases',    icon: Briefcase },
      { label: 'Prompt Registry',     to: '/prompt-registry', icon: ChatTeardropText },
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
      {
        label: 'Evaluations', to: '/evals', icon: ChartBar,
        children: [
          { label: 'Eval Techniques', to: '/evals/techniques' },
          { label: 'Benchmark',       to: '/evals/benchmark' },
        ],
      },
    ],
  },
  {
    title: 'COMPLIANCE',
    items: [
      { label: 'Dashboard',    to: '/compliance',          icon: ChartBar },
      { label: 'Frameworks',   to: '/frameworks',           icon: BookOpen },
      { label: 'Controls',     to: '/compliance/controls',  icon: ListChecks },
      { label: 'Reg Radar',    to: '/reg-radar',            icon: Globe },
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
        ],
      },
      {
        label: 'Audits', to: '/audits', icon: ClipboardText,
        children: [
          { label: 'Audit Trail',        to: '/audit-trail' },
          { label: 'System Audit Log',   to: '/system-audit-log' },
          { label: 'Compliance Calendar',to: '/calendar' },
        ],
      },
      { label: 'Gap Analysis',       to: '/compliance/gap-analysis', icon: Target },
      { label: 'Document Mgmt',      to: '/documents',               icon: FileText },
      { label: 'Conformity Assess',  to: '/conformity',              icon: Scan },
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
      {
        label: 'Incidents', to: '/risk/incidents', icon: ShieldWarning,
        children: [
          { label: 'Incident Workflow', to: '/incident-workflow' },
          { label: 'Incident Playbooks',to: '/incidents/playbooks' },
        ],
      },
      { label: 'Remediation',      to: '/remediation-tracker', icon: ClockCounterClockwise },
      { label: 'Exception Mgmt',   to: '/exceptions',           icon: ShieldStar },
      { label: 'Financial Risk',   to: '/financial-risk',       icon: HandCoins },
      { label: 'HITL Reviews',     to: '/hitl',                 icon: UserCircleCheck, badge: 3 },
      { label: 'Approval Flows',   to: '/workflows',            icon: FlowArrow },
    ],
  },
  {
    title: 'VENDORS & PRIVACY',
    items: [
      {
        label: 'Vendors', to: '/vendors', icon: BuildingOffice,
        children: [
          { label: 'Assessments',   to: '/vendors/assessments' },
          { label: 'SLA Monitor',   to: '/vendors/sla' },
          { label: 'TPRM Workspace',to: '/vendors/tprm' },
        ],
      },
      { label: 'DSR / Rights',      to: '/dsr',                icon: UserList },
      { label: 'Consent Mgmt',      to: '/consent-management', icon: CheckSquare },
      {
        label: 'Supply Chain', to: '/aibom', icon: Package,
        children: [
          { label: 'Provenance Graph',   to: '/provenance' },
          { label: 'Vendor Upload',      to: '/vendor-upload' },
          { label: 'Attestations',       to: '/supply-chain' },
        ],
      },
      { label: 'Integrations',   to: '/integrations', icon: Plugs },
      { label: 'Export Center',  to: '/export',        icon: DownloadSimple },
    ],
  },
  {
    title: 'DATA & SUSTAINABILITY',
    items: [
      { label: 'Datasets',         to: '/datasets',         icon: Database },
      { label: 'Data Governance',  to: '/data-governance',  icon: Table },
      { label: 'Data Lineage',     to: '/data-lineage',     icon: ChartLine },
      { label: 'Carbon Ledger',    to: '/carbon-ledger',    icon: Leaf },
      { label: 'Energy Efficiency',to: '/energy-efficiency',icon: Lightning },
      { label: 'ESG Reports',      to: '/esg-reports',      icon: EsgIcon },
    ],
  },
  {
    title: 'ORGANIZATION',
    items: [
      { label: 'Access Control',  to: '/access-control', icon: Lock },
      { label: 'Committee Mgmt',  to: '/committee',       icon: Users },
      { label: 'Training',        to: '/training',         icon: GraduationCap },
      { label: 'Maturity',        to: '/maturity',         icon: ChartBar },
      { label: 'Continuity',      to: '/continuity',       icon: Lifebuoy },
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

  const [sidebarState, setSidebarState] = useState<'expanded' | 'icon-only'>(loadSidebarState)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>(
    () => findActiveSection(location.pathname)
  )
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const activeItemTo = findActiveItemTo(location.pathname)
    return activeItemTo ? [activeItemTo] : []
  })
  const [logoError, setLogoError] = useState(false)

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
    // Close mobile overlay on route change
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

  // ── Mobile hamburger button (rendered in TopHeader via portal is complex;
  //    instead render a floating hamburger over content on mobile) ─────────────

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
          {!logoError ? (
            <img
              src='https://dignep.com.np/wp-content/uploads/2026/03/sentinel_logo.svg'
              alt='Sentinel'
              className='w-7 h-7 flex-shrink-0'
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
              <ShieldCheck size={16} weight='fill' className='text-white' />
            </div>
          )}
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
                                    childrenExpanded ? 'rotate-0' : '-rotate-90',
                                    isHighlighted ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))]'
                                  )}
                                />
                              </>
                            )}
                          </button>
                        ) : (
                          <NavLink
                            to={item.to}
                            className={({ isActive }) => cn(
                              'flex items-center gap-2.5 px-2 py-1.5 text-[13px] transition-colors group',
                              isActive
                                ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-l-2 border-[hsl(var(--brand))]'
                                : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]',
                              collapsed && 'justify-center px-0'
                            )}
                            title={collapsed ? item.label : undefined}
                          >
                            <Icon
                              size={16}
                              weight={active ? 'fill' : 'regular'}
                              className={cn(
                                'flex-shrink-0 transition-colors',
                                active
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

                        {/* Sub-items */}
                        {!collapsed && hasChildren && childrenExpanded && (
                          <div className='ml-5 mt-0.5 space-y-0.5 border-l border-[hsl(var(--border))]'>
                            {item.children!.map(child => {
                              const cActive = isItemActive(child.to, location.pathname)
                              return (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  className={cn(
                                    'flex items-center gap-2 pl-3 pr-2 py-1.5 text-[12px] transition-colors',
                                    cActive
                                      ? 'text-[hsl(var(--brand))] font-medium'
                                      : 'text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))]'
                                  )}
                                >
                                  <span className={cn(
                                    'w-1 h-1 flex-shrink-0 rounded-full',
                                    cActive ? 'bg-[hsl(var(--brand))]' : 'bg-current opacity-40'
                                  )} />
                                  <span className='truncate'>{child.label}</span>
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

      {/* Footer — pinned: AI Advisor · Settings · Profile · Theme */}
      <div className='border-t border-[hsl(var(--border))] flex-shrink-0'>
        {collapsed ? (
          <div className='flex flex-col items-center gap-1 py-2'>
            <button
              onClick={() => navigate('/ai-advisor')}
              className='flex items-center justify-center w-8 h-8 text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--brand))] transition-colors'
              title='AI Advisor'
              aria-label='AI Advisor'
            >
              <AdvisorIcon size={14} />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className='flex items-center justify-center w-8 h-8 text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors'
              title='Settings'
              aria-label='Settings'
            >
              <Gear size={14} />
            </button>
            <button
              onClick={cycleTheme}
              className='flex items-center justify-center w-8 h-8 text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors'
              title={THEME_NEXT_LABEL[theme]}
              aria-label={THEME_NEXT_LABEL[theme]}
            >
              {THEME_ICONS[theme]}
            </button>
            <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center mt-1'>
              <span className='text-[10px] font-bold text-white'>SC</span>
            </div>
          </div>
        ) : (
          <div className='p-2 space-y-0.5'>
            {/* Quick-access footer buttons */}
            <div className='flex items-center gap-1'>
              <button
                onClick={() => navigate('/ai-advisor')}
                className={cn(
                  'flex-1 flex items-center gap-2 px-2 py-1.5 text-[12px] transition-colors',
                  isItemActive('/ai-advisor', location.pathname)
                    ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]'
                    : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]'
                )}
              >
                <AdvisorIcon size={14} className='flex-shrink-0' />
                <span className='font-[450]'>AI Advisor</span>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className={cn(
                  'flex items-center justify-center w-7 h-7 transition-colors',
                  isItemActive('/settings', location.pathname)
                    ? 'text-[hsl(var(--brand))]'
                    : 'text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] hover:bg-[hsl(var(--bg-raised))]'
                )}
                title='Settings'
                aria-label='Settings'
              >
                <Gear size={13} />
              </button>
              <button
                onClick={cycleTheme}
                className='flex items-center justify-center w-7 h-7 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
                title={THEME_NEXT_LABEL[theme]}
                aria-label={THEME_NEXT_LABEL[theme]}
              >
                {THEME_ICONS[theme]}
              </button>
            </div>
            {/* User profile */}
            <div className='flex items-center gap-2 px-1.5 py-1.5 border-t border-[hsl(var(--border))]'>
              <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
                <span className='text-[10px] font-bold text-white'>SC</span>
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-[11px] font-semibold text-[hsl(var(--text-1))] truncate leading-tight'>Sarah Chen</p>
                <p className='text-[10px] text-[hsl(var(--text-4))] leading-tight'>CISO</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className='p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
                title='Settings'
                aria-label='Settings'
              >
                <SignOut size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )

  // ── Mobile: overlay drawer ────────────────────────────────────────────────

  if (isMobile) {
    return (
      <>
        {/* Hamburger trigger (absolute-positioned top-left over content) */}
        {!mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className='fixed top-3.5 left-3 z-40 flex items-center justify-center w-9 h-9 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-1))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
            aria-label='Open navigation'
          >
            <List size={18} />
          </button>
        )}

        {/* Backdrop */}
        {mobileOpen && (
          <div
            className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm'
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <div className={cn(
          'fixed top-0 left-0 h-full z-50 transform transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {panel}
        </div>
      </>
    )
  }

  // ── Desktop: inline sidebar ───────────────────────────────────────────────

  return panel
}
