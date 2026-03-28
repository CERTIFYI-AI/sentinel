import { ChartBar, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useState, useMemo } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
interface EvalResult { id: string; model: string; accuracy: number; f1: number; latency: number; timestamp: string; }
export default function EvalResultsViewer() {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof EvalResult>("timestamp");
  const data = useMemo<EvalResult[]>(() => [
    {id:"1",model:"GPT-4",accuracy:0.92,f1:0.89,latency:450,timestamp:"2024-01-15"},
    {id:"2",model:"Claude 3",accuracy:0.94,f1:0.91,latency:380,timestamp:"2024-01-14"},
    {id:"3",model:"Llama 3",accuracy:0.87,f1:0.84,latency:220,timestamp:"2024-01-13"},
  ], []);
  const filtered = useMemo(() => data.filter(d=>d.model.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a[sortCol]>b[sortCol]?1:-1), [data,search,sortCol]);
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-1">Eval Results</h1><p className="text-sm text-muted-foreground mb-4">View and compare evaluation results</p>
<div className="mb-4"><input placeholder="MagnifyingGlass models..." className="border rounded px-3 py-2 w-64" value={search} onChange={e=>setSearch(e.target.value)}/></div>
{filtered.length===0?(<div className="text-center py-12 text-muted-foreground"><p className="text-lg">No results found</p><p className="text-sm">Run an evaluation to see results here</p></div>):(
<Table className="w-full border-collapse text-foreground"><TableHeader><TableRow className="border-b">{(["model","accuracy","f1","latency","timestamp"] as (keyof EvalResult)[]).map(col=>(<TableHead key={col} className="text-left p-2 cursor-pointer hover:bg-[hsl(var(--muted))]" onClick={()=>setSortCol(col)}>{col}</TableHead>))}</TableRow></TableHeader><TableBody>{filtered.map(r=>(<TableRow key={r.id} className="border-b hover:bg-[hsl(var(--muted))]"><TableCell className="p-2">{r.model}</TableCell><TableCell className="p-2">{(r.accuracy*100).toFixed(1)}%</TableCell><TableCell className="p-2">{(r.f1*100).toFixed(1)}%</TableCell><TableCell className="p-2">{r.latency}ms</TableCell><TableCell className="p-2">{r.timestamp}</TableCell></TableRow>))}</TableBody></Table>)}</div>);}
