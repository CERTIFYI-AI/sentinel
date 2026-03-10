import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Bug, Search, Filter, AlertTriangle, Clock, User, Plus, ChevronRight } from 'lucide-react';

type Severity = 'critical' | 'high' | 'medium' | 'low';
interface Vuln {
  id: string; title: string; severity: Severity; cveId?: string; component: string;
  status: 'open' | 'in-progress' | 'resolved' | 'wont-fix';
  assignee: string; discoveredAt: string; affectedVersions: string;
  description: string;
}

const VULNS: Vuln[] = [
  { id: 'V-001', title: 'SQL Injection in RAG Query Builder', severity: 'critical', cveId: 'CVE-2025-1001', component: 'RAG Pipeline', status: 'open', assignee: 'Alice Chen', discoveredAt: '2025-03-09', affectedVersions: 'v2.1.0-v2.3.2', description: 'Unsanitized user input passed directly to vector DB query builder allows SQL injection.' },
  { id: 'V-002', title: 'Prompt Leakage via System Message Extraction', severity: 'high', component: 'Chat API', status: 'in-progress', assignee: 'Bob Kumar', discoveredAt: '2025-03-08', affectedVersions: 'v3.0.0+', description: 'Crafted prompts can extract system instructions from the AI model.' },
  { id: 'V-003', title: 'Model Weight Exfiltration via Debug Endpoint', severity: 'critical', cveId: 'CVE-2025-1042', component: 'Model Server', status: 'open', assignee: 'Unassigned', discoveredAt: '2025-03-07', affectedVersions: 'v1.0.0-v1.5.0', description: 'Debug endpoint left exposed allows downloading model weights.' },
  { id: 'V-004', title: 'XSS in Eval Dashboard', severity: 'medium', component: 'Dashboard', status: 'resolved', assignee: 'Carol Li', discoveredAt: '2025-03-05', affectedVersions: 'v4.2.0', description: 'Stored XSS through eval metric names displayed without sanitization.' },
  { id: 'V-005', title: 'Insecure API Key Storage', severity: 'high', component: 'Keys Vault', status: 'in-progress', assignee: 'Dave Park', discoveredAt: '2025-03-04', affectedVersions: 'All', description: 'API keys stored in plaintext in environment variables.' },
  { id: 'V-006', title: 'Rate Limiting Bypass on Inference API', severity: 'medium', component: 'API Gateway', status: 'open', assignee: 'Alice Chen', discoveredAt: '2025-03-03', affectedVersions: 'v2.0.0+', description: 'Rate limiting can be bypassed using multiple API key rotation.' },
  { id: 'V-007', title: 'Training Data PII Exposure', severity: 'critical', component: 'Data Pipeline', status: 'in-progress', assignee: 'Eve Sharma', discoveredAt: '2025-03-01', affectedVersions: 'v1.0.0+', description: 'PII not properly redacted from training datasets.' },
  { id: 'V-008', title: 'Outdated TensorFlow Dependency', severity: 'low', component: 'ML Framework', status: 'wont-fix', assignee: 'Bob Kumar', discoveredAt: '2025-02-28', affectedVersions: 'v2.8.0', description: 'TF 2.8 has known low-severity CVEs but upgrade path is complex.' },
];

const sevColor: Record<Severity, string> = { critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200', high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200', medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200', low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200' };
const statusColor: Record<string, string> = { open: 'bg-red-100 text-red-700', 'in-progress': 'bg-blue-100 text-blue-700', resolved: 'bg-green-100 text-green-700', 'wont-fix': 'bg-slate-100 text-slate-600' };

export default function VulnTracker() {
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = VULNS.filter(v => {
    if (sevFilter !== 'all' && v.severity !== sevFilter) return false;
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (search && !v.title.toLowerCase().includes(search.toLowerCase()) && !v.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vulnerability Tracker</h1><p className="text-sm text-slate-500 mt-1">Track and manage AI/ML security vulnerabilities</p></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus className="w-4 h-4" /> Report Vulnerability</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ l: 'Total Vulns', v: VULNS.length, c: 'blue' }, { l: 'Critical', v: VULNS.filter(v => v.severity === 'critical').length, c: 'red' }, { l: 'Open', v: VULNS.filter(v => v.status === 'open').length, c: 'orange' }, { l: 'Resolved', v: VULNS.filter(v => v.status === 'resolved').length, c: 'green' }].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><p className="text-xs text-slate-500">{s.l}</p><p className={`text-2xl font-bold text-${s.c}-600`}>{s.v}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vulnerabilities..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option value="all">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option value="all">All</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="wont-fix">Won't Fix</option></select>
      </div>

      <div className="space-y-3">
        {filtered.map(v => (
          <Card key={v.id} className={`border-l-4 ${sevColor[v.severity]} hover:shadow-md transition-shadow`}><CardContent className="p-4"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 rounded text-xs font-medium ${sevColor[v.severity]}`}>{v.severity.toUpperCase()}</span><span className={`px-2 py-0.5 rounded text-xs ${statusColor[v.status]}`}>{v.status}</span><span className="text-xs text-slate-400">{v.id}</span>{v.cveId && <span className="text-xs text-blue-600 font-mono">{v.cveId}</span>}</div><h3 className="font-semibold text-slate-900 dark:text-white">{v.title}</h3><p className="text-sm text-slate-500 mt-1">{v.description}</p><div className="flex gap-4 mt-2 text-xs text-slate-400"><span>Component: {v.component}</span><span>Assignee: {v.assignee}</span><span>Versions: {v.affectedVersions}</span><span>Found: {v.discoveredAt}</span></div></div><div className="flex gap-1 ml-4"><button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Assign</button><button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Details</button></div></div></CardContent></Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400">No vulnerabilities match filters.</div>}
      </div>
    </div>
  );
}