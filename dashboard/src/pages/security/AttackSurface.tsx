import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Globe, Server, Shield, AlertTriangle, Eye, Lock, Wifi, Database, Cloud, ExternalLink } from 'lucide-react';

interface Endpoint {
  id: string; name: string; type: string; url: string; risk: 'critical' | 'high' | 'medium' | 'low';
  exposure: number; openVulns: number; lastScan: string; status: 'exposed' | 'protected' | 'monitoring';
}

const ENDPOINTS: Endpoint[] = [
  { id: 'EP-001', name: 'GPT-4 Production API', type: 'API', url: 'api.sentinel.io/v1/chat', risk: 'high', exposure: 78, openVulns: 5, lastScan: '2h ago', status: 'monitoring' },
  { id: 'EP-002', name: 'Model Registry (HuggingFace)', type: 'Registry', url: 'hf.co/sentinel-org', risk: 'medium', exposure: 45, openVulns: 2, lastScan: '1d ago', status: 'protected' },
  { id: 'EP-003', name: 'RAG Vector Database', type: 'Database', url: 'pinecone.io/sentinel-idx', risk: 'critical', exposure: 92, openVulns: 8, lastScan: '30m ago', status: 'exposed' },
  { id: 'EP-004', name: 'Training Pipeline (AWS)', type: 'Cloud', url: 'sagemaker.us-east-1', risk: 'medium', exposure: 55, openVulns: 3, lastScan: '6h ago', status: 'protected' },
  { id: 'EP-005', name: 'Agent Orchestration Service', type: 'Service', url: 'agents.sentinel.io', risk: 'high', exposure: 71, openVulns: 6, lastScan: '4h ago', status: 'monitoring' },
  { id: 'EP-006', name: 'Embeddings Microservice', type: 'API', url: 'embed.sentinel.io/v2', risk: 'low', exposure: 22, openVulns: 1, lastScan: '12h ago', status: 'protected' },
  { id: 'EP-007', name: 'MLflow Experiment Tracker', type: 'Service', url: 'mlflow.internal.io', risk: 'medium', exposure: 48, openVulns: 2, lastScan: '3h ago', status: 'monitoring' },
  { id: 'EP-008', name: 'Customer Data Lake', type: 'Database', url: 's3://sentinel-datalake', risk: 'critical', exposure: 88, openVulns: 7, lastScan: '1h ago', status: 'exposed' },
];

const riskColor: Record<string, string> = { critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
const typeIcon: Record<string, any> = { API: Globe, Registry: Server, Database: Database, Cloud: Cloud, Service: Wifi };

export default function AttackSurface() {
  const [view, setView] = useState<'grid' | 'table'>('grid');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attack Surface Map</h1><p className="text-sm text-slate-500 mt-1">AI/ML infrastructure exposure analysis</p></div>
        <div className="flex gap-2">
          <button onClick={() => setView('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>Grid</button>
          <button onClick={() => setView('table')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>Table</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ l: 'Total Endpoints', v: ENDPOINTS.length, icon: Globe, c: 'blue' }, { l: 'Exposed', v: ENDPOINTS.filter(e => e.status === 'exposed').length, icon: AlertTriangle, c: 'red' }, { l: 'Open Vulns', v: ENDPOINTS.reduce((a, e) => a + e.openVulns, 0), icon: Shield, c: 'orange' }, { l: 'Avg Exposure', v: Math.round(ENDPOINTS.reduce((a, e) => a + e.exposure, 0) / ENDPOINTS.length) + '%', icon: Eye, c: 'purple' }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><div className={`p-2 rounded-lg bg-${s.c}-100 dark:bg-${s.c}-900/30`}><s.icon className={`w-5 h-5 text-${s.c}-600`} /></div><div><p className="text-2xl font-bold text-slate-900 dark:text-white">{s.v}</p><p className="text-xs text-slate-500">{s.l}</p></div></CardContent></Card>
        ))}
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 gap-4">
          {ENDPOINTS.map(ep => { const Icon = typeIcon[ep.type] || Globe; return (
            <Card key={ep.id} className="hover:shadow-md transition-shadow"><CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2"><div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" /></div><div><h3 className="font-semibold text-sm text-slate-900 dark:text-white">{ep.name}</h3><p className="text-xs text-slate-500 font-mono">{ep.url}</p></div></div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor[ep.risk]}`}>{ep.risk.toUpperCase()}</span>
              </div>
              <div className="mb-3"><div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Exposure Score</span><span className="font-medium text-slate-900 dark:text-white">{ep.exposure}%</span></div><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"><div className={`h-2 rounded-full ${ep.exposure >= 80 ? 'bg-red-500' : ep.exposure >= 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${ep.exposure}%` }} /></div></div>
              <div className="flex items-center justify-between text-xs"><span className="text-slate-500">{ep.openVulns} open vulns</span><span className="text-slate-400">Scanned {ep.lastScan}</span><span className={`px-2 py-0.5 rounded ${ep.status === 'exposed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ep.status === 'monitoring' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{ep.status}</span></div>
            </CardContent></Card>
          ); })}
        </div>
      ) : (
        <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="p-3 text-left text-xs font-medium text-slate-500">Endpoint</th><th className="p-3 text-left text-xs font-medium text-slate-500">Type</th><th className="p-3 text-left text-xs font-medium text-slate-500">Risk</th><th className="p-3 text-left text-xs font-medium text-slate-500">Exposure</th><th className="p-3 text-left text-xs font-medium text-slate-500">Vulns</th><th className="p-3 text-left text-xs font-medium text-slate-500">Status</th><th className="p-3 text-left text-xs font-medium text-slate-500">Actions</th></tr></thead><tbody>{ENDPOINTS.map(ep => <tr key={ep.id} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3 text-sm font-medium text-slate-900 dark:text-white">{ep.name}</td><td className="p-3 text-xs text-slate-500">{ep.type}</td><td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColor[ep.risk]}`}>{ep.risk}</span></td><td className="p-3 text-sm font-mono">{ep.exposure}%</td><td className="p-3 text-sm">{ep.openVulns}</td><td className="p-3 text-xs">{ep.status}</td><td className="p-3"><button className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700">Audit</button></td></tr>)}</tbody></table></CardContent></Card>
      )}
    </div>
  );
}