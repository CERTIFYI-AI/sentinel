import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText, CheckCircle, Clock, XCircle, MagnifyingGlass, Export, Plus } from '@phosphor-icons/react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const policies = [
  { id: 'POL-001', name: 'Acceptable AI Use Policy', category: 'AI Usage', version: 'v3.2', owner: 'Emma Wilson', updated: '2026-02-15', status: 'active', framework: 'EU AI Act' },
  { id: 'POL-002', name: 'AI Model Risk Classification Standard', category: 'AI Usage', version: 'v2.1', owner: 'Maria Santos', updated: '2026-01-20', status: 'active', framework: 'NIST AI RMF' },
  { id: 'POL-003', name: 'Data Retention & Deletion Policy', category: 'Data Privacy', version: 'v4.0', owner: 'James Liu', updated: '2025-12-10', status: 'active', framework: 'GDPR' },
  { id: 'POL-004', name: 'Third-Party AI Vendor Assessment Protocol', category: 'Vendor Mgmt', version: 'v1.5', owner: 'Bob Kumar', updated: '2026-03-01', status: 'active', framework: 'ISO 27001' },
  { id: 'POL-005', name: 'Incident Response Playbook for AI Failures', category: 'Incident Response', version: 'v2.0', owner: 'Alice Chen', updated: '2025-11-20', status: 'active', framework: 'SOC 2' },
  { id: 'POL-006', name: 'Bias Testing & Fairness Standard', category: 'Fairness', version: 'v1.3', owner: 'Maria Santos', updated: '2026-03-10', status: 'review', framework: 'EU AI Act' },
  { id: 'POL-007', name: 'Human Oversight Requirements for High-Risk AI', category: 'AI Usage', version: 'v1.0', owner: 'Emma Wilson', updated: '2026-02-28', status: 'review', framework: 'EU AI Act' },
  { id: 'POL-008', name: 'LLM Prompt Injection Prevention Guide', category: 'Security', version: 'v1.1', owner: 'David Kim', updated: '2025-08-15', status: 'expired', framework: 'OWASP LLM' },
];

const catData = [{name:'AI Usage',value:3},{name:'Data Privacy',value:1},{name:'Security',value:1},{name:'Vendor Mgmt',value:1},{name:'Incident Response',value:1},{name:'Fairness',value:1}];
const COLORS = ['#10b981','#3b82f6','#ef4444','#f59e0b','#8b5cf6','#ec4899'];
const timeData = [{month:'Oct',reviews:3},{month:'Nov',reviews:5},{month:'Dec',reviews:2},{month:'Jan',reviews:4},{month:'Feb',reviews:6},{month:'Mar',reviews:3}];
const sColor: Record<string,string> = {active:'bg-emerald-600',review:'bg-amber-600',expired:'bg-red-600',draft:'bg-zinc-600'};

