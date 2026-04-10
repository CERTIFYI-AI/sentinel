import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback } from 'react'
import { MagnifyingGlass, Bell, ArrowsClockwise, Sun, Moon, User, Gear, SignOut, CaretRight } from '@phosphor-icons/react'
import { Button } from './ui/button'
import { CommandPalette } from './ui/CommandPalette'
import { NotificationDrawer } from './ui/NotificationDrawer'
import { useTheme } from '../providers/theme'

const UNREAD_COUNT = 5  // seed value — 5 unread notifications

const SEGMENT_LABELS: Record<string, string> = {
  overview:            'Dashboard',
  compliance:          'Compliance',
  policies:            'Policies',
  controls:            'Controls',
  frameworks:          'Frameworks',
  'reg-radar':         'Reg Radar',
  hitl:                'HITL Reviews',
  'gap-analysis':      'Gap Analysis',
  evidence:            'Evidence Hub',
  'policy-templates':  'Policy Templates',
  'ai-advisor':        'AI Advisor',
  conformity:          'Conformity Assessment',
  'data-governance':   'Data Governance',
  models:              'AI Inventory',
  inventory:           'Model Inventory',
  lifecycle:           'Model Lifecycle',
  agents:              'AI Inventory',
  'shadow-ai':         'Shadow AI',
  datasets:            'Datasets',
  vendors:             'Vendor Registry',
  'use-cases':         'Use Cases',
  explainability:      'Explainability',
  risk:                'Risk & Compliance',
  register:            'Risk Register',
  matrix:              'Risk Matrix',
  'bias-audits':       'Bias Audits',
  incidents:           'Incidents',
  remediation:         'Remediation',
  'evidence-sync':     'Evidence Sync',
  reporting:           'Reporting',
  security:            'Security',
  threats:             'Threat Feed',
  vulnerabilities:     'Vulnerabilities',
  'red-team':          'Red Team Lab',
  'attack-surface':    'Attack Surface',
  scans:               'Scan Center',
  keys:                'Keys Vault',
  'model-arena':       'Model Arena',
  reports:             'Reports',
  'trust-engine':      'Trust Engine',
  guardrails:          'Guardrails',
  traces:              'Live Traces',
  costs:               'Cost & Tokens',
  fallback:            'Fallback Log',
  tools:               'Tool Calls',
  config:              'Configuration',
  'access-control':    'Access Control',
  roles:               'Roles',
  users:               'Users',
  'audit-log':         'Audit Log',
  'evidence-vault':    'Evidence Vault',
  export:              'Export Center',
  settings:            'Settings',
  notifications:       'Notifications',
  evals:               'Evaluations',
  techniques:          'Eval Techniques',
  benchmark:           'Benchmark',
  'incident-workflow': 'Incident Workflow',
  'hitl-queue':        'HITL Queue',
  'policy-editor':     'Policy Editor',
  'remediation-tracker': 'Remediation Tracker',
  audits:              'Audit Management',
  risks:               'Risk Register',
  exceptions:          'Exception Management',
  training:            'Training & Awareness',
  documents:           'Document Management',
  continuity:          'Business Continuity',
  calendar:            'Compliance Calendar',
  maturity:            'Benchmarking & Maturity',
  aiia:                'AI Impact Assessments',
  'audit-trail':       'Audit Trail',
  workflows:           'Approval Workflows',
}

function isDynamicId(seg: string): boolean {
  return /^[0-9a-f-]{8,}$/i.test(seg) || /^\d+$/.test(seg) || /^[A-Z]+-\d+$/.test(seg)
}

function segmentLabel(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  if (isDynamicId(seg)) return seg.toUpperCase()
  return seg.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function buildBreadcrumbs(pathname: string): { label: string; path: string; isLast: boolean }[] {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'Dashboard', path: '/overview', isLast: true }]
  const crumbs: { label: string; path: string; isLast: boolean }[] = []
  let accumulated = ''
  for (let i = 0; i < segments.length; i++) {
    accumulated += '/' + segments[i]
    const label = segmentLabel(segments[i])
    const isLast = i === segments.length - 1
    if (crumbs.length > 0 && crumbs[crumbs.length - 1].label === label) {
      if (isLast) crumbs[crumbs.length - 1].isLast = true
      continue
    }
    crumbs.push({ label, path: accumulated, isLast })
  }
  return crumbs
}

