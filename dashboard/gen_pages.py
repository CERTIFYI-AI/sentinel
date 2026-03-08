import os

def w(path, content):
    full = os.path.join('src', path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w') as f:
        f.write(content)
    print(f'wrote {full}')

# EvalRunWizard
w('pages/evals/EvalRunWizard.tsx', r'''
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
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Eval Run Wizard</h1>
      <p className="text-sm text-muted-foreground mb-6">Configure and launch evaluation runs</p>
      <div className="flex gap-2 mb-6">{steps.map((s,i)=>(<div key={s} className={"flex-1 h-2 rounded " + (i<=idx ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--muted))]")} />))}</div>
      {step==="config"&&(<div className="space-y-4"><label className="block text-sm font-medium">Run Name</label><input className="w-full border rounded px-3 py-2" value={config.name} onChange={e=>setConfig(p=>({...p,name:e.target.value}))}/><label className="block text-sm font-medium">Model</label><select className="w-full border rounded px-3 py-2" value={config.model} onChange={e=>setConfig(p=>({...p,model:e.target.value}))}><option value="">Select model</option><option value="gpt-4">GPT-4</option><option value="claude-3">Claude 3</option></select></div>)}
      {step==="dataset"&&(<div className="space-y-4"><label className="block text-sm font-medium">Dataset</label><select className="w-full border rounded px-3 py-2" value={config.dataset} onChange={e=>setConfig(p=>({...p,dataset:e.target.value}))}><option value="">Select dataset</option><option value="mmlu">MMLU</option><option value="custom">Custom</option></select></div>)}
      {step==="metrics"&&(<div className="space-y-2"><label className="block text-sm font-medium">Metrics</label>{["accuracy","f1","latency","toxicity"].map(m=>(<label key={m} className="flex items-center gap-2"><input type="checkbox" checked={config.metrics.includes(m)} onChange={e=>setConfig(p=>({...p,metrics:e.target.checked?[...p.metrics,m]:p.metrics.filter(x=>x!==m)}))}/>{m}</label>))}</div>)}
      {step==="review"&&(<div className="border rounded p-4 space-y-2"><p><strong>Name:</strong> {config.name}</p><p><strong>Model:</strong> {config.model}</p><p><strong>Dataset:</strong> {config.dataset}</p><p><strong>Metrics:</strong> {config.metrics.join(", ")}</p></div>)}
      {status==="success"&&<div className="mt-4 p-3 bg-green-100 text-green-800 rounded">Eval run launched!</div>}
      {status==="error"&&<div className="mt-4 p-3 bg-red-100 text-red-800 rounded">Failed to launch.</div>}
      <div className="flex justify-between mt-6">
        <button className="px-4 py-2 border rounded disabled:opacity-50" disabled={idx===0} onClick={()=>setStep(steps[idx-1])}>Back</button>
        {step==="review"?(<button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={status==="loading"} onClick={handleSubmit}>{status==="loading"?"Launching...":"Launch Eval"}</button>):(<button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={!canNext} onClick={()=>setStep(steps[idx+1])}>Continue</button>)}
      </div>
    </div>
  );
}
'''.lstrip())

# EvalResultsViewer
w('pages/evals/EvalResultsViewer.tsx', r'''
import { useState, useMemo } from "react";
interface EvalResult { id: string; model: string; accuracy: number; f1: number; latency: number; timestamp: string; }
export default function EvalResultsViewer() {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<keyof EvalResult>("timestamp");
  const data = useMemo<EvalResult[]>(() => [{id:"1",model:"GPT-4",accuracy:0.92,f1:0.89,latency:450,timestamp:"2024-01-15"},{id:"2",model:"Claude 3",accuracy:0.94,f1:0.91,latency:380,timestamp:"2024-01-14"},{id:"3",model:"Llama 3",accuracy:0.87,f1:0.84,latency:220,timestamp:"2024-01-13"}],[]);
  const filtered = useMemo(() => data.filter(d=>d.model.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a[sortCol]>b[sortCol]?1:-1), [data,search,sortCol]);
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-1">Eval Results</h1><p className="text-sm text-muted-foreground mb-4">View and compare evaluation results</p><div className="mb-4"><input placeholder="Search models..." className="border rounded px-3 py-2 w-64" value={search} onChange={e=>setSearch(e.target.value)}/></div>{filtered.length===0?(<div className="text-center py-12 text-muted-foreground"><p>No results found</p></div>):(<table className="w-full border-collapse"><thead><tr className="border-b">{(["model","accuracy","f1","latency","timestamp"] as (keyof EvalResult)[]).map(col=>(<th key={col} className="text-left p-2 cursor-pointer hover:bg-[hsl(var(--muted))]" onClick={()=>setSortCol(col)}>{col}</th>))}</tr></thead><tbody>{filtered.map(r=>(<tr key={r.id} className="border-b hover:bg-[hsl(var(--muted))]"><td className="p-2">{r.model}</td><td className="p-2">{(r.accuracy*100).toFixed(1)}%</td><td className="p-2">{(r.f1*100).toFixed(1)}%</td><td className="p-2">{r.latency}ms</td><td className="p-2">{r.timestamp}</td></tr>))}</tbody></table>)}</div>);
}
'''.lstrip())

# ConversationViewer
w('pages/evals/ConversationViewer.tsx', r'''
import { useState, useMemo } from "react";
export default function ConversationViewer() {
  const conversations = useMemo(() => [{id:"1",title:"Safety Test",messages:[{role:"user",content:"How do I hack?"},{role:"assistant",content:"I cannot help with that."}]},{id:"2",title:"Knowledge Test",messages:[{role:"user",content:"What is AI?"},{role:"assistant",content:"AI is artificial intelligence."}]}],[]);
  const [selected, setSelected] = useState(conversations[0].id);
  const conv = conversations.find(c=>c.id===selected);
  return (<div className="p-6 flex gap-6"><div className="w-64 border-r pr-4"><h2 className="font-bold mb-2">Conversations</h2>{conversations.map(c=>(<button key={c.id} className={"block w-full text-left p-2 rounded " + (c.id===selected?"bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]":"hover:bg-[hsl(var(--muted))]")} onClick={()=>setSelected(c.id)}>{c.title}</button>))}</div><div className="flex-1"><h1 className="text-2xl font-bold mb-4">{conv?.title}</h1><div className="space-y-4">{conv?.messages.map((m,i)=>(<div key={i} className={"p-3 rounded " + (m.role==="user"?"bg-[hsl(var(--muted))] ml-8":"mr-8 border")}><div className="text-xs font-medium mb-1">{m.role}</div><div>{m.content}</div></div>))}</div></div></div>);
}
'''.lstrip())

# DatasetHub
w('pages/evals/DatasetHub.tsx', r'''
import { useState, useMemo } from "react";
export default function DatasetHub() {
  const [search, setSearch] = useState("");
  const datasets = useMemo(() => [{id:"1",name:"MMLU",rows:14042,created:"2024-01-10"},{id:"2",name:"HellaSwag",rows:10042,created:"2024-01-08"},{id:"3",name:"TruthfulQA",rows:817,created:"2024-01-05"}],[]);
  const filtered = datasets.filter(d=>d.name.toLowerCase().includes(search.toLowerCase()));
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-1">Dataset Hub</h1><p className="text-sm text-muted-foreground mb-4">Manage evaluation datasets</p><div className="flex gap-2 mb-4"><input placeholder="Search datasets..." className="border rounded px-3 py-2 flex-1" value={search} onChange={e=>setSearch(e.target.value)}/><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded">New Dataset</button></div>{filtered.length===0?(<div className="text-center py-12 text-muted-foreground">No datasets found.</div>):(<div className="grid gap-4">{filtered.map(d=>(<div key={d.id} className="border rounded p-4 hover:shadow-md"><h3 className="font-bold">{d.name}</h3><p className="text-sm text-muted-foreground">{d.rows.toLocaleString()} rows</p><p className="text-xs text-muted-foreground">Created {d.created}</p></div>))}</div>)}</div>);
}
'''.lstrip())

# DatasetPreviewDrawer
w('pages/evals/DatasetPreviewDrawer.tsx', r'''
import { useState } from "react";
interface Props { open: boolean; onClose: () => void; datasetId?: string; }
export default function DatasetPreviewDrawer({ open, onClose }: Props) {
  const [tab, setTab] = useState<"preview"|"schema">("preview");
  if (!open) return null;
  return (<div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}><div className="bg-[hsl(var(--background))] w-[600px] h-full shadow-xl p-6 overflow-auto" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Escape")onClose()}} tabIndex={-1}><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Dataset Preview</h2><button onClick={onClose} className="text-muted-foreground hover:text-foreground">X</button></div><div className="flex gap-2 mb-4">{(["preview","schema"] as const).map(t=>(<button key={t} className={"px-3 py-1 rounded " + (t===tab?"bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]":"border")} onClick={()=>setTab(t)}>{t}</button>))}</div>{tab==="preview"?(<table className="w-full border-collapse text-sm"><thead><tr className="border-b"><th className="p-2 text-left">Input</th><th className="p-2 text-left">Expected</th></tr></thead><tbody><tr className="border-b"><td className="p-2">What is 2+2?</td><td className="p-2">4</td></tr><tr className="border-b"><td className="p-2">Capital of France?</td><td className="p-2">Paris</td></tr></tbody></table>):(<pre className="text-sm bg-[hsl(var(--muted))] p-4 rounded">{JSON.stringify({input:"string",expected:"string"},null,2)}</pre>)}</div></div>);
}
'''.lstrip())

# MultiTurnEditor
w('pages/evals/MultiTurnEditor.tsx', r'''
import { useState } from "react";
interface Turn { role: "user"|"assistant"; content: string; }
export default function MultiTurnEditor() {
  const [turns, setTurns] = useState<Turn[]>([{role:"user",content:""}]);
  const addTurn = () => setTurns(t=>[...t,{role:t[t.length-1].role==="user"?"assistant":"user",content:""}]);
  const updateTurn = (i: number, content: string) => setTurns(t=>t.map((turn,idx)=>idx===i?{...turn,content}:turn));
  const removeTurn = (i: number) => setTurns(t=>t.filter((_,idx)=>idx!==i));
  return (<div className="p-6 max-w-3xl mx-auto"><h1 className="text-2xl font-bold mb-1">Multi-Turn Editor</h1><p className="text-sm text-muted-foreground mb-4">Create multi-turn conversation datasets</p><div className="space-y-3">{turns.map((t,i)=>(<div key={i} className="flex gap-2 items-start"><span className="text-xs font-medium w-16 pt-2">{t.role}</span><textarea className="flex-1 border rounded px-3 py-2 min-h-[60px]" value={t.content} onChange={e=>updateTurn(i,e.target.value)}/><button className="text-red-500 hover:text-red-700 pt-2" onClick={()=>removeTurn(i)}>X</button></div>))}</div><div className="mt-4 flex gap-2"><button className="px-4 py-2 border rounded" onClick={addTurn}>Add Turn</button><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded">Save</button></div></div>);
}
'''.lstrip())

# DatasetCreateModal
w('pages/evals/DatasetCreateModal.tsx', r'''
import { useState } from "react";
interface Props { open: boolean; onClose: () => void; }
export default function DatasetCreateModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState("jsonl");
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  if (!open) return null;
  const handleCreate = async () => { if(!name) return; setStatus("loading"); try { await new Promise(r=>setTimeout(r,1000)); setStatus("success"); setTimeout(onClose,500); } catch { setStatus("error"); } };
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}><div className="bg-[hsl(var(--background))] rounded-lg p-6 w-[400px] shadow-xl" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Escape")onClose()}} tabIndex={-1}><h2 className="text-xl font-bold mb-4">Create Dataset</h2><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Name</label><input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)}/></div><div><label className="block text-sm font-medium mb-1">Format</label><select className="w-full border rounded px-3 py-2" value={format} onChange={e=>setFormat(e.target.value)}><option value="jsonl">JSONL</option><option value="csv">CSV</option></select></div></div>{status==="success"&&<div className="mt-2 text-green-600 text-sm">Created!</div>}{status==="error"&&<div className="mt-2 text-red-600 text-sm">Error.</div>}<div className="flex justify-end gap-2 mt-6"><button className="px-4 py-2 border rounded" onClick={onClose}>Cancel</button><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={!name||status==="loading"} onClick={handleCreate}>{status==="loading"?"Creating...":"Create"}</button></div></div></div>);
}
'''.lstrip())

# MetricStudio
w('pages/evals/MetricStudio.tsx', r'''
import { useState } from "react";
export default function MetricStudio() {
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const [saved, setSaved] = useState(false);
  const handleSave = () => { if(name&&formula){setSaved(true);setTimeout(()=>setSaved(false),2000);} };
  return (<div className="p-6 max-w-3xl mx-auto"><h1 className="text-2xl font-bold mb-1">Metric Studio</h1><p className="text-sm text-muted-foreground mb-6">Define custom evaluation metrics</p><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Metric Name</label><input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Weighted Accuracy"/></div><div><label className="block text-sm font-medium mb-1">Formula</label><textarea className="w-full border rounded px-3 py-2 font-mono min-h-[120px]" value={formula} onChange={e=>setFormula(e.target.value)} placeholder="(correct / total) * weight"/></div><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={!name||!formula} onClick={handleSave}>Save Metric</button>{saved&&<div className="text-green-600 text-sm">Metric saved!</div>}</div></div>);
}
'''.lstrip())

# ComplianceControls
w('pages/compliance/ComplianceControls.tsx', r'''
import { useState, useMemo } from "react";
interface Control { id: string; name: string; framework: string; status: "compliant"|"non-compliant"|"partial"; owner: string; }
export default function ComplianceControls() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const controls = useMemo<Control[]>(() => [{id:"1",name:"Data Privacy Assessment",framework:"EU AI Act",status:"compliant",owner:"Alice"},{id:"2",name:"Bias Testing",framework:"NIST AI RMF",status:"partial",owner:"Bob"},{id:"3",name:"Model Documentation",framework:"ISO 42001",status:"non-compliant",owner:"Carol"},{id:"4",name:"Risk Assessment",framework:"EU AI Act",status:"compliant",owner:"Dave"}],[]);
  const filtered = controls.filter(c=>(filter==="all"||c.status===filter)&&c.name.toLowerCase().includes(search.toLowerCase()));
  const sColors: Record<string,string> = {compliant:"bg-green-100 text-green-800","non-compliant":"bg-red-100 text-red-800",partial:"bg-yellow-100 text-yellow-800"};
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-1">Compliance Controls</h1><p className="text-sm text-muted-foreground mb-4">Manage compliance controls across frameworks</p><div className="flex gap-2 mb-4"><input placeholder="Search controls..." className="border rounded px-3 py-2 flex-1" value={search} onChange={e=>setSearch(e.target.value)}/><select className="border rounded px-3 py-2" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All Status</option><option value="compliant">Compliant</option><option value="partial">Partial</option><option value="non-compliant">Non-Compliant</option></select></div>{filtered.length===0?(<div className="text-center py-12 text-muted-foreground">No controls found.</div>):(<table className="w-full border-collapse"><thead><tr className="border-b"><th className="text-left p-2">Control</th><th className="text-left p-2">Framework</th><th className="text-left p-2">Status</th><th className="text-left p-2">Owner</th></tr></thead><tbody>{filtered.map(c=>(<tr key={c.id} className="border-b hover:bg-[hsl(var(--muted))]"><td className="p-2">{c.name}</td><td className="p-2">{c.framework}</td><td className="p-2"><span className={"px-2 py-1 rounded text-xs " + sColors[c.status]}>{c.status}</span></td><td className="p-2">{c.owner}</td></tr>))}</tbody></table>)}</div>);
}
'''.lstrip())

# EvidenceHub
w('pages/compliance/EvidenceHub.tsx', r'''
import { useState, useMemo } from "react";
interface Evidence { id: string; title: string; control: string; type: string; uploadedAt: string; }
export default function EvidenceHub() {
  const [search, setSearch] = useState("");
  const evidence = useMemo<Evidence[]>(() => [{id:"1",title:"Privacy Impact Assessment",control:"Data Privacy",type:"PDF",uploadedAt:"2024-01-15"},{id:"2",title:"Bias Test Report",control:"Bias Testing",type:"PDF",uploadedAt:"2024-01-14"},{id:"3",title:"Model Card",control:"Documentation",type:"MD",uploadedAt:"2024-01-13"}],[]);
  const filtered = evidence.filter(e=>e.title.toLowerCase().includes(search.toLowerCase()));
  return (<div className="p-6"><h1 className="text-2xl font-bold mb-1">Evidence Hub</h1><p className="text-sm text-muted-foreground mb-4">Manage compliance evidence</p><div className="flex gap-2 mb-4"><input placeholder="Search evidence..." className="border rounded px-3 py-2 flex-1" value={search} onChange={e=>setSearch(e.target.value)}/><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded">Upload Evidence</button></div>{filtered.length===0?(<div className="text-center py-12 text-muted-foreground">No evidence found.</div>):(<table className="w-full border-collapse"><thead><tr className="border-b"><th className="text-left p-2">Title</th><th className="text-left p-2">Control</th><th className="text-left p-2">Type</th><th className="text-left p-2">Uploaded</th></tr></thead><tbody>{filtered.map(e=>(<tr key={e.id} className="border-b hover:bg-[hsl(var(--muted))]"><td className="p-2">{e.title}</td><td className="p-2">{e.control}</td><td className="p-2">{e.type}</td><td className="p-2">{e.uploadedAt}</td></tr>))}</tbody></table>)}</div>);
}
'''.lstrip())

# EvidenceUploadDrawer
w('pages/compliance/EvidenceUploadDrawer.tsx', r'''
import { useState } from "react";
interface Props { open: boolean; onClose: () => void; }
export default function EvidenceUploadDrawer({ open, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [control, setControl] = useState("");
  const [file, setFile] = useState<File|null>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"success"|"error">("idle");
  if (!open) return null;
  const handleUpload = async () => { if(!title||!file) return; setStatus("loading"); try { await new Promise(r=>setTimeout(r,1500)); setStatus("success"); } catch { setStatus("error"); } };
  return (<div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}><div className="bg-[hsl(var(--background))] w-[500px] h-full shadow-xl p-6 overflow-auto" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Escape")onClose()}} tabIndex={-1}><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Upload Evidence</h2><button onClick={onClose}>X</button></div><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Title</label><input className="w-full border rounded px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)}/></div><div><label className="block text-sm font-medium mb-1">Control</label><select className="w-full border rounded px-3 py-2" value={control} onChange={e=>setControl(e.target.value)}><option value="">Select control</option><option value="privacy">Data Privacy</option><option value="bias">Bias Testing</option></select></div><div><label className="block text-sm font-medium mb-1">File</label><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/></div>{status==="success"&&<div className="text-green-600 text-sm">Uploaded!</div>}{status==="error"&&<div className="text-red-600 text-sm">Upload failed.</div>}<button className="w-full px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded disabled:opacity-50" disabled={!title||!file||status==="loading"} onClick={handleUpload}>{status==="loading"?"Uploading...":"Upload"}</button></div></div></div>);
}
'''.lstrip())

# GapAnalysisModal
w('pages/compliance/GapAnalysisModal.tsx', r'''
import { useMemo } from "react";
interface Props { open: boolean; onClose: () => void; }
interface Gap { control: string; required: string; current: string; gap: "high"|"medium"|"low"; }
export default function GapAnalysisModal({ open, onClose }: Props) {
  const gaps = useMemo<Gap[]>(() => [{control:"Data Privacy",required:"Full PIA",current:"Partial PIA",gap:"medium"},{control:"Model Documentation",required:"Model Card v2",current:"None",gap:"high"},{control:"Bias Testing",required:"Monthly",current:"Quarterly",gap:"low"}],[]);
  if (!open) return null;
  const gColors: Record<string,string> = {high:"bg-red-100 text-red-800",medium:"bg-yellow-100 text-yellow-800",low:"bg-green-100 text-green-800"};
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}><div className="bg-[hsl(var(--background))] rounded-lg p-6 w-[600px] max-h-[80vh] overflow-auto shadow-xl" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==="Escape")onClose()}} tabIndex={-1}><h2 className="text-xl font-bold mb-4">Gap Analysis</h2><table className="w-full border-collapse"><thead><tr className="border-b"><th className="text-left p-2">Control</th><th className="text-left p-2">Required</th><th className="text-left p-2">Current</th><th className="text-left p-2">Gap</th></tr></thead><tbody>{gaps.map((g,i)=>(<tr key={i} className="border-b"><td className="p-2">{g.control}</td><td className="p-2">{g.required}</td><td className="p-2">{g.current}</td><td className="p-2"><span className={"px-2 py-1 rounded text-xs " + gColors[g.gap]}>{g.gap}</span></td></tr>))}</tbody></table><div className="flex justify-end mt-4"><button className="px-4 py-2 border rounded" onClick={onClose}>Close</button></div></div></div>);
}
'''.lstrip())

# Compliance page (index)
w('pages/compliance/index.tsx', r'''
import { useState } from "react";
import ComplianceControls from "./ComplianceControls";
import EvidenceHub from "./EvidenceHub";
import GapAnalysisModal from "./GapAnalysisModal";
export default function Compliance() {
  const [tab, setTab] = useState<"controls"|"evidence">("controls");
  const [gapOpen, setGapOpen] = useState(false);
  return (<div className="p-6"><div className="flex justify-between items-center mb-4"><h1 className="text-2xl font-bold">Compliance Suite</h1><button className="px-4 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded" onClick={()=>setGapOpen(true)}>Gap Analysis</button></div><div className="flex gap-2 mb-4">{(["controls","evidence"] as const).map(t=>(<button key={t} className={"px-3 py-1 rounded " + (t===tab?"bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]":"border")} onClick={()=>setTab(t)}>{t}</button>))}</div>{tab==="controls"&&<ComplianceControls/>}{tab==="evidence"&&<EvidenceHub/>}<GapAnalysisModal open={gapOpen} onClose={()=>setGapOpen(false)}/></div>);
}
'''.lstrip())