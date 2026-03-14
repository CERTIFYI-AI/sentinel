import { ChartBar, Plus, MagnifyingGlass } from '@phosphor-icons/react';

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';export default function QualityMetrics() {
  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: 'Outfit, Inter, system-ui, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Quality Metrics</h1>
        <button className="bg-[#1A6B5A] text-foreground px-4 py-2 rounded-none text-sm">+ Add New</button>
      </div>
      <div className="bg-card rounded-none border shadow-sm"><Table className="w-full text-sm text-foreground">
        <TableHeader className="bg-muted text-muted-foreground"><TableRow><TableHead className="p-3 text-left">Model</TableHead><TableHead className="p-3 text-left">Accuracy</TableHead><TableHead className="p-3 text-left">Latency</TableHead><TableHead className="p-3 text-left">Throughput</TableHead><TableHead className="p-3 text-left">Bias Score</TableHead><TableHead className="p-3 text-left">Last Eval</TableHead></TableRow></TableHeader>
        <TableBody><TableRow className="border-t"><TableCell className="p-3">GPT-4o</TableCell><TableCell className="p-3">94.2%</TableCell><TableCell className="p-3">120ms</TableCell><TableCell className="p-3">850 req/s</TableCell><TableCell className="p-3">96/100</TableCell><TableCell className="p-3">2h ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Claude 3.5 Sonnet</TableCell><TableCell className="p-3">93.8%</TableCell><TableCell className="p-3">95ms</TableCell><TableCell className="p-3">920 req/s</TableCell><TableCell className="p-3">97/100</TableCell><TableCell className="p-3">4h ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Llama 3 70B</TableCell><TableCell className="p-3">89.1%</TableCell><TableCell className="p-3">180ms</TableCell><TableCell className="p-3">450 req/s</TableCell><TableCell className="p-3">91/100</TableCell><TableCell className="p-3">1d ago</TableCell></TableRow>
<TableRow className="border-t"><TableCell className="p-3">Gemini Pro</TableCell><TableCell className="p-3">91.5%</TableCell><TableCell className="p-3">110ms</TableCell><TableCell className="p-3">780 req/s</TableCell><TableCell className="p-3">94/100</TableCell><TableCell className="p-3">1d ago</TableCell></TableRow>
</TableBody>
      </Table></div>
    </div>);
}