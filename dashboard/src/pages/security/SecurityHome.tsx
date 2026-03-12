import { Link } from 'react-router-dom';
const SCANS = [
  { name: 'GPT-4o Injection Scan', status: 'Complete', findings: 3, date: '2 hours ago', severity: 'High' },
  { name: 'Claude 3.5 Prompt Leak Test', status: 'Complete', findings: 1, date: '1 day ago', severity: 'Medium' },
  { name: 'Llama 3 Data Exfil Test', status: 'Running', findings: 0, date: 'In progress', severity: 'N/A' },
  { name: 'Gemini Jailbreak Scan', status: 'Scheduled', findings: 0, date: 'Tomorrow', severity: 'N/A' },
];
const THREATS = [
  { type: 'Prompt Injection', count: 12, trend: 'up', color: 'red' },
  { type: 'Data Leakage', count: 5, trend: 'down', color: 'amber' },
  { type: 'Model Theft', count: 2, trend: 'stable', color: 'blue' },
  { type: 'Adversarial Input', count: 8, trend: 'up', color: 'purple' },
];
export default function SecurityHome() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Inter, Outfit, system-ui, sans-serif' }}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Center</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {THREATS.map((t,i) => (
          <div key={i} className={`bg-white rounded-xl p-4 border shadow-sm`}>
            <p className="text-sm text-gray-500">{t.type}</p>
            <p className="text-2xl font-bold mt-1">{t.count}</p>
            <span className={`text-xs text-${t.color}-600`}>{t.trend === 'up' ? 'Trending up' : t.trend === 'down' ? 'Declining' : 'Stable'}</span>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b"><h2 className="font-semibold">Recent Scans</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-3 text-left">Scan Name</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Findings</th><th className="p-3 text-left">Severity</th><th className="p-3 text-left">Date</th></tr></thead>
          <tbody>{SCANS.map((s,i) => (<tr key={i} className="border-t"><td className="p-3">{s.name}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${s.status==='Complete'?'bg-green-100 text-green-700':s.status==='Running'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}`}>{s.status}</span></td><td className="p-3">{s.findings}</td><td className="p-3">{s.severity}</td><td className="p-3 text-gray-500">{s.date}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
