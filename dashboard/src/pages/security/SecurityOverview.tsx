import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function SecurityOverview() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Security Overview</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm hover:bg-[#155A4B]">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm">
        <Table className="w-full text-sm text-foreground">
          <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Category</TableHead><TableHead className="p-3 text-left">Score</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Last Updated</TableHead></TableRow></TableHeader>
          <TableBody>
          <TableRow className="border-t"><TableCell className="p-3">Prompt Injection Defense</TableCell><TableCell className="p-3">87/100</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Good</span></TableCell><TableCell className="p-3">2 hours ago</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Data Leakage Prevention</TableCell><TableCell className="p-3">72/100</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">Fair</span></TableCell><TableCell className="p-3">1 day ago</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Model Access Control</TableCell><TableCell className="p-3">95/100</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Excellent</span></TableCell><TableCell className="p-3">3 hours ago</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Adversarial Robustness</TableCell><TableCell className="p-3">68/100</TableCell><TableCell className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Needs Work</span></TableCell><TableCell className="p-3">2 days ago</TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}