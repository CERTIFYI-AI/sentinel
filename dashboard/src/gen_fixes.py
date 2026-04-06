import os
B = os.path.dirname(os.path.abspath(__file__))
def w(p, c):
    f = os.path.join(B, p)
    os.makedirs(os.path.dirname(f), exist_ok=True)
    open(f, 'w').write(c)
    print(f'OK: {p}')

# P0: DataTable.tsx
w('components/ui/DataTable.tsx', r'''import React, { useState, useMemo } from "react"
import { Eye, PencilSimple, Trash, MagnifyingGlass, CaretUp, CaretDown } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface Props<T> {
  data: T[]
  columns: Column<T>[]
  onView?: (row: T) => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onRowClick?: (row: T) => void
  searchPlaceholder?: string
  searchKey?: string
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  getRowClassName?: (row: T) => string
}

export function DataTable<T extends Record<string, any>>({
  data, columns, onView, onEdit, onDelete, onRowClick,
  searchPlaceholder = "Search...", searchKey = "name",
  actions, emptyMessage = "No records found.", getRowClassName,
}: Props<T>) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const filtered = useMemo(() => {
    let d = data
    if (search) d = d.filter(r => String(r[searchKey] ?? "").toLowerCase().includes(search.toLowerCase()))
    if (sortKey) d = [...d].sort((a, b) => {
      const cmp = String(a[sortKey] ?? "").localeCompare(String(b[sortKey] ?? ""), undefined, { numeric: true })
      return sortDir === "asc" ? cmp : -cmp
    })
    return d
  }, [data, search, sortKey, sortDir, searchKey])
  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }
  const hasActions = onView || onEdit || onDelete || actions
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={searchPlaceholder}
            className="w-full h-8 pl-8 pr-3 text-xs bg-[hsl(var(--bg-raised))] border border-[hsl(var(--border))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand))]" />
        </div>
      </div>
      <div className="border border-[hsl(var(--border))] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[hsl(var(--bg-raised))] border-b border-[hsl(var(--border))]">
              {columns.map(col => (
                <th key={col.key} className={cn("px-4 py-2.5 text-left text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider", col.sortable && "cursor-pointer select-none hover:text-[hsl(var(--text-2))]", col.className)}
                  onClick={() => col.sortable && toggleSort(col.key)}>
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (sortDir === "asc" ? <CaretUp size={12}/> : <CaretDown size={12}/>)}
                  </span>
                </th>
              ))}
              {hasActions && <th className="px-4 py-2.5 text-right text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wider w-28">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length + (hasActions ? 1 : 0)} className="px-4 py-8 text-center text-sm text-[hsl(var(--text-4))]">{emptyMessage}</td></tr>
            ) : filtered.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)}
                className={cn("group border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))] transition-colors", onRowClick && "cursor-pointer", getRowClassName?.(row))}>
                {columns.map(col => (
                  <td key={col.key} className={cn("px-4 py-3 text-[hsl(var(--text-2))]", col.className)}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
                {hasActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {actions ? actions(row) : (<>
                        {onView && <button onClick={e => { e.stopPropagation(); onView(row) }} className="p-1.5 hover:bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--brand))] transition-colors" title="View"><Eye size={16} weight="duotone"/></button>}
                        {onEdit && <button onClick={e => { e.stopPropagation(); onEdit(row) }} className="p-1.5 hover:bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-1))] transition-colors" title="Edit"><PencilSimple size={16} weight="duotone"/></button>}
                        {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(row) }} className="p-1.5 hover:bg-[hsl(var(--s-er-bg))] text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-er-text))] transition-colors" title="Delete"><Trash size={16} weight="duotone"/></button>}
                      </>)}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[hsl(var(--text-4))]">{filtered.length} of {data.length} records</p>
    </div>
  )
}
export default DataTable
''')
print('Done')


# P0: Sidebar fix - theme toggle icon-only + localStorage persistence
w('components/Sidebar.tsx', r'''import { NavLink, useLocation } from 'react-router-dom'
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
    { label: 'Fallback Log', to: '/trust-engine/fallbacks', icon: FileText },
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
export default function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(loadSections)
  const { theme, setTheme, resolvedTheme } = useTheme()
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections)) }, [expandedSections])
  const isActive = (to: string) =>
    to === '/overview' ? location.pathname === '/' || location.pathname === '/overview' : location.pathname.startsWith(to)
  const toggleSection = (title: string) =>
    setExpandedSections(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])
  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  return (
    <aside className={cn('flex flex-col h-screen bg-[hsl(var(--bg-surface))] text-[hsl(var(--text-1))] border-r border-[hsl(var(--border))] transition-all duration-200 flex-shrink-0', collapsed ? 'w-16' : 'w-64')}>
      <div className='flex items-center gap-3 px-4 h-14 border-b border-[hsl(var(--border))]'>
        <div className='w-8 h-8 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0'>
          <ShieldCheck size={18} weight='fill' className='text-white' />
        </div>
        {!collapsed && (<div className='flex-1 min-w-0'>
          <p className='text-sm font-semibold text-[hsl(var(--text-1))] truncate'>Sentinel AI</p>
          <p className='text-[10px] text-[hsl(var(--text-4))]'>GRC Platform</p>
        </div>)}
        <button onClick={() => setCollapsed(!collapsed)} className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] ml-auto'>
          {collapsed ? <CaretRight size={14}/> : <CaretDown size={14}/>}
        </button>
      </div>
      <div className='flex-1 overflow-y-auto py-2'>
        {NAV.map(section => (
          <div key={section.title} className='px-2 mb-1'>
            {!collapsed && (
              <button onClick={() => toggleSection(section.title)} className='flex items-center justify-between w-full px-2 py-1'>
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
                      className={cn('flex items-center gap-3 px-3 py-2 text-sm transition-colors group',
                        active ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))] border-l-2 border-[hsl(var(--brand))]'
                          : 'text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))]',
                        collapsed && 'justify-center px-2')}
                      title={collapsed ? item.label : undefined}>
                      <Icon size={18} weight={active ? 'fill' : 'duotone'} className={cn('flex-shrink-0', active ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-4))] group-hover:text-[hsl(var(--text-2))]')} />
                      {!collapsed && (<>
                        <span className='flex-1 truncate'>{item.label}</span>
                        {item.badge && <span className='bg-[hsl(var(--brand))] text-white text-[10px] px-1.5 py-0.5 font-medium min-w-[20px] text-center'>{item.badge}</span>}
                      </>)}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className='border-t border-[hsl(var(--border))] p-3 space-y-1'>
        <button onClick={toggleTheme} className={cn('flex items-center justify-center w-8 h-8 mx-auto text-[hsl(var(--text-3))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors', !collapsed && 'ml-0')}>
          {resolvedTheme === 'dark' ? <Sun size={18} weight='duotone'/> : <Moon size={18} weight='duotone'/>}
        </button>
        <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center px-2')}>
          <div className='w-7 h-7 bg-[hsl(var(--brand))] flex items-center justify-center flex-shrink-0 rounded-full' data-avatar='true'>
            <span className='text-xs font-semibold text-white'>BA</span>
          </div>
          {!collapsed && (<>
            <div className='flex-1 min-w-0'>
              <p className='text-xs font-medium text-[hsl(var(--text-1))] truncate'>Bhaskar Admin</p>
              <p className='text-[10px] text-[hsl(var(--text-4))]'>CISO</p>
            </div>
            <button className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))]'><SignOut size={14}/></button>
          </>)}
        </div>
      </div>
    </aside>
  )
}
export { default as AppSidebar } from "./Sidebar"
''')


print('=== All fixes generated ===')
