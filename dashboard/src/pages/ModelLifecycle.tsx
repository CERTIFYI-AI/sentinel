import { Robot, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import {useState} from "react";
import {GitBranch,CheckCircle2,Clock,AlertCircle,ArrowRight,Play,Pause,RotateCcw,Eye} from "lucide-react";
import {Card,CardContent} from "@/components/ui/card";

type LifecycleModel = {
  id:string; name:string; provider:string;
  stage:"development"|"testing"|"staging"|"production"|"deprecated";
  version:string; deployedAt:string; approvedBy:string; checks:{safety:boolean;bias:boolean;compliance:boolean;performance:boolean};
};

const lifecycleModels:LifecycleModel[] = [
  {id:"1",name:"GPT-4o",provider:"OpenAI",stage:"production",version:"v2.1.0",deployedAt:"2024-06-10",approvedBy:"Sarah Chen",checks:{safety:true,bias:true,compliance:true,performance:true}},
  {id:"2",name:"Claude 3.5 Sonnet",provider:"Anthropic",stage:"staging",version:"v1.3.0",deployedAt:"2024-06-14",approvedBy:"Pending",checks:{safety:true,bias:true,compliance:true,performance:false}},
  {id:"3",name:"Gemini 1.5 Pro",provider:"Google",stage:"testing",version:"v0.9.2",deployedAt:"2024-06-13",approvedBy:"Pending",checks:{safety:true,bias:false,compliance:false,performance:false}},
  {id:"4",name:"Llama 3.1 70B",provider:"Meta",stage:"development",version:"v0.2.0",deployedAt:"2024-06-15",approvedBy:"--",checks:{safety:false,bias:false,compliance:false,performance:false}},
  {id:"5",name:"GPT-3.5 Turbo",provider:"OpenAI",stage:"deprecated",version:"v4.0.0",deployedAt:"2023-06-01",approvedBy:"Auto",checks:{safety:true,bias:true,compliance:true,performance:true}},
];

const stages = ["development","testing","staging","production","deprecated"] as const;
const stageColors:Record<string,string> = {development:"bg-slate-500",testing:"bg-emerald-600",staging:"bg-amber-500",production:"bg-emerald-500",deprecated:"bg-red-500"};

export default function ModelLifecycle(){
  const [selected,setSelected] = useState<string|null>(null);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <GitBranch size={24} className="text-emerald-600"/>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">Model Lifecycle</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Track AI models through development, testing, staging, and production stages</p>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {stages.map((s,i) => (
              <div key={s} className="flex items-center">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full ${stageColors[s]} flex items-center justify-center text-foreground font-bold text-lg mx-auto mb-2`}>
                    {lifecycleModels.filter(m=>m.stage===s).length}
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">{s}</span>
                </div>
                {i < stages.length-1 && <ArrowRight size={20} className="text-slate-300 dark:text-slate-600 mx-4"/>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Cards */}
      <div className="space-y-3">
        {lifecycleModels.map(m => (
          <Card key={m.id} className={`transition cursor-pointer ${selected===m.id?"ring-2 ring-blue-500":"hover:ring-1 hover:ring-blue-500/30"}`} onClick={()=>setSelected(selected===m.id?null:m.id)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${stageColors[m.stage]}`}/>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-foreground">{m.name}</div>
                    <div className="text-xs text-slate-500">{m.provider} &middot; {m.version} &middot; Deployed: {m.deployedAt}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full capitalize font-medium ${stageColors[m.stage].replace("bg-","bg-").replace("500","500/10")} ${stageColors[m.stage].replace("bg-","text-").replace("500","600")}`}>{m.stage}</span>
                  <span className="text-xs text-slate-500">Approved: {m.approvedBy}</span>
                </div>
              </div>
              {selected===m.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-xs font-medium text-slate-500 mb-2 uppercase">Gate Checks</div>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(m.checks).map(([k,v]) => (
                      <div key={k} className={`flex items-center gap-2 px-3 py-2 rounded-none text-xs ${v?"bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400":"bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                        {v?<CheckCircle2 size={14}/>:<Clock size={14}/>}
                        <span className="capitalize">{k}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {m.stage!=="production" && m.stage!=="deprecated" && <button className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-none bg-emerald-600 text-foreground hover:bg-emerald-700"><Play size={12}/> Promote</button>}
                    <button className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-none border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"><Eye size={12}/> View Details</button>
                    {m.stage==="production" && <button className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-none border border-red-200 text-red-600 hover:bg-red-50"><RotateCcw size={12}/> Rollback</button>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
