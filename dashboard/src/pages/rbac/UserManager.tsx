import{useState}from"react";import{Card,CardContent}from"../../components/ui/card";import{Badge}from"../../components/ui/badge";import{Button}from"../../components/ui/button";import{Input}from"../../components/ui/input";import{Search,Plus,UserCheck,UserX,Edit}from"lucide-react";
const users=[{id:"U-001",name:"Bhaskar Acharya",email:"bhaskar@certifyi.com",role:"CISO",status:"active",lastLogin:"2026-03-15 09:00",mfa:true},{id:"U-002",name:"Alice Chen",email:"alice@certifyi.com",role:"Compliance Analyst",status:"active",lastLogin:"2026-03-14 14:30",mfa:true},{id:"U-003",name:"Bob Kumar",email:"bob@certifyi.com",role:"Risk Manager",status:"active",lastLogin:"2026-03-13 11:00",mfa:false},{id:"U-004",name:"Carol Davis",email:"carol@certifyi.com",role:"Auditor",status:"inactive",lastLogin:"2026-02-28 16:00",mfa:true},{id:"U-005",name:"Dave Wilson",email:"dave@certifyi.com",role:"Developer",status:"active",lastLogin:"2026-03-15 08:30",mfa:true},{id:"U-006",name:"Eve Sharma",email:"eve@certifyi.com",role:"Viewer",status:"suspended",lastLogin:"2026-03-01 10:00",mfa:false}];
const sc:Record<string,string>={active:"bg-green-500/20 text-green-400",inactive:"bg-muted text-muted-foreground",suspended:"bg-red-500/20 text-red-400"};
export default function UserManager(){const[search,setSearch]=useState("");const filtered=users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase())||u.role.toLowerCase().includes(search.toLowerCase()));return(<div className="space-y-6">
  <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">User Manager</h1><p className="text-muted-foreground">Manage platform users, roles, and access permissions</p></div><Button className="bg-green-600 hover:bg-green-700"><Plus className="w-4 h-4 mr-2"/>Add User</Button></div>
  <div className="grid grid-cols-4 gap-4">
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold">{users.length}</div><div className="text-sm text-muted-foreground">Total Users</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-green-400">{users.filter(u=>u.status==="active").length}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-yellow-400">{users.filter(u=>!u.mfa).length}</div><div className="text-sm text-muted-foreground">No MFA</div></CardContent></Card>
    <Card><CardContent className="pt-4 text-center"><div className="text-3xl font-bold text-red-400">{users.filter(u=>u.status==="suspended").length}</div><div className="text-sm text-muted-foreground">Suspended</div></CardContent></Card>
  </div>
  <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"/><Input placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
  <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b border-border">
    <th className="text-left p-3 text-sm font-medium text-muted-foreground">User</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Role</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">MFA</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Login</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th><th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
  </tr></thead><tbody>{filtered.map(u=>(
    <tr key={u.id} className="border-b border-border hover:bg-muted/50">
      <td className="p-3"><div><div className="text-sm font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div></td>
      <td className="p-3 text-sm">{u.role}</td>
      <td className="p-3"><Badge className={u.mfa?"bg-green-500/20 text-green-400":"bg-red-500/20 text-red-400"}>{u.mfa?"Enabled":"Disabled"}</Badge></td>
      <td className="p-3 text-xs text-muted-foreground">{u.lastLogin}</td>
      <td className="p-3"><Badge className={sc[u.status]}>{u.status}</Badge></td>
      <td className="p-3"><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7"><Edit className="w-3 h-3"/></Button><Button size="sm" variant="outline" className="h-7">{u.status==="active"?<UserX className="w-3 h-3"/>:<UserCheck className="w-3 h-3"/>}</Button></div></td>
    </tr>
  ))}</tbody></table></CardContent></Card>
</div>);}
