import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function ScanCenter() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Scan Center</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm hover:bg-[#155A4B]">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm">
        <Table className="w-full text-sm text-foreground">
          <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Scan Name</TableHead><TableHead className="p-3 text-left">Target</TableHead><TableHead className="p-3 text-left">Type</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Findings</TableHead><TableHead className="p-3 text-left">Last Run</TableHead></TableRow></TableHeader>
          <TableBody>
          <TableRow className="border-t"><TableCell className="p-3">GPT-4o Injection Test</TableCell><TableCell className="p-3">Production API</TableCell><TableCell className="p-3">Red Team</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Complete</span></TableCell><TableCell className="p-3">3</TableCell><TableCell className="p-3">2h ago</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Claude Prompt Leak</TableCell><TableCell className="p-3">Staging</TableCell><TableCell className="p-3">Automated</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Complete</span></TableCell><TableCell className="p-3">1</TableCell><TableCell className="p-3">1d ago</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Full Model Audit</TableCell><TableCell className="p-3">All Models</TableCell><TableCell className="p-3">Comprehensive</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">Running</span></TableCell><TableCell className="p-3">0</TableCell><TableCell className="p-3">In progress</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">OWASP LLM Top 10</TableCell><TableCell className="p-3">Production</TableCell><TableCell className="p-3">Compliance</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-muted text-foreground">Scheduled</span></TableCell><TableCell className="p-3">-</TableCell><TableCell className="p-3">Tomorrow</TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}