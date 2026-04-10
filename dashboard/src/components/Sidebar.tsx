import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  SquaresFour, Bell, FileText, Shield, BookOpen, ChartBar,
  UserCircleCheck, Robot, Database, BuildingOffice,
  Warning, Scales, FolderOpen,
  ShieldCheck, Lock, Gear,
  SignOut, CaretDown, Sun, Moon, Monitor,
  List, X, Brain, Briefcase, Eye,
  ListChecks, Lightbulb, GlobeHemisphereWest,
  Table, Target, Scan,
  Gauge,
  ClockCounterClockwise, DownloadSimple,
  ClipboardText, ShieldWarning, GraduationCap, Lifebuoy, CalendarBlank,
  FileMagnifyingGlass, FlowArrow,
  ChartPieSlice, Scroll, ChatTeardropText, CheckSquare,
  ArrowRight,
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { useTheme, type Theme } from '../providers/theme'

interface NavSubItem {
  label: string
  to: string
}

interface NavItem {
  label: string
  to: string
  icon: any
  badge?: number
  children?: NavSubItem[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  { title: 'OVERVIEW', items: [
    { label: 'Dashboard', to: '/overview', icon: SquaresFour },
    { label: 'Tasks', to: '/tasks', icon: CheckSquare },
    { label: 'Notifications', to: '/notifications', icon: Bell },
    { label: 'Reporting', to: '/reporting', icon: ChartPieSlice },
  ]},
  { title: 'AI GOVERNANCE', items: [
    { label: 'Model Inventory', to: '/models/inventory', icon: Robot, children: [
      { label: 'Model Lifecycle', to: '/models/lifecycle' },
    ]},
    { label: 'Trust Engine', to: '/trust-engine', icon: Gauge, children: [
      { label: 'Guardrails', to: '/trust-engine/guardrails' },
      { label: 'Live Traces', to: '/trust-engine/traces' },
      { label: 'Cost & Tokens', to: '/trust-engine/costs' },
      { label: 'Fallback Log', to: '/trust-engine/fallback' },
      { label: 'Tool Monitor', to: '/trust-engine/tools' },
      { label: 'Configuration', to: '/trust-engine/config' },
    ]},
    { label: 'Agent Discovery', to: '/agents', icon: Brain, badge: 3, children: [
      { label: 'Shadow AI', to: '/agents/shadow-ai' },
    ]},
    { label: 'Bias Audits', to: '/bias-audits', icon: Scales },
    { label: 'AI Impact Assessments', to: '/aiia', icon: FileMagnifyingGlass },
    { label: 'Explainability', to: '/explainability', icon: Lightbulb },
    { label: 'Use Cases', to: '/use-cases', icon: Briefcase },
    { label: 'Prompt Registry', to: '/prompt-registry', icon: ChatTeardropText },
  ]},
  { title: 'SECURITY', items: [
    { label: 'Security Overview', to: '/security', icon: ShieldCheck, children: [
      { label: 'Threat Feed', to: '/security/threats' },
      { label: 'Scan Center', to: '/security/scans' },
      { label: 'Attack Surface', to: '/security/attack-surface' },
      { label: 'Vulnerabilities', to: '/security/vulnerabilities' },
      { label: 'Red Team Lab', to: '/security/red-team' },
      { label: 'Policy Firewall', to: '/security/policies' },
      { label: 'Keys Vault', to: '/security/keys' },
      { label: 'Model Arena', to: '/security/model-arena' },
      { label: 'Reports', to: '/security/reports' },
    ]},
  ]},
  { title: 'COMPLIANCE', items: [
    { label: 'Compliance Dashboard', to: '/compliance', icon: ChartBar },
    { label: 'Frameworks', to: '/frameworks', icon: BookOpen },
    { label: 'Controls', to: '/compliance/controls', icon: ListChecks },
    { label: 'Audit Management', to: '/audits', icon: ClipboardText },
    { label: 'Evidence', to: '/evidence-sync', icon: FolderOpen, children: [
      { label: 'Evidence Hub', to: '/compliance/evidence' },
      { label: 'Evidence Vault', to: '/evidence-vault' },
    ]},
    { label: 'Gap Analysis', to: '/compliance/gap-analysis', icon: Target },
    { label: 'Conformity Assessment', to: '/conformity', icon: Scan },
    { label: 'Policies', to: '/policies', icon: Scroll, children: [
      { label: 'Policy Templates', to: '/compliance/policy-templates' },
      { label: 'Policy Editor', to: '/policy-editor' },
    ]},
    { label: 'Compliance Calendar', to: '/calendar', icon: CalendarBlank },
    { label: 'Document Management', to: '/documents', icon: FileText },
    { label: 'Audit Trail', to: '/audit-trail', icon: ClockCounterClockwise },
  ]},
  { title: 'RISK & INCIDENTS', items: [
    { label: 'Risk Register', to: '/risks', icon: Warning, children: [
      { label: 'Risk Matrix', to: '/risk/matrix' },
    ]},
    { label: 'Incidents', to: '/risk/incidents', icon: ShieldWarning, children: [
      { label: 'Incident Workflow', to: '/incident-workflow' },
      { label: 'Remediation', to: '/risk/remediation' },
      { label: 'Remediation Tracker', to: '/remediation-tracker' },
    ]},
    { label: 'Exception Management', to: '/exceptions', icon: ShieldWarning },
  ]},
  { title: 'EVALUATIONS', items: [
    { label: 'Quality Metrics', to: '/evals', icon: Gauge, children: [
      { label: 'Eval Techniques', to: '/evals/techniques' },
      { label: 'Benchmark', to: '/evals/benchmark' },
    ]},
    { label: 'Datasets', to: '/datasets', icon: Database },
    { label: 'Data Governance', to: '/data-governance', icon: Table },
  ]},
  { title: 'OPERATIONS', items: [
    { label: 'HITL Reviews', to: '/hitl', icon: UserCircleCheck, badge: 3 },
    { label: 'Vendors', to: '/vendors', icon: BuildingOffice },
    { label: 'Regulatory Radar', to: '/reg-radar', icon: GlobeHemisphereWest },
    { label: 'Approval Workflows', to: '/workflows', icon: FlowArrow },
    { label: 'Export Center', to: '/export', icon: DownloadSimple },
  ]},
  { title: 'ORGANIZATION', items: [
    { label: 'Training & Awareness', to: '/training', icon: GraduationCap },
    { label: 'Access Control', to: '/access-control', icon: Lock },
    { label: 'Benchmarking & Maturity', to: '/maturity', icon: ChartBar },
    { label: 'Business Continuity', to: '/continuity', icon: Lifebuoy },
  ]},
  { title: 'SYSTEM', items: [
    { label: 'Settings', to: '/settings', icon: Gear },
    { label: 'Import Sample Data', to: '/import-data', icon: Database },
    { label: 'AI Advisor', to: '/ai-advisor', icon: Lightbulb },
  ]},
]

const STORAGE_KEY = 'sentinel-sidebar-sections'
const SIDEBAR_STATE_KEY = 'sentinel-sidebar-state'

function loadSections(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || NAV.map(s => s.title) }
  catch { return NAV.map(s => s.title) }
}

