import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function ComplianceDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Compliance Dashboard</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Framework</TableHead><TableHead className="p-3 text-left">Total Controls</TableHead><TableHead className="p-3 text-left">Implemented</TableHead><TableHead className="p-3 text-left">In Progress</TableHead><TableHead className="p-3 text-left">Score</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">NIST AI RMF</TableCell><TableCell className="p-3">93</TableCell><TableCell className="p-3">72</TableCell><TableCell className="p-3">15</TableCell><TableCell className="p-3">77%</TableCell><TableCell className="p-3">In Progress</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">ISO 42001</TableCell><TableCell className="p-3">24</TableCell><TableCell className="p-3">18</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">75%</TableCell><TableCell className="p-3">In Progress</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">EU AI Act</TableCell><TableCell className="p-3">85</TableCell><TableCell className="p-3">45</TableCell><TableCell className="p-3">25</TableCell><TableCell className="p-3">53%</TableCell><TableCell className="p-3">In Progress</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">OWASP LLM Top 10</TableCell><TableCell className="p-3">10</TableCell><TableCell className="p-3">8</TableCell><TableCell className="p-3">2</TableCell><TableCell className="p-3">80%</TableCell><TableCell className="p-3">Complete</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">SOC 2 Type II</TableCell><TableCell className="p-3">120</TableCell><TableCell className="p-3">64</TableCell><TableCell className="p-3">32</TableCell><TableCell className="p-3">53%</TableCell><TableCell className="p-3">In Progress</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}