import { Wrench, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import {useState} from "react";
import {Wrench,CheckCircle2,Clock,AlertTriangle,User,Calendar,ArrowUpRight,Filter} from "lucide-react";
import {Card,CardContent} from "@/components/ui/card";

type RemediationItem = {
  id:string; title:string; description:string; framework:string; control:string;
  priority:"critical"|"high"|"medium"|"low"; status:"open"|"in-progress"|"resolved"|"deferred";
  assignee:string; dueDate:string; createdAt:string;
};

const items:RemediationItem[] = [
  {id:"1",title:"Implement bias testing pipeline",description:"Set up automated bias detection for all production LLMs per EU AI Act Art. 10",framework:"EU AI Act",control:"ART-10.2",priority:"critical",status:"in-progress",assignee:"Sarah Chen",dueDate:"2024-06-20",createdAt:"2024-06-01"},
  {id:"2",title:"Add human oversight controls",description:"Deploy HITL queue for high-risk decisions in automated hiring system",framework:"EU AI Act",control:"ART-14.1",priority:"high",status:"open",assignee:"Mike Ross",dueDate:"2024-06-25",createdAt:"2024-06-05"},
  {id:"3",title:"Update model documentation",description:"Complete technical documentation for all Annex IV requirements",framework:"EU AI Act",control:"ART-11.1",priority:"medium",status:"in-progress",assignee:"Lisa Park",dueDate:"2024-07-01",createdAt:"2024-05-20"},
  {id:"4",title:"PII data retention policy",description:"Implement 30-day data retention limit for training data with PII",framework:"NIST AI RMF",control:"MAP-1.5",priority:"high",status:"resolved",assignee:"Dev Team",dueDate:"2024-06-10",createdAt:"2024-05-15"},
  {id:"5",title:"Incident response playbook",description:"Create and test incident response procedures for AI system failures",framework:"ISO 42001",control:"A.8.4",priority:"medium",status:"open",assignee:"Ops Team",dueDate:"2024-07-15",createdAt:"2024-06-10"},
  {id:"6",title:"Vendor security assessment",description:"Complete security questionnaire for all third-party model providers",framework:"SOC 2",control:"CC9.2",priority:"low",status:"deferred",assignee:"Security",dueDate:"2024-08-01",createdAt:"2024-06-12"},
];

const priorityColors:Record<string,string> = {critical:"bg-red-500/10 text-red-600",high:"bg-amber-500/10 text-amber-600",medium:"bg-emerald-600/10 text-emerald-600",low:"bg-slate-200 text-slate-600"};
const statusColors:Record<string,string> = {open:"bg-slate-200 text-slate-600","in-progress":"bg-emerald-600/10 text-emerald-600",resolved:"bg-emerald-500/10 text-emerald-600",deferred:"bg-amber-500/10 text-amber-600"};

export default function Remediation(){
  const [filterStatus,setFilterStatus] = useState("all");
  const filtered = filterStatus==="all"?items:items.filter(i=>i.status===filterStatus);
  const stats = {open:items.filter(i=>i.status==="open").length,inProgress:items.filter(i=>i.status==="in-progress").length,resolved:items.filter(i=>i.status==="resolved").length,total:items.length};

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Wrench size={24} className="text-emerald-600"/>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">Remediation Tracker</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Track and manage compliance gaps and remediation actions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[{l:"Total",v:stats.total,c:"text-slate-900"},{l:"Open",v:stats.open,c:"text-amber-600"},{l:"In Progress",v:stats.inProgress,c:"text-emerald-600"},{l:"Resolved",v:stats.resolved,c:"text-emerald-600"}].map((s,i)=>(
          <Card key={i}><CardContent className="p-4"><div className="text-xs text-slate-500 mb-1">{s.l}</div><div className={`text-2xl font-bold ${s.c} dark:text-foreground`}>{s.v}</div></CardContent></Card>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Filter size={14} className="text-slate-400"/>
        {["all","open","in-progress","resolved","deferred"].map(s=>(
          <button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${filterStatus===s?"bg-emerald-600 text-foreground":"bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>{s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(item=>(
          <Card key={item.id} className="hover:ring-1 hover:ring-blue-500/30 transition">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-foreground text-sm">{item.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${priorityColors[item.priority]}`}>{item.priority}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[item.status]}`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{item.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{item.framework} / {item.control}</span>
                    <span className="flex items-center gap-1"><User size={10}/> {item.assignee}</span>
                    <span className="flex items-center gap-1"><Calendar size={10}/> Due: {item.dueDate}</span>
                  </div>
                </div>
                <button className="p-2 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowUpRight size={14} className="text-slate-400"/></button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
