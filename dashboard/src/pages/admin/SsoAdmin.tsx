// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// C.5 — SSO admin: SAML/OIDC connection management + SCIM provisioning status.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRequiredOrgId } from '../../hooks/useTenant'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { toast } from 'sonner'
import { Shield, Key, Users, CheckCircle, XCircle } from 'lucide-react'

interface SsoProvider {
  id: string
  name: string
  protocol: 'saml' | 'oidc'
  issuer_url: string
  is_active: boolean
  scim_enabled: boolean
  last_sync_at: string | null
  user_count: number
}

export default function SsoAdmin() {
  const orgId = useRequiredOrgId()
  const [providers, setProviders] = useState<SsoProvider[]>([])
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState<'providers' | 'scim' | 'claim_mapping'>('providers')
  const [form, setForm] = useState({ name: '', protocol: 'saml', issuer_url: '', sso_url: '', cert: '' })

  useEffect(() => {
    if (!orgId) return
    supabase.from('identity_providers').select('*').eq('org_id', orgId).then(({ data }) => setProviders(data ?? []))
  }, [orgId])

  async function addProvider() {
    if (!form.name || !form.issuer_url) { toast.error('Name and Issuer URL are required'); return }
    const { data, error } = await supabase.from('identity_providers').insert({
      org_id: orgId, name: form.name, protocol: form.protocol,
      issuer_url: form.issuer_url, is_active: false,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setProviders(p => [...p, data])
    setShowForm(false)
    toast.success('SSO provider added — configure metadata to activate')
  }

  return (
    <main id="main-content" className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
          <Shield className="text-[#368F4D]" size={22} />
          SSO & Identity Providers
        </h1>
        <p className="text-[hsl(var(--text-3))] text-sm mt-1">Configure SAML 2.0 / OIDC identity providers and SCIM 2.0 provisioning.</p>
      </div>

      <div className="flex gap-1 border-b border-[hsl(var(--border))]">
        {(['providers','scim','claim_mapping'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-[#368F4D] text-[#368F4D]' : 'text-[hsl(var(--text-3))] hover:text-[hsl(var(--text-1))]'}`}>
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {tab === 'providers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[hsl(var(--text-3))]">Enterprise SSO via SAML 2.0 or OIDC. SCIM 2.0 auto-provisioning available per provider.</p>
            <Button size="sm" onClick={() => setShowForm(true)}>Add Provider</Button>
          </div>

          {showForm && (
            <div className="border border-[hsl(var(--border))] rounded p-4 bg-[hsl(var(--bg-muted))] space-y-3">
              <h3 className="font-medium text-[hsl(var(--text-1))] text-sm">New Identity Provider</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Provider name (e.g. Okta Production)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <select value={form.protocol} onChange={e => setForm(f => ({ ...f, protocol: e.target.value }))}
                  className="border border-[hsl(var(--border))] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#368F4D]">
                  <option value="saml">SAML 2.0</option>
                  <option value="oidc">OpenID Connect</option>
                </select>
                <Input placeholder="Issuer URL / Entity ID" value={form.issuer_url} onChange={e => setForm(f => ({ ...f, issuer_url: e.target.value }))} className="col-span-2" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addProvider}>Add Provider</Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {providers.length === 0 ? (
            <div className="text-center py-12 text-[hsl(var(--text-4))]">
              <Key size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No SSO providers configured</p>
              <p className="text-sm mt-1">Add Okta, Azure AD, Google Workspace, or any SAML/OIDC IdP.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map(p => (
                <div key={p.id} className="border border-[hsl(var(--border))] rounded p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-[hsl(var(--text-1))]">{p.name}</p>
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                      <span className="text-xs text-[hsl(var(--text-4))] uppercase font-mono">{p.protocol}</span>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-4))] mt-0.5 font-mono">{p.issuer_url}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {p.scim_enabled ? <CheckCircle size={14} className="text-[hsl(var(--s-ok-tx))]" /> : <XCircle size={14} className="text-[hsl(var(--text-4))]" />}
                    <span className="text-[hsl(var(--text-3))]">SCIM</span>
                  </div>
                  {p.last_sync_at && <p className="text-xs text-[hsl(var(--text-4))]">Last sync: {new Date(p.last_sync_at).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'scim' && (
        <div className="space-y-4">
          <p className="text-sm text-[hsl(var(--text-3))]">SCIM 2.0 endpoint for automated user provisioning/deprovisioning.</p>
          <div className="border border-[hsl(var(--border))] rounded p-4 bg-[hsl(var(--bg-muted))] space-y-2">
            <p className="text-xs font-medium text-[hsl(var(--text-3))]">SCIM Base URL</p>
            <code className="text-sm font-mono text-[hsl(var(--text-1))]">{`${window.location.origin}/api/scim/v2`}</code>
          </div>
          <p className="text-xs text-[hsl(var(--text-4))]">Configure this URL in your IdP's SCIM settings. Use a service account API key as the Bearer token.</p>
        </div>
      )}

      {tab === 'claim_mapping' && (
        <div className="space-y-4">
          <p className="text-sm text-[hsl(var(--text-3))]">Map IdP group claims to Sentinel roles via the claim allowlist (injection-hardened).</p>
          <div className="text-center py-8 text-[hsl(var(--text-4))] text-sm">
            <p>Claim mappings are managed via Supabase <code className="font-mono text-xs">idp_claim_allowlist</code> table.</p>
            <p className="mt-1">UI configurator coming in next sprint.</p>
          </div>
        </div>
      )}
    </main>
  )
}
