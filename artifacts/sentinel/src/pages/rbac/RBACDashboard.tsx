import { useState } from 'react';
import { Users, ShieldCheck, Key, ClockCounterClockwise, MagnifyingGlass, Plus, Eye, PencilSimple, Trash, UserPlus, Warning, CheckCircle, XCircle, CaretRight } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { USERS, User, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

interface Role {
  id: string; name: string; description: string; userCount: number;
  permissions: string[]; riskLevel: 'low' | 'medium' | 'high';
}

interface RBACUser extends User {
  status: 'active' | 'inactive' | 'locked';
  lastActive: string; mfaEnabled: boolean; sessions: number;
}

interface AccessEvent {
  id: string; user: string; action: string; resource: string;
  timestamp: string; result: 'granted' | 'denied';
}

const ROLES: Role[] = [
  { id: 'r1', name: 'Super Admin', description: 'Full platform access — all modules', userCount: 1, permissions: ['manage_users', 'manage_roles', 'manage_policies', 'manage_settings', 'view_audit_log', 'export_data'], riskLevel: 'high' },
  { id: 'r2', name: 'CISO', description: 'Security leadership — full security + compliance access', userCount: 1, permissions: ['view_threats', 'manage_scans', 'view_vulnerabilities', 'view_audit_log', 'manage_policies', 'export_data'], riskLevel: 'high' },
  { id: 'r3', name: 'VP Compliance', description: 'Compliance management — policies, frameworks, evidence', userCount: 1, permissions: ['manage_policies', 'manage_frameworks', 'manage_evidence', 'view_audit_log', 'export_data'], riskLevel: 'medium' },
  { id: 'r4', name: 'ML Engineer', description: 'AI/ML model lifecycle management', userCount: 2, permissions: ['manage_models', 'manage_evals', 'manage_datasets', 'view_audit_log'], riskLevel: 'medium' },
  { id: 'r5', name: 'Risk Analyst', description: 'Risk register and incident management', userCount: 1, permissions: ['manage_risks', 'manage_incidents', 'manage_remediation', 'view_audit_log'], riskLevel: 'medium' },
  { id: 'r6', name: 'Auditor', description: 'Read-only audit and evidence access', userCount: 1, permissions: ['view_policies', 'view_evidence', 'view_controls', 'view_audit_log'], riskLevel: 'low' },
];

const ALL_PERMS = ['manage_users', 'manage_roles', 'manage_policies', 'manage_settings', 'view_audit_log', 'export_data', 'view_threats', 'manage_scans', 'view_vulnerabilities', 'manage_frameworks', 'manage_evidence', 'manage_models', 'manage_evals', 'manage_datasets', 'manage_risks', 'manage_incidents', 'manage_remediation', 'view_policies', 'view_evidence', 'view_controls'];

const INITIAL_RBAC_USERS: RBACUser[] = USERS.map((u, i) => ({
  ...u,
  status: i === 3 ? 'inactive' : 'active',
  lastActive: i === 0 ? '2026-03-31' : i === 1 ? '2026-03-30' : i === 2 ? '2026-03-31' : i === 3 ? '2026-02-15' : i === 4 ? '2026-03-29' : '2026-03-28',
  mfaEnabled: i === 0 || i === 1 || i === 3 || i === 4,
  sessions: i === 0 ? 2 : i === 1 ? 1 : i === 2 ? 0 : i === 3 ? 1 : i === 4 ? 3 : 1,
}));

const ACCESS_EVENTS: AccessEvent[] = [
  { id: 'AE-001', user: 'Sarah Chen', action: 'Accessed Model Registry', resource: 'MDL-001', timestamp: '2026-03-31T14:22:00Z', result: 'granted' },
  { id: 'AE-002', user: 'Emma Wilson', action: 'Attempted Settings Change', resource: 'System Config', timestamp: '2026-03-31T13:48:00Z', result: 'denied' },
  { id: 'AE-003', user: 'James Patel', action: 'Exported Risk Register', resource: 'RISKS', timestamp: '2026-03-31T12:15:00Z', result: 'granted' },
  { id: 'AE-004', user: 'Maria Santos', action: 'Created Bias Audit', resource: 'BA-006', timestamp: '2026-03-30T16:30:00Z', result: 'granted' },
  { id: 'AE-005', user: 'Raj Gupta', action: 'Deleted Model Draft', resource: 'MDL-DRAFT-007', timestamp: '2026-03-30T11:00:00Z', result: 'granted' },
  { id: 'AE-006', user: 'David Kim', action: 'Attempted User Management', resource: 'USR-005', timestamp: '2026-03-29T09:45:00Z', result: 'denied' },
  { id: 'AE-007', user: 'Sarah Chen', action: 'Login — New Device', resource: 'Dashboard', timestamp: '2026-03-29T08:30:00Z', result: 'granted' },
  { id: 'AE-008', user: 'Emma Wilson', action: 'Downloaded Evidence', resource: 'EV-003', timestamp: '2026-03-28T14:10:00Z', result: 'granted' },
];

const ROLE_DIST = ROLES.map(r => ({ name: r.name, value: r.userCount, color: ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'][ROLES.indexOf(r)] }));
const MFA_DATA = [
  { name: 'MFA Enabled', value: 63, color: '#10b981' },
  { name: 'No MFA', value: 37, color: '#f59e0b' },
];

export default function RBACDashboard() {
  const { orgName } = useSettingsStore();
  const chart = useChartTheme();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const queued = sessionStorage.getItem('rbac_initial_tab');
    if (queued) { sessionStorage.removeItem('rbac_initial_tab'); return queued; }
    return 'overview';
  });
  const [users, setUsers] = useState<RBACUser[]>(INITIAL_RBAC_USERS);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: '', department: '' });
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);
  const [mfaToast, setMfaToast] = useState(false);

  const enforceMFA = () => {
    setUsers(prev => prev.map(u => ({ ...u, mfaEnabled: true })));
    setMfaDialogOpen(false);
    setMfaToast(true);
    setTimeout(() => setMfaToast(false), 3000);
  };

  // Permission Matrix Data
  const MATRIX_ROLES = ['CISO', 'VP Compliance', 'ML Engineer', 'Risk Analyst', 'Auditor', 'Model Risk'];
  const MATRIX_MODULES = ['Models', 'Agents', 'Risks', 'Policies', 'Evidence', 'Security', 'Trust Engine', 'Reports'];
  // ● = full, ◐ = read-only, ○ = none
  const MATRIX_DATA: Record<string, Record<string, string>> = {
    'CISO':         { Models: '●', Agents: '●', Risks: '●', Policies: '●', Evidence: '●', Security: '●', 'Trust Engine': '●', Reports: '●' },
    'VP Compliance':{ Models: '◐', Agents: '◐', Risks: '◐', Policies: '●', Evidence: '●', Security: '◐', 'Trust Engine': '◐', Reports: '●' },
    'ML Engineer':  { Models: '●', Agents: '●', Risks: '◐', Policies: '◐', Evidence: '◐', Security: '◐', 'Trust Engine': '◐', Reports: '◐' },
    'Risk Analyst': { Models: '◐', Agents: '◐', Risks: '●', Policies: '◐', Evidence: '◐', Security: '◐', 'Trust Engine': '◐', Reports: '◐' },
    'Auditor':      { Models: '◐', Agents: '◐', Risks: '◐', Policies: '◐', Evidence: '◐', Security: '◐', 'Trust Engine': '◐', Reports: '◐' },
    'Model Risk':   { Models: '●', Agents: '◐', Risks: '●', Policies: '◐', Evidence: '●', Security: '◐', 'Trust Engine': '●', Reports: '●' },
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const revokeSession = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, sessions: 0 } : u));
  };

  const handleAddUser = () => {
    const nu: RBACUser = {
      id: `U-00${users.length + 1}`,
      name: newUser.name || 'New User',
      email: newUser.email || 'new@sentinel-grc.com',
      role: newUser.role || 'Auditor',
      department: newUser.department || 'General',
      avatar: newUser.name ? newUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'NU',
      status: 'active',
      lastActive: new Date().toISOString().split('T')[0],
      mfaEnabled: false,
      sessions: 0,
    };
    setUsers(prev => [...prev, nu]);
    setNewUser({ name: '', email: '', role: '', department: '' });
    setAddUserOpen(false);
  };

  const tooltipStyle = { contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 0, color: chart.tooltipText, fontSize: 12 } };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Access Control</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · RBAC management, roles, users &amp; audit log</p>
        </div>
        <Button onClick={() => setAddUserOpen(true)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <UserPlus className="h-4 w-4 mr-2" weight="bold" />Add User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--border) / 0.3)' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="roles" style={{ borderRadius: 0 }}>Roles</TabsTrigger>
          <TabsTrigger value="users" style={{ borderRadius: 0 }}>Users</TabsTrigger>
          <TabsTrigger value="matrix" style={{ borderRadius: 0 }}>Permission Matrix</TabsTrigger>
          <TabsTrigger value="audit" style={{ borderRadius: 0 }}>Audit Log</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: users.length, color: 'hsl(var(--text-1))' },
              { label: 'Active Roles', value: ROLES.length, color: 'hsl(var(--brand))' },
              { label: 'MFA Coverage', value: '63%', color: 'hsl(var(--s-wn-tx))' },
              { label: 'Access Denials (7d)', value: 2, color: 'hsl(var(--destructive))' },
            ].map(stat => (
              <Card key={stat.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="pt-5">
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{stat.label}</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* MFA Warning */}
          <div className="flex items-center gap-3 p-3" style={{ background: 'hsl(45 93% 47% / 0.1)', border: '1px solid hsl(45 93% 47% / 0.3)', borderRadius: 0 }}>
            <Warning size={16} style={{ color: 'hsl(var(--s-wn-tx))' }} />
            <p className="text-sm flex-1" style={{ color: 'hsl(var(--s-wn-tx))' }}>
              <strong>MFA at 63%</strong> — 2 users without MFA have active sessions. Consider enforcing MFA organization-wide.
            </p>
            <Button
              size="sm"
              style={{ borderRadius: 0, background: 'hsl(0 72% 51%)', color: '#fff', flexShrink: 0 }}
              onClick={() => setMfaDialogOpen(true)}
            >
              <Warning size={13} className="mr-1" weight="bold" />
              Enforce MFA for All Users
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Role Distribution */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Users by Role</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ROLE_DIST} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: chart.axis, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chart.axis, fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: chart.axis } }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" radius={0}>
                      {ROLE_DIST.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* MFA Pie */}
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>MFA Adoption</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={MFA_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                      {MFA_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ROLES TAB */}
        <TabsContent value="roles" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['Role', 'Description', 'Users', 'Risk Level', 'Permissions', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{r.name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{r.description}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'hsl(var(--text-1))' }}>{r.userCount}</td>
                      <td className="px-4 py-3">
                        <Badge style={{
                          background: r.riskLevel === 'high' ? 'hsl(0 72% 51% / 0.15)' : r.riskLevel === 'medium' ? 'hsl(45 93% 47% / 0.15)' : 'hsl(142 71% 45% / 0.15)',
                          color: r.riskLevel === 'high' ? 'hsl(var(--destructive))' : r.riskLevel === 'medium' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                          borderRadius: 0, fontSize: 11
                        }}>
                          {r.riskLevel.charAt(0).toUpperCase() + r.riskLevel.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{r.permissions.length} permissions</span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setSelectedRole(r); setRoleSheetOpen(true); }}>
                          <Eye size={13} className="mr-1" />View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Permissions Matrix */}
          <Card className="mt-4" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Permissions Matrix</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <th className="px-3 py-2 text-left font-semibold sticky left-0" style={{ color: 'hsl(var(--text-4))', background: 'hsl(var(--bg-surface))', minWidth: 160 }}>Permission</th>
                    {ROLES.map(r => (
                      <th key={r.id} className="px-3 py-2 text-center font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ALL_PERMS.slice(0, 12).map(perm => (
                    <tr key={perm} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }} className="hover:bg-muted/20">
                      <td className="px-3 py-1.5 font-mono sticky left-0" style={{ color: 'hsl(var(--text-4))', background: 'hsl(var(--bg-surface))' }}>{perm}</td>
                      {ROLES.map(r => (
                        <td key={r.id} className="px-3 py-1.5 text-center">
                          {r.permissions.includes(perm) ? (
                            <CheckCircle size={14} style={{ color: 'hsl(var(--s-ok-tx))', margin: '0 auto' }} weight="fill" />
                          ) : (
                            <span style={{ color: 'hsl(var(--border))' }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="relative max-w-xs">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }} />
          </div>
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12" style={{ color: 'hsl(var(--text-4))' }}>
                  <Users size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No users match your search</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['User', 'Email', 'Role', 'Department', 'MFA', 'Sessions', 'Last Active', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 flex items-center justify-center text-xs font-bold" style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))', borderRadius: 0 }}>{u.avatar}</div>
                              <span className="font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{u.email}</td>
                          <td className="px-4 py-3 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{u.role}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{u.department}</td>
                          <td className="px-4 py-3">
                            {u.mfaEnabled
                              ? <CheckCircle size={15} className="text-green-600 dark:text-green-400" weight="fill" />
                              : <XCircle size={15} style={{ color: 'hsl(var(--s-wn-tx))' }} weight="fill" />
                            }
                          </td>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: u.sessions > 0 ? 'hsl(var(--text-1))' : 'hsl(var(--text-4))' }}>{u.sessions}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{u.lastActive}</td>
                          <td className="px-4 py-3">
                            <Badge style={{
                              background: u.status === 'active' ? 'hsl(142 71% 45% / 0.15)' : u.status === 'inactive' ? 'hsl(var(--border) / 0.5)' : 'hsl(0 72% 51% / 0.15)',
                              color: u.status === 'active' ? 'hsl(var(--s-ok-tx))' : u.status === 'inactive' ? 'hsl(var(--text-4))' : 'hsl(var(--destructive))',
                              borderRadius: 0, fontSize: 11
                            }}>
                              {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {u.sessions > 0 && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive">
                                      Revoke
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent style={{ borderRadius: 0 }}>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Revoke Sessions</AlertDialogTitle>
                                      <AlertDialogDescription>Revoke all {u.sessions} active session(s) for {u.name}? They will be immediately signed out.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => revokeSession(u.id)} style={{ borderRadius: 0, background: 'hsl(var(--destructive))' }}>Revoke</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERMISSION MATRIX TAB */}
        <TabsContent value="matrix" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Role × Module Permission Matrix</CardTitle>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                ● Full access    ◐ Read-only    ○ No access
              </p>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold sticky left-0" style={{ color: 'hsl(var(--text-4))', background: 'hsl(var(--bg-surface))', minWidth: 130 }}>Role</th>
                    {MATRIX_MODULES.map(mod => (
                      <th key={mod} className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{mod}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX_ROLES.map((role) => (
                    <tr key={role} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold text-xs sticky left-0" style={{ color: 'hsl(var(--text-1))', background: 'hsl(var(--bg-surface))' }}>{role}</td>
                      {MATRIX_MODULES.map(mod => {
                        const val = MATRIX_DATA[role]?.[mod] || '○';
                        const color = val === '●' ? 'hsl(var(--s-ok-tx))' : val === '◐' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--border))';
                        const bg = val === '●' ? 'hsl(var(--s-ok-bg))' : val === '◐' ? 'hsl(var(--s-wn-bg))' : 'transparent';
                        return (
                          <td key={mod} className="px-3 py-3 text-center">
                            <span
                              style={{
                                fontSize: 18, color,
                                background: bg,
                                padding: '2px 6px',
                                borderRadius: 0,
                                display: 'inline-block',
                              }}
                              title={val === '●' ? 'Full Access' : val === '◐' ? 'Read-Only' : 'No Access'}
                            >{val}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          {/* Legend */}
          <div className="flex items-center gap-6 mt-3 px-1">
            {[{ sym: '●', label: 'Full Access', color: 'hsl(var(--s-ok-tx))' }, { sym: '◐', label: 'Read-Only', color: 'hsl(var(--s-wn-tx))' }, { sym: '○', label: 'No Access', color: 'hsl(var(--border))' }].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <span style={{ fontSize: 16, color: l.color }}>{l.sym}</span>
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* AUDIT LOG TAB */}
        <TabsContent value="audit" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'User', 'Action', 'Resource', 'Timestamp', 'Result'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACCESS_EVENTS.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.id}</td>
                      <td className="px-4 py-3 font-medium text-xs" style={{ color: 'hsl(var(--text-1))' }}>{e.user}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.action}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--text-4))' }}>{e.resource}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>
                        {new Date(e.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{
                          background: e.result === 'granted' ? 'hsl(142 71% 45% / 0.15)' : 'hsl(0 72% 51% / 0.15)',
                          color: e.result === 'granted' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--destructive))',
                          borderRadius: 0, fontSize: 11
                        }}>
                          {e.result.charAt(0).toUpperCase() + e.result.slice(1)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Detail Sheet */}
      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
        <SheetContent style={{ borderRadius: 0 }}>
          <SheetHeader><SheetTitle style={{ color: 'hsl(var(--text-1))' }}>Role Detail</SheetTitle></SheetHeader>
          {selectedRole && (
            <div className="mt-6 space-y-4 text-sm">
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Role Name</p><p className="font-bold text-base">{selectedRole.name}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Description</p><p>{selectedRole.description}</p></div>
              <div><p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Users Assigned</p><p className="font-bold text-2xl" style={{ color: 'hsl(var(--brand))' }}>{selectedRole.userCount}</p></div>
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-4))' }}>Permissions ({selectedRole.permissions.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRole.permissions.map(p => (
                    <Badge key={p} style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))', borderRadius: 0, fontSize: 11 }}>{p}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent style={{ borderRadius: 0 }}>
          <DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Full Name</label>
              <Input value={newUser.name} onChange={e => setNewUser(f => ({ ...f, name: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="Jane Smith" /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Email</label>
              <Input value={newUser.email} onChange={e => setNewUser(f => ({ ...f, email: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="jane@sentinel-grc.com" /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Role</label>
              <Input value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Auditor" /></div>
            <div><label className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Department</label>
              <Input value={newUser.department} onChange={e => setNewUser(f => ({ ...f, department: e.target.value }))} className="mt-1" style={{ borderRadius: 0 }} placeholder="e.g. Compliance" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleAddUser} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MFA Enforcement Confirm Dialog */}
      <AlertDialog open={mfaDialogOpen} onOpenChange={setMfaDialogOpen}>
        <AlertDialogContent style={{ borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Warning size={16} style={{ color: 'hsl(0 72% 51%)' }} />
              Enforce MFA for All Users
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately require multi-factor authentication for all {users.length} users in the organization.
              Users without MFA will be prompted to enroll on their next login. This action cannot be undone without
              manually updating individual user settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={enforceMFA}
              style={{ borderRadius: 0, background: 'hsl(0 72% 51%)', color: '#fff' }}
            >
              Enforce MFA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MFA Toast */}
      {mfaToast && (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 shadow-xl"
          style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0 }}
        >
          <CheckCircle size={16} style={{ color: 'hsl(var(--s-ok-tx))' }} weight="fill" />
          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>MFA enforcement policy applied</span>
        </div>
      )}
    </div>
  );
}
