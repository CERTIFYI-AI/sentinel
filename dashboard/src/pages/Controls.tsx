import React, { useState, useEffect } from "react";
import { CheckSquare, Plus, MagnifyingGlass, Funnel } from "@phosphor-icons/react";
import Badge from "../components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';

const MOCK: any[] = [
  { id:"1", control_id:"AC-1", title:"Access Control Policy", status:"passing", severity:"high", framework:"ISO 27001", owner:"admin@certifyi.ai", last_tested:"2025-06-01" },
  { id:"2", control_id:"AC-2", title:"Account Management", status:"passing", severity:"high", framework:"ISO 27001", owner:"admin@certifyi.ai", last_tested:"2025-06-01" },
  { id:"3", control_id:"IA-5", title:"Authenticator Management", status:"failing", severity:"critical", framework:"ISO 27001", owner:"sec@certifyi.ai", last_tested:"2025-05-30" },
  { id:"4", control_id:"SC-8", title:"Transmission Confidentiality", status:"passing", severity:"medium", framework:"SOC 2", owner:"admin@certifyi.ai", last_tested:"2025-05-28" },
  { id:"5", control_id:"AU-2", title:"Event Logging", status:"not_tested", severity:"medium", framework:"SOC 2", owner:"ops@certifyi.ai", last_tested:null },
  { id:"6", control_id:"LLM-1", title:"Prompt Injection Prevention", status:"failing", severity:"critical", framework:"OWASP LLM", owner:"ai@certifyi.ai", last_tested:"2025-05-25" },
  { id:"7", control_id:"LLM-2", title:"Insecure Output Handling", status:"not_tested", severity:"high", framework:"OWASP LLM", owner:"ai@certifyi.ai", last_tested:null },
  { id:"8", control_id:"EU-3", title:"AI Transparency Requirements", status:"passing", severity:"high", framework:"EU AI Act", owner:"legal@certifyi.ai", last_tested:"2025-06-02" },
];

const SEV_ORDER: Record<string,number> = { critical:0, high:1, medium:2, low:3 };

export default function Controls() {
  const [items, setItems] = useState(MOCK);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  useEffect(() => {
    fetch("/api/controls").then(r=>r.json()).then(d=>{ const arr=Array.isArray(d)?d:d.items||[]; if(arr.length) setItems(arr); }).catch(()=>{});
  }, []);
  const filtered = items
    .filter(x => statusFilter==="all" || x.status===statusFilter)
    .filter(x => x.title?.toLowerCase().includes(search.toLowerCase()) || x.control_id?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => (SEV_ORDER[a.severity]||4)-(SEV_ORDER[b.severity]||4));
  const counts = { passing: items.filter(x=>x.status==="passing").length, failing: items.filter(x=>x.status==="failing").length, not_tested: items.filter(x=>x.status==="not_tested").length };
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-outfit flex items-center gap-2"><CheckSquare size={20} className="text-emerald-400"/>Controls</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor and manage compliance controls</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-foreground text-sm font-medium rounded-sm transition-colors">
          <Plus size={16}/>Add Control
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Passing",count:counts.passing,v:"healthy"},{label:"Failing",count:counts.failing,v:"critical"},{label:"Not Tested",count:counts.not_tested,v:"unknown"}].map((s,i)=>(
          <button key={i} onClick={()=>setStatusFilter(s.label.toLowerCase().replace(" ","_")===statusFilter?"all":s.label.toLowerCase().replace(" ","_"))} className="bg-card border border-border rounded-sm p-4 text-left hover:border-emerald-500/30 transition-colors">
            <p className="text-2xl font-bold text-foreground font-outfit">{s.count}</p>
            <div className="flex items-center gap-2 mt-1"><Badge variant={s.v as any} size="sm">{s.label}</Badge></div>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search controls..." className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500">
          <option value="all">All Status</option>
          <option value="passing">Passing</option>
          <option value="failing">Failing</option>
          <option value="not_tested">Not Tested</option>
          <option value="not_applicable">N/A</option>
        </select>
      </div>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <Table className="w-full text-xs">
          <TableHeader><TableRow className="border-b border-border bg-muted/30 text-muted-foreground">
            <TableHead className="px-5 py-3 text-left font-medium">ID</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Control Title</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Framework</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Severity</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Status</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Owner</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Last Tested</TableHead>
          </TableRow></TableHeader>
          <TableBody className="divide-y divide-border">
            {filtered.map(c => (
              <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="px-5 py-3 font-mono text-emerald-400">{c.control_id}</TableCell>
                <TableCell className="px-5 py-3 font-medium text-foreground">{c.title}</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{c.framework}</TableCell>
                <TableCell className="px-5 py-3"><Badge variant={c.severity as any}>{c.severity}</Badge></TableCell>
                <TableCell className="px-5 py-3"><Badge variant={c.status as any}>{c.status.replace("_"," ")}</Badge></TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{c.owner}</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{c.last_tested||"—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length===0 && <div className="py-12 text-center text-sm text-muted-foreground">No controls found</div>}
      </div>
    </div>
  );
}
