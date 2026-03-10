import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Key, Plus, Eye, EyeOff, Copy, Trash2, RefreshCw, Shield, Clock, AlertTriangle } from 'lucide-react';

interface ApiKey {
  id: string; name: string; key: string; provider: string; created: string;
  lastUsed: string; status: 'active' | 'expired' | 'revoked';
  permissions: string[]; rateLimit: string;
}

const API_KEYS: ApiKey[] = [
  { id: 'K-001', name: 'GPT-4 Production', key: 'sk-proj-****...8xQ2', provider: 'OpenAI', created: '2025-01-15', lastUsed: '2 min ago', status: 'active', permissions: ['chat', 'embeddings', 'fine-tuning'], rateLimit: '10K/min' },
  { id: 'K-002', name: 'Claude 3 Staging', key: 'sk-ant-****...7kP1', provider: 'Anthropic', created: '2025-02-01', lastUsed: '1h ago', status: 'active', permissions: ['chat', 'batch'], rateLimit: '5K/min' },
  { id: 'K-003', name: 'Pinecone Vector DB', key: 'pc-****...9mN3', provider: 'Pinecone', created: '2024-12-10', lastUsed: '30s ago', status: 'active', permissions: ['read', 'write', 'delete'], rateLimit: '50K/min' },
  { id: 'K-004', name: 'AWS SageMaker', key: 'AKIA****...2bX5', provider: 'AWS', created: '2024-11-20', lastUsed: '3h ago', status: 'active', permissions: ['invoke', 'deploy'], rateLimit: '1K/min' },
  { id: 'K-005', name: 'HuggingFace Hub', key: 'hf_****...4tR8', provider: 'HuggingFace', created: '2025-01-01', lastUsed: '2d ago', status: 'expired', permissions: ['read', 'write'], rateLimit: '100/min' },
  { id: 'K-006', name: 'Cohere Embed v3', key: 'co-****...6wL2', provider: 'Cohere', created: '2025-02-15', lastUsed: 'Never', status: 'revoked', permissions: ['embed'], rateLimit: '10K/min' },
];

const statusColor: Record<string, string> = { active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', expired: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };

export default function KeysVault() {
  const [showAdd, setShowAdd] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const toggleKeyVisibility = (id: string) => setVisibleKeys(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Keys Vault</h1><p className="text-sm text-slate-500 mt-1">Secure API key and secret management</p></div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"><Plus className="w-4 h-4" /> Add Key</button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[{ l: 'Total Keys', v: API_KEYS.length, icon: Key, c: 'blue' }, { l: 'Active', v: API_KEYS.filter(k => k.status === 'active').length, icon: Shield, c: 'green' }, { l: 'Expired', v: API_KEYS.filter(k => k.status === 'expired').length, icon: Clock, c: 'yellow' }, { l: 'Revoked', v: API_KEYS.filter(k => k.status === 'revoked').length, icon: AlertTriangle, c: 'red' }].map((s, i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3"><div className={`p-2 rounded-lg bg-${s.c}-100 dark:bg-${s.c}-900/30`}><s.icon className={`w-5 h-5 text-${s.c}-600`} /></div><div><p className="text-2xl font-bold text-slate-900 dark:text-white">{s.v}</p><p className="text-xs text-slate-500">{s.l}</p></div></CardContent></Card>
        ))}
      </div>

      {showAdd && (
        <Card><CardContent className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white">Add New API Key</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-500 mb-1 block">Key Name</label><input placeholder="e.g. GPT-4 Production" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" /></div>
            <div><label className="text-xs text-slate-500 mb-1 block">Provider</label><select className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option>OpenAI</option><option>Anthropic</option><option>Google</option><option>AWS</option><option>Azure</option><option>Other</option></select></div>
            <div><label className="text-xs text-slate-500 mb-1 block">API Key</label><input type="password" placeholder="sk-..." className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono" /></div>
          </div>
          <div className="flex gap-2"><button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save Key</button><button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">Cancel</button></div>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <table className="w-full"><thead><tr className="border-b border-slate-200 dark:border-slate-700"><th className="p-3 text-left text-xs font-medium text-slate-500">Name</th><th className="p-3 text-left text-xs font-medium text-slate-500">Key</th><th className="p-3 text-left text-xs font-medium text-slate-500">Provider</th><th className="p-3 text-left text-xs font-medium text-slate-500">Status</th><th className="p-3 text-left text-xs font-medium text-slate-500">Permissions</th><th className="p-3 text-left text-xs font-medium text-slate-500">Rate Limit</th><th className="p-3 text-left text-xs font-medium text-slate-500">Last Used</th><th className="p-3 text-left text-xs font-medium text-slate-500">Actions</th></tr></thead>
        <tbody>{API_KEYS.map(key => (
          <tr key={key.id} className="border-b border-slate-100 dark:border-slate-800">
            <td className="p-3"><div className="font-medium text-sm text-slate-900 dark:text-white">{key.name}</div><div className="text-xs text-slate-400">{key.id}</div></td>
            <td className="p-3 font-mono text-xs text-slate-600">{visibleKeys.has(key.id) ? key.key.replace(/\*/g, 'x') : key.key}</td>
            <td className="p-3 text-sm text-slate-500">{key.provider}</td>
            <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor[key.status]}`}>{key.status}</span></td>
            <td className="p-3"><div className="flex gap-1 flex-wrap">{key.permissions.map(p => <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">{p}</span>)}</div></td>
            <td className="p-3 text-xs font-mono">{key.rateLimit}</td>
            <td className="p-3 text-xs text-slate-500">{key.lastUsed}</td>
            <td className="p-3"><div className="flex gap-1">
              <button onClick={() => toggleKeyVisibility(key.id)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">{visibleKeys.has(key.id) ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}</button>
              <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Copy className="w-3.5 h-3.5 text-slate-400" /></button>
              <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw className="w-3.5 h-3.5 text-slate-400" /></button>
              <button className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div></td>
          </tr>
        ))}</tbody></table>
      </CardContent></Card>
    </div>
  );
}