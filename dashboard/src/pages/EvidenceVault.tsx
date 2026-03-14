import { FolderOpen, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function EvidenceVault() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Evidence Vault</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Document</TableHead><TableHead className="p-3 text-left">Framework</TableHead><TableHead className="p-3 text-left">Control</TableHead><TableHead className="p-3 text-left">Uploaded By</TableHead><TableHead className="p-3 text-left">Date</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">AI Ethics Policy v2.3</TableCell><TableCell className="p-3">NIST AI RMF</TableCell><TableCell className="p-3">CC-001</TableCell><TableCell className="p-3">Alice</TableCell><TableCell className="p-3">2h ago</TableCell><TableCell className="p-3">Verified</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">DPIA Report 2025</TableCell><TableCell className="p-3">EU AI Act</TableCell><TableCell className="p-3">CC-002</TableCell><TableCell className="p-3">Bob</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Under Review</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Bias Audit Results</TableCell><TableCell className="p-3">ISO 42001</TableCell><TableCell className="p-3">CC-003</TableCell><TableCell className="p-3">Carol</TableCell><TableCell className="p-3">3d ago</TableCell><TableCell className="p-3">Verified</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Penetration Test Report</TableCell><TableCell className="p-3">SOC 2</TableCell><TableCell className="p-3">CC-007</TableCell><TableCell className="p-3">Dave</TableCell><TableCell className="p-3">1w ago</TableCell><TableCell className="p-3">Verified</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}