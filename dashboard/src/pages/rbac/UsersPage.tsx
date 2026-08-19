import logger from '@/lib/logger';
import { useState, useMemo, useCallback, useEffect } from 'react'
import { Users, MagnifyingGlass, Plus, PencilSimple, Trash, X, Warning, CaretLeft, CaretRight, Eye, Export } from '@phosphor-icons/react'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { toast } from 'sonner'
import { SEED_USERS, SEED_ROLES, SEED_DEPARTMENTS } from '../../features/access-control/seed'
import { PERMISSIONS, PERMISSION_SECTIONS } from '../../features/access-control/permissions'
import type { ACUser, UserStatus, Role, Department } from '../../features/access-control/types'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { isSupabaseConfigured } from "../../lib/supabase"
import { fetchUsers as sbFetchUsers, fetchRoles as sbFetchRoles, fetchDepartments as sbFetchDepts, createUser as sbCreateUser, updateUser as sbUpdateUser, deleteUser as sbDeleteUser, suspendUser as sbSuspendUser } from "../../lib/supabase-access-control"


const STATUS_STYLE: Record<UserStatus, { bg: string; color: string }> = {
  active:    { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  inactive:  { bg: 'hsl(var(--border) / 0.5)', color: 'hsl(var(--text-4))' },
  pending:   { bg: 'hsl(var(--s-wn-bg))',  color: 'hsl(var(--s-wn-tx))' },
  suspended: { bg: 'hsl(var(--s-er-bg))',   color: 'hsl(var(--destructive))' },
}

const COLOR_STYLES: Record<string, { bg: string; color: string }> = {
  zinc:    { bg: 'hsl(240 5% 64% / 0.15)',  color: 'hsl(240 5% 45%)' },
  emerald: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  blue:    { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  amber:   { bg: 'hsl(var(--s-wn-bg))',  color: 'hsl(var(--s-wn-tx))' },
  red:     { bg: 'hsl(var(--s-er-bg))',   color: 'hsl(var(--destructive))' },
  purple:  { bg: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' },
  orange:  { bg: 'hsl(var(--s-wn-bg))',  color: 'hsl(25 90% 45%)' },
}

function Avatar({ user }: { user: ACUser }) {
  return (
    <div className="w-8 h-8 flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}>
      {user.firstName[0]}{user.lastName[0]}
    </div>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  const s = STATUS_STYLE[status] || { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }
  return <span className="text-[11px] px-2 py-0.5 font-medium" style={s}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

function formatLogin(dt?: string): string {
  if (!dt) return 'Never'
  const d = new Date(dt)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff}d ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return `${Math.floor(diff / 30)}mo ago`
}

function getEffectivePermissions(user: ACUser, roles: Role[]): string[] {
  const perms = new Set<string>()
  for (const rid of user.roleIds) {
    const role = roles.find(r => r.id === rid)
    if (role) role.permissions.forEach(p => perms.add(p))
  }
  return Array.from(perms)
}

const BLANK_FORM = {
  firstName: '', lastName: '', email: '', status: 'pending' as UserStatus,
  departmentId: '', notes: '', roleIds: [] as string[],
}

export default function UsersPage() {
  const [users, setUsers] = useState<ACUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [deptFilter, setDeptFilter] = useState('All')
  const [roleFilter, setRoleFilter] = useState('All')

  const [selected, setSelected] = useState<ACUser | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<ACUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ACUser | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<ACUser | null>(null)

  const [step, setStep] = useState(1)
  const [form, setForm] = useState(BLANK_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      if (!isSupabaseConfigured()) {
        setUsers(SEED_USERS); setRoles(SEED_ROLES); setDepartments(SEED_DEPARTMENTS)
        return
      }
      const [u, r, d] = await Promise.all([sbFetchUsers(), sbFetchRoles(), sbFetchDepts()])
      setUsers(u); setRoles(r); setDepartments(d)
    } catch(e) {
      logger.error(e)
      setLoadError(e instanceof Error ? e.message : 'Failed to load users.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase()
      const name = `${u.firstName} ${u.lastName}`.toLowerCase()
      const matchQ = name.includes(q) || u.email.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'All' || u.status === statusFilter
      const matchDept = deptFilter === 'All' || u.departmentId === deptFilter
      const matchRole = roleFilter === 'All' || u.roleIds.includes(roleFilter)
      return matchQ && matchStatus && matchDept && matchRole
    })
  }, [users, search, statusFilter, deptFilter, roleFilter])

  function clearFilters() {
    setSearch(''); setStatusFilter('All'); setDeptFilter('All'); setRoleFilter('All')
  }

  function openCreate() {
    setEditTarget(null)
    setForm(BLANK_FORM)
    setFormError(null)
    setStep(1)
    setShowCreate(true)
  }

  function openEdit(u: ACUser) {
    setEditTarget(u)
    setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, status: u.status, departmentId: u.departmentId, notes: '', roleIds: [...u.roleIds] })
    setFormError(null)
    setStep(1)
    setShowCreate(true)
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!form.firstName.trim()) return 'First name is required.'
      if (!form.lastName.trim()) return 'Last name is required.'
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'A valid email is required.'
      const conflict = users.find(u => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== editTarget?.id)
      if (conflict) return 'A user with this email already exists.'
    }
    if (s === 2) {
      if (!form.departmentId) return 'Department is required.'
    }
    if (s === 3) {
      if (form.roleIds.length === 0) return 'Assign at least one role.'
    }
    return null
  }

  function nextStep() {
    const err = validateStep(step)
    if (err) { setFormError(err); return }
    setFormError(null)
    setStep(s => s + 1)
  }

  async function handleSave() {
    const err = validateStep(3)
    if (err) { setFormError(err); return }
    setSaving(true)
    try {
      if (editTarget) {
        if (isSupabaseConfigured()) {
          await sbUpdateUser(editTarget.id, form)
        }
        const updated: ACUser = { ...editTarget, firstName: form.firstName, lastName: form.lastName, email: form.email, status: form.status, departmentId: form.departmentId, roleIds: form.roleIds, updatedAt: new Date().toISOString().split('T')[0] }
        setUsers(p => p.map(u => u.id === editTarget.id ? updated : u))
        if (selected?.id === editTarget.id) setSelected(updated)
        toast.success('User updated.')
      } else {
        if (isSupabaseConfigured()) {
          const created = await sbCreateUser(form)
          if (created) setUsers(p => [created, ...p])
        } else {
          const newU: ACUser = {
            id: `usr-${String(users.length + 1).padStart(3, '0')}`,
            firstName: form.firstName, lastName: form.lastName, email: form.email,
            status: form.status, departmentId: form.departmentId, roleIds: form.roleIds,
            createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0],
          }
          setUsers(p => [newU, ...p])
        }
        toast.success('User created. An activation email will be sent.')
      }
      setShowCreate(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      if (isSupabaseConfigured()) {
        await sbDeleteUser(deleteTarget.id)
      }
      setUsers(p => p.filter(u => u.id !== deleteTarget.id))
      if (selected?.id === deleteTarget.id) setSelected(null)
      toast.success(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete user.')
    }
  }

  async function handleSuspend() {
    if (!suspendTarget) return
    try {
      const newStatus: UserStatus = suspendTarget.status === 'suspended' ? 'active' : 'suspended'
      if (isSupabaseConfigured()) {
        await sbSuspendUser(suspendTarget.id, newStatus === 'suspended')
      }
      const updated = { ...suspendTarget, status: newStatus, updatedAt: new Date().toISOString().split('T')[0] }
      setUsers(p => p.map(u => u.id === suspendTarget.id ? updated : u))
      if (selected?.id === suspendTarget.id) setSelected(updated)
      toast.success(`${suspendTarget.firstName} ${suspendTarget.lastName} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}.`)
      setSuspendTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user status.')
    }
  }

  const getDept = (id: string) => departments.find(d => d.id === id)
  const getRole = (id: string) => roles.find(r => r.id === id)

  const selectedUser = selected
  const selectedEffectivePerms = selectedUser ? getEffectivePermissions(selectedUser, roles) : []

  // Effective permissions preview for step 3
  const previewPerms = getEffectivePermissions({ ...({} as ACUser), roleIds: form.roleIds }, roles)
  const hasAdmin = previewPerms.some(p => p.includes(':admin'))

  const activeFilters = [statusFilter !== 'All', deptFilter !== 'All', roleFilter !== 'All'].filter(Boolean).length

  if (loading) return <PageSkeleton title="Users" />

  function exportCsv() {
    if (!filtered.length) return
    const rows = filtered.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      status: u.status,
      departmentId: u.departmentId,
      lastLogin: u.lastLogin ?? '',
      createdAt: u.createdAt,
    }))
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? '')).join(','))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'users.csv'
    a.click()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Users size={20} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            Users
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
            Manage platform users, role assignments, and access status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
            <Export size={14} /> Export CSV
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] hover:opacity-90" style={{ background: 'hsl(var(--brand))' }}>
            <Plus size={14} weight="bold" /> Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'hsl(var(--text-1))' },
          { label: 'Active', value: users.filter(u => u.status === 'active').length, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Pending', value: users.filter(u => u.status === 'pending').length, color: 'hsl(var(--s-wn-tx))' },
          { label: 'Suspended', value: users.filter(u => u.status === 'suspended').length, color: 'hsl(var(--destructive))' },
        ].map(s => (
          <div key={s.label} className="p-4 border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            className="w-full pl-8 pr-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
          <option value="All">All Status</option>
          {(['active','inactive','pending','suspended'] as UserStatus[]).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
          <option value="All">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
          <option value="All">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {activeFilters > 0 && (
          <button onClick={clearFilters} className="text-xs px-2 py-1.5 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
            Clear ({activeFilters})
          </button>
        )}
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="border overflow-hidden" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                {['User', 'Email', 'Department', 'Roles', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{search || activeFilters > 0 ? 'No results match your filters' : 'No users yet'}</p>
                  {search || activeFilters > 0
                    ? <button onClick={clearFilters} className="mt-3 text-xs px-3 py-1.5 border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>Clear Filters</button>
                    : <button onClick={openCreate} className="mt-4 px-4 py-2 text-xs font-medium text-[hsl(var(--bg-surface))]" style={{ background: 'hsl(var(--brand))' }}>+ Invite User</button>}
                </td></tr>
              ) : filtered.map(u => {
                const dept = getDept(u.departmentId)
                const userRoles = u.roleIds.map(rid => getRole(rid)).filter(Boolean) as Role[]
                return (
                  <tr key={u.id} className="hover:opacity-90 cursor-pointer" style={{ borderBottom: '1px solid hsl(var(--border))' }} onClick={() => setSelected(u)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={u} />
                        <span className="font-medium text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-1))' }}>{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{u.email}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-3))' }}>{dept?.code ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.slice(0, 2).map(r => (
                          <span key={r.id} className="text-[10px] px-1.5 py-0.5 whitespace-nowrap" style={COLOR_STYLES[r.color] || { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{r.name}</span>
                        ))}
                        {userRoles.length > 2 && <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' }}>+{userRoles.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{formatLogin(u.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelected(u)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--text-4))' }} title="View"><Eye size={14} /></button>
                        <button onClick={() => openEdit(u)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--text-4))' }} title="Edit"><PencilSimple size={14} /></button>
                        <button onClick={() => setSuspendTarget(u)} className="p-1.5 hover:opacity-70" style={{ color: u.status === 'suspended' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }} title={u.status === 'suspended' ? 'Reactivate' : 'Suspend'}>
                          <Warning size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(u)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--destructive))' }} title="Delete"><Trash size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[500px] flex flex-col h-full overflow-y-auto" style={{ background: 'hsl(var(--bg-surface))', borderLeft: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-3">
                <Avatar user={selectedUser} />
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selectedUser.firstName} {selectedUser.lastName}</h2>
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} style={{ color: 'hsl(var(--text-4))' }} /></button>
            </div>
            <div className="p-4 space-y-5 flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedUser.status} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Department', value: getDept(selectedUser.departmentId)?.name ?? '—' },
                  { label: 'Last Login', value: formatLogin(selectedUser.lastLogin) },
                  { label: 'Member Since', value: selectedUser.createdAt },
                ].map(s => (
                  <div key={s.label} className="p-3 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                    <p className="text-[10px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
                    <p className="text-xs font-medium mt-0.5 truncate" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Assigned Roles */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text-3))' }}>Assigned Roles</p>
                <div className="space-y-2">
                  {selectedUser.roleIds.map(rid => {
                    const r = getRole(rid)
                    if (!r) return null
                    return (
                      <div key={rid} className="flex items-center justify-between px-3 py-2 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                        <div>
                          <span className="text-[11px] px-2 py-0.5 font-medium" style={COLOR_STYLES[r.color] || { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{r.name}</span>
                          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{r.permissions.length} permissions</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Effective Permissions */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text-3))' }}>
                  Effective Permissions ({selectedEffectivePerms.length})
                </p>
                <div className="space-y-2">
                  {PERMISSION_SECTIONS.map(section => {
                    const sectionPerms = PERMISSIONS.filter(p => p.section === section && selectedEffectivePerms.includes(p.id))
                    if (sectionPerms.length === 0) return null
                    return (
                      <div key={section}>
                        <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'hsl(var(--text-4))' }}>{section}</p>
                        <div className="flex flex-wrap gap-1">
                          {sectionPerms.map(p => (
                            <span key={p.id} className="text-[10px] px-1.5 py-0.5 border" style={{ background: 'hsl(var(--brand) / 0.08)', borderColor: 'hsl(var(--brand) / 0.2)', color: 'hsl(var(--brand))' }}>
                              {p.key}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 flex gap-2 flex-wrap" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button onClick={() => { setSelected(null); openEdit(selectedUser) }} className="flex items-center gap-1.5 px-4 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                <PencilSimple size={14} /> Edit
              </button>
              <button onClick={() => { setSuspendTarget(selectedUser); setSelected(null) }} className="flex items-center gap-1.5 px-4 py-2 text-sm border hover:opacity-80"
                style={selectedUser.status === 'suspended'
                  ? { borderColor: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
                  : { borderColor: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
                <Warning size={14} /> {selectedUser.status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
              <button onClick={() => { setDeleteTarget(selectedUser); setSelected(null) }} className="flex items-center gap-1.5 px-4 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive))' }}>
                <Trash size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form (3-step) */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-xl mx-4 shadow-2xl flex flex-col max-h-[90vh]" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            {/* Header + Step Indicator */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  {editTarget ? 'Edit User' : 'Invite User'}
                </h2>
                <button onClick={() => setShowCreate(false)}><X size={16} style={{ color: 'hsl(var(--text-4))' }} /></button>
              </div>
              <div className="flex items-center gap-0">
                {[{ n: 1, label: 'Identity' }, { n: 2, label: 'Organization' }, { n: 3, label: 'Access' }].map(({ n, label }) => (
                  <div key={n} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 flex items-center justify-center text-xs font-bold"
                        style={step >= n
                          ? { background: 'hsl(var(--brand))', color: 'white' }
                          : { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))', border: '1px solid hsl(var(--border))' }}>
                        {n}
                      </div>
                      <span className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: step >= n ? 'hsl(var(--brand))' : 'hsl(var(--text-4))' }}>{label}</span>
                    </div>
                    {n < 3 && <div className="w-16 h-px mx-2 mb-4" style={{ background: step > n ? 'hsl(var(--brand))' : 'hsl(var(--border))' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>First Name *</label>
                      <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} placeholder="Alexander"
                        className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Last Name *</label>
                      <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Chen"
                        className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Email Address *</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="a.chen@acme-corp.com"
                      className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Initial Status</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as UserStatus }))}
                      className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
                      <option value="pending">Pending (awaiting activation)</option>
                      <option value="active">Active (immediate access)</option>
                    </select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Department *</label>
                    <select value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
                      <option value="">Select department…</option>
                      {departments.filter(d => d.status === 'active').map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Notes (Optional)</label>
                    <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Any context about this user's role or access requirements…"
                      className="w-full px-3 py-2 text-sm border outline-none resize-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wide mb-2 block" style={{ color: 'hsl(var(--text-4))' }}>Assign Roles * (select one or more)</label>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto border" style={{ borderColor: 'hsl(var(--border))' }}>
                      {roles.map(r => {
                        const checked = form.roleIds.includes(r.id)
                        return (
                          <label key={r.id} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:opacity-80" style={{ background: checked ? 'hsl(var(--brand) / 0.05)' : 'hsl(var(--bg-raised))', borderBottom: '1px solid hsl(var(--border))' }}>
                            <input type="checkbox" checked={checked} onChange={() => {
                              setForm(p => ({ ...p, roleIds: checked ? p.roleIds.filter(id => id !== r.id) : [...p.roleIds, r.id] }))
                            }} className="mt-0.5 w-3.5 h-3.5" style={{ accentColor: 'hsl(var(--brand))' }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] px-2 py-0.5 font-medium" style={COLOR_STYLES[r.color] || { bg: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>{r.name}</span>
                                {r.isSystem && <span className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>System</span>}
                              </div>
                              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'hsl(var(--text-4))' }}>{r.description}</p>
                            </div>
                            <span className="text-[10px] flex-shrink-0" style={{ color: 'hsl(var(--text-4))' }}>{r.permissions.length} perms</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Effective permissions preview */}
                  {form.roleIds.length > 0 && (
                    <div className="p-3 border" style={{ background: 'hsl(var(--brand) / 0.04)', borderColor: 'hsl(var(--brand) / 0.15)' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--brand))' }}>
                        Effective Permissions Preview ({previewPerms.length} total)
                      </p>
                      {hasAdmin && (
                        <div className="flex items-center gap-1.5 mb-2 text-[10px]" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                          <Warning size={12} /> Combined roles grant admin-level access — review carefully.
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {previewPerms.slice(0, 20).map(pid => (
                          <span key={pid} className="text-[10px] px-1.5 py-0.5 border" style={{ background: 'hsl(var(--brand) / 0.08)', borderColor: 'hsl(var(--brand) / 0.2)', color: 'hsl(var(--brand))' }}>{pid}</span>
                        ))}
                        {previewPerms.length > 20 && <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>+{previewPerms.length - 20} more</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div className="mt-4 text-xs px-3 py-2 border" style={{ background: 'hsl(var(--s-er-bg))', borderColor: 'hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive))' }}>
                  {formError}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button onClick={() => { if (step > 1) { setStep(s => s - 1); setFormError(null) } else setShowCreate(false) }}
                className="flex items-center gap-1 px-4 py-2 text-sm border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                <CaretLeft size={13} /> {step > 1 ? 'Back' : 'Cancel'}
              </button>
              {step < 3 ? (
                <button onClick={nextStep} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] hover:opacity-90" style={{ background: 'hsl(var(--brand))' }}>
                  Continue <CaretRight size={13} />
                </button>
              ) : (
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] hover:opacity-90 disabled:opacity-60" style={{ background: 'hsl(var(--brand))' }}>
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create User'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete User?"
        description={`Permanently delete ${deleteTarget?.firstName} ${deleteTarget?.lastName} (${deleteTarget?.email}). This will revoke all access immediately.`}
        isDestructive
        confirmLabel="Delete User"
      />

      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={o => !o && setSuspendTarget(null)}
        onConfirm={handleSuspend}
        title={suspendTarget?.status === 'suspended' ? 'Reactivate User?' : 'Suspend User?'}
        description={suspendTarget?.status === 'suspended'
          ? `Reactivate ${suspendTarget?.firstName} ${suspendTarget?.lastName}? They will regain access to all assigned modules.`
          : `Suspend ${suspendTarget?.firstName} ${suspendTarget?.lastName}? This will revoke access to ${suspendTarget ? getEffectivePermissions(suspendTarget, roles).length : 0} permissions immediately.`}
        isDestructive={suspendTarget?.status !== 'suspended'}
        confirmLabel={suspendTarget?.status === 'suspended' ? 'Reactivate' : 'Suspend'}
      />
    </div>
  )
}
