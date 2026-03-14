import { Database, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function Datasets() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Datasets</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Name</TableHead><TableHead className="p-3 text-left">Type</TableHead><TableHead className="p-3 text-left">Records</TableHead><TableHead className="p-3 text-left">Size</TableHead><TableHead className="p-3 text-left">Created</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Safety Eval v3</TableCell><TableCell className="p-3">Evaluation</TableCell><TableCell className="p-3">12,450</TableCell><TableCell className="p-3">2.3 GB</TableCell><TableCell className="p-3">Jan 2025</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Bias Test Suite</TableCell><TableCell className="p-3">Fairness</TableCell><TableCell className="p-3">8,200</TableCell><TableCell className="p-3">1.1 GB</TableCell><TableCell className="p-3">Feb 2025</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Adversarial Prompts</TableCell><TableCell className="p-3">Red Team</TableCell><TableCell className="p-3">3,500</TableCell><TableCell className="p-3">450 MB</TableCell><TableCell className="p-3">Mar 2025</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Production Logs Q1</TableCell><TableCell className="p-3">Monitoring</TableCell><TableCell className="p-3">156,000</TableCell><TableCell className="p-3">8.7 GB</TableCell><TableCell className="p-3">Mar 2025</TableCell><TableCell className="p-3">Processing</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}