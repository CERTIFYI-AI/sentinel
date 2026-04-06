import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ClipboardText, CheckCircle, Warning, Clock, Plus } from '@phosphor-icons/react';
import Breadcrumbs from '../components/Breadcrumbs';

const ASSESSMENTS = [
  { id: 'CA-001', framework: 'ISO 42001', status: 'In Progress', completion: 72, auditor: 'Internal', due: '2025-02-15' },
  { id: 'CA-002', framework: 'EU AI Act', status: 'Scheduled', completion: 0, auditor: 'Deloitte', due: '2025-03-01' },
  { id: 'CA-003', framework: 'NIST AI RMF', status: 'Complete', completion: 100, auditor: 'Internal', due: '2025-01-10' },
  { id: 'CA-004', framework: 'SOC 2 Type II', status: 'In Progress', completion: 45, auditor: 'EY', due: '2025-04-01' },
];

export default function ConformityAssessment() {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const items = ASSESSMENTS.filter(a => tab === 'active' ? a.status !== 'Complete' : a.status === 'Complete');
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Conformity Assessment</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">Track certification & audit readiness</p>
        </div>
        <Button className="gap-2"><Plus size={16} /> New Assessment</Button>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle size={24} className="text-emerald-400" />
          <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">1</p><p className="text-xs text-[hsl(var(--text-3))]">Completed</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock size={24} className="text-amber-400" />
          <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">2</p><p className="text-xs text-[hsl(var(--text-3))]">In Progress</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Warning size={24} className="text-red-400" />
          <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">1</p><p className="text-xs text-[hsl(var(--text-3))]">Overdue</p></div>
        </CardContent></Card>
      </div>
      <div className="flex gap-2 mb-4">
        {(['active', 'completed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm border-b-2 ${tab === t ? 'border-[hsl(var(--accent))] text-[hsl(var(--text-1))]' : 'border-transparent text-[hsl(var(--text-3))]'}`}>
            {t === 'active' ? 'Active' : 'Completed'}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {items.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ClipboardText size={20} className="text-[hsl(var(--accent))]" />
                <div>
                  <p className="font-medium text-[hsl(var(--text-1))]">{a.framework}</p>
                  <p className="text-xs text-[hsl(var(--text-3))]">{a.id} &middot; Auditor: {a.auditor}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 h-2 bg-[hsl(var(--bg-surface))] rounded-full overflow-hidden">
                  <div className="h-full bg-[hsl(var(--accent))]" style={{ width: `${a.completion}%` }} />
                </div>
                <span className="text-sm text-[hsl(var(--text-2))]">{a.completion}%</span>
                <Badge className={a.status === 'Complete' ? 'bg-emerald-500/20 text-emerald-400' : a.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}>{a.status}</Badge>
                <span className="text-xs text-[hsl(var(--text-3))]">Due: {a.due}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
