import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Plus,Shield,Edit,Trash2}from"lucide-react";
const roles=[{id:"R-001",name:"CISO",users:2,permissions:["view_all","edit_all","delete_all","admin"],type:"system"},{id:"R-002",name:"Compliance Analyst",users:5,permissions:["view_compliance","edit_compliance","create_reports"],type:"system"},{id:"R-003",name:"Risk Manager",users:3,permissions:["view_risks","edit_risks","approve_controls"],type:"system"},{id:"R-004",name:"Auditor",users:4,permissions:["view_all","create_audits","export_data"],type:"system"},{id:"R-005",name:"Developer",users:6,permissions:["view_agents","edit_agents","deploy_agents"],type:"custom"},{id:"R-006",name:"Viewer",users:12,permissions:["view_dashboard","view_reports"],type:"system"}];
export default function RoleManager(){return(<div className="space-y-6">
  <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">Role Manager</h1><p className="text-muted-foreground">Define and manage RBAC roles and permission sets</p></div><Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2"/>Create Role</Button></div>
  <div className="grid grid-cols-3 gap-4">
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{roles.length}</div><div className="text-sm text-muted-foreground">Total Roles</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{roles.reduce((a,r)=>a+r.users,0)}</div><div className="text-sm text-muted-foreground">Total Users</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{new Set(roles.flatMap(r=>r.permissions)).size}</div><div className="text-sm text-muted-foreground">Unique Permissions</div></CardContent></Card>
  </div>
  <div className="grid grid-cols-2 gap-4">{roles.map(role=>(
    <Card key={role.id}><CardContent className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400"/><div><div className="text-sm font-medium">{role.name}</div><div className="text-xs text-muted-foreground">{role.users} users | {role.id}</div></div></div>
        <div className="flex items-center gap-2"><Badge className={role.type==="system"?"bg-blue-500/20 text-blue-400":"bg-purple-500/20 text-purple-400"}>{role.type}</Badge><Button size="sm" variant="outline" className="h-7"><Edit className="w-3 h-3"/></Button></div>
      </div>
      <div className="flex flex-wrap gap-1">{role.permissions.map(p=><span key={p} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{p}</span>)}</div>
    </CardContent></Card>
  ))}</div>
</div>);}
