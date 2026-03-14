import { Warning, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function GapAnalysis() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gap Analysis</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Framework</TableHead><TableHead className="p-3 text-left">Requirement</TableHead><TableHead className="p-3 text-left">Current State</TableHead><TableHead className="p-3 text-left">Target State</TableHead><TableHead className="p-3 text-left">Gap</TableHead><TableHead className="p-3 text-left">Priority</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">EU AI Act</TableCell><TableCell className="p-3">Risk Management System</TableCell><TableCell className="p-3">Partial</TableCell><TableCell className="p-3">Full</TableCell><TableCell className="p-3">40%</TableCell><TableCell className="p-3">High</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">NIST AI RMF</TableCell><TableCell className="p-3">Continuous Monitoring</TableCell><TableCell className="p-3">Basic</TableCell><TableCell className="p-3">Advanced</TableCell><TableCell className="p-3">35%</TableCell><TableCell className="p-3">High</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">ISO 42001</TableCell><TableCell className="p-3">Documentation</TableCell><TableCell className="p-3">Partial</TableCell><TableCell className="p-3">Complete</TableCell><TableCell className="p-3">25%</TableCell><TableCell className="p-3">Medium</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">SOC 2 Type II</TableCell><TableCell className="p-3">Access Controls</TableCell><TableCell className="p-3">Good</TableCell><TableCell className="p-3">Excellent</TableCell><TableCell className="p-3">15%</TableCell><TableCell className="p-3">Low</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}