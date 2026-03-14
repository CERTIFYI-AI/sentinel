import { UserCircle, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function HitlQueue() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Human-in-the-Loop Queue</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">ID</TableHead><TableHead className="p-3 text-left">Model Output</TableHead><TableHead className="p-3 text-left">Model</TableHead><TableHead className="p-3 text-left">Confidence</TableHead><TableHead className="p-3 text-left">Flagged Reason</TableHead><TableHead className="p-3 text-left">Assigned To</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">HITL-001</TableCell><TableCell className="p-3">Response about medical advice</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">62%</TableCell><TableCell className="p-3">Low confidence + sensitive topic</TableCell><TableCell className="p-3">Alice</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">HITL-002</TableCell><TableCell className="p-3">Financial prediction output</TableCell><TableCell className="p-3">Claude 3.5</TableCell><TableCell className="p-3">45%</TableCell><TableCell className="p-3">Below threshold</TableCell><TableCell className="p-3">Bob</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">HITL-003</TableCell><TableCell className="p-3">Legal document summary</TableCell><TableCell className="p-3">Llama 3</TableCell><TableCell className="p-3">71%</TableCell><TableCell className="p-3">Sensitive domain</TableCell><TableCell className="p-3">Carol</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">HITL-004</TableCell><TableCell className="p-3">Code with security implications</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">58%</TableCell><TableCell className="p-3">Security flag</TableCell><TableCell className="p-3">Dave</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}