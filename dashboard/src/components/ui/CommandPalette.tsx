import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlass, SquaresFour, Robot, ShieldCheck, ChartBar, BookOpen,
  Warning, Database, BuildingOffice, Lock, Gear, Bell, GraduationCap,
  Target, UserCircleCheck, ArrowRight, Hash, FileText, Scroll,
  Scales, Brain, Lightbulb, Briefcase, FlowArrow, DownloadSimple,
  ClipboardText, CalendarBlank, ChartPieSlice, Gauge, ClockCounterClockwise,
  FileMagnifyingGlass, Table, GlobeHemisphereWest, Lifebuoy, ListChecks,
  FolderOpen, ShieldWarning,
} from '@phosphor-icons/react'

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchItem {
  group: string
  icon: any
  title: string
  subtitle?: string
  path: string
  keywords?: string[]
}

const ALL_ITEMS: SearchItem[] = [
  // Overview
  { group: 'Overview', icon: SquaresFour, title: 'Dashboard', subtitle: 'Main overview', path: '/overview', keywords: ['home', 'summary', 'kpi'] },
  { group: 'Overview', icon: ChartPieSlice, title: 'Reporting', subtitle: 'Reports & exports', path: '/reporting' },

  // AI Governance
  { group: 'AI Governance', icon: Robot, title: 'Model Inventory', subtitle: 'AI model registry', path: '/models/inventory', keywords: ['model', 'registry', 'ai'] },
  { group: 'AI Governance', icon: Gauge, title: 'Trust Engine', subtitle: 'LLM observability', path: '/trust-engine', keywords: ['trust', 'llm', 'guardrails'] },
  { group: 'AI Governance', icon: Brain, title: 'Agent Discovery', subtitle: 'AI agent inventory', path: '/agents', keywords: ['agent', 'shadow', 'discovery'] },
  { group: 'AI Governance', icon: Scales, title: 'Bias Audits', subtitle: 'Fairness assessments', path: '/bias-audits', keywords: ['bias', 'fairness', 'audit'] },
  { group: 'AI Governance', icon: FileMagnifyingGlass, title: 'AI Impact Assessments', subtitle: 'AIIA evaluations', path: '/aiia', keywords: ['impact', 'assessment', 'aiia'] },
  { group: 'AI Governance', icon: Lightbulb, title: 'Explainability', subtitle: 'Model explainability', path: '/explainability', keywords: ['explainability', 'shap', 'xai'] },
  { group: 'AI Governance', icon: Briefcase, title: 'Use Cases', subtitle: 'Approved use case registry', path: '/use-cases' },

  // Security
  { group: 'Security', icon: ShieldCheck, title: 'Security Overview', subtitle: 'Security posture', path: '/security', keywords: ['security', 'threats', 'vulnerabilities'] },
  { group: 'Security', icon: ShieldWarning, title: 'Threat Feed', subtitle: 'Active threat intelligence', path: '/security/threats', keywords: ['threats', 'intel', 'cve'] },
  { group: 'Security', icon: Target, title: 'Scan Center', subtitle: 'Security scans', path: '/security/scans' },
  { group: 'Security', icon: ShieldWarning, title: 'Vulnerabilities', subtitle: 'Vulnerability register', path: '/security/vuln-tracker' },

  // Compliance
  { group: 'Compliance', icon: ChartBar, title: 'Compliance Dashboard', subtitle: 'Compliance posture', path: '/compliance', keywords: ['compliance', 'gdpr', 'eu ai act', 'sox'] },
  { group: 'Compliance', icon: BookOpen, title: 'Frameworks', subtitle: 'EU AI Act, SOC 2, GDPR', path: '/frameworks', keywords: ['frameworks', 'standards'] },
  { group: 'Compliance', icon: ListChecks, title: 'Controls', subtitle: 'Control requirements', path: '/compliance/controls', keywords: ['controls', 'requirements'] },
  { group: 'Compliance', icon: ClipboardText, title: 'Audit Management', subtitle: 'Internal audits', path: '/audits' },
  { group: 'Compliance', icon: FolderOpen, title: 'Evidence Hub', subtitle: 'Evidence collection', path: '/compliance/evidence', keywords: ['evidence', 'documents'] },
  { group: 'Compliance', icon: Target, title: 'Gap Analysis', subtitle: 'Compliance gaps', path: '/compliance/gap-analysis' },
  { group: 'Compliance', icon: Scroll, title: 'Policies', subtitle: 'Policy library', path: '/policies', keywords: ['policy', 'policies'] },
  { group: 'Compliance', icon: CalendarBlank, title: 'Compliance Calendar', subtitle: 'Upcoming deadlines', path: '/calendar' },
  { group: 'Compliance', icon: FileText, title: 'Document Management', subtitle: 'Document repository', path: '/documents' },
  { group: 'Compliance', icon: ClockCounterClockwise, title: 'Audit Trail', subtitle: 'Immutable audit log', path: '/audit-trail' },

  // Risk & Incidents
  { group: 'Risk & Incidents', icon: Warning, title: 'Risk Register', subtitle: 'Risk inventory', path: '/risks', keywords: ['risk', 'register'] },
  { group: 'Risk & Incidents', icon: Target, title: 'Risk Matrix', subtitle: 'Risk heat map', path: '/risk/matrix' },
  { group: 'Risk & Incidents', icon: ShieldWarning, title: 'Incidents', subtitle: 'Incident management', path: '/risk/incidents', keywords: ['incidents', 'events'] },
  { group: 'Risk & Incidents', icon: ShieldWarning, title: 'Exception Management', subtitle: 'Risk exceptions', path: '/exceptions' },

  // Evaluations
  { group: 'Evaluations', icon: Gauge, title: 'Quality Metrics', subtitle: 'Eval runs & metrics', path: '/evals' },
  { group: 'Evaluations', icon: Database, title: 'Datasets', subtitle: 'Training & eval datasets', path: '/datasets' },
  { group: 'Evaluations', icon: Table, title: 'Data Governance', subtitle: 'Data lineage & classification', path: '/data-governance' },

  // Operations
  { group: 'Operations', icon: UserCircleCheck, title: 'HITL Reviews', subtitle: 'Human-in-the-loop queue', path: '/hitl', keywords: ['hitl', 'human', 'review'] },
  { group: 'Operations', icon: BuildingOffice, title: 'Vendors', subtitle: 'Third-party vendors', path: '/vendors', keywords: ['vendor', 'third-party', 'supplier'] },
  { group: 'Operations', icon: GlobeHemisphereWest, title: 'Regulatory Radar', subtitle: 'Regulatory intelligence', path: '/reg-radar', keywords: ['regulatory', 'compliance updates'] },
  { group: 'Operations', icon: FlowArrow, title: 'Approval Workflows', subtitle: 'Workflow management', path: '/workflows' },
  { group: 'Operations', icon: Bell, title: 'Notifications', subtitle: 'All notifications', path: '/notifications' },
  { group: 'Operations', icon: DownloadSimple, title: 'Export Center', subtitle: 'Download reports', path: '/export' },

  // Organization
  { group: 'Organization', icon: GraduationCap, title: 'Training & Awareness', subtitle: 'AI training courses', path: '/training', keywords: ['training', 'learning', 'courses'] },
  { group: 'Organization', icon: Lock, title: 'Access Control', subtitle: 'Roles & user management', path: '/access-control', keywords: ['rbac', 'roles', 'users', 'permissions'] },
  { group: 'Organization', icon: ChartBar, title: 'Benchmarking & Maturity', subtitle: 'AI maturity model', path: '/maturity' },
  { group: 'Organization', icon: Lifebuoy, title: 'Business Continuity', subtitle: 'BCP & disaster recovery', path: '/continuity' },

  // System
  { group: 'System', icon: Gear, title: 'Settings', subtitle: 'Platform settings', path: '/settings' },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) return ALL_ITEMS.slice(0, 10)
    const q = query.toLowerCase()
    return ALL_ITEMS.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.keywords?.some(k => k.toLowerCase().includes(q))
    )
  }, [query])

  const grouped = useMemo(() => {
    if (!query.trim()) return null
    const map = new Map<string, SearchItem[]>()
    results.forEach(item => {
      const arr = map.get(item.group) || []
      arr.push(item)
      map.set(item.group, arr)
    })
    return map
  }, [results, query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(v => Math.min(v + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(v => Math.max(v - 1, 0))
    } else if (e.key === 'Enter') {
      const item = results[selected]
      if (item) { navigate(item.path); onOpenChange(false) }
    }
  }

  const handleSelect = (item: SearchItem) => {
    navigate(item.path)
    onOpenChange(false)
  }

  if (!open) return null

  const renderItem = (item: SearchItem, idx: number, globalIdx: number) => {
    const Icon = item.icon
    const isSelected = globalIdx === selected
    return (
      <button
        key={item.path}
        onClick={() => handleSelect(item)}
        onMouseEnter={() => setSelected(globalIdx)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          isSelected
            ? 'bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]'
            : 'hover:bg-raised text-[hsl(var(--text-2))]'
        }`}
      >
        <span className={`w-7 h-7 flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-[hsl(var(--brand))] text-white' : 'bg-raised text-[hsl(var(--text-4))]'
        }`}>
          <Icon size={14} weight='duotone' />
        </span>
        <div className='flex-1 min-w-0'>
          <p className={`text-sm font-medium truncate ${isSelected ? 'text-[hsl(var(--brand))]' : 'text-[hsl(var(--text-1))]'}`}>
            {item.title}
          </p>
          {item.subtitle && (
            <p className='text-[11px] text-[hsl(var(--text-4))] truncate'>{item.subtitle}</p>
          )}
        </div>
        <span className='text-[hsl(var(--text-4))] flex-shrink-0'>
          <ArrowRight size={12} />
        </span>
      </button>
    )
  }

  let globalIdx = 0

  return (
    <div className='fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className='relative w-full max-w-[560px] bg-surface border border-[hsl(var(--border))] shadow-2xl overflow-hidden'>
        {/* Search input */}
        <div className='flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]'>
          <MagnifyingGlass size={16} className='text-[hsl(var(--text-4))] flex-shrink-0' />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder='Search pages, actions, controls, risks…'
            className='flex-1 bg-transparent text-sm text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))] outline-none'
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] transition-colors text-xs px-1.5 py-0.5 border border-[hsl(var(--border))]'
            >
              Clear
            </button>
          )}
          <kbd className='hidden sm:flex items-center gap-1 px-1.5 py-0.5 border border-[hsl(var(--border))] text-[10px] text-[hsl(var(--text-4))]'>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className='max-h-[400px] overflow-y-auto'>
          {results.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-[hsl(var(--text-4))]'>
              <MagnifyingGlass size={32} className='mb-3 opacity-30' />
              <p className='text-sm'>No results for "{query}"</p>
              <p className='text-xs mt-1 opacity-70'>Try a different search term</p>
            </div>
          ) : !query.trim() ? (
            <>
              <div className='px-3 py-2 border-b border-[hsl(var(--border))]'>
                <p className='text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]'>
                  Quick navigation
                </p>
              </div>
              {results.map((item, i) => renderItem(item, i, i))}
            </>
          ) : (
            grouped && Array.from(grouped.entries()).map(([group, items]) => (
              <div key={group}>
                <div className='px-3 py-1.5 bg-raised border-b border-[hsl(var(--border))]'>
                  <p className='text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-4))]'>
                    {group}
                  </p>
                </div>
                {items.map((item, i) => {
                  const gi = globalIdx++
                  return renderItem(item, i, gi)
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center gap-4 px-4 py-2.5 border-t border-[hsl(var(--border))] bg-raised'>
          <span className='flex items-center gap-1.5 text-[10px] text-[hsl(var(--text-4))]'>
            <kbd className='px-1 py-0.5 border border-[hsl(var(--border))] text-[9px]'>↑↓</kbd>
            Navigate
          </span>
          <span className='flex items-center gap-1.5 text-[10px] text-[hsl(var(--text-4))]'>
            <kbd className='px-1 py-0.5 border border-[hsl(var(--border))] text-[9px]'>↵</kbd>
            Open
          </span>
          <span className='flex items-center gap-1.5 text-[10px] text-[hsl(var(--text-4))]'>
            <kbd className='px-1 py-0.5 border border-[hsl(var(--border))] text-[9px]'>ESC</kbd>
            Close
          </span>
          <span className='ml-auto text-[10px] text-[hsl(var(--text-4))]'>
            ⌘K to toggle
          </span>
        </div>
      </div>
    </div>
  )
}
