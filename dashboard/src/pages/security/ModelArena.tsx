import { Robot, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function ModelArena() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Model Arena - Comparative Testing</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Test</TableHead><TableHead className="p-3 text-left">Model A</TableHead><TableHead className="p-3 text-left">Model B</TableHead><TableHead className="p-3 text-left">Winner</TableHead><TableHead className="p-3 text-left">Metric</TableHead><TableHead className="p-3 text-left">Date</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Safety Benchmark v2</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">Claude 3.5</TableCell><TableCell className="p-3">Claude 3.5</TableCell><TableCell className="p-3">Safety Score: 94 vs 91</TableCell><TableCell className="p-3">2h ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Robustness Test</TableCell><TableCell className="p-3">Llama 3</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">Adversarial: 87 vs 82</TableCell><TableCell className="p-3">1d ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Bias Detection</TableCell><TableCell className="p-3">Claude 3.5</TableCell><TableCell className="p-3">Gemini Pro</TableCell><TableCell className="p-3">Tie</TableCell><TableCell className="p-3">Bias Score: 96 vs 95</TableCell><TableCell className="p-3">2d ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Hallucination Test</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">Claude 3.5</TableCell><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">Accuracy: 93 vs 90</TableCell><TableCell className="p-3">3d ago</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}