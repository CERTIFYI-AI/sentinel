// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// C.6 — Session-scoped "view as role" impersonation for CISO/super_admin.
import { useState, useEffect } from 'react'
import { Eye, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSessionStore } from '../../store/sessionStore'

interface SentinelRole { slug: string; display_name: string; tier: number }

export function ViewAsRole() {
  const [roles, setRoles] = useState<SentinelRole[]>([])
  const { viewAsRole, setViewAsRole } = useSessionStore()
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    supabase.from('sentinel_roles').select('slug, display_name, tier').order('tier').then(({ data }) => setRoles(data ?? []))
  }, [])

  return (
    <div className="relative">
      {viewAsRole ? (
        <div className="flex items-center gap-2 px-2 py-1 bg-amber-100 border border-amber-300 rounded text-xs font-medium text-amber-800">
          <Eye size={11} />
          <span>Viewing as: {roles.find(r => r.slug === viewAsRole)?.display_name ?? viewAsRole}</span>
          <button
            onClick={() => { setViewAsRole(null); setShowPicker(false) }}
            className="hover:text-amber-900 focus:outline-none"
            aria-label="Exit role view"
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowPicker(p => !p)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-[#368F4D]"
          aria-label="View as different role"
        >
          <Eye size={11} />
          View as role
        </button>
      )}

      {showPicker && !viewAsRole && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-zinc-200 rounded shadow-lg min-w-[200px]">
          <p className="px-3 py-2 text-xs font-medium text-zinc-500 border-b border-zinc-100">Impersonate role (session only)</p>
          {roles.map(r => (
            <button key={r.slug} onClick={() => { setViewAsRole(r.slug); setShowPicker(false) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 flex items-center justify-between text-zinc-700">
              <span>{r.display_name}</span>
              <span className="text-zinc-400">T{r.tier}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
