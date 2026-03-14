import { ChartBar, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';export default function Benchmark() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Benchmarks</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Benchmark</TableHead><TableHead className="p-3 text-left">Models</TableHead><TableHead className="p-3 text-left">Avg Score</TableHead><TableHead className="p-3 text-left">Best Model</TableHead><TableHead className="p-3 text-left">Last Run</TableHead><TableHead className="p-3 text-left">Status</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">MMLU</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">87.3%</TableCell><TableCell className="p-3">GPT-4o (92.1%)</TableCell><TableCell className="p-3">2h ago</TableCell><TableCell className="p-3">Complete</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">HellaSwag</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">91.2%</TableCell><TableCell className="p-3">Claude 3.5 (94.8%)</TableCell><TableCell className="p-3">6h ago</TableCell><TableCell className="p-3">Complete</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">TruthfulQA</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">78.5%</TableCell><TableCell className="p-3">GPT-4o (83.2%)</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Complete</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">HumanEval</TableCell><TableCell className="p-3">4</TableCell><TableCell className="p-3">82.1%</TableCell><TableCell className="p-3">Claude 3.5 (86.4%)</TableCell><TableCell className="p-3">1d ago</TableCell><TableCell className="p-3">Complete</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}