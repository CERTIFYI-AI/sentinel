/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * SsoProviders — admin page for managing SAML/OIDC identity providers.
 * Lives under /settings/sso. Requires `sso:manage` role (enforced in
 * WS4 RBAC; for now gated by tenant membership via RLS).
 */
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useRequiredOrgId, useTenant } from '../../hooks/useTenant'

const providerSchema = z.object({
  kind: z.enum(['saml', 'oidc']),
  display_name: z.string().min(2).max(80),
  // IdP-specific config is validated per-kind below on submit.
  issuer: z.string().url().optional().or(z.literal('')),
  jwks_uri: z.string().url().optional().or(z.literal('')),
  token_endpoint: z.string().url().optional().or(z.literal('')),
  client_id: z.string().optional().or(z.literal('')),
  client_secret: z.string().optional().or(z.literal('')),
  redirect_uri: z.string().url().optional().or(z.literal('')),
  sso_url: z.string().url().optional().or(z.literal('')),
  x509_cert: z.string().optional().or(z.literal('')),
  group_claim_path: z.string().optional().or(z.literal('')),
})

type ProviderForm = z.infer<typeof providerSchema>

interface ProviderRow {
  id: string
  kind: 'saml' | 'oidc'
  display_name: string
  is_enabled: boolean
  created_at: string
}

