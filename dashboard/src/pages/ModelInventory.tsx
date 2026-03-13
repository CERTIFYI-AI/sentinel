// src/pages/ModelInventory.tsx
import { useState } from "react";
import { Plus, Search, LayoutGrid, Table } from "lucide-react";
import { useModels, useModelHealth, useSetModelRole } from "../hooks/use-models";
import { ModelCard } from "../components/models/ModelCard";
import type { ModelConfig } from "../api/types";

export default function ModelInventory() {
  const { data: models, isLoading } = useModels();
  const { data: health } = useModelHealth();
  const setRole = useSetModelRole();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [view, setView] = useState<"grid" | "table">("grid");

  const providers = ["all", "openai", "anthropic", "azure", "local", "custom"];
  const filtered = (models ?? []).filter(m =>
    (providerFilter === "all" || m.provider === providerFilter) &&
    (search === "" || m.display_name.toLowerCase().includes(search.toLowerCase()) || m.model_name.toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  if (isLoading) return <div className="p-8"><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}</div></div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Model Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage LLM providers, monitor health, compare performance</p>
        </div>
        <div className="flex gap-2">
          {selected.size >= 2 && <button className="h-9 px-3 rounded-md border border-border text-sm hover:bg-gray-100">Compare ({selected.size})</button>}
          <button className="h-9 px-3 rounded-md bg-[#1A6B5A] text-white text-sm font-medium hover:bg-[#1A6B5A]/90 flex items-center gap-2"><Plus className="w-4 h-4" />Add Model</button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sticky top-0 z-10 bg-background py-2">
        <div className="flex gap-1">
          {providers.map(p => (
            <button key={p} onClick={() => setProviderFilter(p)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition-colors ${providerFilter === p ? "bg-[#1A6B5A] text-white" : "text-gray-500 hover:bg-gray-100"}`}>{p}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models..."
              className="h-9 w-56 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex border border-border rounded-md">
            <button onClick={() => setView("grid")} className={`p-2 ${view === "grid" ? "bg-gray-100" : ""}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setView("table")} className={`p-2 ${view === "table" ? "bg-gray-100" : ""}`}><Table className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No models found</p>
          <p className="text-sm mt-1">Add your first LLM provider to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(m => (
            <ModelCard key={m.id} model={m} health={health?.[m.id]}
              selected={selected.has(m.id)} onSelect={() => toggle(m.id)}
              onSetRole={r => setRole.mutate({ id: m.id, role: r })} onTest={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
