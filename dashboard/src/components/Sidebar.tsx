const NAV: NavSection[] = [
  { title: 'DASHBOARD', items: [
    { label: 'Overview', to: '/overview', icon: 'BarChart3' },
    { label: 'Alerts', to: '/notifications', icon: 'Bell' },
  ]},
  { title: 'GOVERNANCE', items: [
    { label: 'Policy Manager', to: '/compliance/policies', icon: 'FileText' },
    { label: 'Controls', to: '/controls', icon: 'Shield' },
    { label: 'Frameworks', to: '/frameworks', icon: 'Layers' },
    { label: 'Reg Radar', to: '/reg-radar', icon: 'Radio' },
  ]},
  { title: 'AI INVENTORY', items: [
    { label: 'Model Inventory', to: '/models/inventory', icon: 'Brain' },
    { label: 'Model Lifecycle', to: '/models/lifecycle', icon: 'RefreshCw' },
    { label: 'Agent Discovery', to: '/agents', icon: 'Bot' },
    { label: 'Shadow AI', to: '/agents/shadow-ai', icon: 'Ghost' },
    { label: 'Datasets', to: '/datasets', icon: 'Database' },
    { label: 'Vendors', to: '/vendors', icon: 'Building2' },
  ]},
  { title: 'RISK & COMPLIANCE', items: [
    { label: 'Compliance', to: '/compliance', icon: 'CheckCircle' },
    { label: 'Bias Audits', to: '/bias-audits', icon: 'Scale' },
    { label: 'Evidence Sync', to: '/evidence-sync', icon: 'FolderSync' },
    { label: 'HITL Reviews', to: '/hitl', icon: 'UserCheck' },
    { label: 'Risk Map', to: '/risk', icon: 'Map' },
    { label: 'Trust Engine', to: '/trust-engine', icon: 'Lock' },
    { label: 'Guardrails', to: '/trust-engine/guardrails', icon: 'ShieldAlert' },
  ]},
  { title: 'SECURITY', items: [
    { label: 'Security Overview', to: '/security', icon: 'ShieldCheck' },
    { label: 'Threat Feed', to: '/security/threats', icon: 'Skull' },
    { label: 'Scan Center', to: '/security/scans', icon: 'Search' },
    { label: 'Incidents', to: '/risk/incidents', icon: 'AlertTriangle' },
  ]},
  { title: 'ADMINISTRATION', items: [
    { label: 'Access Control', to: '/access-control', icon: 'Key' },
    { label: 'Audit Log', to: '/audit-log', icon: 'BookOpen' },
    { label: 'Settings', to: '/settings', icon: 'Settings' },
  ]},
]