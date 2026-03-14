import { ShieldCheck, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function KeysVault() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Keys Vault</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Key Name</TableHead><TableHead className="p-3 text-left">Service</TableHead><TableHead className="p-3 text-left">Created</TableHead><TableHead className="p-3 text-left">Last Used</TableHead><TableHead className="p-3 text-left">Status</TableHead><TableHead className="p-3 text-left">Permissions</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">prod-openai-key</TableCell><TableCell className="p-3">OpenAI API</TableCell><TableCell className="p-3">Jan 15, 2025</TableCell><TableCell className="p-3">2 hours ago</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">Read/Write</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">staging-anthropic</TableCell><TableCell className="p-3">Anthropic API</TableCell><TableCell className="p-3">Feb 1, 2025</TableCell><TableCell className="p-3">1 day ago</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">Read Only</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">dev-huggingface</TableCell><TableCell className="p-3">HuggingFace</TableCell><TableCell className="p-3">Dec 10, 2024</TableCell><TableCell className="p-3">1 week ago</TableCell><TableCell className="p-3">Active</TableCell><TableCell className="p-3">Read Only</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">old-cohere-key</TableCell><TableCell className="p-3">Cohere API</TableCell><TableCell className="p-3">Jun 5, 2024</TableCell><TableCell className="p-3">3 months ago</TableCell><TableCell className="p-3">Expired</TableCell><TableCell className="p-3">N/A</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}