import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Crosshair, Play, CheckCircle, XCircle, Clock, Zap, Target, Shield, Plus } from 'lucide-react';

interface RedTeamTest {
  id: string; name: string; category: string; target: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  severity: string; lastRun: string; passRate: number; description: string;
}

const TESTS: RedTeamTest[] = [
  { id: 'RT-001', name: 'Prompt Injection - Direct', category: 'Injection', target: 'GPT-4 API', status: 'failed', severity: 'critical', lastRun: '2h ago', passRate: 35, description: 'Direct prompt injection attempts to override system instructions.' },
  { id: 'RT-002', name: 'Jailbreak - Persona Stacking', category: 'Jailbreak', target: 'Claude 3', status: 'passed', severity: 'high', lastRun: '4h ago', passRate: 92, description: 'Multi-persona role-play attacks to bypass safety filters.' },
  { id: 'RT-003', name: 'Data Exfiltration via Tool Use', category: 'Exfiltration', target: 'Agent Pipeline', status: 'failed', severity: 'critical', lastRun: '1h ago', passRate: 28, description: 'Attempts to extract sensitive data through authorized tool calls.' },
  { id: 'RT-004', name: 'Adversarial Suffix Attack', category: 'Adversarial', target: 'Llama-3-70B', status: 'running', severity: 'high', lastRun: 'Running...', passRate: 0, description: 'Appending adversarial token sequences to bypass alignment.' },
  { id: 'RT-005', name: 'System Prompt Extraction', category: 'Extraction', target: 'All Models', status: 'failed', severity: 'medium', lastRun: '6h ago', passRate: 55, description: 'Techniques to reveal hidden system prompts and instructions.' },
  { id: 'RT-006', name: 'Bias Amplification Test', category: 'Fairness', target: 'GPT-4 API', status: 'passed', severity: 'medium', lastRun: '12h ago', passRate: 88, description: 'Test for demographic bias amplification in model outputs.' },
  { id: 'RT-007', name: 'Indirect Injection via RAG', category: 'Injection', target: 'RAG Pipeline', status: 'pending', severity: 'high', lastRun: 'Not run', passRate: 0, description: 'Injection through retrieved documents in RAG systems.' },
  { id: 'RT-008', name: 'Token Smuggling Attack', category: 'Adversarial', target: 'Mistral-7B', status: 'passed', severity: 'low', lastRun: '1d ago', passRate: 95, description: 'Unicode and encoding tricks to smuggle harmful tokens.' },
];

const statusIcon: Record<string, any> = { passed: CheckCircle, failed: XCircle, running: Zap, pending: Clock };
const statusStyle: Record<string, string> = { passed: 'text-green-600', failed: 'text-red-600', running: 'text-blue-600 animate-pulse', pending: 'text-slate-400' };

export default function RedTeamLab() {
  const [filter, setFilter] = useState('all');
  const filtered = TESTS.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Red Team Lab</h1><p className="text-sm text-slate-500 mt-1">Adversarial testing and AI safety assessment</p></div>
        <div className="flex gap-2"><button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"><Play className="w-4 h-4" /> Run All Tests</button><button className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> New Test</button></div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ l: 'Total Tests', v: TESTS.length, icon: Target, c: 'blue' }, { l: 'Passed', v: TESTS.filter(t => t.status === 'passed').length, icon: CheckCircle, c: 'green' }, { l: 'Failed', v: TESTS.filter(t => t.status === 'failed').length, icon: XCircle, c: 'red' }, { l: 'Avg Pass Rate', v: Math.round(TESTS.filter(t => t.passRate > 0).reduce((a, t) => a + t.passRate, 0) / TESTS.filter(t => t.passRate > 0).length) + '%', icon: Shield, c: 'purple' }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><div className={`p-2 rounded-lg bg-${s.c}-100 dark:bg-${s.c}-900/30`}><s.icon className={`w-5 h-5 text-${s.c}-600`} /></div><div><p className="text-2xl font-bold text-slate-900 dark:text-white">{s.v}</p><p className="text-xs text-slate-500">{s.l}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-1">{['all', 'passed', 'failed', 'running', 'pending'].map(s => <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>)}</div>

      <div className="space-y-3">
        {filtered.map(test => { const Icon = statusIcon[test.status]; return (
          <Card key={test.id} className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><Icon className={`w-4 h-4 ${statusStyle[test.status]}`} /><span className="font-semibold text-slate-900 dark:text-white text-sm">{test.name}</span><span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">{test.category}</span><span className="text-xs text-slate-400">{test.id}</span></div><p className="text-sm text-slate-500 mt-1">{test.description}</p><div className="flex items-center gap-4 mt-2 text-xs text-slate-400"><span>Target: {test.target}</span><span>Severity: {test.severity}</span>{test.passRate > 0 && <span>Pass Rate: <span className={test.passRate >= 80 ? 'text-green-600' : test.passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>{test.passRate}%</span></span>}<span>{test.lastRun}</span></div></div><div className="flex gap-1 ml-4"><button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100">Re-Run</button><button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">Details</button></div></div></CardContent></Card>
        ); })}
      </div>
    </div>
  );
}