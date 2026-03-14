import { Warning, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function IncidentLog() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Incident Log</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">ID</TableHead><TableHead className="p-3 text-left">Incident</TableHead><TableHead className="p-3 text-left">Severity</TableHead><TableHead className="p-3 text-left">Model</TableHead><TableHead className="p-3 text-left">Reported</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Assignee</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">INC-001</TableCell><TableCell className="p-3">Hallucination in customer-facing bot</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">2d ago</TableCell><TableCell className="p-3">Investigating</TableCell><TableCell className="p-3">Alice</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">INC-002</TableCell><TableCell className="p-3">PII leak in model output</TableCell><TableCell className="p-3">Critical</TableCell><TableCell className="p-3">Claude 3.5</TableCell><TableCell className="p-3">5d ago</TableCell><TableCell className="p-3">Resolved</TableCell><TableCell className="p-3">Bob</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">INC-003</TableCell><TableCell className="p-3">Bias detected in hiring assistant</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">Llama 3</TableCell><TableCell className="p-3">1w ago</TableCell><TableCell className="p-3">Mitigated</TableCell><TableCell className="p-3">Carol</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">INC-004</TableCell><TableCell className="p-3">Prompt injection successful</TableCell><TableCell className="p-3">Medium</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">2w ago</TableCell><TableCell className="p-3">Resolved</TableCell><TableCell className="p-3">Dave</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}