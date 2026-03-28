
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../components/ui/table";
import { Users, Shield, Activity, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const roleData = [{name:"Admin",value:2,color:"#ef4444"},{name:"CISO",value:1,color:"#f59e0b"},{name:"Compliance Officer",value:4,color:"#16a34a"},{name:"Auditor",value:3,color:"#3b82f6"},{name:"Developer",value:8,color:"#8b5cf6"},{name:"Viewer",value:6,color:"#6b7280"}];
const accessLog = [
  { user: "Bhaskar Admin", resource: "Risk Register", time: "2 min ago", ip: "192.168.1.45", result: "success" },
  { user: "Sarah Chen", resource: "Trust Engine Config", time: "5 min ago", ip: "10.0.0.23", result: "success" },
  { user: "Unknown User", resource: "Admin Settings", time: "12 min ago", ip: "203.45.67.89", result: "denied" },
  { user: "John Park", resource: "Model Inventory", time: "15 min ago", ip: "192.168.1.67", result: "success" },
  { user: "Emily Davis", resource: "Compliance Reports", time: "20 min ago", ip: "10.0.0.45", result: "success" },
  { user: "Tom Lee", resource: "Security Scans", time: "25 min ago", ip: "192.168.1.89", result: "success" },
  { user: "Unknown IP", resource: "User Management", time: "30 min ago", ip: "45.67.89.12", result: "denied" },
  { user: "Lisa Wang", resource: "Vendor Registry", time: "35 min ago", ip: "10.0.0.78", result: "success" },
  { user: "Mike Johnson", resource: "Incident Logs", time: "42 min ago", ip: "192.168.1.34", result: "success" },
  { user: "Bot Detection", resource: "API Endpoint", time: "45 min ago", ip: "178.23.45.67", result: "denied" },
];

export default function RBACDashboard() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Access Control Overview</h1><p className="text-muted-foreground">RBAC dashboard and access monitoring</p></div>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /><div><div className="text-sm text-muted-foreground">Total Users</div><div className="text-2xl font-bold">24</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-400" /><div><div className="text-sm text-muted-foreground">Roles</div><div className="text-2xl font-bold">6</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><Activity className="w-5 h-5 text-yellow-400" /><div><div className="text-sm text-muted-foreground">Active Sessions</div><div className="text-2xl font-bold">8</div></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" /><div><div className="text-sm text-muted-foreground">Failed Logins</div><div className="text-2xl font-bold text-red-400">3</div></div></div></CardContent></Card>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Users by Role</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
            {roleData.map((e,i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Recent Access Log</CardTitle></CardHeader><CardContent className="max-h-[300px] overflow-auto">
          <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Resource</TableHead><TableHead>Time</TableHead><TableHead>IP</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
            <TableBody>{accessLog.map((l,i) => (<TableRow key={i}><TableCell className="font-medium">{l.user}</TableCell><TableCell>{l.resource}</TableCell><TableCell className="text-muted-foreground">{l.time}</TableCell><TableCell className="font-mono text-xs">{l.ip}</TableCell>
              <TableCell><span className={l.result==="success"?"text-green-400":"text-red-400"}>{l.result}</span></TableCell></TableRow>))}</TableBody></Table>
        </CardContent></Card>
      </div>
    </div>);
}
