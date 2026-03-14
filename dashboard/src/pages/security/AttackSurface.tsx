import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function AttackSurface() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Attack Surface Analysis</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Asset</TableHead><TableHead className="p-3 text-left">Type</TableHead><TableHead className="p-3 text-left">Risk Level</TableHead><TableHead className="p-3 text-left">Exposure</TableHead><TableHead className="p-3 text-left">Last Scanned</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Production API Gateway</TableCell><TableCell className="p-3">API Endpoint</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">Public</TableCell><TableCell className="p-3">2h ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Model Serving Cluster</TableCell><TableCell className="p-3">Infrastructure</TableCell><TableCell className="p-3">Medium</TableCell><TableCell className="p-3">Internal</TableCell><TableCell className="p-3">1d ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Training Data Pipeline</TableCell><TableCell className="p-3">Data</TableCell><TableCell className="p-3">High</TableCell><TableCell className="p-3">Internal</TableCell><TableCell className="p-3">3d ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">User Auth Service</TableCell><TableCell className="p-3">API Endpoint</TableCell><TableCell className="p-3">Low</TableCell><TableCell className="p-3">Public</TableCell><TableCell className="p-3">6h ago</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}