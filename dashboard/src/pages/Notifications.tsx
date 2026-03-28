import { Bell, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import {useState} from "react";
import {Bell,Warning,Info,CheckCircle,XCircle,Shield,Clock,Check,Trash,Funnel} from "@phosphor-icons/react";
import {Card,CardContent} from "@/components/ui/card";

type Notification = {
  id:string; title:string; message:string; type:"critical"|"warning"|"info"|"success";
  source:string; time:string; read:boolean;
};

const initialNotifications:Notification[] = [
  {id:"1",title:"Critical: Safety threshold breached",message:"GPT-4o toxicity score exceeded 15% threshold on production traffic. Immediate review required.",type:"critical",source:"Safety Monitor",time:"5 min ago",read:false},
  {id:"2",title:"Bias alert: Gender disparity detected",message:"Bias detection found 12% gender disparity in hiring assistant model responses.",type:"warning",source:"Fairness Engine",time:"23 min ago",read:false},
  {id:"3",title:"EU AI Act compliance scan complete",message:"Quarterly compliance scan finished. 94% compliance achieved across all high-risk systems.",type:"success",source:"Compliance Scanner",time:"1 hour ago",read:false},
  {id:"4",title:"Model version update available",message:"Claude 3.5 Sonnet v2024-06-20 is available. Review changelog before upgrading.",type:"info",source:"Model Registry",time:"2 hours ago",read:true},
  {id:"5",title:"Benchmark run completed",message:"Weekly benchmark suite completed for 6 models. 2 models showed performance degradation.",type:"warning",source:"Benchmark Engine",time:"3 hours ago",read:true},
  {id:"6",title:"New vendor risk assessment",message:"OpenAI vendor assessment updated with latest SOC 2 Type II report.",type:"info",source:"Vendor Management",time:"5 hours ago",read:true},
  {id:"7",title:"Incident resolved: Latency spike",message:"Production latency spike on Gemini 1.5 Pro has been resolved. Root cause: rate limiting.",type:"success",source:"Incident Manager",time:"6 hours ago",read:true},
];

const typeIcon = (t:string) => {
  switch(t){case "critical":return <XCircle size={16} className="text-red-500"/>;case "warning":return <Warning size={16} className="text-amber-500"/>;case "success":return <CheckCircle size={16} className="text-emerald-500"/>;default:return <Info size={16} className="text-emerald-500"/>;}
};

export default function Notifications(){
  const [notifications,setNotifications] = useState(initialNotifications);
  const [filterType,setFunnelType] = useState("all");
  const markRead = (id:string) => setNotifications(n=>n.map(x=>x.id===id?{...x,read:true}:x));
  const markAllRead = () => setNotifications(n=>n.map(x=>({...x,read:true})));
  const filtered = filterType==="all"?notifications:filterType==="unread"?notifications.filter(n=>!n.read):notifications.filter(n=>n.type===filterType);
  const unreadCount = notifications.filter(n=>!n.read).length;

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative"><Bell size={24} className="text-emerald-600"/>{unreadCount>0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-foreground text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}</div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">Notifications</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{unreadCount} unread notifications</p>
          </div>
        </div>
        <button onClick={markAllRead} className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-none border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"><Check size={14}/> Mark all read</button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Funnel size={14} className="text-slate-400"/>
        {["all","unread","critical","warning","info","success"].map(t => (
          <button key={t} onClick={()=>setFunnelType(t)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${filterType===t?"bg-emerald-600 text-foreground":"bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>{t}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(n => (
          <Card key={n.id} className={`transition ${!n.read?"ring-1 ring-blue-500/30 bg-blue-50/50 dark:bg-blue-900/10":""}`} onClick={()=>markRead(n.id)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcon(n.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-medium ${!n.read?"text-slate-900 dark:text-foreground":"text-slate-600 dark:text-slate-400"}`}>{n.title}</h3>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-600"/>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span>{n.source}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1"><Clock size={10}/> {n.time}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
