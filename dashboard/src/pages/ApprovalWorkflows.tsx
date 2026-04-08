import { useState } from 'react';
import { FlowArrow, Plus, MagnifyingGlass, Funnel, CheckCircle, Clock, XCircle, Eye } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const WORKFLOWS = [
  { id: 'WF-001', name: 'Model Deployment Approval', type: 'Model Release', status: 'Active', pending: 3, approvers: 'Risk + Compliance + Engineering', sla: '48h', lastTriggered: '2026-04-07' },
  { id: 'WF-002', name: 'Policy Change Approval', type: 'Policy Update', status: 'Active', pending: 1, approvers: 'Legal + CISO', sla: '72h', lastTriggered: '2026-04-06' },
  { id: 'WF-003', name: 'High-Risk Vendor Onboarding', type: 'Vendor', status: 'Active', pending: 2, approvers: 'Procurement + Security + Legal', sla: '5 days', lastTriggered: '2026-04-05' },
  { id: 'WF-004', name: 'Exception Request', type: 'Exception', status: 'Active', pending: 0, approvers: 'Risk Manager + CISO', sla: '24h', lastTriggered: '2026-04-03' },
  { id: 'WF-005', name: 'Data Access Escalation', type: 'Access Control', status: 'Paused', pending: 0, approvers: 'Data Owner + Privacy Officer', sla: '24h', lastTriggered: '2026-03-28' },
  { id: 'WF-006', name: 'Incident Severity Upgrade', type: 'Incident', status: 'Active', pending: 1, approvers: 'Incident Commander + VP Eng', sla: '4h', lastTriggered: '2026-04-08' },
];

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Paused: 'bg-amber-500/15 text-amber-400',
  Disabled: 'bg-gray-500/15 text-gray-400',
};

export default function ApprovalWorkflows() {
  const [search, setSearch] = useState('');

  const filtered = WORKFLOWS.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.type.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPending = WORKFLOWS.reduce((sum, w) => sum + w.pending, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlowArrow className="w-7 h-7 text-emerald-400" />
            Approval Workflows
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-1">
            Manage multi-stage approval pipelines for governance actions
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Workflow
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Total Workflows</p>
          <p className="text-2xl font-bold mt-1">{WORKFLOWS.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Active</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{WORKFLOWS.filter(w => w.status === 'Active').length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Pending Approvals</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{totalPending}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Avg SLA</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">48h</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workflow Definitions</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--text-4))]" />
                <Input
                  placeholder="Search workflows…"
                  className="pl-9 w-64"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <Funnel className="w-4 h-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] text-[hsl(var(--text-4))]">
                <th className="text-left py-3 font-medium">ID</th>
                <th className="text-left py-3 font-medium">Workflow Name</th>
                <th className="text-left py-3 font-medium">Type</th>
                <th className="text-left py-3 font-medium">Status</th>
                <th className="text-left py-3 font-medium">Pending</th>
                <th className="text-left py-3 font-medium">Approvers</th>
                <th className="text-left py-3 font-medium">SLA</th>
                <th className="text-left py-3 font-medium">Last Triggered</th>
                <th className="text-left py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--border)/.3)]">
                  <td className="py-3 font-mono text-xs">{w.id}</td>
                  <td className="py-3 font-medium">{w.name}</td>
                  <td className="py-3 text-[hsl(var(--text-4))]">{w.type}</td>
                  <td className="py-3"><Badge className={STATUS_STYLES[w.status]}>{w.status}</Badge></td>
                  <td className="py-3">
                    {w.pending > 0 ? (
                      <Badge className="bg-amber-500/15 text-amber-400">{w.pending}</Badge>
                    ) : (
                      <span className="text-[hsl(var(--text-4))]">0</span>
                    )}
                  </td>
                  <td className="py-3 text-[hsl(var(--text-4))] max-w-xs truncate">{w.approvers}</td>
                  <td className="py-3 text-[hsl(var(--text-4))]">{w.sla}</td>
                  <td className="py-3 text-[hsl(var(--text-4))]">{w.lastTriggered}</td>
                  <td className="py-3"><Eye className="w-4 h-4 text-[hsl(var(--text-4))] cursor-pointer hover:text-white" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
