import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function ThreatFeed() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Threat Intelligence Feed</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm hover:bg-[#155A4B]">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm">
        <Table className="w-full text-sm text-foreground">
          <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Threat</TableHead><TableHead className="p-3 text-left">Source</TableHead><TableHead className="p-3 text-left">Severity</TableHead><TableHead className="p-3 text-left">Detected</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
          <TableBody>
          <TableRow className="border-t"><TableCell className="p-3">Prompt injection via markdown</TableCell><TableCell className="p-3">OWASP</TableCell><TableCell className="p-3"><span className="text-red-600 font-medium">Critical</span></TableCell><TableCell className="p-3">2h ago</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Training data poisoning</TableCell><TableCell className="p-3">MITRE ATLAS</TableCell><TableCell className="p-3"><span className="text-amber-600 font-medium">High</span></TableCell><TableCell className="p-3">6h ago</TableCell><TableCell className="p-3">Monitoring</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Model weight exfiltration</TableCell><TableCell className="p-3">Internal</TableCell><TableCell className="p-3"><span className="text-amber-600 font-medium">High</span></TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Mitigated</TableCell></TableRow>
          <TableRow className="border-t"><TableCell className="p-3">Adversarial suffix attack</TableCell><TableCell className="p-3">Research</TableCell><TableCell className="p-3"><span className="text-emerald-600 font-medium">Medium</span></TableCell><TableCell className="p-3">2d ago</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}