import { FolderOpen, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function EvidenceHub() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Evidence Hub</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Evidence</TableHead><TableHead className="p-3 text-left">Control</TableHead><TableHead className="p-3 text-left">Type</TableHead><TableHead className="p-3 text-left">Uploaded</TableHead><TableHead className="p-3 text-left">Size</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">AI Ethics Policy v2.3</TableCell><TableCell className="p-3">CC-001</TableCell><TableCell className="p-3">Policy Document</TableCell><TableCell className="p-3">2h ago</TableCell><TableCell className="p-3">1.2 MB</TableCell><TableCell className="p-3">Approved</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Bias Test Results Q1</TableCell><TableCell className="p-3">CC-003</TableCell><TableCell className="p-3">Test Report</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">890 KB</TableCell><TableCell className="p-3">Under Review</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">DPIA for Chat Model</TableCell><TableCell className="p-3">CC-002</TableCell><TableCell className="p-3">Assessment</TableCell><TableCell className="p-3">3d ago</TableCell><TableCell className="p-3">2.1 MB</TableCell><TableCell className="p-3">Approved</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Incident Playbook v1</TableCell><TableCell className="p-3">CC-004</TableCell><TableCell className="p-3">Procedure</TableCell><TableCell className="p-3">1w ago</TableCell><TableCell className="p-3">456 KB</TableCell><TableCell className="p-3">Draft</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}