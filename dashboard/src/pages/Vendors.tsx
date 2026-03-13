import {useState} from "react";
import {Globe,Shield,CheckCircle2,AlertTriangle,ExternalLink,Star,Search,Plus} from "lucide-react";
import {Card,CardContent} from "@/components/ui/card";

type Vendor = {
  id:string; name:string; category:string; riskTier:"critical"|"high"|"medium"|"low";
  complianceScore:number; certifications:string[]; lastAssessment:string;
  status:"approved"|"under-review"|"restricted"; contactEmail:string; models:number;
};

const vendors:Vendor[] = [
  {id:"1",name:"OpenAI",category:"LLM Provider",riskTier:"critical",complianceScore:92,certifications:["SOC 2 Type II","ISO 27001"],lastAssessment:"2024-06-10",status:"approved",contactEmail:"enterprise@openai.com",models:4},
  {id:"2",name:"Anthropic",category:"LLM Provider",riskTier:"critical",complianceScore:96,certifications:["SOC 2 Type II","ISO 27001","GDPR"],lastAssessment:"2024-06-12",status:"approved",contactEmail:"sales@anthropic.com",models:2},
  {id:"3",name:"Google Cloud AI",category:"Cloud AI Platform",riskTier:"high",complianceScore:94,certifications:["SOC 2","ISO 27001","FedRAMP","HIPAA"],lastAssessment:"2024-06-08",status:"approved",contactEmail:"cloud@google.com",models:3},
  {id:"4",name:"Meta AI",category:"Open Source Models",riskTier:"medium",complianceScore:78,certifications:["SOC 2 Type II"],lastAssessment:"2024-05-20",status:"under-review",contactEmail:"ai-partnerships@meta.com",models:2},
  {id:"5",name:"Mistral AI",category:"LLM Provider",riskTier:"medium",complianceScore:82,certifications:["GDPR"],lastAssessment:"2024-05-15",status:"under-review",contactEmail:"enterprise@mistral.ai",models:1},
  {id:"6",name:"Cohere",category:"NLP Platform",riskTier:"low",complianceScore:88,certifications:["SOC 2","GDPR"],lastAssessment:"2024-06-01",status:"approved",contactEmail:"sales@cohere.com",models:1},
];

const tierColors:Record<string,string> = {critical:"text-red-600 bg-red-500/10",high:"text-amber-600 bg-amber-500/10",medium:"text-blue-600 bg-blue-500/10",low:"text-emerald-600 bg-emerald-500/10"};

export default function Vendors(){
  const [search,setSearch] = useState("");
  const filtered = vendors.filter(v=>v.name.toLowerCase().includes(search.toLowerCase())||v.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe size={24} className="text-blue-600"/>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vendor Register</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Third-party AI vendor compliance and risk management</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Plus size={14}/> Add Vendor</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {l:"Total Vendors",v:vendors.length,c:"text-blue-600"},
          {l:"Critical Tier",v:vendors.filter(v=>v.riskTier==="critical").length,c:"text-red-600"},
          {l:"Approved",v:vendors.filter(v=>v.status==="approved").length,c:"text-emerald-600"},
          {l:"Avg Compliance",v:Math.round(vendors.reduce((s,v)=>s+v.complianceScore,0)/vendors.length)+"%",c:"text-purple-600"},
        ].map((s,i)=>(
          <Card key={i}><CardContent className="p-4"><div className="text-xs text-slate-500 mb-1">{s.l}</div><div className={`text-2xl font-bold ${s.c}`}>{s.v}</div></CardContent></Card>
        ))}
      </div>

      <div className="relative max-w-sm mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"/>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm text-gray-900">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700">
              {["Vendor","Risk Tier","Compliance","Certifications","Status","Models","Last Assessment",""].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(v=>(
              <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-white">{v.name}</div>
                  <div className="text-xs text-slate-500">{v.category}</div>
                </td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${tierColors[v.riskTier]}`}>{v.riskTier}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${v.complianceScore>=90?"bg-emerald-500":v.complianceScore>=80?"bg-amber-500":"bg-red-500"}`} style={{width:`${v.complianceScore}%`}}/>
                    </div>
                    <span className="text-xs font-mono">{v.complianceScore}%</span>
                  </div>
                </td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{v.certifications.map(c=><span key={c} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{c}</span>)}</div></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${v.status==="approved"?"bg-emerald-500/10 text-emerald-600":v.status==="under-review"?"bg-amber-500/10 text-amber-600":"bg-red-500/10 text-red-600"}`}>{v.status}</span></td>
                <td className="px-4 py-3 font-mono text-center">{v.models}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{v.lastAssessment}</td>
                <td className="px-4 py-3"><button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><ExternalLink size={14} className="text-slate-400"/></button></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
