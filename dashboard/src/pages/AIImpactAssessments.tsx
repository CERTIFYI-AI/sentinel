import { useState } from 'react';
import { FileMagnifyingGlass, Plus, Funnel, MagnifyingGlass, CaretRight } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const ASSESSMENTS = [
  { id: 'AIIA-001', name: 'Customer Scoring Model v2', system: 'Credit Engine', status: 'Completed', risk: 'High', date: '2026-03-15', owner: 'Sarah Chen' },
  { id: 'AIIA-002', name: 'Resume Screening Agent', system: 'HR Platform', status: 'In Progress', risk: 'Critical', date: '2026-03-28', owner: 'Michael Torres' },
  { id: 'AIIA-003', name: 'Fraud Detection Pipeline', system: 'Risk Engine', status: 'Completed', risk: 'Medium', date: '2026-02-20', owner: 'Priya Gupta' },
  { id: 'AIIA-004', name: 'Content Moderation Bot', system: 'Trust & Safety', status: 'Pending Review', risk: 'High', date: '2026-04-01', owner: 'James Wilson' },
  { id: 'AIIA-005', name: 'Predictive Maintenance Model', system: 'Operations', status: 'Draft', risk: 'Low', date: '2026-04-05', owner: 'Anika Patel' },
  { id: 'AIIA-006', name: 'Chatbot Response Generator', system: 'Customer Support', status: 'Completed', risk: 'Medium', date: '2026-01-12', owner: 'David Kim' },
];

const STATUS_STYLES: Record<string, string> = {
  Completed: 'bg-emerald-500/15 text-emerald-400',
  'In Progress': 'bg-blue-500/15 text-blue-400',
  'Pending Review': 'bg-amber-500/15 text-amber-400',
  Draft: 'bg-gray-500/15 text-gray-400',
};

const RISK_STYLES: Record<string, string> = {
  Critical: 'bg-red-500/15 text-red-400',
  High: 'bg-orange-500/15 text-orange-400',
  Medium: 'bg-amber-500/15 text-amber-400',
  Low: 'bg-emerald-500/15 text-emerald-400',
};

export default function AIImpactAssessments() {
  const [search, setSearch] = useState('');

  const filtered = ASSESSMENTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.system.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileMagnifyingGlass className="w-7 h-7 text-emerald-400" />
            AI Impact Assessments
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-1">
            Evaluate and document the impact of AI systems on individuals and society
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Total Assessments</p>
          <p className="text-2xl font-bold mt-1">{ASSESSMENTS.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">Completed</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{ASSESSMENTS.filter(a => a.status === 'Completed').length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">In Progress</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{ASSESSMENTS.filter(a => a.status === 'In Progress').length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-sm text-[hsl(var(--text-4))]">High/Critical Risk</p>
          <p className="text-2xl font-bold mt-1 text-orange-400">{ASSESSMENTS.filter(a => a.risk === 'High' || a.risk === 'Critical').length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Impact Assessments</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--text-4))]" />
                <Input
                  placeholder="Search assessments…"
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
                <th className="text-left py-3 font-medium">Assessment Name</th>
                <th className="text-left py-3 font-medium">AI System</th>
                <th className="text-left py-3 font-medium">Status</th>
                <th className="text-left py-3 font-medium">Risk Level</th>
                <th className="text-left py-3 font-medium">Owner</th>
                <th className="text-left py-3 font-medium">Date</th>
                <th className="text-left py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--border)/.3)]">
                  <td className="py-3 font-mono text-xs">{a.id}</td>
                  <td className="py-3 font-medium">{a.name}</td>
                  <td className="py-3 text-[hsl(var(--text-4))]">{a.system}</td>
                  <td className="py-3"><Badge className={STATUS_STYLES[a.status]}>{a.status}</Badge></td>
                  <td className="py-3"><Badge className={RISK_STYLES[a.risk]}>{a.risk}</Badge></td>
                  <td className="py-3">{a.owner}</td>
                  <td className="py-3 text-[hsl(var(--text-4))]">{a.date}</td>
                  <td className="py-3"><CaretRight className="w-4 h-4 text-[hsl(var(--text-4))]" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
