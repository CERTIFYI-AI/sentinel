import { Scales, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function AuditLog() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Timestamp</TableHead><TableHead className="p-3 text-left">User</TableHead><TableHead className="p-3 text-left">Action</TableHead><TableHead className="p-3 text-left">Resource</TableHead><TableHead className="p-3 text-left">Details</TableHead><TableHead className="p-3 text-left">IP</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">2 min ago</TableCell><TableCell className="p-3">admin@certifyi.ai</TableCell><TableCell className="p-3">Updated</TableCell><TableCell className="p-3">Policy: AI Ethics v2.3</TableCell><TableCell className="p-3">Version bump</TableCell><TableCell className="p-3">192.168.1.1</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">15 min ago</TableCell><TableCell className="p-3">alice@certifyi.ai</TableCell><TableCell className="p-3">Created</TableCell><TableCell className="p-3">Scan: GPT-4o Injection</TableCell><TableCell className="p-3">New scan initiated</TableCell><TableCell className="p-3">192.168.1.2</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">1h ago</TableCell><TableCell className="p-3">bob@certifyi.ai</TableCell><TableCell className="p-3">Deleted</TableCell><TableCell className="p-3">Risk: RSK-006</TableCell><TableCell className="p-3">Duplicate removed</TableCell><TableCell className="p-3">192.168.1.3</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">3h ago</TableCell><TableCell className="p-3">carol@certifyi.ai</TableCell><TableCell className="p-3">Approved</TableCell><TableCell className="p-3">Evidence: Bias Test Q1</TableCell><TableCell className="p-3">Review complete</TableCell><TableCell className="p-3">192.168.1.4</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">6h ago</TableCell><TableCell className="p-3">admin@certifyi.ai</TableCell><TableCell className="p-3">Modified</TableCell><TableCell className="p-3">Control: CC-003</TableCell><TableCell className="p-3">Status changed</TableCell><TableCell className="p-3">192.168.1.1</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}