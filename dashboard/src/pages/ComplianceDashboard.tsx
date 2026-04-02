import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ChartLine, Shield, Warning, Files, MagnifyingGlass, Export, Plus } from '@phosphor-icons/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const frameworks = [
  { id: 'FW-001', name: 'ISO 27001', score: 87, controls: '99/114', gaps: 15, evidence: 38, lastAudit: '2024-12-01', owner: 'Sarah Chen', status: 'compliant', description: 'Information security management system standard' },
  { id: 'FW-002', name: 'SOC 2 Type II', score: 82, controls: '79/96', gaps: 17, evidence: 32, lastAudit: '2024-11-15', owner: 'Mike Johnson', status: 'compliant', description: 'Service organization controls for security and availability' },
  { id: 'FW-003', name: 'EU AI Act', score: 71, controls: '45/63', gaps: 18, evidence: 22, lastAudit: '2025-01-20', owner: 'Emma Wilson', status: 'partial', description: 'European Union regulation on artificial intelligence' },
  { id: 'FW-004', name: 'NIST AI RMF', score: 78, controls: '62/80', gaps: 18, evidence: 28, lastAudit: '2025-02-01', owner: 'Maria Santos', status: 'partial', description: 'AI risk management framework by NIST' },
  { id: 'FW-005', name: 'GDPR', score: 91, controls: '42/46', gaps: 4, evidence: 41, lastAudit: '2024-10-15', owner: 'James Liu', status: 'compliant', description: 'General Data Protection Regulation' },
  { id: 'FW-006', name: 'OWASP LLM Top 10', score: 68, controls: '27/40', gaps: 13, evidence: 15, lastAudit: '2025-03-01', owner: 'David Kim', status: 'in-progress', description: 'Security risks for large language model applications' },
];

const trendData = [
  { month: 'Oct', ISO: 82, SOC2: 78, EUAI: 55, NIST: 65, GDPR: 88, OWASP: 45 },
  { month: 'Nov', ISO: 84, SOC2: 79, EUAI: 60, NIST: 70, GDPR: 89, OWASP: 52 },
  { month: 'Dec', ISO: 85, SOC2: 80, EUAI: 63, NIST: 72, GDPR: 90, OWASP: 58 },
  { month: 'Jan', ISO: 85, SOC2: 81, EUAI: 66, NIST: 74, GDPR: 90, OWASP: 62 },
  { month: 'Feb', ISO: 86, SOC2: 81, EUAI: 69, NIST: 76, GDPR: 91, OWASP: 65 },
  { month: 'Mar', ISO: 87, SOC2: 82, EUAI: 71, NIST: 78, GDPR: 91, OWASP: 68 },
];

const gapData = frameworks.map(f => ({ name: f.name, gaps: f.gaps }));
const statusColor: Record<string,string> = { compliant: 'bg-[hsl(var(--brand))]', partial: 'bg-amber-600', 'in-progress': 'bg-blue-600' };

