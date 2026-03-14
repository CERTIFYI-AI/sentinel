import { FileText, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function PolicyFirewall() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Policy Firewall</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Rule</TableHead><TableHead className="p-3 text-left">Type</TableHead><TableHead className="p-3 text-left">Action</TableHead><TableHead className="p-3 text-left">Matches (24h)</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Priority</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Block prompt injection patterns</TableCell><TableCell className="p-3">Input Filter</TableCell><TableCell className="p-3">Block</TableCell><TableCell className="p-3">234</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">Critical</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">PII detection and masking</TableCell><TableCell className="p-3">Output Filter</TableCell><TableCell className="p-3">Mask</TableCell><TableCell className="p-3">89</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">High</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Rate limit per user</TableCell><TableCell className="p-3">Rate Limit</TableCell><TableCell className="p-3">Throttle</TableCell><TableCell className="p-3">1,203</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">Medium</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Block known adversarial suffixes</TableCell><TableCell className="p-3">Input Filter</TableCell><TableCell className="p-3">Block</TableCell><TableCell className="p-3">12</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">High</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}