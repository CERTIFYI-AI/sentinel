import { Link } from 'react-router-dom';

const STATS = [
  { label: 'Models', value: 12, icon: '🤖', to: '/models/inventory', color: 'bg-blue-50 text-blue-700' },
  { label: 'Vendors', value: 5, icon: '🏢', to: '/risk/vendors', color: 'bg-purple-50 text-purple-700' },
  { label: 'Policies', value: 24, icon: '📜', to: '/compliance/policies', color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Open Risks', value: 8, icon: '⚠️', to: '/risk', color: 'bg-amber-50 text-amber-700' },
  { label: 'Controls', value: 156, icon: '🎛️', to: '/compliance/controls', color: 'bg-indigo-50 text-indigo-700' },
  { label: 'Incidents', value: 3, icon: '🚨', to: '/risk/incidents', color: 'bg-red-50 text-red-700' },
];

const FRAMEWORKS = [
  { name: 'NIST AI RMF', score: 72, total: 93, status: 'In Progress' },
  { name: 'ISO 42001', score: 18, total: 24, status: 'In Progress' },
  { name: 'EU AI Act', score: 45, total: 85, status: 'In Progress' },
  { name: 'OWASP LLM Top 10', score: 8, total: 10, status: 'Complete' },
  { name: 'SOC 2 Type II', score: 64, total: 120, status: 'In Progress' },
];

const RECENT_ACTIVITY = [
  { action: 'Policy updated', detail: 'AI Ethics Policy v2.3 approved', time: '2 hours ago', type: 'policy' },
  { action: 'Scan completed', detail: 'GPT-4o injection scan - 3 findings', time: '4 hours ago', type: 'scan' },
  { action: 'Risk mitigated', detail: 'Vendor data retention risk resolved', time: '6 hours ago', type: 'risk' },
  { action: 'Model registered', detail: 'Claude 3.5 Sonnet added to inventory', time: '1 day ago', type: 'model' },
  { action: 'Evidence uploaded', detail: 'Q1 2026 audit evidence package', time: '1 day ago', type: 'evidence' },
  { action: 'Incident reported', detail: 'Hallucination in customer-facing bot', time: '2 days ago', type: 'incident' },
];

export default function Overview() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Good afternoon, Admin</h1>
        <p className="text-gray-500 text-sm mt-1">Here is an overview of your AI governance platform</p>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {STATS.map((stat) => (
          <Link key={stat.label} to={stat.to} className={`rounded-xl p-4 ${stat.color} hover:shadow-md transition-shadow`} style={{ textDecoration: 'none' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-75">{stat.label}</span>
              <span className="text-lg">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Compliance Frameworks */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Compliance Frameworks</h2>
            <Link to="/compliance" className="text-sm text-emerald-600 hover:text-emerald-700" style={{ textDecoration: 'none' }}>View all</Link>
          </div>
          <div className="space-y-4">
            {FRAMEWORKS.map((fw) => {
              const pct = Math.round((fw.score / fw.total) * 100);
              return (
                <div key={fw.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{fw.name}</span>
                    <span className="text-xs text-gray-500">{fw.score}/{fw.total} controls</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/audit-log" className="text-sm text-emerald-600 hover:text-emerald-700" style={{ textDecoration: 'none' }}>View all</Link>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  item.type === 'scan' ? 'bg-blue-500' :
                  item.type === 'risk' ? 'bg-amber-500' :
                  item.type === 'incident' ? 'bg-red-500' :
                  item.type === 'policy' ? 'bg-emerald-500' :
                  'bg-gray-400'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.action}</p>
                  <p className="text-xs text-gray-500 truncate">{item.detail}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* AI Governance Score */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Governance Score</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Risk Management', score: 78, color: 'text-emerald-600' },
            { label: 'Vendor Management', score: 65, color: 'text-amber-600' },
            { label: 'Policy Coverage', score: 92, color: 'text-emerald-600' },
            { label: 'Model Lifecycle', score: 54, color: 'text-red-500' },
            { label: 'Evidence Quality', score: 71, color: 'text-amber-600' },
          ].map((item) => (
            <div key={item.label} className="text-center p-4 rounded-lg bg-gray-50">
              <p className={`text-3xl font-bold ${item.color}`}>{item.score}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
