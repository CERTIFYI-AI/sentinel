import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function RedTeamLab() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Red Team Lab</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Campaign</TableHead><TableHead className="p-3 text-left">Target Model</TableHead><TableHead className="p-3 text-left">Technique</TableHead><TableHead className="p-3 text-left">Success Rate</TableHead><TableHead className="p-3 text-left">Findings</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Jailbreak Campaign v3</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">Multi-turn manipulation</TableCell><TableCell className="p-3">23%</TableCell><TableCell className="p-3">7</TableCell><TableCell className="p-3">Complete</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Data Extraction Test</TableCell><TableCell className="p-3">Claude 3.5</TableCell><TableCell className="p-3">System prompt leak</TableCell><TableCell className="p-3">12%</TableCell><TableCell className="p-3">3</TableCell><TableCell className="p-3">Complete</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Adversarial Inputs</TableCell><TableCell className="p-3">Llama 3</TableCell><TableCell className="p-3">Token manipulation</TableCell><TableCell className="p-3">8%</TableCell><TableCell className="p-3">2</TableCell><TableCell className="p-3">Running</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Social Engineering</TableCell><TableCell className="p-3">All Models</TableCell><TableCell className="p-3">Role-play bypass</TableCell><TableCell className="p-3">31%</TableCell><TableCell className="p-3">9</TableCell><TableCell className="p-3">Scheduled</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}