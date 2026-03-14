import { Export, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function ExportCenter() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Export Center</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Report</TableHead><TableHead className="p-3 text-left">Format</TableHead><TableHead className="p-3 text-left">Size</TableHead><TableHead className="p-3 text-left">Generated</TableHead><TableHead className="p-3 text-left">Requested By</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Full Compliance Report Q1</TableCell><TableCell className="p-3">PDF</TableCell><TableCell className="p-3">4.2 MB</TableCell><TableCell className="p-3">2h ago</TableCell><TableCell className="p-3">Admin</TableCell><TableCell className="p-3">Ready</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Risk Assessment Summary</TableCell><TableCell className="p-3">Excel</TableCell><TableCell className="p-3">1.8 MB</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Alice</TableCell><TableCell className="p-3">Ready</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Security Scan Results</TableCell><TableCell className="p-3">CSV</TableCell><TableCell className="p-3">890 KB</TableCell><TableCell className="p-3">2d ago</TableCell><TableCell className="p-3">Bob</TableCell><TableCell className="p-3">Ready</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Model Inventory Export</TableCell><TableCell className="p-3">JSON</TableCell><TableCell className="p-3">2.1 MB</TableCell><TableCell className="p-3">3d ago</TableCell><TableCell className="p-3">Carol</TableCell><TableCell className="p-3">Ready</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}