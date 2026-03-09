import {useState} from "react";
import {Database,Search,Plus,Upload,Download,Eye,Trash2,FileText,Tag,Calendar,HardDrive} from "lucide-react";
import {Card,CardContent} from "@/components/ui/card";

type Dataset = {
  id:string; name:string; description:string; type:"evaluation"|"training"|"validation"|"test";
  records:number; size:string; tags:string[]; created:string; lastUsed:string; status:"active"|"archived"|"processing";
};

const datasets:Dataset[] = [
  {id:"1",name:"TruthfulQA-Extended",description:"Extended truthfulness evaluation with 2,500 adversarial prompts",type:"evaluation",records:2500,size:"4.2 MB",tags:["truthfulness","safety"],created:"2024-06-15",lastUsed:"2 hours ago",status:"active"},
  {id:"2",name:"Bias-Detection-v3",description:"Gender, race, and age bias detection across 15 categories",type:"evaluation",records:8200,size:"12.1 MB",tags:["bias","fairness","demographic"],created:"2024-06-10",lastUsed:"1 day ago",status:"active"},
  {id:"3",name:"EU-AI-Act-Compliance",description:"Regulatory compliance test cases for EU AI Act requirements",type:"test",records:1850,size:"3.8 MB",tags:["compliance","eu-ai-act","regulatory"],created:"2024-05-28",lastUsed:"5 hours ago",status:"active"},
  {id:"4",name:"Toxicity-Benchmark",description:"Multi-language toxicity and harmful content detection",type:"evaluation",records:15000,size:"28.5 MB",tags:["toxicity","safety","multilingual"],created:"2024-05-20",lastUsed:"3 days ago",status:"active"},
  {id:"5",name:"PII-Leakage-Tests",description:"Personal information leakage detection scenarios",type:"test",records:3200,size:"6.7 MB",tags:["privacy","pii","security"],created:"2024-06-01",lastUsed:"12 hours ago",status:"active"},
  {id:"6",name:"Legacy-Safety-v1",description:"Deprecated safety evaluation dataset",type:"evaluation",records:900,size:"1.2 MB",tags:["safety","legacy"],created:"2024-01-15",lastUsed:"30 days ago",status:"archived"},
];

export default function Datasets(){
  const [search,setSearch] = useState("");
  const [filterType,setFilterType] = useState<string>("all");
  const filtered = datasets.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.tags.some(t=>t.includes(search.toLowerCase()));
    const matchType = filterType==="all" || d.type===filterType;
    return matchSearch && matchType;
  });
  const types = ["all","evaluation","training","validation","test"];

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-blue-600"/>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dataset Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Manage evaluation and test datasets for AI model benchmarking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"><Upload size={14}/> Import</button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Plus size={14}/> New Dataset</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {label:"Total Datasets",value:datasets.length,icon:Database},
          {label:"Total Records",value:datasets.reduce((s,d)=>s+d.records,0).toLocaleString(),icon:FileText},
          {label:"Storage Used",value:"56.5 MB",icon:HardDrive},
          {label:"Active",value:datasets.filter(d=>d.status==="active").length,icon:Tag},
        ].map((s,i) => (
          <Card key={i}><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20"><s.icon size={18} className="text-blue-600"/></div>
            <div><div className="text-xs text-slate-500">{s.label}</div><div className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</div></div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search datasets or tags..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"/>
        </div>
        {types.map(t => (
          <button key={t} onClick={()=>setFilterType(t)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${filterType===t ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>{t}</button>
        ))}
      </div>

      {/* Dataset List */}
      <div className="space-y-3">
        {filtered.map(d => (
          <Card key={d.id} className="hover:ring-1 hover:ring-blue-500/30 transition">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{d.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${d.type==="evaluation"?"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400":d.type==="test"?"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400":"bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>{d.type}</span>
                    {d.status==="archived" && <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700">archived</span>}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{d.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><FileText size={12}/> {d.records.toLocaleString()} records</span>
                    <span className="flex items-center gap-1"><HardDrive size={12}/> {d.size}</span>
                    <span className="flex items-center gap-1"><Calendar size={12}/> {d.created}</span>
                    <span>Last used: {d.lastUsed}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2">{d.tags.map(t => <span key={t} className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">{t}</span>)}</div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"><Eye size={16}/></button>
                  <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"><Download size={16}/></button>
                  <button className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
