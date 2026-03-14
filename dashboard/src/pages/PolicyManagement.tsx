import { FileText, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function PolicyManagement() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Policy Management</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Policy</TableHead><TableHead className="p-3 text-left">Version</TableHead><TableHead className="p-3 text-left">Category</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Last Updated</TableHead><TableHead className="p-3 text-left">Owner</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">AI Ethics Policy</TableCell><TableCell className="p-3">v2.3</TableCell><TableCell className="p-3">Ethics</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">2h ago</TableCell><TableCell className="p-3">Alice</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Data Retention Policy</TableCell><TableCell className="p-3">v1.5</TableCell><TableCell className="p-3">Data</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Bob</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Model Deployment Policy</TableCell><TableCell className="p-3">v3.0</TableCell><TableCell className="p-3">Operations</TableCell><TableCell className="p-3">Under Review</TableCell><TableCell className="p-3">3d ago</TableCell><TableCell className="p-3">Carol</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Incident Response Policy</TableCell><TableCell className="p-3">v1.2</TableCell><TableCell className="p-3">Security</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">1w ago</TableCell><TableCell className="p-3">Dave</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Third-Party AI Vendor Policy</TableCell><TableCell className="p-3">v1.0</TableCell><TableCell className="p-3">Vendor</TableCell><TableCell className="p-3">Draft</TableCell><TableCell className="p-3">2w ago</TableCell><TableCell className="p-3">Eve</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}