import { useLocation, Link } from 'react-router-dom';
import { useState } from 'react';

interface NavItem { label: string; to: string; icon: string; }
interface NavSection { title: string; items: NavItem[]; }

const NAV: NavSection[] = [
  { title: 'DASHBOARD', items: [
    { label: 'Overview', to: '/overview', icon: '📊' },
  ]},
  { title: 'SECURITY', items: [
    { label: 'Security Overview', to: '/security', icon: '🛡' },
    { label: 'Threat Intelligence', to: '/security/threats', icon: '🔍' },
    { label: 'Scan Center', to: '/security/scans', icon: '📡' },
    { label: 'Attack Surface', to: '/security/attack-surface', icon: '🎯' },
    { label: 'Vulnerabilities', to: '/security/vulnerabilities', icon: '⚠' },
    { label: 'Red Team Lab', to: '/security/red-team', icon: '🔴' },
    { label: 'Policy Firewall', to: '/security/policies', icon: '🧱' },
    { label: 'Keys Vault', to: '/security/keys', icon: '🔑' },
    { label: 'Model Arena', to: '/security/model-arena', icon: '🏟' },
    { label: 'Board Reports', to: '/security/reports', icon: '📋' },
  ]},
  { title: 'EVALS', items: [
    { label: 'Quality Metrics', to: '/evals/quality-metrics', icon: '📈' },
    { label: 'Eval Techniques', to: '/evals/techniques', icon: '🧪' },
    { label: 'Benchmark', to: '/evals/benchmark', icon: '🏆' },
    { label: 'Datasets', to: '/evals/datasets', icon: '💾' },
  ]},
  { title: 'COMPLIANCE', items: [
    { label: 'Dashboard', to: '/compliance', icon: '✅' },
    { label: 'Controls', to: '/compliance/controls', icon: '🎛' },
    { label: 'Evidence Hub', to: '/compliance/evidence', icon: '📁' },
    { label: 'Gap Analysis', to: '/compliance/gap-analysis', icon: '📉' },
    { label: 'Policy Management', to: '/compliance/policies', icon: '📜' },
  ]},
  { title: 'RISK', items: [
    { label: 'Risk Matrix', to: '/risk', icon: '🗺' },
    { label: 'Vendor Register', to: '/risk/vendors', icon: '🏢' },
    { label: 'Incident Log', to: '/risk/incidents', icon: '🚨' },
    { label: 'Remediation', to: '/risk/remediation', icon: '🔧' },
  ]},
  { title: 'MODELS', items: [
    { label: 'Inventory', to: '/models/inventory', icon: '🤖' },
    { label: 'Lifecycle', to: '/models/lifecycle', icon: '🔄' },
  ]},
  { title: 'OPERATIONS', items: [
    { label: 'Audit Log', to: '/audit-log', icon: '📝' },
    { label: 'HITL Queue', to: '/hitl-queue', icon: '👤' },
    { label: 'Export Center', to: '/export', icon: '📤' },
    { label: 'Notifications', to: '/notifications', icon: '🔔' },
    { label: 'Settings', to: '/settings', icon: '⚙' },
  ]},
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSection = (title: string) => setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  const isActive = (path: string): boolean => {
    if (path === '/overview') return location.pathname === '/overview' || location.pathname === '/';
    if (path === '/security') return location.pathname === '/security' || location.pathname === '/security/overview';
    return location.pathname === path;
  };

  if (sidebarCollapsed) {
    return (
      <aside className="w-16 border-r min-h-screen flex flex-col items-center py-4 bg-[#1a1f2e]">
        <button onClick={() => setSidebarCollapsed(false)} className="mb-6 w-10 h-10 rounded-lg flex items-center justify-center text-white hover:bg-white/10">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">S</div>
      </aside>
    );
  }

  return (
    <aside className="w-64 border-r min-h-screen flex flex-col bg-[#1a1f2e] text-gray-300" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <Link to="/overview" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <span className="text-white font-semibold text-sm">Sentinel</span>
            <span className="text-[10px] text-gray-500 ml-1">v1.0</span>
          </div>
        </Link>
        <button onClick={() => setSidebarCollapsed(true)} className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((section) => (
          <div key={section.title} className="mb-1">
            <button onClick={() => toggleSection(section.title)} className="w-full flex items-center justify-between px-5 py-2 text-[11px] font-semibold tracking-widest text-gray-500 hover:text-gray-300 transition-colors">
              {section.title}
              <svg className={`w-3 h-3 transition-transform ${collapsed[section.title] ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {!collapsed[section.title] && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {section.items.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} style={{ textDecoration: 'none' }} className={`flex items-center gap-2.5 px-5 py-[7px] text-[13px] transition-all duration-150 ${isActive(item.to) ? 'bg-emerald-500/15 text-emerald-400 border-r-2 border-emerald-400 font-medium' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}>
                      <span className="text-sm w-5 text-center">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">AD</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate" style={{ margin: 0 }}>Admin User</p>
            <p className="text-[11px] text-gray-500 truncate" style={{ margin: 0 }}>admin@certifyi.ai</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
