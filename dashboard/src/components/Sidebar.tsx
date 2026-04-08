import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  SquaresFour, Bell, FileText, Shield, BookOpen, ChartBar,
  UserCircleCheck, Robot, Rss, Database, BuildingOffice,
  Warning, Scales, FolderOpen,
  ShieldCheck, LockOpen, Lock, Gear,
  SignOut, CaretDown, CaretRight, Sun, Moon,
  List, X, Brain, Briefcase, Eye,
  ListChecks, TreeStructure, Lightbulb, GlobeHemisphereWest,
  Table, Target, Sword, Scan, Key, GameController,
  Gauge, Sliders, CurrencyDollar, ArrowsLeftRight, Wrench, UserGear,
  ClockCounterClockwise, DownloadSimple, BellRinging,
  ClipboardText, ShieldWarning, GraduationCap, Lifebuoy, CalendarBlank,
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { useTheme } from '../providers/ThemeProvider'

// ── Navigation Structure ──────────────────────────────────────────────────────

interface NavSubItem {
  label: string
  to: string
  icon?: any
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
  ]},
  { title: 'AI GOVERNANCE', items: [
    { label: 'Model Inventory', to: '/models/inventory', icon: Robot, children: [
      { label: 'Model Lifecycle', to: '/models/lifecycle' },
    ]},
    { label: 'Trust Engine', to: '/trust-engine', icon: Gauge, children: [
      { label: 'Guardrails', to: '/trust-engine/guardrails' },
      { label: 'Live Traces', to: '/trust-engine/traces' },
      { label: 'Configuration', to: '/trust-engine/config' },
    ]},
    { label: 'Agent Discovery', to: '/agents', icon: Brain, badge: 12, children: [
      { label: 'Shadow AI', to: '/agents/shadow-ai' },
    ]},
    { label: 'Bias Audits', to: '/bias-audits', icon: Scales },
  ]},
  { title: 'COMPLIANCE', items: [
    { label: 'Frameworks', to: '/frameworks', icon: BookOpen },
    { label: 'Controls', to: '/compliance/controls', icon: ListChecks },
    { label: 'Audit Management', to: '/audits', icon: ClipboardText },
    { label: 'Evidence Sync', to: '/evidence-sync', icon: FolderOpen },
    { label: 'Compliance Calendar', to: '/calendar', icon: CalendarBlank },
    { label: 'Document Management', to: '/documents', icon: FileText },
  ]},
  { title: 'RISK & INCIDENTS', items: [
    { label: 'Risk Register', to: '/risks', icon: Warning },
    { label: 'Incidents', to: '/risk/incidents', icon: ShieldWarning },
    { label: 'Exception Management', to: '/exceptions', icon: ShieldWarning },
  ]},
  { title: 'OPERATIONS', items: [
    { label: 'HITL Reviews', to: '/hitl', icon: UserCircleCheck, badge: 3 },
    { label: 'Vendors', to: '/vendors', icon: BuildingOffice },
    { label: 'Regulatory Radar', to: '/reg-radar', icon: GlobeHemisphereWest },
  ]},
  { title: 'ORGANIZATION', items: [
    { label: 'Training & Awareness', to: '/training', icon: GraduationCap },
    { label: 'Access Control', to: '/access-control', icon: Lock },
    { label: 'Benchmarking & Maturity', to: '/maturity', icon: ChartBar },
    { label: 'Business Continuity', to: '/continuity', icon: Lifebuoy },
  ]},
  { title: 'SYSTEM', items: [
    { label: 'Settings', to: '/settings', icon: Gear },
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

/**
 * Returns true if the nav item's route is active for the current path.
 */
function isItemActive(to: string, pathname: string): boolean {
  if (to === '/overview') {
    return pathname === '/' || pathname === '/overview'
  }
  if (pathname === to) return true
  return pathname.startsWith(to + '/')
}

/**
 * Returns true if any item in a section is active (used for auto-expand).
 */
function isSectionActive(items: NavItem[], pathname: string): boolean {
  return items.some(item => {
    if (isItemActive(item.to, pathname)) return true
    if (item.children?.some(c => isItemActive(c.to, pathname))) return true
    return false
  })
}

function isParentOrChildActive(item: NavItem, pathname: string): boolean {
  if (isItemActive(item.to, pathname)) return true
  if (item.children?.some(c => isItemActive(c.to, pathname))) return true
  return false
}

const LOGO_URL = 'https://dignep.com.np/wp-content/uploads/2026/03/sentinel_logo.svg'

export default function Sidebar() {
  const location = useLocation()
  const [sidebarState, setSidebarState] = useState<'expanded' | 'icon-only' | 'hidden'>(loadSidebarState)
  const [expandedSections, setExpandedSections] = useState<string[]>(loadSections)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [logoError, setLogoError] = useState(false)

  const collapsed = sidebarState === 'icon-only'
  const hidden = sidebarState === 'hidden'

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections))
  }, [expandedSections])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, sidebarState)
  }, [sidebarState])

  // Auto-expand sections that contain the currently active route
  useEffect(() => {
    const activeSections = NAV
      .filter(section => isSectionActive(section.items, location.pathname))
      .map(section => section.title)

    if (activeSections.length > 0) {
      setExpandedSections(prev => {
        const missing = activeSections.filter(title => !prev.includes(title))
        if (missing.length === 0) return prev
        return [...prev, ...missing]
      })
    }

    // Auto-expand parent items whose children are active
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

  const toggleItemExpand = (to: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedItems(prev => prev.includes(to) ? prev.filter(t => t !== to) : [...prev, to])
  }

  const cycleSidebar = () => {
    setSidebarState(prev => {
      if (prev === 'expanded') return 'icon-only'
      if (prev === 'icon-only') return 'hidden'
      return 'expanded'
    })
  }

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  if (hidden) {
    return (
      <button
        onClick={() => setSidebarState('expanded')}
        className='fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))] transition-colors'
        title='Show sidebar'
      >
        <List size={18} />
      </button>
    )
  }

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] border-r border-[hsl(var(--border))] transition-all duration-200 flex-shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo + Toggle */}
      <div className='flex items-center gap-3 px-4 h-14 border-b border-[hsl(var(--border))]'>
        {!logoError ? (
          <img
            src={LOGO_URL}
            alt='Sentinel'
            className='w-8 h-8 flex-shrink-0'
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className='w-8 h-8 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
            <ShieldCheck size={18} weight='fill' className='text-white' />
          </div>
        )}
        {!collapsed && (
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate'>Sentinel AI</p>
            <p className='text-[10px] text-[hsl(var(--text-4))]'>GRC Platform</p>
          </div>
        )}
        <button
          onClick={cycleSidebar}
          className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] ml-auto'
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <CaretRight size={14}/> : <X size={14}/>}
        </button>
      </div>

      {/* Nav items */}
      <div className='flex-1 overflow-y-auto py-2'>
        {NAV.map(section => {
          const sectionActive = isSectionActive(section.items, location.pathname)
          const isExpanded = expandedSections.includes(section.title)

          return (
            <div key={section.title} className='px-2 mb-1'>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className='flex items-center justify-between w-full px-2 py-1'
                >
                  <span className={cn(
                    'text-[10px] font-semibold tracking-wider uppercase',
                    sectionActive ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))]'
                  )}>
                    {section.title}
                  </span>
                  {isExpanded
                    ? <CaretDown size={10} className='text-[hsl(var(--text-4))]'/>
                    : <CaretRight size={10} className='text-[hsl(var(--text-4))]'/>
                  }
                </button>
              )}
              {(collapsed || isExpanded) && (
                <div className='space-y-0.5'>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = isItemActive(item.to, location.pathname)
                    const parentActive = isParentOrChildActive(item, location.pathname)
                    const hasChildren = item.children && item.children.length > 0
                    const childrenExpanded = expandedItems.includes(item.to)

                    return (
                      <div key={item.to}>
                        {/* Primary nav item */}
                        <div className='flex items-center'>
                          <NavLink
                            to={item.to}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 text-sm transition-colors group flex-1 min-w-0',
                              active
                                ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-l-2 border-[hsl(var(--brand))]'
                                : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]',
                              collapsed && 'justify-center px-2'
                            )}
                            title={collapsed ? item.label : undefined}
                          >
                            <Icon
                              size={18}
                              weight={active ? 'fill' : 'duotone'}
                              className={cn(
                                'flex-shrink-0',
                                active ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--text-2))]'
                              )}
                            />
                            {!collapsed && (
                              <>
                                <span className='flex-1 truncate'>{item.label}</span>
                                {item.badge != null && (
                                  <span className='bg-[hsl(var(--brand))] text-white text-[10px] px-1.5 py-0.5 font-medium min-w-[20px] text-center'>
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </NavLink>
                          {!collapsed && hasChildren && (
                            <button
                              onClick={(e) => toggleItemExpand(item.to, e)}
                              className='px-2 py-2 text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] flex-shrink-0'
                            >
                              {childrenExpanded
                                ? <CaretDown size={10}/>
                                : <CaretRight size={10}/>
                              }
                            </button>
                          )}
                        </div>

                        {/* Sub-items (children) */}
                        {!collapsed && hasChildren && childrenExpanded && (
                          <div className='ml-4 space-y-0.5'>
                            {item.children!.map(child => {
                              const childActive = isItemActive(child.to, location.pathname)
                              return (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  className={cn(
                                    'flex items-center gap-2 pl-4 pr-3 py-1.5 text-xs transition-colors',
                                    childActive
                                      ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-l-2 border-[hsl(var(--brand))] opacity-90'
                                      : 'text-[hsl(var(--text-4))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-2))]'
                                  )}
                                >
                                  <span className='w-1.5 h-1.5 border border-current opacity-50 flex-shrink-0' />
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
      <div className='border-t border-[hsl(var(--border))] p-3 space-y-1'>
        <button
          onClick={toggleTheme}
          className={cn(
            'flex items-center justify-center w-8 h-8 mx-auto text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors',
            !collapsed && 'ml-0'
          )}
          title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun size={18} weight='duotone'/> : <Moon size={18} weight='duotone'/>}
        </button>
        <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center px-2')}>
          <div data-avatar='true' className='w-8 h-8 rounded-full bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
            <span className='text-xs font-bold text-white'>SC</span>
          </div>
          {!collapsed && (
            <>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium text-[hsl(var(--text-1))] truncate'>Sarah Chen</p>
                <p className='text-[10px] text-[hsl(var(--text-4))]'>CISO</p>
              </div>
              <button className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]' title='Sign out'>
                <SignOut size={14}/>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
export { default as AppSidebar } from "./Sidebar"
