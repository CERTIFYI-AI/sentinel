import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, ShieldCheck, ListChecks, AlertTriangle, FileText, Database,
  Search, Target, FlaskConical, Shield, Key, Sun, Moon, ChevronDown, ChevronRight,
  Activity, Globe, Lock, Cpu, BarChart3, Settings, Bell, LogOut, User,
  Zap, Eye, BookOpen, GitBranch, Network, Bug, Crosshair
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  {
    s: 'OVERVIEW',
    i: [
      { l: 'Dashboard', icon: LayoutDashboard, to: '/overview' },
      { l: 'Security Overview', icon: ShieldCheck, to: '/security-overview' },
    ]
  },
  {
    s: 'THREAT INTELLIGENCE',
    i: [
      { l: 'Threat Feed', icon: Activity, to: '/threat-feed' },
      { l: 'Attack Surface', icon: Target, to: '/attack-surface' },
      { l: 'Vulnerability Tracker', icon: Bug, to: '/vuln-tracker' },
      { l: 'Scan Center', icon: Search, to: '/scan-center' },
    ]
  },
  {
    s: 'SECURITY OPS',
    i: [
      { l: 'Red Team Lab', icon: Crosshair, to: '/red-team-lab' },
      { l: 'Policy Firewall', icon: Shield, to: '/policy-firewall' },
      { l: 'Keys Vault', icon: Key, to: '/keys-vault' },
    ]
  },
  {
    s: 'COMPLIANCE',
    i: [
      { l: 'Compliance', icon: ListChecks, to: '/compliance' },
      { l: 'Audit Log', icon: BookOpen, to: '/audit-log' },
      { l: 'Evidence', icon: FileText, to: '/evidence' },
      { l: 'Gap Analysis', icon: BarChart3, to: '/gap-analysis' },
    ]
  },
  {
    s: 'AI GOVERNANCE',
    i: [
      { l: 'AI Models', icon: Cpu, to: '/models' },
      { l: 'Model Lifecycle', icon: GitBranch, to: '/model-lifecycle' },
      { l: 'Evals', icon: FlaskConical, to: '/evals' },
      { l: 'Datasets', icon: Database, to: '/datasets' },
    ]
  },
  {
    s: 'RISK',
    i: [
      { l: 'Risk Matrix', icon: AlertTriangle, to: '/risk-matrix' },
      { l: 'Incident Log', icon: Zap, to: '/incident-log' },
      { l: 'Remediation', icon: Network, to: '/remediation' },
    ]
  },
  {
    s: 'SETTINGS',
    i: [
      { l: 'Settings', icon: Settings, to: '/settings' },
      { l: 'Notifications', icon: Bell, to: '/notifications' },
    ]
  },
];

export default function Sidebar() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const btnCls = 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150';
  const activeCls = 'bg-blue-600 text-white shadow-sm';
  const inactiveCls = 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100';

  const toggleSection = (s: string) => setCollapsed(p => ({ ...p, [s]: !p[s] }));

  return (
    <aside className="w-56 flex-shrink-0 h-screen overflow-y-auto flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">SENTINEL</span>
        </div>
        <button onClick={toggle} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {theme === 'dark' ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {NAV.map((s, i) => (
          <div key={i}>
            <button
              onClick={() => toggleSection(s.s)}
              className="flex items-center justify-between w-full px-3 py-1 mb-1"
            >
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wider">{s.s}</span>
              {collapsed[s.s] ? <ChevronRight className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
            </button>
            {!collapsed[s.s] && (
              <div className="space-y-0.5">
                {s.i.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={`${btnCls} ${isActive ? activeCls : inactiveCls}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.l}</span>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 mb-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 dark:text-white truncate">Admin User</p>
            <p className="text-xs text-slate-500 truncate">admin@sentinel.io</p>
          </div>
        </div>
        <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}