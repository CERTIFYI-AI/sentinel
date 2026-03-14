import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function VulnTracker() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Vulnerability Tracker</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">ID</TableHead><TableHead className="p-3 text-left">Vulnerability</TableHead><TableHead className="p-3 text-left">Severity</TableHead><TableHead className="p-3 text-left">Component</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Assignee</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">VLN-001</TableCell><TableCell className="p-3">Prompt injection in chat endpoint</TableCell><TableCell className="p-3">Critical</TableCell><TableCell className="p-3">Chat API</TableCell><TableCell className="p-3">Open</TableCell><TableCell className="p-3">Alice</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">VLN-002</TableCell><TableCell className="p-3">Model output data leak</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">Model Server</TableCell><TableCell className="p-3">In Progress</TableCell><TableCell className="p-3">Bob</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">VLN-003</TableCell><TableCell className="p-3">Weak input sanitization</TableCell><TableCell className="p-3">Medium</TableCell><TableCell className="p-3">Input Layer</TableCell><TableCell className="p-3">Resolved</TableCell><TableCell className="p-3">Carol</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">VLN-004</TableCell><TableCell className="p-3">Rate limiting bypass</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">API Gateway</TableCell><TableCell className="p-3">Open</TableCell><TableCell className="p-3">Dave</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}