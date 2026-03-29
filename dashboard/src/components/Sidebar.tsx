
import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  SquaresFour, Bell, FileText, Shield, BookOpen, ChartBar,
  UserCircleCheck, Robot, Rss, Database, BuildingOffice,
  Warning, Scales, FolderOpen,
  ShieldCheck, LockOpen, Lock, Gear, Star,
  SignOut, CaretDown, CaretRight, MoonStars, SunHorizon
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'

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
    { label: 'Model Inventory', to: '/models/inventory', icon: Robot },
    { label: 'Agent Discovery', to: '/agents', icon: Rss, badge: 12 },
    { label: 'Datasets', to: '/datasets', icon: Database },
    { label: 'Vendor List', to: '/vendors', icon: BuildingOffice },
  ]},
  { title: 'RISK & COMPLIANCE', items: [
    { label: 'Risk Map', to: '/risk', icon: Warning },
    { label: 'Bias Audits', to: '/bias-audits', icon: Scales },
    { label: 'Evidence Sync', to: '/evidence-sync', icon: FolderOpen },
    { label: 'Incidents', to: '/risk/incidents', icon: Warning },
    { label: 'Reporting', to: '/reporting', icon: ChartBar },
  ]},
  { title: 'TRUST ENGINE', items: [
    { label: 'Trust Engine', to: '/trust-engine', icon: ShieldCheck },
    { label: 'Guardrails', to: '/trust-engine/guardrails', icon: LockOpen },
  ]},
  { title: 'ADMINISTRATION', items: [
    { label: 'Access Control', to: '/access-control', icon: Lock },
    { label: 'Settings', to: '/settings', icon: Gear },
  ]},
]

export default function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(NAV.map(s => s.title))
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'))

  const isActive = (to: string) =>
    to === '/overview' ? location.pathname === '/' || location.pathname === '/overview' : location.pathname.startsWith(to)

  const toggleSection = (title: string) =>
    setExpandedSections(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-zinc-950 text-zinc-100 border-r border-zinc-800 transition-all duration-200 flex-shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className='flex items-center gap-3 px-4 h-14 border-b border-zinc-800'>
        <div className='w-8 h-8 bg-emerald-600 flex items-center justify-center flex-shrink-0'>
          <ShieldCheck size={18} weight='fill' className='text-white' />
        </div>
        {!collapsed && (
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-semibold text-white truncate'>Sentinel AI</p>
            <p className='text-[10px] text-zinc-500'>GRC Platform</p>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className='text-zinc-500 hover:text-zinc-300 ml-auto'>
          {collapsed ? <CaretRight size={14}/> : <CaretDown size={14}/>}
        </button>
      </div>
      <div className='flex-1 overflow-y-auto py-2'>
        {NAV.map(section => (
          <div key={section.title} className='px-2 mb-1'>
            {!collapsed && (
              <button onClick={() => toggleSection(section.title)}
                className='flex items-center justify-between w-full px-2 py-1'>
                <span className='text-[10px] font-semibold tracking-wider text-zinc-500 uppercase'>{section.title}</span>
                {expandedSections.includes(section.title) ? <CaretDown size={10} className='text-zinc-600'/> : <CaretRight size={10} className='text-zinc-600'/>}
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
                        active ? 'bg-emerald-600/15 text-emerald-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
                        collapsed && 'justify-center px-2'
                      )}
                      title={collapsed ? item.label : undefined}>
                      <Icon size={18} weight='duotone' className={cn('flex-shrink-0', active ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300')} />
                      {!collapsed && (
                        <>
                          <span className='flex-1 truncate'>{item.label}</span>
                          {item.badge && (
                            <span className='bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 font-medium min-w-[20px] text-center'>{item.badge}</span>
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
      <div className='border-t border-zinc-800 p-3 space-y-1'>
        <button className={cn('flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-emerald-400 transition-colors', collapsed && 'justify-center px-2')}>
          <Star size={18} weight='duotone' className='flex-shrink-0 text-emerald-500' />
          {!collapsed && <span>AI Advisor</span>}
        </button>
        <button onClick={toggleDark} className={cn('flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors', collapsed && 'justify-center px-2')}>
          {darkMode ? <SunHorizon size={18} weight='duotone' className='flex-shrink-0'/> : <MoonStars size={18} weight='duotone' className='flex-shrink-0'/>}
          {!collapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center px-2')}>
          <div className='w-7 h-7 bg-emerald-600 flex items-center justify-center flex-shrink-0'>
            <span className='text-xs font-semibold text-white'>BA</span>
          </div>
          {!collapsed && (
            <>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium text-zinc-200 truncate'>Bhaskar Admin</p>
                <p className='text-[10px] text-zinc-500'>CISO</p>
              </div>
              <button className='text-zinc-600 hover:text-zinc-300'><SignOut size={14}/></button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
