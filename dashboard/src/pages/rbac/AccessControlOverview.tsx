import { useState } from 'react'
import { ShieldCheck, Users, Buildings, Key, CaretRight, UserPlus, Warning } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { SEED_USERS, SEED_ROLES, SEED_DEPARTMENTS } from '../../features/access-control/seed'
import { PERMISSIONS } from '../../features/access-control/permissions'
import { useChartTheme } from '../../hooks/useChartTheme'

export default function AccessControlOverview() {
  const navigate = useNavigate()
  const chart = useChartTheme()
  const [users] = useState(SEED_USERS)
  const [roles] = useState(SEED_ROLES)
  const [departments] = useState(SEED_DEPARTMENTS)

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    pendingUsers: users.filter(u => u.status === 'pending').length,
    suspendedUsers: users.filter(u => u.status === 'suspended').length,
    totalRoles: roles.length,
    systemRoles: roles.filter(r => r.isSystem).length,
    customRoles: roles.filter(r => !r.isSystem).length,
    totalDepts: departments.length,
    activeDepts: departments.filter(d => d.status === 'active').length,
  }

  // Permissions coverage by section
  const sectionCoverage = Array.from(new Set(PERMISSIONS.map(p => p.section))).map(section => {
    const permsInSection = PERMISSIONS.filter(p => p.section === section)
    const covered = permsInSection.filter(p => {
      return roles.some(r => r.permissions.includes(p.id))
    }).length
    return { section: section.replace(' & ', ' &\n'), covered, total: permsInSection.length, pct: Math.round(covered / permsInSection.length * 100) }
  })

  const tooltipStyle = {
    contentStyle: { background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 0, color: chart.tooltipText, fontSize: 12 }
  }

  const recentUsers = [...users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  const navCards = [
    { icon: Users, label: 'Users', desc: `${stats.totalUsers} total · ${stats.activeUsers} active`, path: '/access-control/users', color: 'hsl(var(--brand))' },
    { icon: ShieldCheck, label: 'Roles', desc: `${stats.totalRoles} roles · ${stats.customRoles} custom`, path: '/access-control/roles', color: 'hsl(var(--tag-purple))' },
    { icon: Buildings, label: 'Departments', desc: `${stats.totalDepts} total · ${stats.activeDepts} active`, path: '/access-control/departments', color: 'hsl(var(--s-ok-tx))' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Key size={20} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            Access Control
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
            RBAC governance — users, roles, departments, and permission coverage
          </p>
        </div>
        <button onClick={() => navigate('/access-control/users')} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] hover:opacity-90" style={{ background: 'hsl(var(--brand))' }}>
          <UserPlus size={14} /> Invite User
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, sub: `${stats.activeUsers} active`, color: 'hsl(var(--text-1))' },
          { label: 'Total Roles', value: stats.totalRoles, sub: `${stats.systemRoles} system · ${stats.customRoles} custom`, color: 'hsl(var(--brand))' },
          { label: 'Departments', value: stats.totalDepts, sub: `${stats.activeDepts} active`, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Pending Users', value: stats.pendingUsers, sub: 'Awaiting activation', color: 'hsl(var(--s-wn-tx))' },
        ].map(s => (
          <div key={s.label} className="p-4 border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Warning banner */}
      {stats.pendingUsers > 0 && (
        <div className="flex items-center gap-3 p-3" style={{ background: 'hsl(var(--s-wn-bg))', border: '1px solid hsl(var(--s-wn-bg))' }}>
          <Warning size={15} style={{ color: 'hsl(var(--s-wn-tx))' }} />
          <p className="text-sm flex-1" style={{ color: 'hsl(var(--s-wn-tx))' }}>
            <strong>{stats.pendingUsers} user{stats.pendingUsers !== 1 ? 's' : ''}</strong> pending activation — review and approve access.
          </p>
          <button onClick={() => navigate('/access-control/users')} className="text-xs px-3 py-1.5 border hover:opacity-80" style={{ borderColor: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
            Review Users
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Nav cards */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Quick Access</p>
          {navCards.map(c => (
            <button key={c.label} onClick={() => navigate(c.path)} className="w-full flex items-center gap-3 p-4 border hover:opacity-80 text-left" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
              <div className="w-9 h-9 flex items-center justify-center border flex-shrink-0" style={{ background: `${c.color}18`, borderColor: `${c.color}30` }}>
                <c.icon size={18} style={{ color: c.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{c.label}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{c.desc}</p>
              </div>
              <CaretRight size={14} style={{ color: 'hsl(var(--text-4))' }} />
            </button>
          ))}
        </div>

        {/* Permission coverage chart */}
        <div className="border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Permission Coverage by Section</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>% of permissions assigned to at least one role</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sectionCoverage} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="section" tick={{ fill: chart.axis, fontSize: 9 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Coverage']} />
                <Bar dataKey="pct" radius={0}>
                  {sectionCoverage.map((d, i) => (
                    <Cell key={i} fill={d.pct >= 80 ? 'hsl(var(--s-ok-tx))' : d.pct >= 50 ? 'hsl(var(--brand))' : 'hsl(var(--s-wn-tx))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent users */}
        <div className="border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Recent Users</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}>
                  {u.firstName[0]}{u.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{u.firstName} {u.lastName}</p>
                  <p className="text-[10px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{u.email}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 whitespace-nowrap" style={
                  u.status === 'active' ? { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' } :
                  u.status === 'pending' ? { background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' } :
                  u.status === 'suspended' ? { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' } :
                  { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' }}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <button onClick={() => navigate('/access-control/users')} className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: 'hsl(var(--brand))' }}>
              View all users <CaretRight size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* System Roles Summary */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: 'hsl(var(--text-4))' }}>System Roles Summary</p>
        <div className="border overflow-hidden" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                {['Role', 'Code', 'Permissions', 'Users', 'Type'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.filter(r => r.isSystem).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <td className="px-4 py-3">
                    <span className="text-[11px] px-2 py-0.5 font-medium" style={
                      r.color === 'emerald' ? { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' } :
                      r.color === 'purple'  ? { background: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' } :
                      r.color === 'blue'    ? { background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' } :
                      r.color === 'amber'   ? { background: 'hsl(var(--s-wn-bg))',  color: 'hsl(var(--s-wn-tx))' } :
                      r.color === 'red'     ? { background: 'hsl(var(--s-er-bg))',   color: 'hsl(var(--destructive))' } :
                      r.color === 'orange'  ? { background: 'hsl(var(--s-wn-bg))',  color: 'hsl(25 90% 45%)' } :
                      { background: 'hsl(240 5% 64% / 0.15)',  color: 'hsl(240 5% 45%)' }
                    }>{r.name}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--brand))' }}>{r.code}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.permissions.length}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{users.filter(u => u.roleIds.includes(r.id)).length}</td>
                  <td className="px-4 py-3"><span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' }}>System</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
