import { useState, useMemo } from 'react'
import { Buildings, MagnifyingGlass, Plus, PencilSimple, Trash, Users, X, CaretDown, CaretUp } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { SEED_DEPARTMENTS, SEED_USERS } from '../../features/access-control/seed'
import type { Department } from '../../features/access-control/types'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { isSupabaseConfigured } from "../../lib/supabase"
import { fetchDepartments as sbFetchDepts, fetchUsers as sbFetchUsers, createDepartment as sbCreateDept, updateDepartment as sbUpdateDept, deleteDepartment as sbDeleteDept } from "../../lib/supabase-access-control"

const BLANK: Omit<Department, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', code: '', description: '', headCount: 0, status: 'active',
}

type SortKey = 'name' | 'headCount' | 'userCount' | 'status'

function validate(f: typeof BLANK, editing: boolean, existing: Department[], editId?: string): string | null {
  if (!f.name.trim() || f.name.trim().length < 2) return 'Department name must be at least 2 characters.'
  if (!f.code.trim() || f.code.trim().length < 2) return 'Code must be at least 2 characters.'
  if (!/^[A-Z0-9_]+$/.test(f.code.trim())) return 'Code must be uppercase letters, numbers, or underscores only.'
  const nameConflict = existing.find(d => d.name.toLowerCase() === f.name.trim().toLowerCase() && d.id !== editId)
  if (nameConflict) return 'A department with this name already exists.'
  const codeConflict = existing.find(d => d.code === f.code.trim() && d.id !== editId)
  if (codeConflict) return 'A department with this code already exists.'
  return null
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'inactive'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Department | null>(null)
  const [selected, setSelected] = useState<Department | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)
  const [form, setForm] = useState(BLANK)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured()) {
        const [d, u] = await Promise.all([sbFetchDepts(), sbFetchUsers()])
        setDepartments(d); setUsers(u)
      } else { setDepartments(SEED_DEPARTMENTS); setUsers(SEED_USERS) }
    } catch(e) { console.error(e); setDepartments(SEED_DEPARTMENTS); setUsers(SEED_USERS) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { loadData() }, [loadData])

  const userCount = useMemo(() => {
    const map: Record<string, number> = {}
    for (const u of users) {
      map[u.departmentId] = (map[u.departmentId] || 0) + 1
    }
    return map
  }, [users])

  const filtered = useMemo(() => {
    let list = departments.filter(d => {
      const q = search.toLowerCase()
      return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    })
    if (statusFilter !== 'All') list = list.filter(d => d.status === statusFilter)
    list = [...list].sort((a, b) => {
      let av: string | number = a[sortKey as keyof Department] as string | number
      let bv: string | number = b[sortKey as keyof Department] as string | number
      if (sortKey === 'userCount') { av = userCount[a.id] ?? 0; bv = userCount[b.id] ?? 0 }
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return list
  }, [departments, search, statusFilter, sortKey, sortAsc, userCount])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(true) }
  }

  function openCreate() {
    setEditTarget(null)
    setForm(BLANK)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(d: Department) {
    setEditTarget(d)
    setForm({ name: d.name, code: d.code, description: d.description, headCount: d.headCount, status: d.status })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSave() {
    const err = validate(form, !!editTarget, departments, editTarget?.id)
    if (err) { setFormError(err); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    if (editTarget) {
      const updated = { ...editTarget, ...form, code: form.code.toUpperCase(), updatedAt: new Date().toISOString().split('T')[0] }
      setDepartments(p => p.map(d => d.id === editTarget.id ? updated : d))
      if (selected?.id === editTarget.id) setSelected(updated)
      toast.success('Department updated.')
    } else {
      const newD: Department = {
        id: `dept-${String(departments.length + 1).padStart(3, '0')}`,
        ...form,
        code: form.code.toUpperCase(),
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      }
      setDepartments(p => [newD, ...p])
      toast.success('Department created.')
    }
    setSaving(false)
    setShowForm(false)
  }

  function handleDelete() {
    if (!deleteTarget) return
    const inUse = users.filter(u => u.departmentId === deleteTarget.id).length
    setDepartments(p => p.filter(d => d.id !== deleteTarget.id))
    if (selected?.id === deleteTarget.id) setSelected(null)
    toast.success(`${deleteTarget.name} deleted.${inUse > 0 ? ` ${inUse} user(s) now have no department.` : ''}`)
    setDeleteTarget(null)
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 opacity-30">↕</span>
    return sortAsc ? <CaretUp size={11} className="ml-1 inline" /> : <CaretDown size={11} className="ml-1 inline" />
  }

  const deptUsers = selected ? users.filter(u => u.departmentId === selected.id) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Buildings size={20} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            Departments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
            Manage organizational departments and their user assignments
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white hover:opacity-90" style={{ background: 'hsl(var(--brand))' }}>
          <Plus size={14} weight="bold" /> New Department
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Departments', value: departments.length, color: 'hsl(var(--text-1))' },
          { label: 'Active', value: departments.filter(d => d.status === 'active').length, color: 'hsl(var(--s-ok-tx))' },
          { label: 'Total Users Assigned', value: users.length, color: 'hsl(var(--brand))' },
        ].map(s => (
          <div key={s.label} className="p-4 border" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or code…"
            className="w-full pl-8 pr-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="border overflow-hidden" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
              {[
                { label: 'Department', key: 'name' as SortKey },
                { label: 'Code', key: null },
                { label: 'Description', key: null },
                { label: 'Head Count', key: 'headCount' as SortKey },
                { label: 'Users', key: 'userCount' as SortKey },
                { label: 'Status', key: 'status' as SortKey },
                { label: 'Actions', key: null },
              ].map(col => (
                <th key={col.label} onClick={col.key ? () => toggleSort(col.key!) : undefined}
                  className={`text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide select-none ${col.key ? 'cursor-pointer hover:opacity-80' : ''}`}
                  style={{ color: 'hsl(var(--text-4))' }}>
                  {col.label}{col.key && <SortIcon k={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                <Buildings size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No departments found</p>
                <p className="text-xs mt-1">Create your first department to organize users and access structures.</p>
                <button onClick={openCreate} className="mt-4 px-4 py-2 text-xs font-medium text-white" style={{ background: 'hsl(var(--brand))' }}>+ Create Department</button>
              </td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} className="hover:opacity-90 cursor-pointer" style={{ borderBottom: '1px solid hsl(var(--border))' }} onClick={() => setSelected(d)}>
                <td className="px-4 py-3 font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{d.name}</td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--brand))' }}>{d.code}</td>
                <td className="px-4 py-3 text-xs max-w-[260px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{d.description || '—'}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{d.headCount}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                    <Users size={12} />{userCount[d.id] ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[11px] px-2 py-0.5 font-medium" style={d.status === 'active'
                    ? { background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' }
                    : { background: 'hsl(var(--border) / 0.5)', color: 'hsl(var(--text-4))' }}>
                    {d.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(d)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--text-4))' }} title="Edit"><PencilSimple size={14} /></button>
                    <button onClick={() => setDeleteTarget(d)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--destructive))' }} title="Delete"><Trash size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md mx-4 shadow-2xl" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                {editTarget ? 'Edit Department' : 'New Department'}
              </h2>
              <button onClick={() => setShowForm(false)}><X size={16} style={{ color: 'hsl(var(--text-4))' }} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Information Security" maxLength={80}
                  className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Code * <span className="normal-case">(2–10 chars, uppercase)</span></label>
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 10) }))} placeholder="e.g. INFOSEC"
                  className="w-full px-3 py-2 text-sm border outline-none font-mono" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--brand))' }} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} maxLength={300} placeholder="Brief description of this department's responsibilities…"
                  className="w-full px-3 py-2 text-sm border outline-none resize-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Head Count</label>
                  <input type="number" min={0} value={form.headCount} onChange={e => setForm(p => ({ ...p, headCount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Status</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              {formError && <p className="text-xs px-3 py-2 border" style={{ background: 'hsl(0 72% 51% / 0.08)', borderColor: 'hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive))' }}>{formError}</p>}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60" style={{ background: 'hsl(var(--brand))' }}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[420px] flex flex-col h-full overflow-y-auto" style={{ background: 'hsl(var(--bg-surface))', borderLeft: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div>
                <span className="font-mono text-xs" style={{ color: 'hsl(var(--brand))' }}>{selected.code}</span>
                <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} style={{ color: 'hsl(var(--text-4))' }} /></button>
            </div>
            <div className="p-4 space-y-4 flex-1">
              <div className="flex gap-2">
                <span className="text-[11px] px-2 py-0.5 font-medium" style={selected.status === 'active'
                  ? { background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' }
                  : { background: 'hsl(var(--border) / 0.5)', color: 'hsl(var(--text-4))' }}>
                  {selected.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              {selected.description && <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Head Count', value: selected.headCount },
                  { label: 'Assigned Users', value: userCount[selected.id] ?? 0 },
                  { label: 'Created', value: selected.createdAt },
                ].map(s => (
                  <div key={s.label} className="p-3 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                    <p className="text-[10px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
                    <p className="text-sm font-semibold mt-0.5" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text-3))' }}>Users in this Department ({deptUsers.length})</p>
                {deptUsers.length === 0 ? (
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No users assigned to this department.</p>
                ) : (
                  <div className="space-y-1.5">
                    {deptUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2 px-3 py-2 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                        <div className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{u.email}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5" style={u.status === 'active'
                          ? { background: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' }
                          : u.status === 'pending'
                          ? { background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(45 85% 40%)' }
                          : { background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' }}>
                          {u.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button onClick={() => { setSelected(null); openEdit(selected) }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                <PencilSimple size={14} /> Edit
              </button>
              <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="px-4 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive))' }}>
                <Trash size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Department?"
        description={`Remove "${deleteTarget?.name}". ${(userCount[deleteTarget?.id ?? ''] ?? 0) > 0 ? `Warning: ${userCount[deleteTarget?.id ?? '']} user(s) are currently assigned to this department.` : 'No users are currently assigned.'}`}
        isDestructive
        confirmLabel="Delete"
      />
    </div>
  )
}
