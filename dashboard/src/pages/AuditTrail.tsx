import { useState } from 'react';
import { ClockCounterClockwise, MagnifyingGlass, Funnel, Export, Eye } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const TRAIL_ENTRIES = [
  { id: 1, timestamp: '2026-04-08 09:15:23', user: 'Sarah Chen', action: 'Updated', resource: 'Model: Credit Scoring v2', category: 'model', details: 'Changed risk classification from Medium to High' },
  { id: 2, timestamp: '2026-04-08 08:42:11', user: 'System', action: 'Triggered', resource: 'Bias Audit #BA-047', category: 'bias_audit', details: 'Automated weekly bias scan initiated' },
  { id: 3, timestamp: '2026-04-07 17:30:05', user: 'Michael Torres', action: 'Approved', resource: 'Policy: Data Retention v3', category: 'policy', details: 'Final approval granted after legal review' },
  { id: 4, timestamp: '2026-04-07 16:22:48', user: 'Priya Gupta', action: 'Created', resource: 'Risk: Supply Chain AI Dependency', category: 'risk', details: 'New risk entry added to register' },
  { id: 5, timestamp: '2026-04-07 14:10:33', user: 'James Wilson', action: 'Uploaded', resource: 'Evidence: SOC2 Type II Report', category: 'evidence', details: 'Annual compliance evidence uploaded' },
  { id: 6, timestamp: '2026-04-07 11:55:19', user: 'Anika Patel', action: 'Modified', resource: 'Control: CTL-029 Access Review', category: 'control', details: 'Updated control frequency from quarterly to monthly' },
  { id: 7, timestamp: '2026-04-07 09:30:02', user: 'David Kim', action: 'Deleted', resource: 'Vendor: Legacy Analytics Corp', category: 'vendor', details: 'Vendor decommissioned after contract expiry' },
  { id: 8, timestamp: '2026-04-06 15:44:57', user: 'System', action: 'Escalated', resource: 'Incident: INC-112', category: 'incident', details: 'Auto-escalated due to SLA breach' },
];

const ACTION_STYLES: Record<string, string> = {
  Created: 'bg-emerald-500/15 text-emerald-400',
  Updated: 'bg-blue-500/15 text-blue-400',
  Modified: 'bg-blue-500/15 text-blue-400',
  Approved: 'bg-emerald-500/15 text-emerald-400',
  Deleted: 'bg-red-500/15 text-red-400',
  Triggered: 'bg-purple-500/15 text-purple-400',
  Uploaded: 'bg-cyan-500/15 text-cyan-400',
  Escalated: 'bg-orange-500/15 text-orange-400',
};

const CATEGORY_STYLES: Record<string, string> = {
  model: 'bg-blue-500/15 text-blue-400',
  bias_audit: 'bg-purple-500/15 text-purple-400',
  policy: 'bg-emerald-500/15 text-emerald-400',
  risk: 'bg-red-500/15 text-red-400',
  evidence: 'bg-cyan-500/15 text-cyan-400',
  control: 'bg-amber-500/15 text-amber-400',
  vendor: 'bg-orange-500/15 text-orange-400',
  incident: 'bg-red-500/15 text-red-400',
};

export default function AuditTrail() {
  const [search, setSearch] = useState('');

  const filtered = TRAIL_ENTRIES.filter(
    (e) =>
      e.resource.toLowerCase().includes(search.toLowerCase()) ||
      e.user.toLowerCase().includes(search.toLowerCase()) ||
      e.action.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClockCounterClockwise className="w-7 h-7 text-emerald-400" />
            Audit Trail
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-1">
            Immutable log of all platform actions for compliance and forensic analysis
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Export className="w-4 h-4" /> Export Log
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Total Events</p>
          <p className="text-2xl font-bold mt-1">{TRAIL_ENTRIES.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Today</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">2</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Users Active</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">6</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">System Events</p>
          <p className="text-2xl font-bold mt-1 text-purple-400">{TRAIL_ENTRIES.filter(e => e.user === 'System').length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event Log</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--text-4))]" />
                <Input
                  placeholder="Search events…"
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
                <th className="text-left py-3 font-medium">Timestamp</th>
                <th className="text-left py-3 font-medium">User</th>
                <th className="text-left py-3 font-medium">Action</th>
                <th className="text-left py-3 font-medium">Resource</th>
                <th className="text-left py-3 font-medium">Category</th>
                <th className="text-left py-3 font-medium">Details</th>
                <th className="text-left py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--border)/.3)]">
                  <td className="py-3 font-mono text-xs text-[hsl(var(--text-4))]">{e.timestamp}</td>
                  <td className="py-3">{e.user}</td>
                  <td className="py-3"><Badge className={ACTION_STYLES[e.action]}>{e.action}</Badge></td>
                  <td className="py-3 font-medium">{e.resource}</td>
                  <td className="py-3"><Badge className={CATEGORY_STYLES[e.category]}>{e.category.replace('_', ' ')}</Badge></td>
                  <td className="py-3 text-[hsl(var(--text-4))] max-w-xs truncate">{e.details}</td>
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
