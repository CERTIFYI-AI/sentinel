
import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Bell, Warning, ShieldCheck, Gear, MagnifyingGlass, Export, Eye, Clock, ArrowUp } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const notifications = [
  { id: 'NTF-001', message: 'EU AI Act Article 6 compliance deadline in 14 days', category: 'compliance', severity: 'high', source: 'Reg Radar', timestamp: '2026-03-29 09:15', read: false },
  { id: 'NTF-002', message: 'CreditScorer v2.1 drift detected - fairness score dropped to 72%', category: 'model', severity: 'critical', source: 'Model Monitor', timestamp: '2026-03-29 08:42', read: false },
  { id: 'NTF-003', message: 'SOC 2 evidence upload pending for CC6.1', category: 'compliance', severity: 'medium', source: 'Evidence Sync', timestamp: '2026-03-28 16:30', read: true },
  { id: 'NTF-004', message: 'Vendor Hugging Face risk score changed: 61 to 58', category: 'security', severity: 'high', source: 'Vendor Registry', timestamp: '2026-03-28 14:15', read: false },
  { id: 'NTF-005', message: 'HITL review queue has 12 overdue items', category: 'system', severity: 'high', source: 'HITL Center', timestamp: '2026-03-28 11:00', read: false },
  { id: 'NTF-006', message: 'New shadow AI agent detected in Marketing dept', category: 'security', severity: 'critical', source: 'Agent Discovery', timestamp: '2026-03-27 17:45', read: false },
  { id: 'NTF-007', message: 'ISO 27001 A.9 control passed re-test', category: 'compliance', severity: 'low', source: 'Controls', timestamp: '2026-03-27 10:20', read: true },
  { id: 'NTF-008', message: 'FraudDetector v3.0 monthly validation report ready', category: 'model', severity: 'medium', source: 'Model Inventory', timestamp: '2026-03-26 15:30', read: true },
];

const chartData = [
  { day: 'Mon', compliance: 4, security: 2, model: 1, system: 3 },
  { day: 'Tue', compliance: 2, security: 1, model: 3, system: 1 },
  { day: 'Wed', compliance: 3, security: 3, model: 2, system: 2 },
  { day: 'Thu', compliance: 1, security: 2, model: 1, system: 4 },
  { day: 'Fri', compliance: 5, security: 1, model: 2, system: 1 },
  { day: 'Sat', compliance: 2, security: 0, model: 1, system: 2 },
  { day: 'Sun', compliance: 1, security: 1, model: 0, system: 1 },
];

const sevColor: Record<string, string> = { critical: 'bg-red-600', high: 'bg-amber-600', medium: 'bg-blue-600', low: 'bg-[hsl(var(--brand))]' };
const catColor: Record<string, string> = { compliance: 'bg-blue-600', security: 'bg-red-600', model: 'bg-amber-600', system: 'bg-zinc-600' };