export default function ComplianceDashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<typeof frameworks[0] | null>(null);
  const filtered = frameworks.filter(f => JSON.stringify(f).toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || f.status === filter));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Compliance Dashboard</h1><p className="text-[hsl(var(--text-3))] text-sm">Acme Financial Corp — Multi-framework compliance posture</p></div>
        <div className="flex gap-2"><Button variant="outline" className="rounded-none border-[#1e1e1e]"><Export className="w-4 h-4 mr-2" />Export</Button><Button className="bg-[hsl(var(--brand))] hover:bg-emerald-700 rounded-none"><Plus className="w-4 h-4 mr-2" />Add Framework</Button></div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{ label: 'Overall Score', value: '87%', icon: ChartLine, color: 'text-[hsl(var(--brand))]' }, { label: 'Frameworks Tracked', value: '6', icon: Shield, color: 'text-blue-400' }, { label: 'Open Gaps', value: '15', icon: Warning, color: 'text-amber-400' }, { label: 'Evidence Items', value: '44', icon: Files, color: 'text-[hsl(var(--text-3))]' }].map(k => (
          <Card key={k.label} className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4 flex items-center gap-3"><k.icon className={`w-8 h-8 ${k.color}`} /><div><div className="text-2xl font-bold text-white">{k.value}</div><div className="text-xs text-[hsl(var(--text-3))]">{k.label}</div></div></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4"><h3 className="text-white font-semibold mb-3">Compliance Score Trend</h3><ResponsiveContainer width="100%" height={200}><LineChart data={trendData}><XAxis dataKey="month" stroke="#71717a" fontSize={12} /><YAxis stroke="#71717a" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', borderRadius: 0 }} /><Line type="monotone" dataKey="ISO" stroke="#10b981" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="EUAI" stroke="#f59e0b" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="GDPR" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></CardContent></Card>
        <Card className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4"><h3 className="text-white font-semibold mb-3">Gaps by Framework</h3><ResponsiveContainer width="100%" height={200}><BarChart data={gapData}><XAxis dataKey="name" stroke="#71717a" fontSize={10} /><YAxis stroke="#71717a" fontSize={12} /><Tooltip contentStyle={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', borderRadius: 0 }} /><Bar dataKey="gaps" fill="#f59e0b" /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
      <Card className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4"><div className="relative flex-1"><MagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-[hsl(var(--text-3))]" /><Input placeholder="Search frameworks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-[#0a0a0a] border-[#1e1e1e] rounded-none text-white" /></div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-[#0a0a0a] border border-[#1e1e1e] text-white px-3 py-2 text-sm">{['all','compliant','partial','in-progress'].map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s}</option>)}</select></div>
        <table className="w-full text-sm"><thead><tr className="border-b border-[#1e1e1e] text-[hsl(var(--text-3))]"><th className="text-left p-2">Framework</th><th className="text-left p-2">Score</th><th className="text-left p-2">Controls</th><th className="text-left p-2">Gaps</th><th className="text-left p-2">Evidence</th><th className="text-left p-2">Last Audit</th><th className="text-left p-2">Owner</th><th className="text-left p-2">Status</th></tr></thead>
          <tbody>{filtered.map(f => (<tr key={f.id} onClick={() => setSelected(f)} className="border-b border-[#1e1e1e] hover:bg-[#1a1a1a] cursor-pointer"><td className="p-2 text-white font-medium">{f.name}</td><td className="p-2 text-white">{f.score}%</td><td className="p-2 text-[hsl(var(--text-3))]">{f.controls}</td><td className="p-2 text-amber-400">{f.gaps}</td><td className="p-2 text-[hsl(var(--text-3))]">{f.evidence}</td><td className="p-2 text-[hsl(var(--text-3))]">{f.lastAudit}</td><td className="p-2 text-[hsl(var(--text-3))]">{f.owner}</td><td className="p-2"><Badge className={`${statusColor[f.status]} text-white rounded-none text-xs`}>{f.status}</Badge></td></tr>))}</tbody></table>
      </CardContent></Card>
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}><SheetContent className="bg-[#111111] border-[#1e1e1e] text-white w-[500px] rounded-none">{selected && (<><SheetHeader><SheetTitle className="text-white">{selected.name}</SheetTitle></SheetHeader><Tabs defaultValue="overview" className="mt-4"><TabsList className="bg-[#0a0a0a] rounded-none"><TabsTrigger value="overview" className="rounded-none">Overview</TabsTrigger><TabsTrigger value="controls" className="rounded-none">Controls</TabsTrigger><TabsTrigger value="gaps" className="rounded-none">Gaps</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-3 mt-3"><p className="text-sm text-[hsl(var(--text-3))]">{selected.description}</p><div className="grid grid-cols-2 gap-2 text-sm"><div className="text-[hsl(var(--text-3))]">Score</div><div className="text-white">{selected.score}%</div><div className="text-[hsl(var(--text-3))]">Controls</div><div className="text-white">{selected.controls}</div><div className="text-[hsl(var(--text-3))]">Owner</div><div className="text-white">{selected.owner}</div><div className="text-[hsl(var(--text-3))]">Last Audit</div><div className="text-white">{selected.lastAudit}</div></div></TabsContent><TabsContent value="controls" className="mt-3"><div className="text-sm text-[hsl(var(--text-3))]">Controls mapped: {selected.controls}</div></TabsContent><TabsContent value="gaps" className="mt-3"><div className="text-sm text-amber-400">{selected.gaps} open gaps requiring remediation</div></TabsContent></Tabs></>)}</SheetContent></Sheet>
    </div>
  );
}
