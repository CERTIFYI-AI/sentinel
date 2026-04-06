import { useLocation } from "react-router-dom"
import { MagnifyingGlass, Bell, ArrowsClockwise, Sun, Moon } from "@phosphor-icons/react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { useTheme } from "../providers/theme"

// Maps path segments → human-readable labels
const SEGMENT_LABELS: Record<string, string> = {
  overview:            'Dashboard',
  // Governance
  compliance:          'Compliance',
  policies:            'Policies',
  controls:            'Controls',
  frameworks:          'Frameworks',
  'reg-radar':         'Reg Radar',
  hitl:                'HITL Reviews',
  'gap-analysis':      'Gap Analysis',
  evidence:            'Evidence Hub',
  'policy-templates':  'Policy Templates',
  // AI Inventory
  models:              'AI Inventory',
  inventory:           'Model Inventory',
  lifecycle:           'Model Lifecycle',
  agents:              'AI Inventory',
  'shadow-ai':         'Shadow AI',
  datasets:            'Datasets',
  vendors:             'Vendor Registry',
  // Risk & Compliance
  risk:                'Risk & Compliance',
  register:            'Risk Register',
  matrix:              'Risk Matrix',
  'bias-audits':       'Bias Audits',
  incidents:           'Incidents',
  remediation:         'Remediation',
  'evidence-sync':     'Evidence Sync',
  reporting:           'Reporting',
  // Security
  security:            'Security',
  threats:             'Threat Feed',
  vulnerabilities:     'Vulnerabilities',
  'red-team':          'Red Team Lab',
  'attack-surface':    'Attack Surface',
  scans:               'Scan Center',
  scanner:             'Scan Center',
  keys:                'Keys Vault',
  'model-arena':       'Model Arena',
  reports:             'Reports',
  // Trust Engine
  'trust-engine':      'Trust Engine',
  guardrails:          'Guardrails',
  traces:              'Live Traces',
  costs:               'Cost & Tokens',
  fallback:            'Fallback Log',
  tools:               'Tool Calls',
  config:              'Configuration',
  // Administration
  'access-control':    'Access Control',
  roles:               'Roles',
  users:               'Users',
  'audit-log':         'Audit Log',
  'evidence-vault':    'Evidence Vault',
  export:              'Export Center',
  settings:            'Settings',
  'ai-advisor':        'AI Advisor',
  notifications:       'Notifications',
  // Other
  evals:               'Evaluations',
  'quality-metrics':   'Quality Metrics',
  techniques:          'Eval Techniques',
  benchmark:           'Benchmark',
  explainability:      'Explainability',
  conformity:          'Conformity Assessment',
  'incident-workflow': 'Incident Workflow',
  'hitl-queue':        'HITL Queue',
  'policy-editor':     'Policy Editor',
  'remediation-tracker': 'Remediation Tracker',
}

/**
 * Determine if a path segment is a dynamic ID (UUID, numeric, or looks like a slug ID).
 * These are displayed as the segment value itself formatted as a title.
 */
function isDynamicId(seg: string): boolean {
  // UUIDs, numeric IDs, or short model-style IDs (e.g. MDL-001, AGT-003)
  return /^[0-9a-f-]{8,}$/i.test(seg) || /^\d+$/.test(seg) || /^[A-Z]+-\d+$/.test(seg)
}

function segmentLabel(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  if (isDynamicId(seg)) return seg.toUpperCase()
  // Fallback: convert kebab-case to Title Case
  return seg.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Builds a deduplicated breadcrumb trail.
 * Collapses redundant parent labels that are identical to a child
 * (e.g. /models/inventory → "AI Inventory / Model Inventory" not "AI Inventory / AI Inventory / Model Inventory").
 */
function buildBreadcrumbs(pathname: string): { label: string; isLast: boolean }[] {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'Dashboard', isLast: true }]

  const crumbs: { label: string; isLast: boolean }[] = []
  for (let i = 0; i < segments.length; i++) {
    const label = segmentLabel(segments[i])
    const isLast = i === segments.length - 1
    // Skip if this label is identical to the previous crumb (dedup)
    if (crumbs.length > 0 && crumbs[crumbs.length - 1].label === label) {
      if (isLast) {
        crumbs[crumbs.length - 1].isLast = true
      }
      continue
    }
    crumbs.push({ label, isLast })
  }
  return crumbs
}

export default function TopHeader() {
  const location = useLocation()
  const { resolved, setTheme } = useTheme()
  const breadcrumbs = buildBreadcrumbs(location.pathname)

  return (
    <header className="flex items-center gap-4 px-6 h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg-surface))] flex-shrink-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-[hsl(var(--text-4))] select-none">/</span>
              )}
              <span className={bc.isLast
                ? "font-medium text-[hsl(var(--text-1))] truncate"
                : "text-[hsl(var(--text-4))]"
              }>
                {bc.label}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="relative">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]"/>
          <Input
            placeholder="Quick search… (/)"
            className="w-48 h-8 pl-8 text-xs border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] text-[hsl(var(--text-1))] placeholder:text-[hsl(var(--text-4))]"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
          title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {resolved === 'dark'
            ? <Sun size={16} className="text-[hsl(var(--text-3))]"/>
            : <Moon size={16} className="text-[hsl(var(--text-3))]"/>
          }
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ArrowsClockwise size={16} className="text-[hsl(var(--text-3))]"/>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell size={16} className="text-[hsl(var(--text-3))]"/>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[hsl(var(--brand))] rounded-full"></span>
        </Button>
      </div>
    </header>
  )
}
