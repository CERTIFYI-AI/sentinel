import { useState, useMemo } from "react";
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
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-1">Eval Results</h1><p className="text-sm text-gray-500 mb-4">View and compare evaluation results</p>
<div className="mb-4"><input placeholder="Search models..." className="border rounded px-3 py-2 w-64" value={search} onChange={e=>setSearch(e.target.value)}/></div>
{filtered.length===0?(<div className="text-center py-12 text-gray-500"><p className="text-lg">No results found</p><p className="text-sm">Run an evaluation to see results here</p></div>):(
<table className="w-full border-collapse text-gray-900"><thead><tr className="border-b">{(["model","accuracy","f1","latency","timestamp"] as (keyof EvalResult)[]).map(col=>(<th key={col} className="text-left p-2 cursor-pointer hover:bg-[hsl(var(--muted))]" onClick={()=>setSortCol(col)}>{col}</th>))}</tr></thead><tbody>{filtered.map(r=>(<tr key={r.id} className="border-b hover:bg-[hsl(var(--muted))]"><td className="p-2">{r.model}</td><td className="p-2">{(r.accuracy*100).toFixed(1)}%</td><td className="p-2">{(r.f1*100).toFixed(1)}%</td><td className="p-2">{r.latency}ms</td><td className="p-2">{r.timestamp}</td></tr>))}</tbody></table>)}</div>);}