export default function Policies() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<typeof policies[0]|null>(null);
  const filtered = policies.filter(p => JSON.stringify(p).toLowerCase().includes(search.toLowerCase()) && (filter==='all'||p.status===filter));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-white">Policy Manager</h1><p className="text-zinc-400 text-sm">Manage AI governance policies, standards, and procedures</p></div>
        <div className="flex gap-2"><Button variant="outline" className="rounded-none border-[#1e1e1e]"><Export className="w-4 h-4 mr-2" />Export</Button><Button className="bg-emerald-600 hover:bg-emerald-700 rounded-none"><Plus className="w-4 h-4 mr-2" />New Policy</Button></div></div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:'Total Policies',value:'31',icon:FileText,color:'text-blue-400'},{label:'Active',value:'24',icon:CheckCircle,color:'text-emerald-400'},{label:'Under Review',value:'5',icon:Clock,color:'text-amber-400'},{label:'Expired',value:'2',icon:XCircle,color:'text-red-400'}].map(k=>(
          <Card key={k.label} className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4 flex items-center gap-3"><k.icon className={`w-8 h-8 ${k.color}`}/><div><div className="text-2xl font-bold text-white">{k.value}</div><div className="text-xs text-zinc-400">{k.label}</div></div></CardContent></Card>))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4"><h3 className="text-white font-semibold mb-3">Policies by Category</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={catData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name})=>name}>{catData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{backgroundColor:'#111111',border:'1px solid #1e1e1e',borderRadius:0}}/></PieChart></ResponsiveContainer></CardContent></Card>
        <Card className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4"><h3 className="text-white font-semibold mb-3">Policy Reviews (6 Months)</h3><ResponsiveContainer width="100%" height={200}><LineChart data={timeData}><XAxis dataKey="month" stroke="#71717a" fontSize={12}/><YAxis stroke="#71717a" fontSize={12}/><Tooltip contentStyle={{backgroundColor:'#111111',border:'1px solid #1e1e1e',borderRadius:0}}/><Line type="monotone" dataKey="reviews" stroke="#10b981" strokeWidth={2}/></LineChart></ResponsiveContainer></CardContent></Card>
      </div>
      <Card className="bg-[#111111] border-[#1e1e1e] rounded-none"><CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4"><div className="relative flex-1"><MagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400"/><Input placeholder="Search policies..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9 bg-[#0a0a0a] border-[#1e1e1e] rounded-none text-white"/></div>
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="bg-[#0a0a0a] border border-[#1e1e1e] text-white px-3 py-2 text-sm">{['all','active','review','expired'].map(s=><option key={s} value={s}>{s==='all'?'All Status':s}</option>)}</select></div>
        <table className="w-full text-sm"><thead><tr className="border-b border-[#1e1e1e] text-zinc-400"><th className="text-left p-2">ID</th><th className="text-left p-2">Name</th><th className="text-left p-2">Category</th><th className="text-left p-2">Version</th><th className="text-left p-2">Owner</th><th className="text-left p-2">Updated</th><th className="text-left p-2">Framework</th><th className="text-left p-2">Status</th></tr></thead>
          <tbody>{filtered.map(p=>(<tr key={p.id} onClick={()=>setSelected(p)} className="border-b border-[#1e1e1e] hover:bg-[#1a1a1a] cursor-pointer"><td className="p-2 text-white font-mono text-xs">{p.id}</td><td className="p-2 text-white">{p.name}</td><td className="p-2 text-zinc-400">{p.category}</td><td className="p-2 text-zinc-400">{p.version}</td><td className="p-2 text-zinc-400">{p.owner}</td><td className="p-2 text-zinc-400">{p.updated}</td><td className="p-2 text-zinc-400">{p.framework}</td><td className="p-2"><Badge className={`${sColor[p.status]} text-white rounded-none text-xs`}>{p.status}</Badge></td></tr>))}</tbody></table>
      </CardContent></Card>
      <Sheet open={!!selected} onOpenChange={()=>setSelected(null)}><SheetContent className="bg-[#111111] border-[#1e1e1e] text-white w-[500px] rounded-none">{selected&&(<><SheetHeader><SheetTitle className="text-white">{selected.name}</SheetTitle></SheetHeader><Tabs defaultValue="overview" className="mt-4"><TabsList className="bg-[#0a0a0a] rounded-none"><TabsTrigger value="overview" className="rounded-none">Overview</TabsTrigger><TabsTrigger value="versions" className="rounded-none">Versions</TabsTrigger><TabsTrigger value="controls" className="rounded-none">Controls</TabsTrigger></TabsList><TabsContent value="overview" className="space-y-3 mt-3"><div className="grid grid-cols-2 gap-2 text-sm"><div className="text-zinc-400">Category</div><div className="text-white">{selected.category}</div><div className="text-zinc-400">Version</div><div className="text-white">{selected.version}</div><div className="text-zinc-400">Owner</div><div className="text-white">{selected.owner}</div><div className="text-zinc-400">Framework</div><div className="text-white">{selected.framework}</div></div></TabsContent><TabsContent value="versions" className="mt-3"><div className="text-sm text-zinc-400">Current: {selected.version} - Updated {selected.updated}</div></TabsContent><TabsContent value="controls" className="mt-3"><div className="text-sm text-zinc-400">Linked to {selected.framework} framework controls</div></TabsContent></Tabs></>)}</SheetContent></Sheet>
    </div>
  );
}
