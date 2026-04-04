import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Briefcase, MagnifyingGlass, Plus, ArrowRight } from "@phosphor-icons/react";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-[hsl(var(--s-in-subtle))] text-[hsl(var(--s-in-fg))]" },
  pending: { label: "Pending", cls: "bg-[hsl(var(--s-wn-subtle))] text-[hsl(var(--s-wn-fg))]" },
  approved: { label: "Approved", cls: "bg-[hsl(var(--s-ok-subtle))] text-[hsl(var(--s-ok-fg))]" },
  rejected: { label: "Rejected", cls: "bg-[hsl(var(--s-er-subtle))] text-[hsl(var(--s-er-fg))]" },
};

const MOCK_CASES = [
  { id: "uc-1", name: "Customer Churn Prediction", status: "approved", risk: "Medium", owner: "ML Team", updated: "2h ago" },
  { id: "uc-2", name: "Fraud Detection Pipeline", status: "pending", risk: "High", owner: "Risk Ops", updated: "5h ago" },
  { id: "uc-3", name: "Resume Screening AI", status: "draft", risk: "High", owner: "HR Tech", updated: "1d ago" },
  { id: "uc-4", name: "Content Moderation", status: "approved", risk: "Low", owner: "Trust & Safety", updated: "3d ago" },
  { id: "uc-5", name: "Credit Scoring Model", status: "pending", risk: "Critical", owner: "Finance AI", updated: "6h ago" },
  { id: "uc-6", name: "Recommendation Engine", status: "approved", risk: "Low", owner: "Product", updated: "1w ago" },
];

export default function UseCases() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_CASES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const pendingCount = MOCK_CASES.filter(c => c.status === "pending").length;
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--text-1))]">Use Cases</h1>
          <p className="text-[hsl(var(--text-3))]">AI use case registry and approval workflow</p>
        </div>
        <Button className="gap-2"><Plus weight="bold" size={16} /> Register Use Case</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{MOCK_CASES.length}</div><div className="text-sm text-[hsl(var(--text-3))]">Total Use Cases</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-[hsl(var(--s-ok-fg))]">{MOCK_CASES.filter(c=>c.status==="approved").length}</div><div className="text-sm text-[hsl(var(--text-3))]">Approved</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-[hsl(var(--s-wn-fg))]">{pendingCount}</div><div className="text-sm text-[hsl(var(--text-3))]">Pending Review</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-[hsl(var(--s-er-fg))]">{MOCK_CASES.filter(c=>c.risk==="Critical"||c.risk==="High").length}</div><div className="text-sm text-[hsl(var(--text-3))]">High Risk</div></CardContent></Card>
      </div>
      <div className="flex gap-4"><div className="relative flex-1 max-w-sm"><MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--text-4))]" size={16} /><Input placeholder="Search use cases..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9" /></div></div>
      <div className="overflow-x-auto"><table className="min-w-[640px] w-full">
        <thead><tr className="border-b border-[hsl(var(--border))]">
          <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--text-3))]">Use Case</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--text-3))]">Status</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--text-3))]">Risk</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--text-3))]">Owner</th>
          <th className="text-left py-3 px-4 text-sm font-medium text-[hsl(var(--text-3))]">Updated</th>
          <th className="py-3 px-4"></th>
        </tr></thead>
        <tbody>{filtered.map(c=>(
          <tr key={c.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-raised))]">
            <td className="py-3 px-4 font-medium text-[hsl(var(--text-1))]">{c.name}</td>
            <td className="py-3 px-4"><span className={`px-2 py-0.5 text-xs font-medium ${STATUS_MAP[c.status]?.cls}`}>{STATUS_MAP[c.status]?.label}</span></td>
            <td className="py-3 px-4 text-sm text-[hsl(var(--text-2))]">{c.risk}</td>
            <td className="py-3 px-4 text-sm text-[hsl(var(--text-2))]">{c.owner}</td>
            <td className="py-3 px-4 text-sm text-[hsl(var(--text-3))]">{c.updated}</td>
            <td className="py-3 px-4"><Link to={`/use-cases/${c.id}`}><Button variant="ghost" size="sm"><ArrowRight size={16} /></Button></Link></td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
