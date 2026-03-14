import { ChartBar, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function EvalTechniques() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Evaluation Techniques</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Technique</TableHead><TableHead className="p-3 text-left">Category</TableHead><TableHead className="p-3 text-left">Models Tested</TableHead><TableHead className="p-3 text-left">Pass Rate</TableHead><TableHead className="p-3 text-left">Last Run</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">Adversarial Prompting</TableCell><TableCell className="p-3">Safety</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">87%</TableCell><TableCell className="p-3">2h ago</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Hallucination Detection</TableCell><TableCell className="p-3">Accuracy</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">91%</TableCell><TableCell className="p-3">6h ago</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Bias Benchmark Suite</TableCell><TableCell className="p-3">Fairness</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">94%</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Toxicity Screening</TableCell><TableCell className="p-3">Safety</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">98%</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Active</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}