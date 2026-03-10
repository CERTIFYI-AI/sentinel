import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Shield, Plus, ToggleLeft, ToggleRight, AlertTriangle, CheckCircle, Clock, Zap, Edit, Trash2 } from 'lucide-react';

interface PolicyRule {
  id: string; name: string; type: 'block' | 'allow' | 'monitor' | 'rate-limit';
  target: string; condition: string; enabled: boolean;
  hits: number; lastTriggered: string | null; severity: string;
}

const INITIAL_RULES: PolicyRule[] = [
  { id: 'PF-001', name: 'Block Prompt Injection Patterns', type: 'block', target: 'All Models', condition: 'Input matches injection signatures', enabled: true, hits: 1247, lastTriggered: '2025-03-10T01:30:00Z', severity: 'critical' },
  { id: 'PF-002', name: 'Rate Limit API Calls', type: 'rate-limit', target: 'API Gateway', condition: '> 100 req/min per user', enabled: true, hits: 892, lastTriggered: '2025-03-10T02:00:00Z', severity: 'medium' },
  { id: 'PF-003', name: 'Monitor PII in Outputs', type: 'monitor', target: 'All Models', condition: 'Output contains PII patterns', enabled: true, hits: 456, lastTriggered: '2025-03-09T22:00:00Z', severity: 'high' },
  { id: 'PF-004', name: 'Block Model Weight Access', type: 'block', target: 'Model Server', condition: 'Unauthorized weight download attempt', enabled: true, hits: 23, lastTriggered: '2025-03-08T10:00:00Z', severity: 'critical' },
  { id: 'PF-005', name: 'Allow Internal Tool Calls', type: 'allow', target: 'Agent Pipeline', condition: 'Tool call from approved list', enabled: true, hits: 5621, lastTriggered: '2025-03-10T02:15:00Z', severity: 'low' },
  { id: 'PF-006', name: 'Block Jailbreak Patterns', type: 'block', target: 'Chat Models', condition: 'Input matches jailbreak DB', enabled: false, hits: 78, lastTriggered: '2025-03-07T14:00:00Z', severity: 'high' },
  { id: 'PF-007', name: 'Monitor External API Calls', type: 'monitor', target: 'Agent Pipeline', condition: 'Outbound HTTP to non-allowlisted domains', enabled: true, hits: 234, lastTriggered: '2025-03-09T16:00:00Z', severity: 'medium' },
  { id: 'PF-008', name: 'Rate Limit Embedding Requests', type: 'rate-limit', target: 'Embedding Service', condition: '> 500 req/min per tenant', enabled: true, hits: 45, lastTriggered: '2025-03-06T08:00:00Z', severity: 'low' },
];

const typeColor: Record<string, string> = { block: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', allow: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', monitor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', 'rate-limit': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };

export default function PolicyFirewall() {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [showAdd, setShowAdd] = useState(false);

  const toggleRule = (id: string) => setRules(r => r.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Policy Firewall</h1><p className="text-sm text-slate-500 mt-1">AI security policy rules and enforcement</p></div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus className="w-4 h-4" /> Add Rule</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ l: 'Total Rules', v: rules.length, c: 'blue' }, { l: 'Active', v: rules.filter(r => r.enabled).length, c: 'green' }, { l: 'Block Rules', v: rules.filter(r => r.type === 'block').length, c: 'red' }, { l: 'Total Hits', v: rules.reduce((a, r) => a + r.hits, 0).toLocaleString(), c: 'purple' }].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><p className="text-xs text-slate-500">{s.l}</p><p className={`text-2xl font-bold text-${s.c}-600`}>{s.v}</p></CardContent></Card>
        ))}
      </div>

      {showAdd && (
        <Card><CardContent className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Add New Rule</h3>
          <div className="grid grid-cols-4 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block">Rule Name</label><input placeholder="Rule name" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Type</label><select className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option>Block</option><option>Allow</option><option>Monitor</option><option>Rate Limit</option></select></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Target</label><input placeholder="Target system" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Condition</label><input placeholder="Condition expression" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
          </div>
          <div className="flex gap-2"><button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save Rule</button><button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Cancel</button></div>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="p-3 text-left text-xs font-medium text-slate-500">Rule</th><th className="p-3 text-left text-xs font-medium text-slate-500">Type</th><th className="p-3 text-left text-xs font-medium text-slate-500">Target</th><th className="p-3 text-left text-xs font-medium text-slate-500">Condition</th><th className="p-3 text-left text-xs font-medium text-slate-500">Hits</th><th className="p-3 text-left text-xs font-medium text-slate-500">Last Triggered</th><th className="p-3 text-left text-xs font-medium text-slate-500">Enabled</th><th className="p-3 text-left text-xs font-medium text-slate-500">Actions</th></tr></thead>
        <tbody>{rules.map(rule => (
          <tr key={rule.id} className={`border-b border-slate-100 dark:border-slate-800 ${!rule.enabled ? 'opacity-50' : ''}`}>
            <td className="p-3"><div className="font-medium text-sm text-slate-900 dark:text-white">{rule.name}</div><div className="text-xs text-slate-400">{rule.id}</div></td>
            <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${typeColor[rule.type]}`}>{rule.type}</span></td>
            <td className="p-3 text-xs text-slate-500">{rule.target}</td>
            <td className="p-3 text-xs text-slate-500 max-w-48 truncate">{rule.condition}</td>
            <td className="p-3 text-sm font-mono">{rule.hits.toLocaleString()}</td>
            <td className="p-3 text-xs text-slate-500">{rule.lastTriggered ? new Date(rule.lastTriggered).toLocaleDateString() : '-'}</td>
            <td className="p-3"><button onClick={() => toggleRule(rule.id)} className="text-slate-500 hover:text-blue-600">{rule.enabled ? <ToggleRight className="w-6 h-6 text-green-600" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}</button></td>
            <td className="p-3"><div className="flex gap-1"><button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Edit className="w-3.5 h-3.5 text-slate-400" /></button><button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 className="w-3.5 h-3.5 text-slate-400" /></button></div></td>
          </tr>
        ))}</tbody></table>
      </CardContent></Card>
    </div>
  );
}