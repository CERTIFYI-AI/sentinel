import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Bell, Warning, ArrowRight, CheckCircle, Clock, Plus } from '@phosphor-icons/react';
import Breadcrumbs from '../components/Breadcrumbs';

const INCIDENTS = [
  { id: 'INC-001', title: 'Model Drift Detected - Credit Scorer', severity: 'High', status: 'Notifying', assignee: 'Risk Team', created: '2025-01-16', sla: '4h' },
  { id: 'INC-002', title: 'PII Leak in Agent Response', severity: 'Critical', status: 'Investigating', assignee: 'Security', created: '2025-01-15', sla: '2h' },
  { id: 'INC-003', title: 'Bias Alert - Hiring Model', severity: 'Medium', status: 'Resolved', assignee: 'ML Ops', created: '2025-01-14', sla: '24h' },
  { id: 'INC-004', title: 'Guardrail Bypass Attempt', severity: 'High', status: 'Escalated', assignee: 'CISO', created: '2025-01-16', sla: '1h' },
];

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-500/20 text-red-400',
  High: 'bg-orange-500/20 text-orange-400',
  Medium: 'bg-amber-500/20 text-amber-400',
  Low: 'bg-blue-500/20 text-blue-400',
};

const STATUS_COLORS: Record<string, string> = {
  Notifying: 'bg-blue-500/20 text-blue-400',
  Investigating: 'bg-amber-500/20 text-amber-400',
  Escalated: 'bg-red-500/20 text-red-400',
  Resolved: 'bg-emerald-500/20 text-emerald-400',
};

export default function IncidentWorkflow() {
  const [filter, setFilter] = useState('all');
  const items = filter === 'all' ? INCIDENTS : INCIDENTS.filter(i => i.status.toLowerCase() === filter);
  return (
    <div>
      <Breadcrumbs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Incident Notification Workflow</h1>
          <p className="text-sm text-[hsl(var(--text-3))]">AI incident response & notification management</p>
        </div>
        <Button className="gap-2"><Plus size={16} /> Report Incident</Button>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{ label: 'Open Incidents', value: '3', icon: Warning, color: 'text-red-400' },
          { label: 'Avg Response Time', value: '1.2h', icon: Clock, color: 'text-amber-400' },
          { label: 'Resolved (30d)', value: '12', icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Notifications Sent', value: '47', icon: Bell, color: 'text-blue-400' }].map(kpi => (
          <Card key={kpi.label}><CardContent className="p-4 flex items-center gap-3">
            <kpi.icon size={24} className={kpi.color} />
            <div><p className="text-2xl font-bold text-[hsl(var(--text-1))]">{kpi.value}</p>
              <p className="text-xs text-[hsl(var(--text-3))]">{kpi.label}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Incident Queue</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map(inc => (
              <div key={inc.id} className="flex items-center justify-between p-3 border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-surface))] transition-colors">
                <div className="flex items-center gap-3">
                  <Warning size={18} className={inc.severity === 'Critical' ? 'text-red-400' : 'text-amber-400'} />
                  <div>
                    <p className="font-medium text-[hsl(var(--text-1))]">{inc.title}</p>
                    <p className="text-xs text-[hsl(var(--text-3))]">{inc.id} &middot; {inc.created} &middot; SLA: {inc.sla}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge>
                  <Badge className={STATUS_COLORS[inc.status]}>{inc.status}</Badge>
                  <span className="text-xs text-[hsl(var(--text-3))]">{inc.assignee}</span>
                  <Button variant="ghost" size="sm"><ArrowRight size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
