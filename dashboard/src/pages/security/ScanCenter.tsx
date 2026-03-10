import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Search, Play, Square, Clock, CheckCircle, XCircle, AlertTriangle, Shield, Loader2, Plus } from 'lucide-react';

interface Scan {
  id: string; target: string; type: string; status: 'completed' | 'running' | 'queued' | 'failed';
  startedAt: string; duration: string; score: number;
  findings: { critical: number; high: number; medium: number; low: number };
}

const SCANS: Scan[] = [
  { id: 'SC-001', target: 'gpt-4-prod-api', type: 'Prompt Injection', status: 'completed', startedAt: '2025-03-10T01:00:00Z', duration: '4m 32s', score: 72, findings: { critical: 2, high: 5, medium: 8, low: 12 } },
  { id: 'SC-002', target: 'claude-3-staging', type: 'Model Security', status: 'running', startedAt: '2025-03-10T02:30:00Z', duration: '2m 15s', score: 0, findings: { critical: 0, high: 0, medium: 0, low: 0 } },
  { id: 'SC-003', target: 'rag-pipeline-v2', type: 'Data Leakage', status: 'completed', startedAt: '2025-03-09T18:00:00Z', duration: '8m 45s', score: 85, findings: { critical: 0, high: 3, medium: 5, low: 7 } },
  { id: 'SC-004', target: 'llama-3-finetune', type: 'Bias Detection', status: 'completed', startedAt: '2025-03-09T14:00:00Z', duration: '12m 10s', score: 91, findings: { critical: 0, high: 1, medium: 3, low: 9 } },
  { id: 'SC-005', target: 'agent-toolchain', type: 'Tool Abuse', status: 'failed', startedAt: '2025-03-09T10:00:00Z', duration: '1m 02s', score: 0, findings: { critical: 0, high: 0, medium: 0, low: 0 } },
  { id: 'SC-006', target: 'embedding-service', type: 'Adversarial Robustness', status: 'queued', startedAt: '', duration: '-', score: 0, findings: { critical: 0, high: 0, medium: 0, low: 0 } },
  { id: 'SC-007', target: 'mistral-7b-prod', type: 'Jailbreak Testing', status: 'completed', startedAt: '2025-03-08T22:00:00Z', duration: '6m 20s', score: 64, findings: { critical: 3, high: 7, medium: 4, low: 2 } },
];

const statusIcon: Record<string, any> = { completed: CheckCircle, running: Loader2, queued: Clock, failed: XCircle };
const statusColor: Record<string, string> = { completed: 'text-green-600', running: 'text-blue-600 animate-spin', queued: 'text-yellow-600', failed: 'text-red-600' };

export default function ScanCenter() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showNewScan, setShowNewScan] = useState(false);

  const filtered = SCANS.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.target.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const scoreColor = (s: number) => s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scan Center</h1><p className="text-sm text-slate-500 mt-1">AI/ML security scanning and assessment</p></div>
        <button onClick={() => setShowNewScan(!showNewScan)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus className="w-4 h-4" /> New Scan</button>
      </div>

      {showNewScan && (
        <Card><CardContent className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Configure New Scan</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block">Target</label><input placeholder="e.g. gpt-4-prod-api" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Scan Type</label><select className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option>Prompt Injection</option><option>Model Security</option><option>Data Leakage</option><option>Bias Detection</option><option>Jailbreak Testing</option><option>Adversarial Robustness</option><option>Tool Abuse</option></select></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Priority</label><select className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option>Normal</option><option>High</option><option>Critical</option></select></div>
          </div>
          <div className="flex gap-2"><button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Start Scan</button><button onClick={() => setShowNewScan(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Cancel</button></div>
        </CardContent></Card>
      )}

      <div className="grid grid-cols-4 gap-4">
        {[{ l: 'Total Scans', v: SCANS.length, c: 'blue' }, { l: 'Running', v: SCANS.filter(s => s.status === 'running').length, c: 'blue' }, { l: 'Critical Findings', v: SCANS.reduce((a, s) => a + s.findings.critical, 0), c: 'red' }, { l: 'Avg Score', v: Math.round(SCANS.filter(s => s.score > 0).reduce((a, s) => a + s.score, 0) / SCANS.filter(s => s.score > 0).length), c: 'green' }].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><p className="text-xs text-slate-500">{s.l}</p><p className={`text-2xl font-bold text-${s.c}-600`}>{s.v}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search scans..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
        <div className="flex gap-1">{['all', 'completed', 'running', 'queued', 'failed'].map(s => <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>)}</div>
      </div>

      <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="p-3 text-left text-xs font-medium text-slate-500">Scan</th><th className="p-3 text-left text-xs font-medium text-slate-500">Target</th><th className="p-3 text-left text-xs font-medium text-slate-500">Type</th><th className="p-3 text-left text-xs font-medium text-slate-500">Status</th><th className="p-3 text-left text-xs font-medium text-slate-500">Duration</th><th className="p-3 text-left text-xs font-medium text-slate-500">Findings</th><th className="p-3 text-left text-xs font-medium text-slate-500">Score</th><th className="p-3 text-left text-xs font-medium text-slate-500">Actions</th></tr></thead>
        <tbody>{filtered.map(scan => { const Icon = statusIcon[scan.status]; return (
          <tr key={scan.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <td className="p-3 text-sm font-mono text-slate-600 dark:text-slate-400">{scan.id}</td>
            <td className="p-3 text-sm font-medium text-slate-900 dark:text-white">{scan.target}</td>
            <td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{scan.type}</span></td>
            <td className="p-3"><span className={`flex items-center gap-1 text-xs ${statusColor[scan.status]}`}><Icon className="w-3.5 h-3.5" />{scan.status}</span></td>
            <td className="p-3 text-sm text-slate-500">{scan.duration}</td>
            <td className="p-3">{scan.status === 'completed' ? <div className="flex gap-1">{scan.findings.critical > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{scan.findings.critical}C</span>}{scan.findings.high > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{scan.findings.high}H</span>}{scan.findings.medium > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">{scan.findings.medium}M</span>}{scan.findings.low > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">{scan.findings.low}L</span>}</div> : <span className="text-xs text-slate-400">-</span>}</td>
            <td className="p-3"><span className={`font-bold font-mono ${scoreColor(scan.score)}`}>{scan.score > 0 ? scan.score : '-'}</span></td>
            <td className="p-3"><button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Details</button></td>
          </tr>
        ); })}</tbody></table></CardContent></Card>
    </div>
  );
}