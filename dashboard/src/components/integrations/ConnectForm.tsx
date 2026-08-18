// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ConnectForm — where an operator actually fills in credentials.
//
// Until this existed, "Connect" created a row and stopped: there was nowhere
// to enter a token, so a connected integration could never collect anything.
//
// Security contract, and the reason this posts to the backend rather than
// writing Supabase directly:
//
//   * credential values are held in component state for the life of the form
//     and sent once, over TLS, to `POST /v1/integrations/connect`;
//   * the backend encrypts them (AES-256-GCM) and stores only ciphertext;
//   * nothing is written to localStorage, the query cache, or the URL, and the
//     form clears its state as soon as the request resolves;
//   * on failure the field values are kept so the operator can correct a typo,
//     but the error shown is the server's message, never an echo of input.
//
// Fields come from the provider's own `IntegrationConfig.credentialFields`, so
// adding an adapter adds its form with no change here.

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Warning, LockKey } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getIntegrationConfig } from '@/integrations'
import type { CredentialField } from '@/integrations/types'
import { connectIntegration } from '@/services/integrationConnectService'

export function ConnectForm({
  slug,
  displayName,
  onConnected,
  onCancel,
}: {
  slug: string
  displayName: string
  onConnected: () => void
  onCancel: () => void
}) {
  const config = useMemo(() => getIntegrationConfig(slug), [slug])
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drop credential values from memory the moment this form goes away.
  useEffect(() => () => setValues({}), [])

  // A provider with a shipped adapter but no form definition would be a
  // packaging mistake; say so rather than rendering an empty form.
  if (!config) {
    return (
      <div className="flex gap-2 text-[12px] text-[hsl(var(--text-3))] leading-relaxed">
        <Warning size={15} className="text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
        <span>
          {displayName} has an adapter but no connection form is registered for it, so there are no
          fields to fill in. This is a packaging gap — report it rather than working around it.
        </span>
      </div>
    )
  }

  const missing = config.credentialFields.filter(
    f => f.required && !(values[f.id] ?? '').trim(),
  )

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await connectIntegration({ catalogSlug: slug, name: displayName, credentials: values })
      // Clear before anything else can read the state.
      setValues({})
      toast.success(`${displayName} connected — first sync queued.`)
      onConnected()
    } catch (e: any) {
      // The server's message, not our guess at what went wrong.
      setError(e?.message ?? 'Could not connect. Nothing was stored.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (missing.length === 0 && !submitting) void submit()
      }}
      className="space-y-4"
      // Credentials must never be offered to the browser's autofill store.
      autoComplete="off"
    >
      {config.credentialFields.map((field: CredentialField) => (
        <div key={field.id} className="space-y-1">
          <Label htmlFor={`cred-${field.id}`} className="text-[12px]">
            {field.label}
            {field.required ? (
              <span className="text-[hsl(var(--s-er-tx))] ml-0.5">*</span>
            ) : (
              <span className="text-[hsl(var(--text-4))] ml-1 font-normal">(optional)</span>
            )}
          </Label>
          <Input
            id={`cred-${field.id}`}
            type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
            value={values[field.id] ?? ''}
            onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
            placeholder={field.placeholder}
            required={field.required}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={field.helpText ? `help-${field.id}` : undefined}
          />
          {field.helpText && (
            <p id={`help-${field.id}`} className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed">
              {field.helpText}
            </p>
          )}
        </div>
      ))}

      <p className="flex gap-1.5 text-[11px] text-[hsl(var(--text-4))] leading-relaxed">
        <LockKey size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Sent once over TLS and encrypted on the server. Credentials are stored as ciphertext and
          never held in your browser.
        </span>
      </p>

      {error && (
        <p className="text-[12px] text-[hsl(var(--s-er-tx))] leading-relaxed" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={submitting || missing.length > 0}>
          {submitting ? 'Connecting…' : 'Connect'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
      {missing.length > 0 && (
        <p className="text-[11px] text-[hsl(var(--text-4))]">
          Required: {missing.map(f => f.label).join(', ')}
        </p>
      )}
    </form>
  )
}

export default ConnectForm
