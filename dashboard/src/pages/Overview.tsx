
import { Card, CardContent } from "../components/ui/card";
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Activity, Users, FileText, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const riskTrend = [{month:"Aug",risks:18},{month:"Sep",risks:16},{month:"Oct",risks:15},{month:"Nov",risks:14},{month:"Dec",risks:13},{month:"Jan",risks:12}];
const frameworkData = [{name:"SOC 2",score:87},{name:"ISO 27001",score:74},{name:"GDPR",score:91},{name:"AI Act",score:68},{name:"NIST",score:72}];
const incidentPie = [{name:"Open",value:3,color:"#ef4444"},{name:"Investigating",value:2,color:"#eab308"},{name:"Resolved",value:5,color:"#16a34a"}];

export default function Overview() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">GRC Executive Dashboard</h1>
        <p className="text-sm text-gray-400">AI Governance, Risk & Compliance overview</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Open Tasks",value:8,color:"text-yellow-400",icon:Activity,sub:"2 overdue"},{label:"Open Risks",value:12,color:"text-red-400",icon:AlertTriangle,sub:"3 critical"},{label:"Compliance Score",value:"83%",color:"text-green-400",icon:Shield,sub:"+2% this month"},{label:"Active Models",value:7,color:"text-blue-400",icon:Zap,sub:"2 under review"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4">
            <div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-400">{s.label}</p><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{label:"Vendors",value:8,color:"text-purple-400",icon:Users,sub:"1 under-review"},{label:"Open Incidents",value:5,color:"text-red-400",icon:AlertTriangle,sub:"2 critical"},{label:"Evidence Items",value:24,color:"text-green-400",icon:FileText,sub:"3 expiring"}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4">
            <div className="flex items-center gap-3"><s.icon className={`w-8 h-8 ${s.color}`} /><div><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-gray-500">{s.sub}</p></div></div>
          </CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
          <h3 className="text-white font-medium mb-4">Risk Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={220}><LineChart data={riskTrend}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="month" tick={{fill:"#9ca3af",fontSize:12}} /><YAxis tick={{fill:"#9ca3af",fontSize:12}} /><Tooltip contentStyle={{backgroundColor:"#1f2937",border:"1px solid #374151",color:"#fff"}} /><Line type="monotone" dataKey="risks" stroke="#ef4444" strokeWidth={2} dot={{fill:"#ef4444"}} /></LineChart></ResponsiveContainer>
        </CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
          <h3 className="text-white font-medium mb-4">Compliance by Framework</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={frameworkData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="name" tick={{fill:"#9ca3af",fontSize:11}} /><YAxis tick={{fill:"#9ca3af",fontSize:12}} domain={[0,100]} /><Tooltip contentStyle={{backgroundColor:"#1f2937",border:"1px solid #374151",color:"#fff"}} /><Bar dataKey="score" fill="#16a34a" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
        </CardContent></Card>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
          <h3 className="text-white font-medium mb-3">Incident Status</h3>
          <ResponsiveContainer width="100%" height={160}><PieChart><Pie data={incidentPie} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>{incidentPie.map((e,i)=><Cell key={i} fill={e.color} />)}</Pie></PieChart></ResponsiveContainer>
        </CardContent></Card>
        <Card className="bg-gray-900 border-gray-800 col-span-2"><CardContent className="p-4">
          <h3 className="text-white font-medium mb-3">Recent Activity</h3>
          <div className="space-y-2">{[
            {text:"Model GPT-4 deployed to production",time:"2h ago",color:"text-blue-400"},
            {text:"Risk RISK-042 accepted by Dave",time:"4h ago",color:"text-yellow-400"},
            {text:"Incident INC-004 opened: Bias detected",time:"5h ago",color:"text-red-400"},
            {text:"Evidence EVD-008 uploaded",time:"8h ago",color:"text-green-400"},
            {text:"Vendor HuggingFace flagged for review",time:"1d ago",color:"text-orange-400"},
          ].map((a,i)=>(
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800">
              <span className={`text-sm ${a.color}`}>{a.text}</span>
              <span className="text-xs text-gray-500">{a.time}</span>
            </div>
          ))}</div>
        </CardContent></Card>
      </div>
    </div>
  );
}
