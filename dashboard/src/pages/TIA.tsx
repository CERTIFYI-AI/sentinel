// @ts-nocheck
import { useState, useMemo } from "react";
import { useTIA } from "@/hooks/queries/useTIA";
import { MOCK_TIA } from "@/data/assets";
import { Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

export default function TIA() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const data = MOCK_TIA;
  const filtered = useMemo(() => data.filter(r =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  ), [data, search]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transfer Impact Assessments</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-border data transfer compliance: SCCs, DPF, BCRs</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus weight="bold" className="mr-2 h-4 w-4" /> New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Total TIAs</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--foreground))"}}>5</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">High Risk</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--destructive))"}}>2</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Pending DPO Approval</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--chart-4))"}}>2</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Non-Adequate Countries</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--chart-4))"}}>3</p></div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm"><Export className="mr-2 h-4 w-4" /> Export</Button>
      </div>

      <div className="rounded-xl border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">TIA Ref</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Destination</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Mechanism</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Risk Level</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/50 transition-colors">
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.tia_ref}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.title}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.source_country}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.destination_country}</td>
        <td><span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">{r.transfer_mechanism}</span></td>
        <td><StatusBadge status={r.risk_level} /></td>
        <td><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(r)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><PencilSimple className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive"><Trash className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
