import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { AlertTriangle, Shield, Activity, Filter, Search, ExternalLink, Clock, Tag, ChevronDown, RefreshCw } from 'lucide-react';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type ThreatType = 'malware' | 'phishing' | 'ransomware' | 'apt' | 'zero-day' | 'ddos';

interface Threat {
  id: string;
  title: string;
  severity: Severity;
  type: ThreatType;
  source: string;
  cveId?: string;
  description: string;
  timestamp: string;
  affectedModels: string[];
  iocs: string[];
  status: 'new' | 'investigating' | 'mitigated' | 'resolved';
}

const THREATS: Threat[] = [
  { id: 'T-001', title: 'Prompt Injection via Multimodal Input', severity: 'critical', type: 'apt', source: 'MITRE ATLAS', cveId: 'CVE-2025-4821', description: 'Advanced prompt injection technique exploiting multimodal AI models through crafted image payloads.', timestamp: '2025-03-10T02:15:00Z', affectedModels: ['GPT-4o', 'Claude 3.5', 'Gemini Pro'], iocs: ['base64_encoded_prompt_*'], status: 'investigating' },
  { id: 'T-002', title: 'Model Poisoning Campaign - LLM Supply Chain', severity: 'critical', type: 'malware', source: 'HuggingFace Security', description: 'Coordinated campaign injecting backdoors into popular open-source LLM fine-tuning datasets.', timestamp: '2025-03-09T18:30:00Z', affectedModels: ['Llama-3-70B', 'Mistral-7B'], iocs: ['sha256:a3f2...'], status: 'new' },
  { id: 'T-003', title: 'Data Exfiltration via AI Agent Tool Calls', severity: 'high', type: 'apt', source: 'Internal SOC', description: 'Adversarial prompts cause AI agents to exfiltrate sensitive data through allowed tool integrations.', timestamp: '2025-03-09T14:45:00Z', affectedModels: ['AutoGPT', 'LangChain Agents'], iocs: ['tool_call:http_request:external'], status: 'investigating' },
  { id: 'T-004', title: 'Jailbreak Technique - DAN v12.0', severity: 'high', type: 'phishing', source: 'Reddit r/ChatGPT', description: 'New jailbreak variant bypassing RLHF safety training using recursive role-play persona stacking.', timestamp: '2025-03-08T22:00:00Z', affectedModels: ['GPT-4', 'Claude 3'], iocs: ['recursive_persona_stack'], status: 'mitigated' },
  { id: 'T-005', title: 'Adversarial Embedding Attack on RAG Pipeline', severity: 'medium', type: 'zero-day', source: 'arXiv:2503.04821', description: 'Novel attack crafting adversarial documents that manipulate RAG to return attacker-controlled content.', timestamp: '2025-03-08T10:20:00Z', affectedModels: ['Any RAG System'], iocs: ['cosine_sim > 0.99'], status: 'investigating' },
  { id: 'T-006', title: 'AI-Powered Credential Stuffing Botnet', severity: 'high', type: 'ddos', source: 'Cloudflare Radar', description: 'New botnet using LLMs to generate human-like login attempts bypassing bot detection.', timestamp: '2025-03-07T16:00:00Z', affectedModels: ['Auth Systems'], iocs: ['ua:AI-Bot-Cluster-*'], status: 'new' },
  { id: 'T-007', title: 'Training Data Reconstruction Attack', severity: 'medium', type: 'apt', source: 'Google DeepMind', description: 'Demonstrated ability to reconstruct training data from production LLMs using extraction prompts.', timestamp: '2025-03-07T09:00:00Z', affectedModels: ['GPT-3.5', 'PaLM 2'], iocs: ['repeated_token_pattern_*'], status: 'resolved' },
  { id: 'T-008', title: 'Ransomware Targeting MLOps Infrastructure', severity: 'critical', type: 'ransomware', source: 'CISA Advisory', description: 'Ransomware targeting K8s clusters running ML training workloads, encrypting model checkpoints.', timestamp: '2025-03-06T20:30:00Z', affectedModels: ['K8s ML Infra'], iocs: ['sha256:e7b1...', '.mllock'], status: 'investigating' },
];

const sevColor: Record<Severity, string> = { critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
const statusColor: Record<string, string> = { new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', investigating: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', mitigated: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };

export default function ThreatFeed() {
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<Severity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = THREATS.filter(t => {
    if (sevFilter !== 'all' && t.severity !== sevFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = { total: THREATS.length, critical: THREATS.filter(t => t.severity === 'critical').length, investigating: THREATS.filter(t => t.status === 'investigating').length, newCount: THREATS.filter(t => t.status === 'new').length };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Threat Intelligence Feed</h1><p className="text-sm text-slate-500 mt-1">Real-time AI/ML threat monitoring and analysis</p></div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><RefreshCw className="w-4 h-4" /> Refresh Feed</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ label: 'Total Threats', value: stats.total, icon: Activity, color: 'blue' }, { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'red' }, { label: 'Investigating', value: stats.investigating, icon: Search, color: 'purple' }, { label: 'New Alerts', value: stats.newCount, icon: Shield, color: 'blue' }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><div className={`p-2 rounded-lg bg-${s.color}-100 dark:bg-${s.color}-900/30`}><s.icon className={`w-5 h-5 text-${s.color}-600`} /></div><div><p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></div></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search threats..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value as any)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option value="all">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option></select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option value="all">All Statuses</option><option value="new">New</option><option value="investigating">Investigating</option><option value="mitigated">Mitigated</option><option value="resolved">Resolved</option></select>
      </div>

      <div className="space-y-3">
        {filtered.map(threat => (
          <Card key={threat.id} className="hover:shadow-md transition-shadow"><CardContent className="p-4"><div className="flex items-start justify-between"><div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className={`px-2 py-0.5 rounded text-xs font-medium ${sevColor[threat.severity]}`}>{threat.severity.toUpperCase()}</span><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[threat.status]}`}>{threat.status}</span><span className="text-xs text-slate-400">{threat.id}</span>{threat.cveId && <span className="text-xs text-blue-600 font-mono">{threat.cveId}</span>}</div><h3 className="font-semibold text-slate-900 dark:text-white">{threat.title}</h3><p className="text-sm text-slate-500 mt-1">{threat.description}</p><div className="flex items-center gap-4 mt-2"><span className="text-xs text-slate-400 flex items-center gap-1"><Tag className="w-3 h-3" />{threat.type}</span><span className="text-xs text-slate-400 flex items-center gap-1"><ExternalLink className="w-3 h-3" />{threat.source}</span><span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(threat.timestamp).toLocaleDateString()}</span></div><div className="flex gap-1 mt-2">{threat.affectedModels.map(m => <span key={m} className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{m}</span>)}</div></div><div className="flex flex-col gap-1 ml-4"><button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Investigate</button><button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Mitigate</button></div></div></CardContent></Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400">No threats match filters.</div>}
      </div>
    </div>
  );
}