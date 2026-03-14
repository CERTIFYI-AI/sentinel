import { ChartBar, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { useState } from "react";
export default function MetricStudio() {
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [saved, setSaved] = useState(false);
  const handleSave = () => { if(name&&formula){setSaved(true);setTimeout(()=>setSaved(false),2000);} };
  return (<div className="p-6 max-w-3xl mx-auto"><h1 className="text-2xl font-bold mb-1">Metric Studio</h1><p className="text-sm text-muted-foreground mb-6">Define custom evaluation metrics</p><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Metric Name</label><input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Weighted Accuracy"/></div><div><label className="block text-sm font-medium mb-1">Formula</label><textarea className="w-full border rounded px-3 py-2 font-mono min-h-[120px]" value={formula} onChange={e=>setFormula(e.target.value)} placeholder="(correct / total) * weight"/></div><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={!name||!formula} onClick={handleSave}>Save Metric</button>{saved&&<div className="text-green-600 text-sm">Metric saved successfully!</div>}</div></div>);}
