import React, { useState, useEffect } from "react";
import { FileText, Plus, MagnifyingGlass } from "@phosphor-icons/react";
import Badge from "../components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';

const MOCK: any[] = [
  { id:"1", title:"AI Acceptable Use Policy", description:"Defines acceptable use of AI systems", status:"active", category:"AI Governance", version:"2.1", owner:"legal@certifyi.ai", last_reviewed:"2025-05-15" },
  { id:"2", title:"Data Privacy & Protection Policy", description:"Personal data handling and protection", status:"active", category:"Data Privacy", version:"3.0", owner:"privacy@certifyi.ai", last_reviewed:"2025-04-20" },
  { id:"3", title:"Information Security Policy", description:"Organization-wide information security controls", status:"active", category:"Security", version:"4.2", owner:"ciso@certifyi.ai", last_reviewed:"2025-05-01" },
  { id:"4", title:"AI Model Risk Management Policy", description:"Risk management for AI model deployment", status:"under_review", category:"AI Governance", version:"1.0", owner:"risk@certifyi.ai", last_reviewed:"2025-05-25" },
  { id:"5", title:"Vendor & Third-Party AI Policy", description:"Third-party AI service governance", status:"draft", category:"Vendor Management", version:"0.9", owner:"procurement@certifyi.ai", last_reviewed:null },
  { id:"6", title:"Incident Response Policy", description:"AI security incident response procedures", status:"active", category:"Security", version:"2.3", owner:"ops@certifyi.ai", last_reviewed:"2025-03-10" },
];

export default function Policies() {
  const [items, setItems] = useState(MOCK);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  useEffect(() => {
    fetch("/api/policies").then(r=>r.json()).then(d=>{ const arr=Array.isArray(d)?d:d.items||[]; if(arr.length) setItems(arr); }).catch(()=>{});
  }, []);
  const filtered = items
    .filter(x=>statusFilter==="all"||x.status===statusFilter)
    .filter(x=>x.title?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-outfit flex items-center gap-2"><FileText size={20} className="text-blue-400"/>Policy Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage compliance policies</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-foreground text-sm font-medium rounded-sm transition-colors">
          <Plus size={16}/>New Policy
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search policies..." className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-2 text-sm bg-card border border-border rounded-sm text-foreground focus:outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="under_review">Under Review</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <Table className="w-full text-xs">
          <TableHeader><TableRow className="border-b border-border bg-muted/30 text-muted-foreground">
            <TableHead className="px-5 py-3 text-left font-medium">Policy Title</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Category</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Version</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Status</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Owner</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Last Reviewed</TableHead>
            <TableHead className="px-5 py-3 text-left font-medium">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody className="divide-y divide-border">
            {filtered.map(p => (
              <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                <TableCell className="px-5 py-3">
                  <div className="font-medium text-foreground">{p.title}</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5">{p.description}</div>
                </TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{p.category}</TableCell>
                <TableCell className="px-5 py-3 font-mono text-muted-foreground">v{p.version}</TableCell>
                <TableCell className="px-5 py-3"><Badge variant={p.status as any}>{p.status.replace("_"," ")}</Badge></TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{p.owner}</TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{p.last_reviewed||"—"}</TableCell>
                <TableCell className="px-5 py-3">
                  <button className="text-emerald-400 hover:text-emerald-300 text-xs">View</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length===0 && <div className="py-12 text-center text-sm text-muted-foreground">No policies found</div>}
      </div>
    </div>
  );
}
