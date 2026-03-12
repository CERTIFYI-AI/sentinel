import { useLocation } from 'react-router-dom';

const BREADCRUMB_MAP: Record<string, string> = {
  '/overview': 'Overview',
  '/security': 'Security Overview',
  '/security/threats': 'Threat Intelligence',
  '/security/scans': 'Scan Center',
  '/security/attack-surface': 'Attack Surface',
  '/security/vulnerabilities': 'Vulnerabilities',
  '/security/red-team': 'Red Team Lab',
  '/security/policies': 'Policy Firewall',
  '/security/keys': 'Keys Vault',
  '/security/model-arena': 'Model Arena',
  '/security/reports': 'Board Reports',
  '/evals/quality-metrics': 'Quality Metrics',
  '/evals/techniques': 'Eval Techniques',
  '/evals/benchmark': 'Benchmark',
  '/evals/datasets': 'Datasets',
  '/compliance': 'Compliance Dashboard',
  '/compliance/controls': 'Controls',
  '/compliance/evidence': 'Evidence Hub',
  '/compliance/gap-analysis': 'Gap Analysis',
  '/compliance/policies': 'Policy Management',
  '/risk': 'Risk Matrix',
  '/risk/vendors': 'Vendor Register',
  '/risk/incidents': 'Incident Log',
  '/risk/remediation': 'Remediation',
  '/models/inventory': 'Model Inventory',
  '/models/lifecycle': 'Model Lifecycle',
  '/audit-log': 'Audit Log',
  '/hitl-queue': 'HITL Queue',
  '/export': 'Export Center',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export default function TopHeader() {
  const location = useLocation();
  const currentPage = BREADCRUMB_MAP[location.pathname] || 'Dashboard';
  const section = location.pathname.split('/')[1] || 'dashboard';
  const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">{sectionLabel}</span>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-800">{currentPage}</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Search">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors relative" title="Notifications">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">3</span>
        </button>
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold">AD</div>
          <span className="text-sm text-gray-700">Admin</span>
        </div>
      </div>
    </header>
  );
}