export default function Notifications() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<typeof notifications[0] | null>(null);
  const cats = ['all', ...Array.from(new Set(notifications.map(n => n.category)))];
  const filtered = notifications.filter(n => {
    const matchSearch = JSON.stringify(n).toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || n.category === filter;
    return matchSearch && matchFilter;
  });
  const kpis = [
    { label: 'Unread', value: '14', icon: Bell, color: 'text-blue-400' },
    { label: 'Critical Alerts', value: '3', icon: Warning, color: 'text-red-400' },
    { label: 'Compliance Deadlines', value: '5', icon: ShieldCheck, color: 'text-amber-400' },
    { label: 'System Alerts', value: '8', icon: Gear, color: 'text-[hsl(var(--brand))]' },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Center</h1>
          <p className="text-[hsl(var(--text-3))] text-sm">Real-time alerts across compliance, security, and model operations</p>
        </div>
        <Button variant="outline" className="rounded-none border-[#1e1e1e]"><Export className="w-4 h-4 mr-2" />Export</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="bg-[#111111] border-[#1e1e1e] rounded-none">
            <CardContent className="p-4 flex items-center gap-3">
              <k.icon className={`w-8 h-8 ${k.color}`} />
              <div><div className="text-2xl font-bold text-foreground">{k.value}</div><div className="text-xs text-[hsl(var(--text-3))]">{k.label}</div></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-[#111111] border-[#1e1e1e] rounded-none">
        <CardContent className="p-4">
          <h3 className="text-foreground font-semibold mb-3">Notifications by Category (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#111111', border: '1px solid #1e1e1e', borderRadius: 0 }} />
              <Bar dataKey="compliance" stackId="a" fill="#3b82f6" />
              <Bar dataKey="security" stackId="a" fill="#ef4444" />
              <Bar dataKey="model" stackId="a" fill="#f59e0b" />
              <Bar dataKey="system" stackId="a" fill="#71717a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="bg-[#111111] border-[#1e1e1e] rounded-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1"><MagnifyingGlass className="absolute left-3 top-2.5 w-4 h-4 text-[hsl(var(--text-3))]" /><Input placeholder="Search notifications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-[#0a0a0a] border-[#1e1e1e] rounded-none text-foreground" /></div>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-[#0a0a0a] border border-[#1e1e1e] text-foreground px-3 py-2 text-sm">
              {cats.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-[#1e1e1e] text-[hsl(var(--text-3))]">
              <th className="text-left p-2">ID</th><th className="text-left p-2">Message</th><th className="text-left p-2">Category</th>
              <th className="text-left p-2">Severity</th><th className="text-left p-2">Source</th><th className="text-left p-2">Time</th><th className="text-left p-2">Status</th>
            </tr></thead>
            <tbody>
              {filtered.map(n => (
                <tr key={n.id} onClick={() => setSelected(n)} className="border-b border-[#1e1e1e] hover:bg-[#1a1a1a] cursor-pointer">
                  <td className="p-2 text-foreground font-mono text-xs">{n.id}</td>
                  <td className={`p-2 ${n.read ? 'text-[hsl(var(--text-3))]' : 'text-foreground font-medium'}`}>{n.message}</td>
                  <td className="p-2"><Badge className={`${catColor[n.category]} text-foreground rounded-none text-xs`}>{n.category}</Badge></td>
                  <td className="p-2"><Badge className={`${sevColor[n.severity]} text-foreground rounded-none text-xs`}>{n.severity}</Badge></td>
                  <td className="p-2 text-[hsl(var(--text-3))]">{n.source}</td>
                  <td className="p-2 text-[hsl(var(--text-3))] text-xs">{n.timestamp}</td>
                  <td className="p-2">{n.read ? <span className="text-[hsl(var(--text-4))]">Read</span> : <Badge className="bg-[hsl(var(--brand))] text-foreground rounded-none text-xs">New</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="bg-[#111111] border-[#1e1e1e] text-foreground w-[500px] rounded-none">
          {selected && (<>
            <SheetHeader><SheetTitle className="text-foreground">{selected.id}: Notification Detail</SheetTitle></SheetHeader>
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="bg-[#0a0a0a] rounded-none"><TabsTrigger value="details" className="rounded-none">Details</TabsTrigger><TabsTrigger value="actions" className="rounded-none">Actions</TabsTrigger><TabsTrigger value="history" className="rounded-none">History</TabsTrigger></TabsList>
              <TabsContent value="details" className="space-y-3 mt-3">
                <p className="text-sm text-foreground">{selected.message}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-[hsl(var(--text-3))]">Category</div><div><Badge className={`${catColor[selected.category]} text-foreground rounded-none`}>{selected.category}</Badge></div>
                  <div className="text-[hsl(var(--text-3))]">Severity</div><div><Badge className={`${sevColor[selected.severity]} text-foreground rounded-none`}>{selected.severity}</Badge></div>
                  <div className="text-[hsl(var(--text-3))]">Source</div><div className="text-foreground">{selected.source}</div>
                  <div className="text-[hsl(var(--text-3))]">Timestamp</div><div className="text-foreground">{selected.timestamp}</div>
                </div>
              </TabsContent>
              <TabsContent value="actions" className="space-y-2 mt-3">
                <Button className="w-full bg-[hsl(var(--brand))] hover:bg-primary/90 rounded-none"><Eye className="w-4 h-4 mr-2" />Mark as Read</Button>
                <Button variant="outline" className="w-full rounded-none border-[#1e1e1e]"><Clock className="w-4 h-4 mr-2" />Snooze 24h</Button>
                <Button variant="outline" className="w-full rounded-none border-red-600 text-red-400"><ArrowUp className="w-4 h-4 mr-2" />Escalate to CISO</Button>
              </TabsContent>
              <TabsContent value="history" className="mt-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-[#1e1e1e] pb-2"><span className="text-[hsl(var(--text-3))]">Alert triggered</span><span className="text-foreground">{selected.timestamp}</span></div>
                  <div className="flex justify-between border-b border-[#1e1e1e] pb-2"><span className="text-[hsl(var(--text-3))]">Similar alert 7 days ago</span><span className="text-foreground">2026-03-22</span></div>
                </div>
              </TabsContent>
            </Tabs>
          </>)}
        </SheetContent>
      </Sheet>
    </div>
  );
}
