// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS4 — Permission Matrix: visual role × module permission grid.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MODULES = ['risks','models','compliance','incidents','vendors','evidence','audit_log','hitl','bias_audits','training','settings','access_control']
const ACTIONS = ['read','create','update','delete','approve','export']

export default function PermissionMatrix() {
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('sentinel_roles').select('*').order('tier').then(({ data }) => {
      setRoles(data ?? [])
      setLoading(false)
    })
  }, [])

  function hasPermission(role: any, module: string, action: string): boolean {
    const p = role.permissions
    if (p['*']?.includes('*') || p['*']?.includes(action)) return true
    if (p[module]?.includes('*') || p[module]?.includes(action)) return true
    return false
  }

  if (loading) return <div className="p-8 text-zinc-400">Loading permission matrix...</div>

  return (
    <main id="main-content" className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Permission Matrix</h1>
        <p className="text-zinc-500 text-sm mt-1">12-role RBAC matrix — server-enforced via RLS + permission_check().</p>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full" role="grid" aria-label="Role permission matrix">
          <thead>
            <tr className="bg-zinc-50">
              <th className="border border-zinc-200 px-3 py-2 text-left font-medium text-zinc-700 sticky left-0 bg-zinc-50">Module / Role</th>
              {roles.map(r => (
                <th key={r.slug} className="border border-zinc-200 px-2 py-2 text-center font-medium text-zinc-700 whitespace-nowrap" style={{ minWidth: 80 }}>
                  <div>{r.display_name}</div>
                  <div className="text-zinc-400 font-normal">T{r.tier}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => (
              <tr key={mod} className="hover:bg-zinc-50">
                <td className="border border-zinc-200 px-3 py-2 font-medium text-zinc-700 sticky left-0 bg-white capitalize">{mod.replace(/_/g,' ')}</td>
                {roles.map(role => {
                  const canRead = hasPermission(role, mod, 'read')
                  const canWrite = hasPermission(role, mod, 'create') || hasPermission(role, mod, 'update')
                  const canDelete = hasPermission(role, mod, 'delete')
                  const canApprove = hasPermission(role, mod, 'approve')
                  return (
                    <td key={role.slug} className="border border-zinc-200 px-2 py-2 text-center">
                      <div className="flex justify-center gap-0.5 flex-wrap">
                        {canRead && <span className="w-2 h-2 rounded-full bg-blue-400" title="Read" />}
                        {canWrite && <span className="w-2 h-2 rounded-full bg-green-400" title="Write" />}
                        {canDelete && <span className="w-2 h-2 rounded-full bg-red-400" title="Delete" />}
                        {canApprove && <span className="w-2 h-2 rounded-full bg-purple-400" title="Approve" />}
                        {!canRead && !canWrite && !canDelete && !canApprove && <span className="text-zinc-200">—</span>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-4 mt-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Read</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Write</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Delete</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Approve</span>
        </div>
      </div>
    </main>
  )
}
