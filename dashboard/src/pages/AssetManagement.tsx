// @ts-nocheck
import { useState, useMemo } from "react";
import { useAssets } from "@/hooks/queries/useAssets";
import { MOCK_ASSETS } from "@/data/assets";
import { Plus, MagnifyingGlass, Eye, PencilSimple, Trash, Export } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/crud-helpers";
import { toast } from "sonner";

export default function AssetManagement() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const data = MOCK_ASSETS;
  const filtered = useMemo(() => data.filter(r =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  ), [data, search]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Unified CMDB: AI systems, datasets, agents, APIs, infrastructure</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus weight="bold" className="mr-2 h-4 w-4" /> Register Asset
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--foreground))"}}>12</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Critical Assets</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--destructive))"}}>6</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Shadow AI Detected</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--destructive))"}}>1</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Decommissioning</p><p className="text-2xl font-semibold" style={{color:"hsl(var(--chart-4))"}}>1</p></div>
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
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Asset Ref</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Criticality</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Classification</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Lifecycle</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Last Scanned</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b hover:bg-muted/50 transition-colors">
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.asset_ref}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.name}</td>
        <td><span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">{r.type}</span></td>
        <td><StatusBadge status={r.criticality} /></td>
        <td><span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-muted">{r.data_classification}</span></td>
        <td><StatusBadge status={r.lifecycle_stage} /></td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{r.last_scanned_at}</td>
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
