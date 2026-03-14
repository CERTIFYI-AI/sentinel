import { Warning, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function RiskMatrix() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Risk Matrix</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Risk ID</TableHead><TableHead className="p-3 text-left">Risk</TableHead><TableHead className="p-3 text-left">Category</TableHead><TableHead className="p-3 text-left">Likelihood</TableHead><TableHead className="p-3 text-left">Impact</TableHead><TableHead className="p-3 text-left">Score</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">RSK-001</TableCell><TableCell className="p-3">Training data poisoning</TableCell><TableCell className="p-3">Data</TableCell><TableCell className="p-3">Medium</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">12</TableCell><TableCell className="p-3">Open</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">RSK-002</TableCell><TableCell className="p-3">Model hallucination in production</TableCell><TableCell className="p-3">Accuracy</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">16</TableCell><TableCell className="p-3">Mitigating</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">RSK-003</TableCell><TableCell className="p-3">Vendor data retention</TableCell><TableCell className="p-3">Privacy</TableCell><TableCell className="p-3">Low</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">8</TableCell><TableCell className="p-3">Resolved</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">RSK-004</TableCell><TableCell className="p-3">Adversarial attacks on API</TableCell><TableCell className="p-3">Security</TableCell><TableCell className="p-3">Medium</TableCell><TableCell className="p-3">Medium</TableCell><TableCell className="p-3">9</TableCell><TableCell className="p-3">Open</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">RSK-005</TableCell><TableCell className="p-3">Regulatory non-compliance</TableCell><TableCell className="p-3">Legal</TableCell><TableCell className="p-3">Low</TableCell><TableCell className="p-3">Critical</TableCell><TableCell className="p-3">10</TableCell><TableCell className="p-3">Monitoring</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}