export default function SsoProviders() {
  const orgId = useRequiredOrgId()
  const { status } = useTenant()
  const [rows, setRows] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [submitErr, setSubmitErr] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues: { kind: 'oidc', display_name: '' },
  })
  const kind = watch('kind')

  useEffect(() => {
    if (status !== 'ready' || !supabase) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    setLoading(true)
    setErr(null)
    supabase
      .from('identity_providers')
      .select('id, kind, display_name, is_enabled, created_at')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .abortSignal(signal)
      .then(({ data, error }) => {
        if (signal.aborted) return
        if (error) {
          setErr(error.message)
          setRows([])
        } else {
          setRows((data ?? []) as ProviderRow[])
        }
        setLoading(false)
      })
    return () => abortRef.current?.abort()
  }, [status, orgId])

  async function onSubmit(values: ProviderForm) {
    setSubmitErr(null)
    if (!supabase) {
      setSubmitErr('Supabase not configured')
      return
    }
    const config: Record<string, string> =
      values.kind === 'oidc'
        ? {
            issuer: values.issuer ?? '',
            jwks_uri: values.jwks_uri ?? '',
            token_endpoint: values.token_endpoint ?? '',
            client_id: values.client_id ?? '',
            client_secret: values.client_secret ?? '',
            redirect_uri: values.redirect_uri ?? '',
          }
        : {
            sso_url: values.sso_url ?? '',
            x509_cert: values.x509_cert ?? '',
          }
    // Per-kind required fields.
    if (values.kind === 'oidc' && (!config['issuer'] || !config['client_id'])) {
      setSubmitErr('OIDC requires issuer and client_id')
      return
    }
    if (values.kind === 'saml' && (!config['sso_url'] || !config['x509_cert'])) {
      setSubmitErr('SAML requires SSO URL and signing certificate')
      return
    }

    const { error } = await supabase.from('identity_providers').insert({
      org_id: orgId,
      kind: values.kind,
      display_name: values.display_name,
      config,
      group_claim_path: values.group_claim_path || null,
      is_enabled: false,
    })
    if (error) {
      setSubmitErr(error.message)
      return
    }
    reset({ kind: values.kind, display_name: '' })
    // Refresh list.
    const { data } = await supabase
      .from('identity_providers')
      .select('id, kind, display_name, is_enabled, created_at')
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setRows((data ?? []) as ProviderRow[])
  }

  async function toggleEnabled(row: ProviderRow, next: boolean) {
    if (!supabase) return
    const { error } = await supabase
      .from('identity_providers')
      .update({ is_enabled: next })
      .eq('id', row.id)
    if (!error) {
      setRows(rs =>
        rs.map(r => (r.id === row.id ? { ...r, is_enabled: next } : r)),
      )
    }
  }

  if (status === 'loading') {
    return <div className="p-6 text-sm">Loading tenant…</div>
  }
  if (status === 'unauthenticated') {
    return <div className="p-6 text-sm">Please sign in.</div>
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Identity Providers</h1>
      <p className="text-sm text-[hsl(var(--text-4))] mb-6">
        Connect SAML or OIDC identity providers for enterprise single
        sign-on. Users with verified email domains will be routed to the
        correct provider at login.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="border border-[hsl(var(--border))] p-4 mb-6 space-y-3"
        aria-busy={isSubmitting}
      >
        <h2 className="text-sm font-semibold">Add provider</h2>

        <label className="block text-xs">
          Type
          <select
            {...register('kind')}
            className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
          >
            <option value="oidc">OIDC (OpenID Connect)</option>
            <option value="saml">SAML 2.0</option>
          </select>
        </label>

        <label className="block text-xs">
          Display name
          <input
            {...register('display_name')}
            className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
            placeholder="Acme Okta"
          />
          {errors.display_name && (
            <span className="text-xs text-[hsl(var(--s-er-tx))]">
              {errors.display_name.message}
            </span>
          )}
        </label>

        {kind === 'oidc' ? (
          <>
            <label className="block text-xs">
              Issuer URL
              <input
                {...register('issuer')}
                className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
                placeholder="https://auth.example.com"
              />
            </label>
            <label className="block text-xs">
              JWKS URI
              <input
                {...register('jwks_uri')}
                className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
              />
            </label>
            <label className="block text-xs">
              Token endpoint
              <input
                {...register('token_endpoint')}
                className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                Client ID
                <input
                  {...register('client_id')}
                  className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
                />
              </label>
              <label className="block text-xs">
                Client secret
                <input
                  {...register('client_secret')}
                  type="password"
                  autoComplete="off"
                  className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
                />
              </label>
            </div>
            <label className="block text-xs">
              Redirect URI
              <input
                {...register('redirect_uri')}
                className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
                placeholder="https://sentinel.example.com/sso/oidc/callback"
              />
            </label>
          </>
        ) : (
          <>
            <label className="block text-xs">
              SSO URL
              <input
                {...register('sso_url')}
                className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
              />
            </label>
            <label className="block text-xs">
              X.509 signing certificate
              <textarea
                {...register('x509_cert')}
                rows={5}
                className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-xs font-mono bg-[hsl(var(--bg-raised))]"
                placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
              />
            </label>
          </>
        )}

        <label className="block text-xs">
          Group claim path (optional)
          <input
            {...register('group_claim_path')}
            className="mt-1 w-full border border-[hsl(var(--border))] px-2 py-1 text-sm bg-[hsl(var(--bg-raised))]"
            placeholder="groups"
          />
        </label>

        {submitErr && (
          <p className="text-xs text-[hsl(var(--s-er-tx))]">{submitErr}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[hsl(var(--brand))] text-white px-3 py-1.5 text-xs"
        >
          {isSubmitting ? 'Saving…' : 'Add provider'}
        </button>
      </form>

      <h2 className="text-sm font-semibold mb-2">Configured providers</h2>
      {loading ? (
        <p className="text-sm text-[hsl(var(--text-4))]">Loading…</p>
      ) : err ? (
        <p className="text-sm text-[hsl(var(--s-er-tx))]">{err}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[hsl(var(--text-4))]">None yet.</p>
      ) : (
        <ul className="divide-y divide-[hsl(var(--border))] border border-[hsl(var(--border))]">
          {rows.map(r => (
            <li key={r.id} className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.display_name}</p>
                <p className="text-xs text-[hsl(var(--text-4))]">
                  {r.kind.toUpperCase()} ·{' '}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={r.is_enabled}
                  onChange={e => void toggleEnabled(r, e.target.checked)}
                />
                Enabled
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
