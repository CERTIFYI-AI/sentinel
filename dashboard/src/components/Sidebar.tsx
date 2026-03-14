import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem { label: string; to: string; icon: string; }
interface NavSection { title: string; items: NavItem[]; }

const NAV: NavSection[] = [
  { title: 'DASHBOARD', items: [
    { label: 'Overview', to: '/overview', icon: 'BarChart3' },
    { label: 'Alerts', to: '/notifications', icon: 'Bell' },
  ]},
  { title: 'GOVERNANCE', items: [
    { label: 'Policy Manager', to: '/compliance/policies', icon: 'FileText' },
        { label: 'Controls', to: '/compliance/controls', icon: 'Shield' },
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
];

function getIcon(name: string) {
  const Icon = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[name];
  return Icon ? <Icon className="h-4 w-4" /> : null;
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (t: string) => setCollapsed((p) => ({ ...p, [t]: !p[t] }));
  return (
    <aside className="w-60 border-r bg-card h-full overflow-y-auto flex flex-col">
      <div className="px-4 py-4 font-bold text-lg border-b">Sentinel GRC</div>
      <nav className="flex-1 px-2 py-2 space-y-1">
        {NAV.map((s) => (
          <div key={s.title}>
            <button onClick={() => toggle(s.title)} className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground">
              {s.title}
              {collapsed[s.title] ? <Icons.ChevronRight className="h-3 w-3" /> : <Icons.ChevronDown className="h-3 w-3" />}
            </button>
            {!collapsed[s.title] && <div className="space-y-0.5">
              {s.items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors', isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                  {getIcon(item.icon)}
                  {item.label}
                </NavLink>
              ))}
            </div>}
          </div>
        ))}
      </nav>
    </aside>
  );
}