export default function TopHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { resolved, setTheme } = useTheme()
  const breadcrumbs = buildBreadcrumbs(location.pathname)

  const [avatarOpen, setAvatarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const closeDropdown = useCallback(() => setAvatarOpen(false), [])

  // Close avatar dropdown on outside click / Escape
  useEffect(() => {
    if (!avatarOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) closeDropdown()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDropdown()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [avatarOpen, closeDropdown])

  // Open search on "/" key (when not in an input)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '/' && !searchOpen && !notifOpen) {
        const tag = (e.target as HTMLElement).tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement).isContentEditable) return
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [searchOpen, notifOpen])

  return (
    <>
      <header className='flex items-center gap-4 px-6 h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] flex-shrink-0'>
        {/* Breadcrumbs */}
        <nav aria-label='Breadcrumb' className='flex-1 min-w-0'>
          <ol className='flex items-center gap-1 text-sm'>
            {breadcrumbs.map((bc, i) => (
              <li key={i} className='flex items-center gap-1'>
                {i > 0 && (
                  <CaretRight size={10} className='text-[hsl(var(--text-4))] flex-shrink-0' />
                )}
                {bc.isLast ? (
                  <span className='font-medium text-[hsl(var(--text-1))] truncate max-w-[200px]'>
                    {bc.label}
                  </span>
                ) : (
                  <Link
                    to={bc.path}
                    className='text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] transition-colors truncate max-w-[120px]'
                  >
                    {bc.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Right side controls */}
        <div className='flex items-center gap-1'>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className='flex items-center gap-2 h-8 px-3 border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] hover:bg-[hsl(var(--bg-surface))] hover:border-[hsl(var(--brand))] transition-colors text-[hsl(var(--text-4))] hover:text-[hsl(var(--text-2))] text-xs w-48'
            aria-label='Open search (press /)'
          >
            <MagnifyingGlass size={13} className='flex-shrink-0' />
            <span className='flex-1 text-left text-xs'>Quick search…</span>
            <kbd className='hidden sm:inline text-[9px] px-1 py-0.5 border border-[hsl(var(--border))] leading-none opacity-70'>/</kbd>
          </button>

          {/* Theme toggle */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
            title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolved === 'dark'
              ? <Sun size={16} className='text-[hsl(var(--text-3))]' />
              : <Moon size={16} className='text-[hsl(var(--text-3))]' />
            }
          </Button>

          {/* Refresh */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            onClick={() => window.location.reload()}
            title='Refresh data'
            aria-label='Refresh data'
          >
            <ArrowsClockwise size={16} className='text-[hsl(var(--text-3))]' />
          </Button>

          {/* Notification bell */}
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 relative'
            onClick={() => setNotifOpen(v => !v)}
            title='Notifications'
            aria-label={`Notifications — ${UNREAD_COUNT} unread`}
          >
            <Bell size={16} className='text-[hsl(var(--text-3))]' />
            {UNREAD_COUNT > 0 && (
              <span
                className='absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 bg-[hsl(var(--brand))] text-white text-[9px] font-bold leading-none'
                aria-hidden='true'
              >
                {UNREAD_COUNT > 9 ? '9+' : UNREAD_COUNT}
              </span>
            )}
          </Button>

          {/* Avatar + dropdown */}
          <div className='relative' ref={dropdownRef}>
            <button
              onClick={() => setAvatarOpen(v => !v)}
              aria-expanded={avatarOpen}
              aria-haspopup='menu'
              aria-label='User menu'
              className='ml-1 flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))]'
            >
              <div
                data-avatar='true'
                className='h-8 w-8 bg-[hsl(var(--brand))] flex items-center justify-center text-white text-xs font-bold'
              >
                SC
              </div>
            </button>

            {avatarOpen && (
              <div
                role='menu'
                className='absolute right-0 top-full mt-2 w-52 bg-[hsl(var(--bg-surface))] border border-[hsl(var(--border))] shadow-[var(--shadow-md)] z-50'
              >
                <div className='px-3 py-2.5 border-b border-[hsl(var(--border))]'>
                  <p className='text-sm font-semibold text-[hsl(var(--text-1))]'>Sarah Chen</p>
                  <p className='text-xs text-[hsl(var(--text-4))]'>sarah.chen@sentinel-grc.com</p>
                  <span className='inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 bg-[hsl(var(--brand-subtle))] text-[hsl(var(--brand))]'>
                    CISO
                  </span>
                </div>
                <div className='py-1'>
                  <button
                    role='menuitem'
                    onClick={() => { closeDropdown(); navigate('/settings'); }}
                    className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors'
                  >
                    <User size={14} className='flex-shrink-0' /> My Profile
                  </button>
                  <button
                    role='menuitem'
                    onClick={() => { closeDropdown(); navigate('/settings'); }}
                    className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(var(--text-2))] hover:bg-[hsl(var(--bg-raised))] hover:text-[hsl(var(--text-1))] transition-colors'
                  >
                    <Gear size={14} className='flex-shrink-0' /> Settings
                  </button>
                  <div className='border-t border-[hsl(var(--border))] my-1' />
                  <button
                    role='menuitem'
                    onClick={() => closeDropdown()}
                    className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[hsl(var(--s-er-tx))] hover:bg-[hsl(var(--bg-raised))] transition-colors'
                  >
                    <SignOut size={14} className='flex-shrink-0' /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global overlays */}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <NotificationDrawer open={notifOpen} onOpenChange={setNotifOpen} />
    </>
  )
}
