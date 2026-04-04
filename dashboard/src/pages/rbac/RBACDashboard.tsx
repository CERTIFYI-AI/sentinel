import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Shield, Search, Plus, Download, Users, Key, Activity, Clock, CheckCircle, XCircle, UserPlus, Edit, Ban, Save } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Role {
  id: string; name: string; description: string; userCount: number;
  permissions: string[]; status: "active" | "inactive"; createdAt: string;
  riskLevel: "low" | "medium" | "high";
}
interface RBACUser {
  id: number; name: string; email: string; role: string;
  status: "active" | "inactive" | "locked"; lastActive: string;
  mfaEnabled: boolean; sessions: number;
}
interface AuditEntry {
  id: number; user: string; action: string; resource: string;
  timestamp: string; result: "granted" | "denied";
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899"];
const ALL_PERMISSIONS = [
  "manage_users", "manage_roles", "manage_policies", "manage_frameworks",
  "manage_settings", "view_audit_log", "manage_integrations", "export_data",
  "manage_evidence", "manage_controls", "view_threats", "manage_scans",
  "view_vulnerabilities", "view_policies", "view_evidence", "view_controls",
  "view_models", "view_datasets", "view_evals", "manage_risks",
  "manage_incidents", "manage_remediation", "manage_models", "manage_evals", "manage_datasets",
];

const initialRoles: Role[] = [
  { id: "r1", name: "Super Admin", description: "Full platform access", userCount: 2, permissions: ["manage_users", "manage_roles", "manage_policies", "manage_frameworks", "manage_settings", "view_audit_log", "manage_integrations", "export_data"], status: "active", createdAt: "2026-01-10", riskLevel: "high" },
  { id: "r2", name: "Compliance Manager", description: "Manage compliance controls and evidence", userCount: 5, permissions: ["manage_policies", "manage_frameworks", "manage_evidence", "view_audit_log", "manage_controls", "export_data"], status: "active", createdAt: "2026-01-10", riskLevel: "medium" },
  { id: "r3", name: "Security Analyst", description: "View and analyze security data", userCount: 8, permissions: ["view_threats", "manage_scans", "view_vulnerabilities", "view_audit_log"], status: "active", createdAt: "2026-01-15", riskLevel: "medium" },
  { id: "r4", name: "External Auditor", description: "Read-only audit access", userCount: 3, permissions: ["view_policies", "view_evidence", "view_controls", "view_audit_log"], status: "active", createdAt: "2026-02-01", riskLevel: "low" },
  { id: "r5", name: "Dev Read-Only", description: "Developer read access to models", userCount: 12, permissions: ["view_models", "view_datasets", "view_evals"], status: "active", createdAt: "2026-02-15", riskLevel: "low" },
  { id: "r6", name: "Risk Manager", description: "Manage risks and incidents", userCount: 4, permissions: ["manage_risks", "manage_incidents", "manage_remediation", "view_audit_log", "export_data"], status: "active", createdAt: "2026-03-01", riskLevel: "medium" },
  { id: "r7", name: "Model Owner", description: "Manage AI model lifecycle", userCount: 6, permissions: ["manage_models", "manage_evals", "manage_datasets", "view_audit_log"], status: "active", createdAt: "2026-03-10", riskLevel: "medium" },
  { id: "r8", name: "Suspended", description: "Temporarily suspended", userCount: 2, permissions: [], status: "inactive", createdAt: "2026-01-10", riskLevel: "high" },
];

const initialUsers: RBACUser[] = [
  { id: 1, name: "Bhaskar Admin", email: "bhaskar@certifyi.ai", role: "Super Admin", status: "active", lastActive: "2026-03-15", mfaEnabled: true, sessions: 3 },
  { id: 2, name: "Sarah Chen", email: "sarah@certifyi.ai", role: "Compliance Manager", status: "active", lastActive: "2026-03-14", mfaEnabled: true, sessions: 1 },
  { id: 3, name: "Mike Ross", email: "mike@certifyi.ai", role: "Security Analyst", status: "active", lastActive: "2026-03-13", mfaEnabled: true, sessions: 2 },
  { id: 4, name: "Jane Auditor", email: "jane@external.com", role: "External Auditor", status: "inactive", lastActive: "2026-02-28", mfaEnabled: false, sessions: 0 },
  { id: 5, name: "Dev User", email: "dev@certifyi.ai", role: "Dev Read-Only", status: "active", lastActive: "2026-03-15", mfaEnabled: false, sessions: 1 },
  { id: 6, name: "Lisa Risk", email: "lisa@certifyi.ai", role: "Risk Manager", status: "active", lastActive: "2026-03-12", mfaEnabled: true, sessions: 1 },
  { id: 7, name: "Tom Model", email: "tom@certifyi.ai", role: "Model Owner", status: "active", lastActive: "2026-03-14", mfaEnabled: true, sessions: 2 },
  { id: 8, name: "Locked User", email: "locked@certifyi.ai", role: "Suspended", status: "locked", lastActive: "2026-01-20", mfaEnabled: false, sessions: 0 },
];

const initialAudit: AuditEntry[] = [
  { id: 1, user: "Bhaskar Admin", action: "Role Modified", resource: "Compliance Manager", timestamp: "2026-03-15 14:22", result: "granted" },
  { id: 2, user: "Sarah Chen", action: "Policy Updated", resource: "Data Retention Policy", timestamp: "2026-03-15 13:10", result: "granted" },
  { id: 3, user: "Jane Auditor", action: "Export Attempted", resource: "Evidence Vault", timestamp: "2026-03-14 09:45", result: "denied" },
  { id: 4, user: "Mike Ross", action: "Scan Initiated", resource: "Model Arena", timestamp: "2026-03-14 08:30", result: "granted" },
  { id: 5, user: "Dev User", action: "Settings Change", resource: "System Config", timestamp: "2026-03-13 16:00", result: "denied" },
  { id: 6, user: "Bhaskar Admin", action: "User Invited", resource: "new.user@certifyi.ai", timestamp: "2026-03-13 10:15", result: "granted" },
  { id: 7, user: "Lisa Risk", action: "Risk Created", resource: "Data Breach Risk", timestamp: "2026-03-12 11:20", result: "granted" },
  { id: 8, user: "Locked User", action: "Login Attempt", resource: "Dashboard", timestamp: "2026-03-10 08:00", result: "denied" },
];

export default function RBACDashboard() {
  const [users, setUsers] = useState<RBACUser[]>(initialUsers);
  const [roles] = useState<Role[]>(initialRoles);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialAudit);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Add User dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  // Edit User dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<RBACUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  // Disable User dialog
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableUser, setDisableUser] = useState<RBACUser | null>(null);

  const filteredUsers = users.filter(u => JSON.stringify(u).toLowerCase().includes(search.toLowerCase()));
  const filteredAudit = auditLog.filter(a => JSON.stringify(a).toLowerCase().includes(search.toLowerCase()));
  const rolePermChart = roles.filter(r => r.status === "active").map(r => ({ name: r.name, permissions: r.permissions.length, users: r.userCount }));
  const roleDistChart = roles.filter(r => r.status === "active").map(r => ({ name: r.name, value: r.userCount }));
  const totalUsers = users.length;
  const activeSessions = users.reduce((a, u) => a + u.sessions, 0);
  const mfaRate = Math.round((users.filter(u => u.mfaEnabled).length / totalUsers) * 100);

  const handleAddUser = () => {
    if (!newName || !newEmail || !newRole) return;
    const nu: RBACUser = { id: Date.now(), name: newName, email: newEmail, role: newRole, status: "active", lastActive: new Date().toISOString().slice(0, 10), mfaEnabled: false, sessions: 0 };
    setUsers(prev => [...prev, nu]);
    setAuditLog(prev => [{ id: Date.now(), user: "Bhaskar Admin", action: "User Added", resource: newEmail, timestamp: new Date().toISOString().slice(0, 16).replace("T", " "), result: "granted" }, ...prev]);
    setNewName(""); setNewEmail(""); setNewRole(""); setAddOpen(false);
  };

  const openEdit = (u: RBACUser) => {
    setEditUser(u); setEditName(u.name); setEditEmail(u.email); setEditRole(u.role);
    const roleObj = roles.find(r => r.name === u.role);
    setEditPerms(roleObj ? [...roleObj.permissions] : []);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editUser) return;
    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, name: editName, email: editEmail, role: editRole } : u));
    setAuditLog(prev => [{ id: Date.now(), user: "Bhaskar Admin", action: "User Edited", resource: editEmail, timestamp: new Date().toISOString().slice(0, 16).replace("T", " "), result: "granted" }, ...prev]);
    setEditOpen(false); setEditUser(null);
  };

  const togglePerm = (perm: string) => {
    setEditPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const openDisable = (u: RBACUser) => { setDisableUser(u); setDisableOpen(true); };

  const handleDisable = () => {
    if (!disableUser) return;
    const newStatus = disableUser.status === "active" ? "inactive" : "active";
    setUsers(prev => prev.map(u => u.id === disableUser.id ? { ...u, status: newStatus as RBACUser["status"], sessions: newStatus === "inactive" ? 0 : u.sessions } : u));
    setAuditLog(prev => [{ id: Date.now(), user: "Bhaskar Admin", action: newStatus === "inactive" ? "User Disabled" : "User Enabled", resource: disableUser.email, timestamp: new Date().toISOString().slice(0, 16).replace("T", " "), result: "granted" }, ...prev]);
    setDisableOpen(false); setDisableUser(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Access Control</h1><p className="text-sm text-muted-foreground">Role-based access control and permissions management</p></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-1" />Add User</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Users</p><p className="text-2xl font-bold">{totalUsers}</p></div><Users className="h-8 w-8 text-[hsl(var(--brand))]" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Roles</p><p className="text-2xl font-bold">{roles.filter(r => r.status === "active").length}</p></div><Key className="h-8 w-8 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Sessions</p><p className="text-2xl font-bold">{activeSessions}</p></div><Activity className="h-8 w-8 text-amber-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">MFA Adoption</p><p className="text-2xl font-bold">{mfaRate}%</p></div><Shield className="h-8 w-8 text-purple-500" /></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Access Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>Permissions per Role</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={rolePermChart}><XAxis dataKey="name" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="permissions" fill="#10b981" radius={[4,4,0,0]} name="Permissions" /><Bar dataKey="users" fill="#6366f1" radius={[4,4,0,0]} name="Users" /></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>User Distribution by Role</CardTitle></CardHeader><CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart><Pie data={roleDistChart} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{roleDistChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Active Sessions</CardTitle></CardHeader><CardContent>
            <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-muted/50"><tr><th className="text-left p-3 text-sm font-medium">User</th><th className="text-left p-3 text-sm font-medium">Role</th><th className="text-left p-3 text-sm font-medium">Sessions</th><th className="text-left p-3 text-sm font-medium">Last Active</th><th className="text-left p-3 text-sm font-medium">MFA</th></tr></thead>
              <tbody>{users.filter(u => u.sessions > 0).map(u => (<tr key={u.id} className="border-t hover:bg-muted/30"><td className="p-3 text-sm font-medium">{u.name}</td><td className="p-3 text-sm">{u.role}</td><td className="p-3 text-sm"><Badge variant="secondary">{u.sessions}</Badge></td><td className="p-3 text-sm">{u.lastActive}</td><td className="p-3 text-sm">{u.mfaEnabled ? <CheckCircle className="h-4 w-4 text-[hsl(var(--brand))]" /> : <XCircle className="h-4 w-4 text-red-400" />}</td></tr>))}</tbody></table></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map(role => (
              <Card key={role.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setSelectedRole(role); setSheetOpen(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2"><h3 className="font-semibold text-sm">{role.name}</h3><Badge variant={role.riskLevel === "high" ? "destructive" : role.riskLevel === "medium" ? "secondary" : "default"}>{role.riskLevel}</Badge></div>
                  <p className="text-xs text-muted-foreground mb-3">{role.description}</p>
                  <div className="flex items-center justify-between text-xs"><span>{role.userCount} users</span><span>{role.permissions.length} perms</span><Badge variant={role.status === "active" ? "default" : "secondary"}>{role.status}</Badge></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle>Role-Permission Matrix</CardTitle></CardHeader><CardContent>
            <div className="border rounded-lg overflow-auto max-h-[400px]"><table className="w-full text-xs"><thead className="bg-muted/50 sticky top-0"><tr><th className="text-left p-2 font-medium min-w-[160px]">Permission</th>{roles.filter(r => r.status === "active").map(r => (<th key={r.id} className="text-center p-2 font-medium min-w-[90px]">{r.name}</th>))}</tr></thead>
              <tbody>{ALL_PERMISSIONS.map(perm => (<tr key={perm} className="border-t hover:bg-muted/20"><td className="p-2 font-mono text-muted-foreground">{perm}</td>{roles.filter(r => r.status === "active").map(r => (<td key={r.id} className="text-center p-2">{r.permissions.includes(perm) ? <CheckCircle className="h-4 w-4 text-[hsl(var(--brand))] mx-auto" /> : <span className="text-muted-foreground/30">&mdash;</span>}</td>))}</tr>))}</tbody></table></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card><CardHeader>
            <div className="flex items-center justify-between"><CardTitle>User Management</CardTitle>
              <div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-64" /></div>
                <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-1" />Add</Button>
              </div>
            </div>
          </CardHeader><CardContent>
            <div className="border rounded-lg overflow-hidden"><table className="w-full">
              <thead className="bg-muted/50"><tr>
                <th className="text-left p-3 text-sm font-medium">Name</th>
                <th className="text-left p-3 text-sm font-medium">Email</th>
                <th className="text-left p-3 text-sm font-medium">Role</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">MFA</th>
                <th className="text-left p-3 text-sm font-medium">Last Active</th>
                <th className="text-left p-3 text-sm font-medium">Actions</th>
              </tr></thead>
              <tbody>{filteredUsers.map(u => (
                <tr key={u.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 text-sm font-medium">{u.name}</td>
                  <td className="p-3 text-sm text-muted-foreground">{u.email}</td>
                  <td className="p-3 text-sm">{u.role}</td>
                  <td className="p-3 text-sm"><Badge variant={u.status === "active" ? "default" : u.status === "locked" ? "destructive" : "secondary"}>{u.status}</Badge></td>
                  <td className="p-3 text-sm">{u.mfaEnabled ? <CheckCircle className="h-4 w-4 text-[hsl(var(--brand))]" /> : <XCircle className="h-4 w-4 text-red-400" />}</td>
                  <td className="p-3 text-sm">{u.lastActive}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(u); }}><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>
                      <Button size="sm" variant="ghost" className={u.status === "active" ? "text-red-400 hover:text-red-300" : "text-[hsl(var(--brand))] hover:text-emerald-300"} onClick={(e) => { e.stopPropagation(); openDisable(u); }}>
                        <Ban className="h-3.5 w-3.5 mr-1" />{u.status === "active" ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
            <p className="text-sm text-muted-foreground mt-2">{filteredUsers.length} of {users.length} users</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Access Audit Log</CardTitle><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search audit log..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-64" /></div></div></CardHeader><CardContent>
            <div className="border rounded-lg overflow-hidden"><table className="w-full"><thead className="bg-muted/50"><tr><th className="text-left p-3 text-sm font-medium">Timestamp</th><th className="text-left p-3 text-sm font-medium">User</th><th className="text-left p-3 text-sm font-medium">Action</th><th className="text-left p-3 text-sm font-medium">Resource</th><th className="text-left p-3 text-sm font-medium">Result</th></tr></thead>
              <tbody>{filteredAudit.map(a => (<tr key={a.id} className="border-t hover:bg-muted/30"><td className="p-3 text-sm text-muted-foreground">{a.timestamp}</td><td className="p-3 text-sm font-medium">{a.user}</td><td className="p-3 text-sm">{a.action}</td><td className="p-3 text-sm">{a.resource}</td><td className="p-3 text-sm"><Badge variant={a.result === "granted" ? "default" : "destructive"}>{a.result}</Badge></td></tr>))}</tbody></table></div>
            <p className="text-sm text-muted-foreground mt-2">{filteredAudit.length} entries</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* ===== ADD USER DIALOG ===== */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add New User</DialogTitle><DialogDescription>Create a new user account and assign a role.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><label className="text-sm font-medium">Full Name</label><Input placeholder="e.g. John Doe" value={newName} onChange={e => setNewName(e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Email Address</label><Input placeholder="e.g. john@certifyi.ai" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Assign Role</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="">Select a role...</option>
                {roles.filter(r => r.status === "active").map(r => <option key={r.id} value={r.name}>{r.name} ({r.permissions.length} permissions)</option>)}
              </select>
            </div>
            {newRole && <div className="rounded-lg border p-3 bg-muted/30"><p className="text-xs font-medium mb-2">Permissions for {newRole}:</p><div className="flex flex-wrap gap-1">{roles.find(r => r.name === newRole)?.permissions.map(p => <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>)}</div></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleAddUser} disabled={!newName || !newEmail || !newRole}><Save className="h-4 w-4 mr-1" />Create User</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT USER DIALOG with Role/Permission Assignment ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5" />Edit User{editUser ? `: ${editUser.name}` : ""}</DialogTitle><DialogDescription>Update user details and assign roles/permissions.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Name</label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Email</label><Input value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Assign Role</label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editRole} onChange={e => { setEditRole(e.target.value); const r = roles.find(ro => ro.name === e.target.value); setEditPerms(r ? [...r.permissions] : []); }}>
                {roles.filter(r => r.status === "active").map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><label className="text-sm font-medium">Permissions ({editPerms.length} selected)</label>
              <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(p => (
                  <label key={p} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/30 rounded p-1">
                    <input type="checkbox" checked={editPerms.includes(p)} onChange={() => togglePerm(p)} className="rounded" />
                    <span className="font-mono">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSaveEdit}><Save className="h-4 w-4 mr-1" />Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DISABLE USER DIALOG ===== */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5" />{disableUser?.status === "active" ? "Disable" : "Enable"} User</DialogTitle>
            <DialogDescription>{disableUser?.status === "active" ? `This will deactivate ${disableUser?.name}'s account and terminate all active sessions.` : `This will re-enable ${disableUser?.name}'s account.`}</DialogDescription>
          </DialogHeader>
          {disableUser && <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">User</span><span className="text-sm font-medium">{disableUser.name}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="text-sm">{disableUser.email}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Role</span><span className="text-sm">{disableUser.role}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Current Status</span><Badge variant={disableUser.status === "active" ? "default" : "secondary"}>{disableUser.status}</Badge></div>
            <div className="flex justify-between"><span className="text-sm text-muted-foreground">Active Sessions</span><span className="text-sm">{disableUser.sessions}</span></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setDisableOpen(false)}>Cancel</Button><Button variant={disableUser?.status === "active" ? "destructive" : "default"} onClick={handleDisable}>{disableUser?.status === "active" ? "Disable Account" : "Enable Account"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ROLE DETAIL SHEET ===== */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader><SheetTitle>{selectedRole?.name}</SheetTitle><SheetDescription>{selectedRole?.description}</SheetDescription></SheetHeader>
          {selectedRole && <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Status</p><Badge variant={selectedRole.status === "active" ? "default" : "secondary"}>{selectedRole.status}</Badge></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Risk Level</p><Badge variant={selectedRole.riskLevel === "high" ? "destructive" : selectedRole.riskLevel === "medium" ? "secondary" : "default"}>{selectedRole.riskLevel}</Badge></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Users</p><p className="text-sm font-medium">{selectedRole.userCount}</p></div>
              <div className="space-y-1"><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium">{selectedRole.createdAt}</p></div>
            </div>
            <div><h4 className="text-sm font-semibold mb-3">Permissions ({selectedRole.permissions.length})</h4><div className="flex flex-wrap gap-1.5">{selectedRole.permissions.map(p => <Badge key={p} variant="outline" className="text-xs font-mono">{p}</Badge>)}{selectedRole.permissions.length === 0 && <p className="text-sm text-muted-foreground">No permissions</p>}</div></div>
            <div><h4 className="text-sm font-semibold mb-3">Users with this Role</h4><div className="space-y-2">{users.filter(u => u.role === selectedRole.name).map(u => (<div key={u.id} className="flex items-center justify-between border rounded-lg p-2"><div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div><div className="flex items-center gap-2"><Badge variant={u.status === "active" ? "default" : u.status === "locked" ? "destructive" : "secondary"}>{u.status}</Badge><Button size="sm" variant="ghost" onClick={() => { setSheetOpen(false); openEdit(u); }}><Edit className="h-3 w-3" /></Button></div></div>))}</div></div>
            <div className="flex gap-2 pt-4"><Button size="sm">Edit Role</Button><Button size="sm" variant="outline">Clone</Button><Button size="sm" variant="destructive">Revoke All</Button></div>
          </div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
