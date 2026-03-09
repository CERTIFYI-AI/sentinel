import {useState} from "react";
import {AlertTriangle,Shield,Info,Eye} from "lucide-react";
import {Card,CardContent} from "@/components/ui/card";

type Risk = {id:string;name:string;model:string;likelihood:1|2|3|4|5;impact:1|2|3|4|5;category:string;owner:string;mitigation:string;};

const risks:Risk[] = [
  {id:"1",name:"Toxic content generation",model:"GPT-4o",likelihood:3,impact:5,category:"Safety",owner:"ML Team",mitigation:"Content filter + HITL review"},
  {id:"2",name:"Gender bias in outputs",model:"Claude 3.5",likelihood:2,impact:4,category:"Fairness",owner:"Ethics Board",mitigation:"Bias testing pipeline"},
  {id:"3",name:"PII leakage in responses",model:"GPT-4o",likelihood:2,impact:5,category:"Privacy",owner:"Security",mitigation:"PII detection + redaction"},
  {id:"4",name:"Model hallucination",model:"Gemini 1.5",likelihood:4,impact:3,category:"Reliability",owner:"QA Team",mitigation:"RAG + fact checking"},
  {id:"5",name:"Regulatory non-compliance",model:"All Models",likelihood:2,impact:5,category:"Compliance",owner:"Legal",mitigation:"Continuous compliance scanning"},
  {id:"6",name:"Latency degradation",model:"Llama 3.1",likelihood:3,impact:2,category:"Performance",owner:"Infra",mitigation:"Auto-scaling + fallback models"},
  {id:"7",name:"Vendor lock-in",model:"OpenAI Suite",likelihood:3,impact:3,category:"Strategic",owner:"CTO",mitigation:"Multi-vendor strategy"},
  {id:"8",name:"Data poisoning attack",model:"Fine-tuned models",likelihood:1,impact:5,category:"Security",owner:"Security",mitigation:"Data validation pipeline"},
];

const riskScore = (r:Risk) => r.likelihood * r.impact;
const riskLevel = (score:number) => score>=15?"critical":score>=10?"high":score>=5?"medium":"low";
const riskColor = (level:string) => level==="critical"?"bg-red-500":level==="high"?"bg-amber-500":level==="medium"?"bg-yellow-400":"bg-emerald-500";
const riskTextColor = (level:string) => level==="critical"?"text-red-600":level==="high"?"text-amber-600":level==="medium"?"text-yellow-600":"text-emerald-600";

export default function RiskMatrix(){
  const [selected,setSelected] = useState<string|null>(null);
  const sorted = [...risks].sort((a,b)=>riskScore(b)-riskScore(a));

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle size={24} className="text-blue-600"/>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Risk Matrix</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">AI model risk assessment with likelihood x impact scoring</p>
        </div>
      </div>

      {/* 5x5 Matrix Grid */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-xs font-medium text-slate-500 mb-2 text-center">IMPACT &rarr;</div>
          <div className="flex">
            <div className="flex flex-col justify-around text-xs text-slate-500 pr-2 w-20">
              <span>5-Almost Certain</span><span>4-Likely</span><span>3-Possible</span><span>2-Unlikely</span><span>1-Rare</span>
            </div>
            <div className="flex-1 grid grid-cols-5 gap-1">
              {[5,4,3,2,1].map(likelihood => (
                [1,2,3,4,5].map(impact => {
                  const score = likelihood*impact;
                  const level = riskLevel(score);
                  const cellRisks = risks.filter(r=>r.likelihood===likelihood && r.impact===impact);
                  return (
                    <div key={`${likelihood}-${impact}`} className={`${riskColor(level)} ${level==="medium"?"text-slate-800":"text-white"} rounded p-2 text-center text-xs min-h-[48px] flex flex-col items-center justify-center opacity-80 hover:opacity-100 transition cursor-pointer`}>
                      <span className="font-bold">{score}</span>
                      {cellRisks.length>0 && <span className="text-[10px] mt-0.5">{cellRisks.length} risk{cellRisks.length>1?"s":""}</span>}
                    </div>
                  );
                })
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs">
            {[{l:"Critical (15-25)",c:"bg-red-500"},{l:"High (10-14)",c:"bg-amber-500"},{l:"Medium (5-9)",c:"bg-yellow-400"},{l:"Low (1-4)",c:"bg-emerald-500"}].map(x=>(
              <div key={x.l} className="flex items-center gap-1"><div className={`w-3 h-3 rounded ${x.c}`}/><span className="text-slate-500">{x.l}</span></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Register */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700">
              {["Risk","Model","Category","L","I","Score","Level","Owner",""].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>{sorted.map(r=>{
              const score = riskScore(r); const level = riskLevel(score);
              return (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer" onClick={()=>setSelected(selected===r.id?null:r.id)}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.model}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{r.category}</span></td>
                  <td className="px-4 py-3 font-mono text-center">{r.likelihood}</td>
                  <td className="px-4 py-3 font-mono text-center">{r.impact}</td>
                  <td className="px-4 py-3 font-mono font-bold text-center">{score}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${riskColor(level).replace("bg-","bg-").replace("500","500/10")} ${riskTextColor(level)}`}>{level}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.owner}</td>
                  <td className="px-4 py-3"><Eye size={14} className="text-slate-400"/></td>
                </tr>
              );
            })}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
