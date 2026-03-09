import {useState} from "react";
import {BarChart3,TrendingUp,TrendingDown,Minus,Clock,Zap,Target,Award,ChevronDown,Filter,Download,RefreshCw} from "lucide-react";
import {Card,CardContent,CardHeader,CardTitle} from "@/components/ui/card";

type ModelBenchmark = {
  id:string; model:string; provider:string; version:string;
  scores:{accuracy:number;fairness:number;robustness:number;safety:number;latency:number;cost:number};
  trend:"up"|"down"|"stable"; lastRun:string; status:"passing"|"warning"|"failing";
};

const benchmarks:ModelBenchmark[] = [
  {id:"1",model:"GPT-4o",provider:"OpenAI",version:"2024-05",scores:{accuracy:94.2,fairness:91.5,robustness:88.3,safety:96.1,latency:1.2,cost:0.03},trend:"up",lastRun:"2 hours ago",status:"passing"},
  {id:"2",model:"Claude 3.5 Sonnet",provider:"Anthropic",version:"2024-06",scores:{accuracy:93.8,fairness:94.2,robustness:90.1,safety:97.3,latency:0.9,cost:0.02},trend:"up",lastRun:"1 hour ago",status:"passing"},
  {id:"3",model:"Gemini 1.5 Pro",provider:"Google",version:"2024-05",scores:{accuracy:91.5,fairness:89.8,robustness:85.7,safety:93.4,latency:1.5,cost:0.025},trend:"stable",lastRun:"4 hours ago",status:"warning"},
  {id:"4",model:"Llama 3.1 70B",provider:"Meta",version:"2024-07",scores:{accuracy:88.9,fairness:86.3,robustness:82.1,safety:89.7,latency:2.1,cost:0.008},trend:"down",lastRun:"6 hours ago",status:"warning"},
  {id:"5",model:"Mistral Large",provider:"Mistral",version:"2024-04",scores:{accuracy:87.2,fairness:84.1,robustness:79.5,safety:88.2,latency:1.8,cost:0.012},trend:"down",lastRun:"12 hours ago",status:"failing"},
  {id:"6",model:"Command R+",provider:"Cohere",version:"2024-03",scores:{accuracy:85.6,fairness:88.9,robustness:81.3,safety:90.5,latency:1.4,cost:0.015},trend:"stable",lastRun:"8 hours ago",status:"passing"},
];

const ScoreBar = ({score,label}:{score:number;label:string}) => {
  const color = score >= 90 ? "bg-emerald-500" : score >= 80 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{width:`${score}%`}}/>
      </div>
      <span className="w-10 text-right font-mono text-slate-700 dark:text-slate-300">{score}%</span>
    </div>
  );
};

export default function Benchmark(){
  const [selectedMetric,setSelectedMetric] = useState<string>("accuracy");
  const [sortBy,setSortBy] = useState<string>("accuracy");
  const metrics = ["accuracy","fairness","robustness","safety"] as const;
  const sorted = [...benchmarks].sort((a,b) => (b.scores as any)[sortBy] - (a.scores as any)[sortBy]);
  const avg = (key:keyof ModelBenchmark["scores"]) => +(benchmarks.reduce((s,b)=>s+b.scores[key],0)/benchmarks.length).toFixed(1);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 size={24} className="text-blue-600"/>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Model Benchmarks</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Compare AI model performance across safety, fairness & compliance metrics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
            <RefreshCw size={14}/> Re-run All
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">
            <Download size={14}/> Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {(["accuracy","fairness","robustness","safety"] as const).map(m => (
          <Card key={m} className="cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition" onClick={()=>setSelectedMetric(m)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{m}</span>
                <Target size={14} className="text-blue-500"/>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{avg(m)}%</div>
              <div className="text-xs text-slate-500 mt-1">Avg across {benchmarks.length} models</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={14} className="text-slate-400"/>
        <span className="text-sm text-slate-500">Sort by:</span>
        {metrics.map(m => (
          <button key={m} onClick={()=>setSortBy(m)} className={`px-3 py-1 text-xs rounded-full capitalize transition ${
            sortBy === m ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
          }`}>{m}</button>
        ))}
      </div>

      {/* Benchmark Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Scores</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Latency</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Cost/1K</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Trend</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b,i) => (
                <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{b.model}</div>
                    <div className="text-xs text-slate-500">{b.provider} &middot; {b.version}</div>
                  </td>
                  <td className="px-4 py-3 w-80">
                    <div className="space-y-1">
                      <ScoreBar score={b.scores.accuracy} label="Accuracy"/>
                      <ScoreBar score={b.scores.fairness} label="Fairness"/>
                      <ScoreBar score={b.scores.robustness} label="Robust"/>
                      <ScoreBar score={b.scores.safety} label="Safety"/>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={12} className="text-slate-400"/>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{b.scores.latency}s</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-700 dark:text-slate-300">${b.scores.cost}</td>
                  <td className="px-4 py-3 text-center">
                    {b.trend==="up" ? <TrendingUp size={16} className="mx-auto text-emerald-500"/> : b.trend==="down" ? <TrendingDown size={16} className="mx-auto text-red-500"/> : <Minus size={16} className="mx-auto text-slate-400"/>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      b.status==="passing" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      b.status==="warning" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                      "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{b.lastRun}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
