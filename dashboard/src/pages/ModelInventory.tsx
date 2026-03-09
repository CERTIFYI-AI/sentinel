import {useState} from "react";
import {Package,Search,Plus,Shield,AlertTriangle,CheckCircle2,Clock,Eye,Settings,ExternalLink} from "lucide-react";
import {Card,CardContent} from "@/components/ui/card";

type Model = {
  id:string; name:string; provider:string; version:string; type:"LLM"|"Embedding"|"Vision"|"Speech";
  riskLevel:"high"|"medium"|"low"; status:"active"|"deprecated"|"testing";
  compliance:number; lastAudit:string; apiCalls:number; owner:string;
};

const models:Model[] = [
  {id:"1",name:"GPT-4o",provider:"OpenAI",version:"2024-05-13",type:"LLM",riskLevel:"high",status:"active",compliance:94,lastAudit:"2 days ago",apiCalls:125400,owner:"ML Team"},
  {id:"2",name:"Claude 3.5 Sonnet",provider:"Anthropic",version:"2024-06-20",type:"LLM",riskLevel:"medium",status:"active",compliance:97,lastAudit:"1 day ago",apiCalls:89200,owner:"ML Team"},
  {id:"3",name:"text-embedding-3-large",provider:"OpenAI",version:"2024-01",type:"Embedding",riskLevel:"low",status:"active",compliance:99,lastAudit:"5 days ago",apiCalls:450000,owner:"Search Team"},
  {id:"4",name:"Gemini 1.5 Pro",provider:"Google",version:"2024-05",type:"LLM",riskLevel:"high",status:"testing",compliance:88,lastAudit:"1 week ago",apiCalls:12300,owner:"Research"},
  {id:"5",name:"Whisper Large v3",provider:"OpenAI",version:"2023-11",type:"Speech",riskLevel:"low",status:"active",compliance:95,lastAudit:"3 days ago",apiCalls:28500,owner:"Voice Team"},
  {id:"6",name:"GPT-3.5 Turbo",provider:"OpenAI",version:"2023-06",type:"LLM",riskLevel:"medium",status:"deprecated",compliance:82,lastAudit:"2 weeks ago",apiCalls:5600,owner:"Legacy"},
];

export default function ModelInventory(){
  const [search,setSearch] = useState("");
  const [filterRisk,setFilterRisk] = useState("all");
  const filtered = models.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.provider.toLowerCase().includes(search.toLowerCase());
    const matchRisk = filterRisk==="all" || m.riskLevel===filterRisk;
    return matchSearch && matchRisk;
  });

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-blue-600"/>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Model Inventory</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">AI model registry with risk classification and compliance tracking</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Plus size={14}/> Register Model</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {label:"Total Models",value:models.length,color:"text-blue-600"},
          {label:"High Risk",value:models.filter(m=>m.riskLevel==="high").length,color:"text-red-600"},
          {label:"Active",value:models.filter(m=>m.status==="active").length,color:"text-emerald-600"},
          {label:"Avg Compliance",value:Math.round(models.reduce((s,m)=>s+m.compliance,0)/models.length)+"%",color:"text-purple-600"},
        ].map((s,i) => (
          <Card key={i}><CardContent className="p-4">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search models..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"/>
        </div>
        {["all","high","medium","low"].map(r => (
          <button key={r} onClick={()=>setFilterRisk(r)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${filterRisk===r?"bg-blue-600 text-white":"bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>{r} risk</button>
        ))}
      </div>

      {/* Model Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700">
              {["Model","Type","Risk","Compliance","Status","API Calls","Last Audit",""].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(m => (
              <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                  <div className="text-xs text-slate-500">{m.provider} &middot; {m.version} &middot; {m.owner}</div>
                </td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{m.type}</span></td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 text-xs font-medium ${m.riskLevel==="high"?"text-red-600":m.riskLevel==="medium"?"text-amber-600":"text-emerald-600"}`}>
                    {m.riskLevel==="high"?<AlertTriangle size={12}/>:<Shield size={12}/>} {m.riskLevel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.compliance>=90?"bg-emerald-500":m.compliance>=80?"bg-amber-500":"bg-red-500"}`} style={{width:`${m.compliance}%`}}/>
                    </div>
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{m.compliance}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${m.status==="active"?"bg-emerald-500/10 text-emerald-600":m.status==="testing"?"bg-blue-500/10 text-blue-600":"bg-slate-200 text-slate-500"}`}>{m.status}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{m.apiCalls.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{m.lastAudit}</td>
                <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Eye size={14} className="text-slate-400"/></button></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
