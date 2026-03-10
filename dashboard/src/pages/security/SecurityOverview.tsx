import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/card';
import { ShieldCheck, AlertTriangle, Bug, Search, Crosshair, Shield, Key, Activity, TrendingUp, TrendingDown, ArrowRight, Eye, Zap } from 'lucide-react';

const POSTURE = [
  { label: 'Threat Level', value: 'HIGH', color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', icon: AlertTriangle },
  { label: 'Open Vulns', value: '34', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: Bug },
  { label: 'Active Scans', value: '3', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Search },
  { label: 'Policy Rules', value: '8', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: Shield },
  { label: 'Red Team Tests', value: '12', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: Crosshair },
  { label: 'API Keys', value: '6', color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Key },
];

const RECENT_THREATS = [
  { id: 'T-001', title: 'Prompt Injection via Multimodal Input', severity: 'critical', time: '2h ago' },
  { id: 'T-002', title: 'Model Poisoning Campaign', severity: 'critical', time: '8h ago' },
  { id: 'T-003', title: 'Data Exfiltration via Agent Tool Calls', severity: 'high', time: '12h ago' },
  { id: 'T-008', title: 'Ransomware Targeting MLOps Infra', severity: 'critical', time: '1d ago' },
];

const RECENT_VULNS = [
  { id: 'V-001', title: 'SQL Injection in RAG Query Builder', severity: 'critical', status: 'open' },
  { id: 'V-003', title: 'Model Weight Exfiltration via Debug Endpoint', severity: 'critical', status: 'open' },
  { id: 'V-007', title: 'Training Data PII Exposure', severity: 'critical', status: 'in-progress' },
  { id: 'V-005', title: 'Insecure API Key Storage', severity: 'high', status: 'in-progress' },
];

const QUICK_ACTIONS = [
  { title: 'Run Security Scan', desc: 'Scan a model for vulnerabilities', route: '/scan-center', icon: Search },
  { title: 'View Threat Feed', desc: 'Check latest AI threat intel', route: '/threat-feed', icon: Activity },
  { title: 'Red Team Test', desc: 'Launch adversarial test suite', route: '/red-team-lab', icon: Crosshair },
  { title: 'Manage Policies', desc: 'Configure firewall rules', route: '/policy-firewall', icon: Shield },
];

const sevColor: Record<string, string> = { critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700' };

export default function SecurityOverview() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Security Overview</h1><p className="text-sm text-slate-500 mt-1">AI/ML security posture at a glance</p></div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30"><AlertTriangle className="w-4 h-4 text-orange-600" /><span className="text-sm font-medium text-orange-700 dark:text-orange-400">Security Score: 64/100</span></div>
      </div>

      {/* Security Posture Cards */}
      <div className="grid grid-cols-6 gap-3">
        {POSTURE.map((p, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer"><CardContent className="p-3 text-center">
            <div className={`w-10 h-10 mx-auto mb-2 rounded-lg ${p.bg} flex items-center justify-center`}><p.icon className={`w-5 h-5 ${p.color}`} /></div>
            <p className={`text-lg font-bold ${p.color}`}>{p.value}</p>
            <p className="text-xs text-slate-500">{p.label}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Security Score Bar */}
      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-slate-900 dark:text-white">Overall Security Score</span><span className="text-sm font-bold text-orange-600">64/100</span></div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3"><div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" style={{ width: '64%' }} /></div>
        <div className="flex justify-between mt-2 text-xs text-slate-400"><span>Critical: 3 open vulns</span><span>High: 5 active threats</span><span>3 scans running</span><span>7/8 policies active</span></div>
      </CardContent></Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Threats */}
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Activity className="w-4 h-4 text-red-600" />Recent Threats</h3><button onClick={() => navigate('/threat-feed')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></button></div>
          <div className="space-y-2">{RECENT_THREATS.map(t => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              <div className="flex items-center gap-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${sevColor[t.severity]}`}>{t.severity.toUpperCase()}</span><span className="text-sm text-slate-900 dark:text-white">{t.title}</span></div>
              <span className="text-xs text-slate-400">{t.time}</span>
            </div>
          ))}</div>
        </CardContent></Card>

        {/* Recent Vulnerabilities */}
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Bug className="w-4 h-4 text-orange-600" />Top Vulnerabilities</h3><button onClick={() => navigate('/vuln-tracker')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></button></div>
          <div className="space-y-2">{RECENT_VULNS.map(v => (
            <div key={v.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              <div className="flex items-center gap-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${sevColor[v.severity]}`}>{v.severity.toUpperCase()}</span><span className="text-sm text-slate-900 dark:text-white">{v.title}</span></div>
              <span className={`text-xs px-2 py-0.5 rounded ${v.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{v.status}</span>
            </div>
          ))}</div>
        </CardContent></Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((qa, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(qa.route)}><CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2"><div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><qa.icon className="w-5 h-5 text-blue-600" /></div><h4 className="font-semibold text-sm text-slate-900 dark:text-white">{qa.title}</h4></div>
            <p className="text-xs text-slate-500">{qa.desc}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}