
import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Shield, CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const frameworkScores = [
  { name: "SOC 2", score: 87, controls: 62, passing: 54, failing: 8 },
  { name: "ISO 27001", score: 74, controls: 93, passing: 69, failing: 24 },
  { name: "GDPR", score: 91, controls: 45, passing: 41, failing: 4 },
  { name: "AI Act", score: 68, controls: 38, passing: 26, failing: 12 },
  { name: "NIST AI RMF", score: 72, controls: 55, passing: 40, failing: 15 },
  { name: "HIPAA", score: 95, controls: 44, passing: 42, failing: 2 },
];

const overallPie = [
  { name: "Passing", value: 272, color: "#16a34a" },
  { name: "Failing", value: 65, color: "#ef4444" },
];

const monthlyTrend = [
  { month: "Aug", score: 71 }, { month: "Sep", score: 74 }, { month: "Oct", score: 76 },
  { month: "Nov", score: 79 }, { month: "Dec", score: 81 }, { month: "Jan", score: 83 },
];

export default function ComplianceDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Compliance Dashboard</h1><p className="text-sm text-gray-400">Cross-framework compliance posture overview</p></div>
        <Button className="bg-green-600 hover:bg-green-700 text-white"><TrendingUp className="w-4 h-4 mr-2" />Generate Report</Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[{label:"Overall Score",value:"83%",color:"text-green-400",icon:Shield},{label:"Total Controls",value:"337",color:"text-white",icon:CheckCircle},{label:"Passing",value:"272",color:"text-green-400",icon:CheckCircle},{label:"Failing",value:"65",color:"text-red-400",icon:XCircle}].map(s=>(
          <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-4 flex items-center gap-3"><s.icon className={`w-8 h-8 ${s.color}`} /><div><p className="text-xs text-gray-400">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></div></CardContent></Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4"><h3 className="text-white font-medium mb-4">Compliance Score by Framework</h3><ResponsiveContainer width="100%" height={300}><BarChart data={frameworkScores}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="name" tick={{fill:"#9ca3af",fontSize:12}} /><YAxis tick={{fill:"#9ca3af",fontSize:12}} domain={[0,100]} /><Tooltip contentStyle={{backgroundColor:"#1f2937",border:"1px solid #374151",color:"#fff"}} /><Bar dataKey="score" fill="#16a34a" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4"><h3 className="text-white font-medium mb-4">Control Status Distribution</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={overallPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name,value})=>`${name}: ${value}`}>{overallPie.map((e,i)=><Cell key={i} fill={e.color} />)}</Pie><Tooltip contentStyle={{backgroundColor:"#1f2937",border:"1px solid #374151",color:"#fff"}} /></PieChart></ResponsiveContainer></CardContent></Card>
      </div>
      <Card className="bg-gray-900 border-gray-800"><CardContent className="p-4">
        <h3 className="text-white font-medium mb-4">Framework Breakdown</h3>
        <div className="space-y-3">{frameworkScores.map(f=>(
          <div key={f.name} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="w-24 text-sm font-medium text-white">{f.name}</div>
            <div className="flex-1 bg-gray-700 rounded-full h-3"><div className="h-3 rounded-full" style={{width:`${f.score}%`,backgroundColor:f.score>=80?"#16a34a":f.score>=70?"#eab308":"#ef4444"}} /></div>
            <div className="w-12 text-right text-sm font-bold" style={{color:f.score>=80?"#16a34a":f.score>=70?"#eab308":"#ef4444"}}>{f.score}%</div>
            <div className="text-xs text-gray-400 w-32">{f.passing}/{f.controls} controls</div>
          </div>
        ))}</div>
      </CardContent></Card>
    </div>
  );
}
