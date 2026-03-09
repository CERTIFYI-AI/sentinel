import {useState} from "react";
import {Download,FileText,FileSpreadsheet,FileJson,Clock,CheckCircle2,Loader2,Plus,Calendar,Filter} from "lucide-react";
import {Card,CardContent} from "@/components/ui/card";

type ExportJob = {
  id:string; name:string; format:"PDF"|"CSV"|"JSON"|"XLSX"; scope:string;
  status:"completed"|"processing"|"queued"|"failed"; size:string; created:string; records:number;
};

const exports:ExportJob[] = [
  {id:"1",name:"Compliance Audit Report - Q2 2024",format:"PDF",scope:"All Frameworks",status:"completed",size:"2.4 MB",created:"2024-06-15 14:30",records:1250},
  {id:"2",name:"Model Risk Assessment Export",format:"XLSX",scope:"Risk Matrix",status:"completed",size:"856 KB",created:"2024-06-15 12:15",records:48},
  {id:"3",name:"Gap Analysis - EU AI Act",format:"PDF",scope:"EU AI Act",status:"processing",size:"--",created:"2024-06-15 15:00",records:320},
  {id:"4",name:"Benchmark Results - All Models",format:"CSV",scope:"Benchmarks",status:"completed",size:"1.1 MB",created:"2024-06-14 09:45",records:6400},
  {id:"5",name:"Audit Log - Last 30 Days",format:"JSON",scope:"Audit Log",status:"completed",size:"4.8 MB",created:"2024-06-13 16:20",records:12800},
  {id:"6",name:"Vendor Assessment Summary",format:"PDF",scope:"Vendors",status:"queued",size:"--",created:"2024-06-15 15:05",records:24},
  {id:"7",name:"Incident Report - Critical",format:"PDF",scope:"Incidents",status:"failed",size:"--",created:"2024-06-15 14:50",records:0},
];

const formatIcon = (f:string) => {
  switch(f){case "PDF":return <FileText size={16} className="text-red-500"/>;case "CSV":case "XLSX":return <FileSpreadsheet size={16} className="text-emerald-500"/>;default:return <FileJson size={16} className="text-blue-500"/>;}
};

export default function ExportCenter(){
  const [filterStatus,setFilterStatus] = useState("all");
  const filtered = filterStatus==="all" ? exports : exports.filter(e=>e.status===filterStatus);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Download size={24} className="text-blue-600"/>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Export Center</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Generate and download compliance reports, audit data, and assessments</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Plus size={14}/> New Export</button>
      </div>

      {/* Quick Export Templates */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {title:"Compliance Report",desc:"Full framework audit",format:"PDF",icon:FileText},
          {title:"Risk Assessment",desc:"Model risk matrix",format:"XLSX",icon:FileSpreadsheet},
          {title:"Benchmark Data",desc:"All model scores",format:"CSV",icon:FileSpreadsheet},
          {title:"Audit Trail",desc:"Activity logs",format:"JSON",icon:FileJson},
        ].map((t,i) => (
          <Card key={i} className="cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition group">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20"><t.icon size={20} className="text-slate-500 group-hover:text-blue-600"/></div>
                <div>
                  <div className="font-medium text-sm text-slate-900 dark:text-white">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.desc} &middot; {t.format}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={14} className="text-slate-400"/>
        {["all","completed","processing","queued","failed"].map(s => (
          <button key={s} onClick={()=>setFilterStatus(s)} className={`px-3 py-1.5 text-xs rounded-full capitalize ${filterStatus===s?"bg-blue-600 text-white":"bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>{s}</button>
        ))}
      </div>

      {/* Export History */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 dark:border-slate-700">
              {["Export","Format","Scope","Records","Size","Status","Created",""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(e => (
              <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{e.name}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-1.5">{formatIcon(e.format)}<span className="text-xs font-mono">{e.format}</span></div></td>
                <td className="px-4 py-3 text-slate-500">{e.scope}</td>
                <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{e.records.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-slate-500">{e.size}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${
                    e.status==="completed"?"bg-emerald-500/10 text-emerald-600":e.status==="processing"?"bg-blue-500/10 text-blue-600":e.status==="queued"?"bg-amber-500/10 text-amber-600":"bg-red-500/10 text-red-600"
                  }`}>
                    {e.status==="processing"?<Loader2 size={10} className="animate-spin"/>:e.status==="completed"?<CheckCircle2 size={10}/>:<Clock size={10}/>}
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{e.created}</td>
                <td className="px-4 py-3">{e.status==="completed" && <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"><Download size={14} className="text-slate-400 hover:text-blue-600"/></button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
