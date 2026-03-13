import { useState, useMemo } from "react";
type Step = "config" | "dataset" | "metrics" | "review";
interface EvalConfig { name: string; model: string; dataset: string; metrics: string[]; }
export default function EvalRunWizard() {
  const [step, setStep] = useState<Step>("config");
  const [config, setConfig] = useState<EvalConfig>({ name: "", model: "", dataset: "", metrics: [] });
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  const steps = useMemo(() => ["config","dataset","metrics","review"] as Step[], []);
  const idx = steps.indexOf(step);
  const canNext = step==="config"?config.name.length>0&&config.model.length>0:step==="dataset"?config.dataset.length>0:step==="metrics"?config.metrics.length>0:true;
  const handleSubmit = async () => { setStatus("loading"); try { await new Promise(r=>setTimeout(r,1200)); setStatus("success"); } catch { setStatus("error"); } };
  return (<div className="p-6 max-w-3xl mx-auto"><h1 className="text-2xl font-bold mb-1">Eval Run Wizard</h1><p className="text-sm text-gray-500 mb-6">Configure and launch evaluation runs</p><div className="flex gap-2 mb-6">{steps.map((s,i)=>(<div key={s} className={`flex-1 h-2 rounded ${i<=idx?"bg-[hsl(var(--primary))]":"bg-[hsl(var(--muted))]"}`}/>))}</div>
{step==="config"&&(<div className="space-y-4"><label className="block text-sm font-medium">Run Name</label><input className="w-full border rounded px-3 py-2" value={config.name} onChange={e=>setConfig(p=>({...p,name:e.target.value}))}/><label className="block text-sm font-medium">Model</label><select className="w-full border rounded px-3 py-2" value={config.model} onChange={e=>setConfig(p=>({...p,model:e.target.value}))}><option value="">Select model</option><option value="gpt-4">GPT-4</option><option value="claude-3">Claude 3</option></select></div>)}
{step==="dataset"&&(<div className="space-y-4"><label className="block text-sm font-medium">Dataset</label><select className="w-full border rounded px-3 py-2" value={config.dataset} onChange={e=>setConfig(p=>({...p,dataset:e.target.value}))}><option value="">Select dataset</option><option value="mmlu">MMLU</option><option value="custom">Custom</option></select></div>)}
{step==="metrics"&&(<div className="space-y-2"><label className="block text-sm font-medium">Metrics</label>{["accuracy","f1","latency","toxicity"].map(m=>(<label key={m} className="flex items-center gap-2"><input type="checkbox" checked={config.metrics.includes(m)} onChange={e=>setConfig(p=>({...p,metrics:e.target.checked?[...p.metrics,m]:p.metrics.filter(x=>x!==m)}))}/>{m}</label>))}</div>)}
{step==="review"&&(<div className="border rounded p-4 space-y-2"><p><strong>Name:</strong> {config.name}</p><p><strong>Model:</strong> {config.model}</p><p><strong>Dataset:</strong> {config.dataset}</p><p><strong>Metrics:</strong> {config.metrics.join(", ")}</p></div>)}
{status==="success"&&<div className="mt-4 p-3 bg-green-100 text-green-800 rounded">Eval run launched!</div>}
{status==="error"&&<div className="mt-4 p-3 bg-red-100 text-red-800 rounded">Failed to launch.</div>}
<div className="flex justify-between mt-6"><button className="px-4 py-2 border rounded disabled:opacity-50" disabled={idx===0} onClick={()=>setStep(steps[idx-1])}>Back</button>
{step==="review"?(<button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={status==="loading"} onClick={handleSubmit}>{status==="loading"?"Launching...":"Launch Eval"}</button>):(<button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={!canNext} onClick={()=>setStep(steps[idx+1])}>Continue</button>)}</div></div>);}
