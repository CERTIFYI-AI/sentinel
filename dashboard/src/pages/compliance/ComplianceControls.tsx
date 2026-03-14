import { Shield, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function ComplianceControls() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Compliance Controls</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Control ID</TableHead><TableHead className="p-3 text-left">Control</TableHead><TableHead className="p-3 text-left">Framework</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Evidence</TableHead><TableHead className="p-3 text-left">Owner</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">CC-001</TableCell><TableCell className="p-3">AI Model Risk Assessment</TableCell><TableCell className="p-3">NIST AI RMF</TableCell><TableCell className="p-3">Implemented</TableCell><TableCell className="p-3">3 docs</TableCell><TableCell className="p-3">Alice</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">CC-002</TableCell><TableCell className="p-3">Data Privacy Impact Assessment</TableCell><TableCell className="p-3">EU AI Act</TableCell><TableCell className="p-3">In Progress</TableCell><TableCell className="p-3">1 doc</TableCell><TableCell className="p-3">Bob</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">CC-003</TableCell><TableCell className="p-3">Algorithmic Bias Testing</TableCell><TableCell className="p-3">ISO 42001</TableCell><TableCell className="p-3">Implemented</TableCell><TableCell className="p-3">5 docs</TableCell><TableCell className="p-3">Carol</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">CC-004</TableCell><TableCell className="p-3">Incident Response Plan</TableCell><TableCell className="p-3">SOC 2 Type II</TableCell><TableCell className="p-3">Draft</TableCell><TableCell className="p-3">0 docs</TableCell><TableCell className="p-3">Dave</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">CC-005</TableCell><TableCell className="p-3">Model Monitoring Procedures</TableCell><TableCell className="p-3">OWASP LLM</TableCell><TableCell className="p-3">Implemented</TableCell><TableCell className="p-3">2 docs</TableCell><TableCell className="p-3">Eve</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}