import logger from '@/lib/logger';
import { useState, useMemo, useCallback, useEffect } from 'react'
import { ShieldCheck, Plus, PencilSimple, Trash, Copy, X, Check, CaretDown, CaretRight, MagnifyingGlass, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { SEED_ROLES, SEED_USERS } from '../../features/access-control/seed'
import { PERMISSIONS, PERMISSION_SECTIONS, PERMISSION_MODULES_BY_SECTION } from '../../features/access-control/permissions'
import type { Role, RoleColor } from '../../features/access-control/types'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { isSupabaseConfigured } from "../../lib/supabase"
import { fetchRoles as sbFetchRoles, fetchUsers as sbFetchUsers, createRole as sbCreateRole, updateRole as sbUpdateRole, deleteRole as sbDeleteRole } from "../../lib/supabase-access-control"


const COLOR_STYLES: Record<RoleColor, { bg: string; color: string }> = {
  zinc:    { bg: 'hsl(240 5% 64% / 0.15)',  color: 'hsl(240 5% 45%)' },
  emerald: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  blue:    { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  amber:   { bg: 'hsl(var(--s-wn-bg))',  color: 'hsl(var(--s-wn-tx))' },
  red:     { bg: 'hsl(var(--s-er-bg))',   color: 'hsl(var(--destructive))' },
  purple:  { bg: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' },
  orange:  { bg: 'hsl(var(--s-wn-bg))',  color: 'hsl(25 90% 45%)' },
}

const COLORS: RoleColor[] = ['zinc', 'emerald', 'blue', 'amber', 'red', 'purple', 'orange']

function RoleBadge({ role }: { role: Role }) {
  const s = COLOR_STYLES[role.color]
  return (
    <span className="text-[11px] px-2 py-0.5 font-medium" style={s}>{role.name}</span>
  )
}

function PermissionTree({ selected, onChange, readOnly }: {
  selected: string[]
  onChange: (ids: string[]) => void
  readOnly?: boolean
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(PERMISSION_SECTIONS.map(s => [s, true]))
  )

  function sectionPerms(section: string) {
    return PERMISSIONS.filter(p => p.section === section).map(p => p.id)
  }
  function modulePerms(module: string) {
    return PERMISSIONS.filter(p => p.module === module).map(p => p.id)
  }

  function isSectionFull(section: string) {
    return sectionPerms(section).every(id => selected.includes(id))
  }
  function isSectionPartial(section: string) {
    const perms = sectionPerms(section)
    return perms.some(id => selected.includes(id)) && !isSectionFull(section)
  }
  function isModuleFull(module: string) {
    return modulePerms(module).every(id => selected.includes(id))
  }
  function isModulePartial(module: string) {
    const perms = modulePerms(module)
    return perms.some(id => selected.includes(id)) && !isModuleFull(module)
  }

  function toggleSection(section: string) {
    const ids = sectionPerms(section)
    if (isSectionFull(section)) onChange(selected.filter(id => !ids.includes(id)))
    else onChange([...new Set([...selected, ...ids])])
  }

  function toggleModule(module: string) {
    const ids = modulePerms(module)
    if (isModuleFull(module)) onChange(selected.filter(id => !ids.includes(id)))
    else onChange([...new Set([...selected, ...ids])])
  }

  function togglePerm(id: string) {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id))
    else onChange([...selected, id])
  }

  const totalSelected = selected.length
  const total = PERMISSIONS.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>
          {totalSelected}/{total} permissions selected
        </span>
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={() => onChange(PERMISSIONS.map(p => p.id))} className="text-[11px] px-2 py-0.5 border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>Select All</button>
            <button onClick={() => onChange([])} className="text-[11px] px-2 py-0.5 border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>Clear All</button>
          </div>
        )}
      </div>
      {PERMISSION_SECTIONS.map(section => (
        <div key={section} className="border" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" style={{ background: 'hsl(var(--bg-raised))' }}>
            {!readOnly && (
              <input type="checkbox" checked={isSectionFull(section)} ref={el => { if (el) el.indeterminate = isSectionPartial(section) }}
                onChange={() => toggleSection(section)} className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: 'hsl(var(--brand))' }} />
            )}
            <button onClick={() => setExpanded(p => ({ ...p, [section]: !p[section] }))} className="flex-1 flex items-center gap-2 text-left">
              {expanded[section] ? <CaretDown size={12} style={{ color: 'hsl(var(--text-4))' }} /> : <CaretRight size={12} style={{ color: 'hsl(var(--text-4))' }} />}
              <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{section}</span>
              <span className="text-[10px] ml-auto" style={{ color: 'hsl(var(--text-4))' }}>
                {PERMISSIONS.filter(p => p.section === section && selected.includes(p.id)).length}/{PERMISSIONS.filter(p => p.section === section).length}
              </span>
            </button>
          </div>
          {expanded[section] && (
            <div className="divide-y" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {(PERMISSION_MODULES_BY_SECTION[section] || []).map(module => {
                const modPerms = PERMISSIONS.filter(p => p.module === module)
                return (
                  <div key={module} className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      {!readOnly && (
                        <input type="checkbox" checked={isModuleFull(module)} ref={el => { if (el) el.indeterminate = isModulePartial(module) }}
                          onChange={() => toggleModule(module)} className="w-3.5 h-3.5 cursor-pointer" style={{ accentColor: 'hsl(var(--brand))' }} />
                      )}
                      <span className="text-[11px] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{module}</span>
                      {isModuleFull(module) && <Check size={11} style={{ color: 'hsl(var(--s-ok-tx))' }} />}
                      {isModulePartial(module) && <span className="text-[10px]" style={{ color: 'hsl(var(--s-wn-tx))' }}>partial</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-5">
                      {modPerms.map(p => (
                        <label key={p.id} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 border ${readOnly ? '' : 'cursor-pointer hover:opacity-80'}`}
                          style={selected.includes(p.id)
                            ? { background: 'hsl(var(--brand) / 0.1)', borderColor: 'hsl(var(--brand) / 0.3)', color: 'hsl(var(--brand))' }
                            : { background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
                          {!readOnly && (
                            <input type="checkbox" checked={selected.includes(p.id)} onChange={() => togglePerm(p.id)} className="w-3 h-3" style={{ accentColor: 'hsl(var(--brand))' }} />
                          )}
                          {p.action}
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const BLANK_FORM = { name: '', code: '', description: '', color: 'emerald' as RoleColor, permissions: [] as string[] }

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'All' | 'System' | 'Custom'>('All')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Role | null>(null)
  const [selected, setSelected] = useState<Role | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
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
        setRoles(SEED_ROLES); setUsers(SEED_USERS)
        return
      }
      const [r, u] = await Promise.all([sbFetchRoles(), sbFetchUsers()])
      setRoles(r); setUsers(u)
    } catch(e) {
      logger.error(e)
      setLoadError(e instanceof Error ? e.message : 'Failed to load roles.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadData() }, [loadData])

  const filtered = useMemo(() => {
    let list = roles.filter(r => {
      const q = search.toLowerCase()
      return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
    })
    if (typeFilter === 'System') list = list.filter(r => r.isSystem)
    if (typeFilter === 'Custom') list = list.filter(r => !r.isSystem)
    return list
  }, [roles, search, typeFilter])

  function openCreate() {
    setEditTarget(null)
    setForm(BLANK_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(r: Role) {
    setEditTarget(r)
    setForm({ name: r.name, code: r.code, description: r.description, color: r.color, permissions: [...r.permissions] })
    setFormError(null)
    setShowForm(true)
  }

  function openDuplicate(r: Role) {
    setEditTarget(null)
    setForm({ name: `Copy of ${r.name}`, code: `${r.code}_COPY`, description: r.description, color: r.color, permissions: [...r.permissions] })
    setFormError(null)
    setShowForm(true)
  }

  function autoCode(name: string) {
    return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30)
  }

  function validateForm(): string | null {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Role name must be at least 2 characters.'
    if (!form.code.trim()) return 'Role code is required.'
    if (form.permissions.length === 0) return 'Select at least one permission.'
    const nameConflict = roles.find(r => r.name.toLowerCase() === form.name.trim().toLowerCase() && r.id !== editTarget?.id)
    if (nameConflict) return 'A role with this name already exists.'
    const codeConflict = roles.find(r => r.code === form.code.trim() && r.id !== editTarget?.id)
    if (codeConflict) return 'A role with this code already exists.'
    return null
  }

  async function handleSave() {
    const err = validateForm()
    if (err) { setFormError(err); return }
    setSaving(true)
    try {
      if (editTarget) {
        if (isSupabaseConfigured()) {
          await sbUpdateRole(editTarget.id, form)
        }
        const updated: Role = { ...editTarget, ...form, updatedAt: new Date().toISOString().split('T')[0] }
        setRoles(p => p.map(r => r.id === editTarget.id ? updated : r))
        if (selected?.id === editTarget.id) setSelected(updated)
        toast.success('Role updated.')
      } else {
        if (isSupabaseConfigured()) {
          const created = await sbCreateRole(form)
          if (created) setRoles(p => [created, ...p])
        } else {
          const newR: Role = {
            id: `role-${String(roles.length + 1).padStart(3, '0')}`,
            ...form,
            isSystem: false,
            userCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
          }
          setRoles(p => [newR, ...p])
        }
        toast.success('Role created.')
      }
      setShowForm(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save role.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      if (isSupabaseConfigured()) {
        await sbDeleteRole(deleteTarget.id)
      }
      setRoles(p => p.filter(r => r.id !== deleteTarget.id))
      if (selected?.id === deleteTarget.id) setSelected(null)
      toast.success(`Role "${deleteTarget.name}" deleted.`)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete role.')
    }
  }

  const roleUsers = selected ? users.filter(u => u.roleIds.includes(selected.id)) : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <ShieldCheck size={20} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            Roles & Permissions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
            Define roles and configure granular module-level permissions
          </p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] hover:opacity-90" style={{ background: 'hsl(var(--brand))' }}>
          <Plus size={14} weight="bold" /> New Role
        </button>
      </div>

      {loading && (
        <div role="status" aria-live="polite" className="border px-4 py-8 text-sm text-center" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-4))' }}>
          Loading roles…
        </div>
      )}
      {loadError && (
        <div role="alert" className="border px-4 py-3 text-sm flex items-start gap-2" style={{ borderColor: 'hsl(var(--s-er-tx))', color: 'hsl(var(--s-er-tx))' }}>
          <Warning size={16} aria-hidden />
          <span>{loadError}</span>
        </div>
      )}

      {!loading && !loadError && (<>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Roles', value: roles.length, color: 'hsl(var(--text-1))' },
          { label: 'System Roles', value: roles.filter(r => r.isSystem).length, color: 'hsl(var(--brand))' },
          { label: 'Custom Roles', value: roles.filter(r => !r.isSystem).length, color: 'hsl(var(--s-ok-tx))' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles…"
            className="w-full pl-8 pr-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
        </div>
        {(['All', 'System', 'Custom'] as const).map(f => (
          <button key={f} onClick={() => setTypeFilter(f)} className="text-xs px-3 py-1.5 border transition-colors"
            style={typeFilter === f
              ? { background: 'hsl(var(--brand))', color: 'white', borderColor: 'hsl(var(--brand))' }
              : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-3))' }}>
            {f}
          </button>
        ))}
        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{filtered.length} role{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="border overflow-hidden" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
              {['Role', 'Code', 'Description', 'Permissions', 'Users', 'Type', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                <ShieldCheck size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">No roles found</p>
                <p className="text-xs mt-1">System roles are always available. Create a custom role to define tailored access.</p>
                <button onClick={openCreate} className="mt-4 px-4 py-2 text-xs font-medium text-[hsl(var(--bg-surface))]" style={{ background: 'hsl(var(--brand))' }}>+ Create Role</button>
              </td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:opacity-90 cursor-pointer" style={{ borderBottom: '1px solid hsl(var(--border))' }} onClick={() => setSelected(r)}>
                <td className="px-4 py-3"><RoleBadge role={r} /></td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: 'hsl(var(--brand))' }}>{r.code}</td>
                <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{r.description}</td>
                <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.permissions.length}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.userCount}</td>
                <td className="px-4 py-3">
                  {r.isSystem
                    ? <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' }}>System</span>
                    : <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-4))' }}>Custom</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--text-4))' }} title="Edit"><PencilSimple size={14} /></button>
                    <button onClick={() => openDuplicate(r)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--text-4))' }} title="Duplicate"><Copy size={14} /></button>
                    {!r.isSystem && (
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 hover:opacity-70" style={{ color: 'hsl(var(--destructive))' }} title="Delete"><Trash size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-2xl mx-4 shadow-2xl flex flex-col max-h-[90vh]" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                {editTarget ? `Edit Role: ${editTarget.name}` : 'Create New Role'}
              </h2>
              <button onClick={() => setShowForm(false)}><X size={16} style={{ color: 'hsl(var(--text-4))' }} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Meta fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Name *</label>
                  <input value={form.name} onChange={e => {
                    const name = e.target.value
                    setForm(p => ({ ...p, name, ...(!editTarget ? { code: autoCode(name) } : {}) }))
                  }} placeholder="e.g. Data Privacy Officer" maxLength={80}
                    className="w-full px-3 py-2 text-sm border outline-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Code *</label>
                  <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 30) }))}
                    placeholder="AUTO_GENERATED" className="w-full px-3 py-2 text-sm border outline-none font-mono" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--brand))' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} maxLength={300} placeholder="What access does this role grant?"
                  className="w-full px-3 py-2 text-sm border outline-none resize-none" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-1))' }} />
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide mb-2 block" style={{ color: 'hsl(var(--text-4))' }}>Badge Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(p => ({ ...p, color: c }))} title={c}
                      className="w-7 h-7 border-2 transition-all" style={{
                        background: COLOR_STYLES[c].bg,
                        borderColor: form.color === c ? COLOR_STYLES[c].color : 'transparent',
                      }}>
                      {form.color === c && <Check size={14} style={{ color: COLOR_STYLES[c].color, margin: '0 auto' }} />}
                    </button>
                  ))}
                  <span className="ml-2 text-xs self-center" style={{ color: 'hsl(var(--text-4))' }}>
                    Preview: <RoleBadge role={{ ...({} as Role), name: form.name || 'Role', color: form.color }} />
                  </span>
                </div>
              </div>
              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Permissions *</label>
                  {editTarget?.isSystem && (
                    <span className="text-[10px] px-2 py-0.5 flex items-center gap-1" style={{ background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }}>
                      <Warning size={11} /> System roles cannot have permissions edited
                    </span>
                  )}
                </div>
                <PermissionTree selected={form.permissions} onChange={perms => setForm(p => ({ ...p, permissions: perms }))} readOnly={editTarget?.isSystem} />
              </div>
              {formError && (
                <p className="text-xs px-3 py-2 border" style={{ background: 'hsl(var(--s-er-bg))', borderColor: 'hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive))' }}>{formError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-[hsl(var(--bg-surface))] hover:opacity-90 disabled:opacity-60" style={{ background: 'hsl(var(--brand))' }}>
                {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-[520px] flex flex-col h-full overflow-y-auto" style={{ background: 'hsl(var(--bg-surface))', borderLeft: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <RoleBadge role={selected} />
                  {selected.isSystem && <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--tag-purple-bg))', color: 'hsl(var(--tag-purple))' }}>System</span>}
                </div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                  <span className="font-mono">{selected.code}</span> · {selected.permissions.length} permissions · {roleUsers.length} users
                </p>
              </div>
              <button onClick={() => setSelected(null)}><X size={18} style={{ color: 'hsl(var(--text-4))' }} /></button>
            </div>
            <div className="p-4 space-y-5 flex-1">
              {selected.description && <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>{selected.description}</p>}

              {/* Assigned Users */}
              {roleUsers.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text-3))' }}>Assigned Users ({roleUsers.length})</p>
                  <div className="space-y-1.5">
                    {roleUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2 px-3 py-2 border" style={{ background: 'hsl(var(--bg-raised))', borderColor: 'hsl(var(--border))' }}>
                        <div className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'hsl(var(--brand) / 0.15)', color: 'hsl(var(--brand))' }}>
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] truncate" style={{ color: 'hsl(var(--text-4))' }}>{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Permission Read-Only Tree */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--text-3))' }}>
                  Permissions ({selected.permissions.length})
                </p>
                <PermissionTree selected={selected.permissions} onChange={() => {}} readOnly />
              </div>
            </div>
            <div className="p-4 flex gap-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              {selected.isSystem && (
                <button onClick={() => { setSelected(null); openDuplicate(selected) }} className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                  <Copy size={14} /> Clone as Custom
                </button>
              )}
              <button onClick={() => { setSelected(null); openEdit(selected) }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                <PencilSimple size={14} /> Edit
              </button>
              <button onClick={() => { setSelected(null); openDuplicate(selected) }} className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
                <Copy size={14} /> Duplicate
              </button>
              {!selected.isSystem && (
                <button onClick={() => { setDeleteTarget(selected); setSelected(null) }} className="px-4 py-2 text-sm border hover:opacity-80" style={{ borderColor: 'hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive))' }}>
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </>)}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Role?"
        description={`Remove "${deleteTarget?.name}". This cannot be undone. Users assigned this role will lose its permissions.`}
        isDestructive
        confirmLabel="Delete Role"
      />
    </div>
  )
}
