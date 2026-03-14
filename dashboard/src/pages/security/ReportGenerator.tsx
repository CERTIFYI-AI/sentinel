import { Export, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function ReportGenerator() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Report Generator</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Report</TableHead><TableHead className="p-3 text-left">Type</TableHead><TableHead className="p-3 text-left">Generated</TableHead><TableHead className="p-3 text-left">Format</TableHead><TableHead className="p-3 text-left">Size</TableHead><TableHead className="p-3 text-left">Actions</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Q1 2025 Security Audit</TableCell><TableCell className="p-3">Comprehensive</TableCell><TableCell className="p-3">Mar 31, 2025</TableCell><TableCell className="p-3">PDF</TableCell><TableCell className="p-3">2.4 MB</TableCell><TableCell className="p-3">Download</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Monthly Vulnerability Summary</TableCell><TableCell className="p-3">Summary</TableCell><TableCell className="p-3">Mar 15, 2025</TableCell><TableCell className="p-3">PDF</TableCell><TableCell className="p-3">890 KB</TableCell><TableCell className="p-3">Download</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">OWASP LLM Top 10 Compliance</TableCell><TableCell className="p-3">Compliance</TableCell><TableCell className="p-3">Mar 10, 2025</TableCell><TableCell className="p-3">PDF</TableCell><TableCell className="p-3">1.2 MB</TableCell><TableCell className="p-3">Download</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Incident Response Report #IR-23</TableCell><TableCell className="p-3">Incident</TableCell><TableCell className="p-3">Mar 5, 2025</TableCell><TableCell className="p-3">PDF</TableCell><TableCell className="p-3">456 KB</TableCell><TableCell className="p-3">Download</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}