function loadSidebarState(): 'expanded' | 'icon-only' | 'hidden' {
  try {
    const v = localStorage.getItem(SIDEBAR_STATE_KEY)
    if (v === 'expanded' || v === 'icon-only' || v === 'hidden') return v
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

const LOGO_URL = 'https://dignep.com.np/wp-content/uploads/2026/03/sentinel_logo.svg'

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark: <Moon size={13} weight='duotone' />,
  light: <Sun size={13} weight='duotone' />,
  system: <Monitor size={13} weight='duotone' />,
}

const THEME_NEXT_LABEL: Record<Theme, string> = {
  dark: 'Dark mode — click for Light',
  light: 'Light mode — click for System',
  system: 'System mode — click for Dark',
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarState, setSidebarState] = useState<'expanded' | 'icon-only' | 'hidden'>(loadSidebarState)
  const [expandedSections, setExpandedSections] = useState<string[]>(loadSections)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const { theme, cycleTheme } = useTheme()
  const [logoError, setLogoError] = useState(false)

  const collapsed = sidebarState === 'icon-only'
  const hidden = sidebarState === 'hidden'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections))
  }, [expandedSections])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, sidebarState)
  }, [sidebarState])

  // Auto-expand sections and items for active route
  useEffect(() => {
    const activeSections = NAV
      .filter(section => isSectionActive(section.items, location.pathname))
      .map(section => section.title)

    if (activeSections.length > 0) {
      setExpandedSections(prev => {
        const missing = activeSections.filter(t => !prev.includes(t))
        return missing.length === 0 ? prev : [...prev, ...missing]
      })
    }

    NAV.forEach(section => {
      section.items.forEach(item => {
        if (item.children?.some(c => isItemActive(c.to, location.pathname))) {
          setExpandedItems(prev => prev.includes(item.to) ? prev : [...prev, item.to])
        }
      })
    })
  }, [location.pathname])

  const toggleSection = (title: string) =>
    setExpandedSections(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])

  const toggleItem = (to: string) =>
    setExpandedItems(prev => prev.includes(to) ? prev.filter(t => t !== to) : [...prev, to])

  const cycleSidebar = () => setSidebarState(prev =>
    prev === 'expanded' ? 'icon-only' : prev === 'icon-only' ? 'hidden' : 'expanded'
  )

  if (hidden) {
    return (
      <button
        onClick={() => setSidebarState('expanded')}
        className='fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] shadow-[var(--shadow-sm)] transition-colors'
        title='Show navigation'
        aria-label='Show navigation'
      >
        <List size={16} />
      </button>
    )
  }

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] border-r border-[hsl(var(--border))] transition-all duration-200 flex-shrink-0',
      collapsed ? 'w-14' : 'w-[220px]'
    )}>
      {/* Logo + Toggle */}
      <div className='flex items-center gap-2.5 px-3 h-14 border-b border-[hsl(var(--border))]'>
        {!logoError ? (
          <img
            src={LOGO_URL}
            alt='Sentinel'
            className='w-7 h-7 flex-shrink-0'
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
            <ShieldCheck size={16} weight='fill' className='text-white' />
          </div>
        )}
        {!collapsed && (
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate leading-tight'>Sentinel AI</p>
            <p className='text-[10px] text-[hsl(var(--text-4))] leading-tight'>GRC Platform</p>
          </div>
        )}
        <button
          onClick={cycleSidebar}
          className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] ml-auto flex-shrink-0 p-1'
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <List size={14}/> : <X size={14}/>}
        </button>
      </div>

      {/* Nav items */}
      <div className='flex-1 overflow-y-auto py-2 scrollbar-thin'>
        {NAV.map(section => {
          const sectionActive = isSectionActive(section.items, location.pathname)
          const isExpanded = expandedSections.includes(section.title)

          return (
            <div key={section.title} className='px-2 mb-0.5'>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className='flex items-center justify-between w-full px-1.5 py-1 group'
                >
                  <span className={cn(
                    'text-[10px] font-semibold tracking-wider uppercase',
                    sectionActive ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))]'
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
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = isItemActive(item.to, location.pathname)
                    const childActive = item.children?.some(c => isItemActive(c.to, location.pathname))
                    const hasChildren = !!(item.children && item.children.length > 0)
                    const childrenExpanded = expandedItems.includes(item.to)
                    const isHighlighted = active || (!!childActive && !active)

                    return (
                      <div key={item.to}>
                        {/* Parent nav row — BUTTON when has children, NavLink when leaf */}
                        {hasChildren ? (
                          <button
                            onClick={() => {
                              toggleItem(item.to)
                              // Navigate to parent page when expanding (not collapsing)
                              if (!childrenExpanded) navigate(item.to)
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

      {/* Footer */}
      <div className='border-t border-[hsl(var(--border))] p-2'>
        {collapsed ? (
          <div className='flex flex-col items-center gap-2 py-1'>
            <button
              onClick={cycleTheme}
              className='flex items-center justify-center w-8 h-8 text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors'
              title={THEME_NEXT_LABEL[theme]}
              aria-label={THEME_NEXT_LABEL[theme]}
            >
              {THEME_ICONS[theme]}
            </button>
            <div className='w-8 h-8 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
              <span className='text-xs font-bold text-white'>SC</span>
            </div>
          </div>
        ) : (
          <div className='flex items-center gap-2 px-1.5 py-1'>
            <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
              <span className='text-[11px] font-bold text-white'>SC</span>
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-[12px] font-semibold text-[hsl(var(--text-1))] truncate leading-tight'>Sarah Chen</p>
              <p className='text-[10px] text-[hsl(var(--text-4))] leading-tight'>CISO</p>
            </div>
            <div className='flex items-center gap-0.5 flex-shrink-0'>
              <button
                onClick={cycleTheme}
                className='flex items-center justify-center w-7 h-7 text-[hsl(var(--text-4))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-2))] transition-colors'
                title={THEME_NEXT_LABEL[theme]}
                aria-label={THEME_NEXT_LABEL[theme]}
              >
                {THEME_ICONS[theme]}
              </button>
              <button
                className='flex items-center justify-center w-7 h-7 text-[hsl(var(--text-4))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-2))] transition-colors'
                title='Sign out'
                aria-label='Sign out'
              >
                <SignOut size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
