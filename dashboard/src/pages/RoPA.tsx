// @ts-nocheck
import { useState, useMemo } from "react";
import { useRoPA } from "@/hooks/queries/useRoPA";
import { MOCK_ROPA } from "@/data/assets";
import { Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

export default function RoPA() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const data = MOCK_ROPA;
  const filtered = useMemo(() => data.filter(r =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  ), [data, search]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Record of Processing Activities</h1>
          <p className="text-sm text-muted-foreground mt-1">GDPR Article 30 processing activity register</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus weight="bold" className="mr-2 h-4 w-4" /> Add Processing Activity
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Total Activities</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--foreground))"}}>5</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">DPO Reviewed</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--chart-2))"}}>3</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Third-Country Transfers</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--chart-4))"}}>2</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Under Review</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--chart-4))"}}>1</p></div>
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
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">RoPA Ref</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Activity</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Purpose</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Legal Basis</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Retention</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">DPO Reviewed</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/50 transition-colors">
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.ropa_ref}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.processing_activity}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.purpose}</td>
        <td><span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">{r.legal_basis}</span></td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.retention_period}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.dpo_reviewed}</td>
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
