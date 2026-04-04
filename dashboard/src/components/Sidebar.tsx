import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  SquaresFour, Bell, FileText, Shield, BookOpen, ChartBar,
  UserCircleCheck, Robot, Rss, Database, BuildingOffice,
  Warning, Scales, FolderOpen,
  ShieldCheck, LockOpen, Lock, Gear,
  SignOut, CaretDown, CaretRight, MoonStars, SunHorizon, Monitor
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
    { label: 'Gap Analysis', to: '/compliance/gap-analysis', icon: ChartBar },
    { label: 'HITL Reviews', to: '/hitl', icon: UserCircleCheck, badge: 3 },
  ]},
  { title: 'AI INVENTORY', items: [
    { label: 'Model Registry', to: '/models/inventory', icon: Robot },
    { label: 'Model Lifecycle', to: '/models/lifecycle', icon: Robot },
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
    { label: 'Security Home', to: '/security', icon: ShieldCheck },
    { label: 'Threat Feed', to: '/security/threats', icon: Warning },
    { label: 'Scan Center', to: '/security/scanner', icon: Shield },
    { label: 'Vulnerabilities', to: '/security/vulnerabilities', icon: Warning },
    { label: 'Red Team Lab', to: '/security/red-team', icon: Shield },
    { label: 'Attack Surface', to: '/security/attack-surface', icon: Shield },
    { label: 'Policy Firewall', to: '/security/policies', icon: FileText },
    { label: 'Keys Vault', to: '/security/keys', icon: Lock },
    { label: 'Model Arena', to: '/security/model-arena', icon: Robot },
  ]},
  { title: 'TRUST ENGINE', items: [
    { label: 'Trust Dashboard', to: '/trust-engine', icon: ShieldCheck },
    { label: 'Guardrails', to: '/trust-engine/guardrails', icon: LockOpen },
    { label: 'Live Traces', to: '/trust-engine/traces', icon: Rss },
    { label: 'Cost & Tokens', to: '/trust-engine/costs', icon: ChartBar },
    { label: 'Fallback Log', to: '/trust-engine/fallbacks', icon: FileText },
    { label: 'Tool Monitor', to: '/trust-engine/tools', icon: Gear },
    { label: 'Configuration', to: '/trust-engine/config', icon: Gear },
  ]},
  { title: 'ADMINISTRATION', items: [
    { label: 'Access Control', to: '/access-control', icon: Lock },
    { label: 'Audit Log', to: '/audit-log', icon: FileText },
    { label: 'Export Center', to: '/export', icon: FolderOpen },
    { label: 'Settings', to: '/settings', icon: Gear },
  ]},
]

export default function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(NAV.map(s => s.title))
  const { theme, setTheme, resolvedTheme } = useTheme()

  const isActive = (to: string) =>
    to === '/overview' ? location.pathname === '/' || location.pathname === '/overview' : location.pathname.startsWith(to)

  const toggleSection = (title: string) =>
    setExpandedSections(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light')
    else if (theme === 'light') setTheme('system')
    else setTheme('dark')
  }

  const themeIcon = theme === 'dark' ? SunHorizon : theme === 'light' ? MoonStars : Monitor
  const themeLabel = theme === 'dark' ? 'Light Mode' : theme === 'light' ? 'System' : 'Dark Mode'
  const ThemeIcon = themeIcon

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] border-r border-[hsl(var(--border))] transition-all duration-200 flex-shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className='flex items-center gap-3 px-4 h-14 border-b border-[hsl(var(--border))]'>
        <div className='w-8 h-8 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
          <ShieldCheck size={18} weight='fill' className='text-foreground' />
        </div>
        {!collapsed && (
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate'>Sentinel AI</p>
            <p className='text-[10px] text-[hsl(var(--text-4))]'>GRC Platform</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] ml-auto'>
          {collapsed ? <CaretRight size={14}/> : <CaretDown size={14}/>}
        </button>
      </div>

      <div className='flex-1 overflow-y-auto py-2'>
        {NAV.map(section => (
          <div key={section.title} className='px-2 mb-1'>
            {!collapsed && (
              <button onClick={() => toggleSection(section.title)}
                className='flex items-center justify-between w-full px-2 py-1'>
                <span className='text-[10px] font-semibold tracking-wider text-[hsl(var(--text-4))] uppercase'>{section.title}</span>
                {expandedSections.includes(section.title) ? <CaretDown size={10} className='text-[hsl(var(--text-4))]'/> : <CaretRight size={10} className='text-[hsl(var(--text-4))]'/>}
              </button>
            )}
            {(collapsed || expandedSections.includes(section.title)) && (
              <div className='space-y-0.5'>
                {section.items.map((item: any) => {
                  const Icon = item.icon
                  const active = isActive(item.to)
                  return (
                    <NavLink key={item.to} to={item.to} end
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm transition-colors group',
                        active
                          ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-l-2 border-[hsl(var(--brand))]'
                          : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]',
                        collapsed && 'justify-center px-2'
                      )}
                      title={collapsed ? item.label : undefined}>
                      <Icon size={18} weight={active ? 'fill' : 'duotone'} className={cn('flex-shrink-0', active ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--text-2))]')} />
                      {!collapsed && (
                        <>
                          <span className='flex-1 truncate'>{item.label}</span>
                          {item.badge && (
                            <span className='bg-[hsl(var(--brand))] text-foreground text-[10px] px-1.5 py-0.5 font-medium min-w-[20px] text-center'>{item.badge}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className='border-t border-[hsl(var(--border))] p-3 space-y-1'>
        <button onClick={cycleTheme} className={cn('flex items-center gap-3 w-full px-3 py-2 text-sm text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors', collapsed && 'justify-center px-2')}>
          <ThemeIcon size={18} weight='duotone' className='flex-shrink-0'/>
          {!collapsed && <span>{themeLabel}</span>}
        </button>
        <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center px-2')}>
          <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0' data-avatar='true'>
            <span className='text-xs font-semibold text-foreground'>BA</span>
          </div>
          {!collapsed && (
            <>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium text-[hsl(var(--text-1))] truncate'>Bhaskar Admin</p>
                <p className='text-[10px] text-[hsl(var(--text-4))]'>CISO</p>
              </div>
              <button className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]'><SignOut size={14}/></button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

export { default as AppSidebar } from "./Sidebar";
