import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  SquaresFour, Bell, FileText, Shield, BookOpen, ChartBar,
  UserCircleCheck, Robot, Rss, Database, BuildingOffice,
  Warning, Scales, FolderOpen,
  ShieldCheck, LockOpen, Lock, Gear,
  SignOut, CaretDown, CaretRight, Sun, Moon
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { useTheme } from '../providers/ThemeProvider'

const NAV = [
  { title: 'OVERVIEW', items: [
    { label: 'Dashboard', to: '/overview', icon: SquaresFour },
    { label: 'Notifications', to: '/notifications', icon: Bell },
  ]},
  { title: 'GOVERNANCE', items: [
    { label: 'Compliance', to: '/compliance', icon: Shield },
    { label: 'Policy Manager', to: '/compliance/policies', icon: FileText },
    { label: 'Controls', to: '/compliance/controls', icon: Shield },
    { label: 'Frameworks', to: '/frameworks', icon: BookOpen },
    { label: 'Reg Radar', to: '/reg-radar', icon: ChartBar },
    { label: 'HITL Reviews', to: '/hitl', icon: UserCircleCheck, badge: 3 },
  ]},
  { title: 'AI INVENTORY', items: [
    { label: 'Model Registry', to: '/models/inventory', icon: Robot },
    { label: 'Agent Discovery', to: '/agents', icon: Rss, badge: 12 },
    { label: 'Shadow AI', to: '/agents/shadow-ai', icon: Warning },
    { label: 'Datasets', to: '/datasets', icon: Database },
    { label: 'Vendor Registry', to: '/vendors', icon: BuildingOffice },
  ]},
  { title: 'RISK & COMPLIANCE', items: [
    { label: 'Risk Register', to: '/risk', icon: Warning },
    { label: 'Risk Matrix', to: '/risk/matrix', icon: Scales },
    { label: 'Bias Audits', to: '/bias-audits', icon: Scales },
    { label: 'Incidents', to: '/risk/incidents', icon: Warning },
    { label: 'Evidence Sync', to: '/evidence-sync', icon: FolderOpen },
    { label: 'Reporting', to: '/reporting', icon: ChartBar },
  ]},
  { title: 'SECURITY', items: [
    { label: 'Security Hub', to: '/security', icon: ShieldCheck },
    { label: 'Threats', to: '/security/threats', icon: Warning },
    { label: 'Vulnerabilities', to: '/security/vulnerabilities', icon: Warning },
    { label: 'Red Team', to: '/security/red-team', icon: Shield },
    { label: 'Attack Surface', to: '/security/attack-surface', icon: Shield },
  ]},
  { title: 'TRUST ENGINE', items: [
    { label: 'Trust Dashboard', to: '/trust-engine', icon: ShieldCheck },
    { label: 'Guardrails', to: '/trust-engine/guardrails', icon: LockOpen },
    { label: 'Live Traces', to: '/trust-engine/traces', icon: Rss },
    { label: 'Costs', to: '/trust-engine/costs', icon: ChartBar },
    { label: 'Fallback Log', to: '/trust-engine/fallback', icon: FileText },
    { label: 'Config', to: '/trust-engine/config', icon: Gear },
  ]},
  { title: 'ADMINISTRATION', items: [
    { label: 'Access Control', to: '/access-control', icon: Lock },
    { label: 'Audit Log', to: '/audit-log', icon: FileText },
    { label: 'Export Center', to: '/export', icon: FolderOpen },
    { label: 'Settings', to: '/settings', icon: Gear },
  ]},
]

const STORAGE_KEY = 'sentinel-sidebar-sections'

function loadSections(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || NAV.map(s => s.title) }
  catch { return NAV.map(s => s.title) }
}

/**
 * Returns true if the nav item's route is active for the current path.
 * Uses exact match for '/overview' and prefix-based matching for sub-paths,
 * but avoids false positives by ensuring segment boundaries are respected.
 */
function isItemActive(to: string, pathname: string): boolean {
  if (to === '/overview') {
    return pathname === '/' || pathname === '/overview'
  }
  // Exact match
  if (pathname === to) return true
  // Prefix match only at segment boundaries (e.g. /agents matches /agents/123 but not /agents-extra)
  return pathname.startsWith(to + '/')
}

/**
 * Returns true if any item in a section is active (used for auto-expand).
 */
function isSectionActive(items: { to: string }[], pathname: string): boolean {
  return items.some(item => isItemActive(item.to, pathname))
}

export default function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(loadSections)
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections))
  }, [expandedSections])

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
  }, [location.pathname])

  const toggleSection = (title: string) =>
    setExpandedSections(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] border-r border-[hsl(var(--border))] transition-all duration-200 flex-shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className='flex items-center gap-3 px-4 h-14 border-b border-[hsl(var(--border))]'>
        <div className='w-8 h-8 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
          <ShieldCheck size={18} weight='fill' className='text-white' />
        </div>
        {!collapsed && (
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate'>Sentinel AI</p>
            <p className='text-[10px] text-[hsl(var(--text-4))]'>GRC Platform</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] ml-auto'
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <CaretRight size={14}/> : <CaretDown size={14}/>}
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
                  {section.items.map((item: any) => {
                    const Icon = item.icon
                    const active = isItemActive(item.to, location.pathname)
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/overview' || item.to === '/compliance' || item.to === '/risk' || item.to === '/security' || item.to === '/trust-engine' || item.to === '/agents'}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm transition-colors group',
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
                            {item.badge && (
                              <span className='bg-[hsl(var(--brand))] text-white text-[10px] px-1.5 py-0.5 font-medium min-w-[20px] text-center'>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
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
          <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0 rounded-full' data-avatar='true'>
            <span className='text-xs font-semibold text-white'>BA</span>
          </div>
          {!collapsed && (
            <>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium text-[hsl(var(--text-1))] truncate'>Bhaskar Admin</p>
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
