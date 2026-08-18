// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ConnectDialog — the modal that opens on any catalogue product.
//
// Before this, opening a catalogue entry gave you operator prose and, for 216
// of 219 products, nowhere to put anything. Only `github`, `aws` and
// `microsoft_azure` had a form, because only those three have an adapter.
//
// This dialog gives every product a real form, without pretending all 219 can
// collect. `buildConnectionProfile` decides which of two it is:
//
//   automated  the adapter's own credential contract. Values are sent once
//              over TLS to the edge function, AES-256-GCM encrypted server
//              side, and the first sync is queued.
//
//   monitored  no adapter, so no credential is asked for. The fields describe
//              the SOURCE — which tenant, who is accountable, how often it is
//              reviewed, where its evidence lives — and submitting registers a
//              governed source that plainly states it collects nothing
//              automatically.
//
// The two are never blurred. The banner, the submit label, the success toast
// and the resulting status all say which one happened, because an operator who
// believes a monitored source is collecting is worse off than one who was
// never offered a form at all.

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Warning, LockKey, Eye, Plugs, Info } from '@phosphor-icons/react'

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  buildConnectionProfile, missingRequired, type ProfileField,
} from '@/integrations/connectionProfiles'
import type { CatalogEntry } from '@/services/integrationCatalogService'
import {
  connectIntegration, registerMonitoredSource,
} from '@/services/integrationConnectService'
import { logAction } from '@/lib/auditLogger'

function FieldRow({
  field, value, onChange,
}: { field: ProfileField; value: string; onChange: (v: string) => void }) {
  const describedBy = field.helpText ? `help-${field.id}` : undefined
  return (
    <div className="space-y-1">
      <Label htmlFor={`f-${field.id}`} className="text-[12px]">
        {field.label}
        {field.required ? (
          <span className="text-[hsl(var(--s-er-tx))] ml-0.5">*</span>
        ) : (
          <span className="text-[hsl(var(--text-4))] ml-1 font-normal">(optional)</span>
        )}
      </Label>
      {field.options ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={`f-${field.id}`} aria-describedby={describedBy}>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={`f-${field.id}`}
          type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          // Credentials must never be offered to the browser's autofill store.
          autoComplete="off"
          spellCheck={false}
          aria-describedby={describedBy}
        />
      )}
      {field.helpText && (
        <p id={describedBy} className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed">
          {field.helpText}
        </p>
      )}
    </div>
  )
}

export function ConnectDialog({
  entry,
  open,
  onOpenChange,
  onDone,
  canManage,
}: {
  entry: CatalogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
  canManage: boolean
}) {
  const profile = useMemo(
    () => (entry ? buildConnectionProfile(entry) : null),
    [entry],
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Drop every value — credentials included — the moment the dialog closes or
  // the operator switches to a different product.
  useEffect(() => {
    setValues({})
    setError(null)
  }, [entry?.slug, open])

  if (!entry || !profile) return null

  const automated = profile.mode === 'automated'
  const missing = missingRequired(profile, values)

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const result = automated
        ? await connectIntegration({
          catalogSlug: entry.slug, name: entry.name, credentials: values,
        })
        : await registerMonitoredSource({
          catalogSlug: entry.slug, name: entry.name, details: values,
        })
      // Clear before anything else can read the state.
      setValues({})
      // EU AI Act Art. 12: who attached this evidence source, and when. The
      // edge function writes under the service role, so the actor is only
      // knowable here.
      void logAction({
        module: 'integrations',
        entityType: 'integration',
        entityId: result.integrationId,
        entityName: entry.name,
        action: automated ? 'connect' : 'register_monitored_source',
        newValues: automated
          // Never the credential values — only which fields were supplied.
          ? { catalogSlug: entry.slug, mode: 'automated', fields: Object.keys(values) }
          : { catalogSlug: entry.slug, mode: 'manual', ...values },
      })
      toast.success(result.message)
      onOpenChange(false)
      onDone()
    } catch (e: any) {
      // The server's message, never an echo of what was typed.
      setError(e?.message ?? 'Could not save. Nothing was stored.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!submitting) onOpenChange(o) }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {automated ? <Plugs size={16} /> : <Eye size={16} />}
            {automated ? `Connect ${entry.name}` : `Monitor ${entry.name}`}
          </DialogTitle>
          <DialogDescription>
            {automated
              ? 'An adapter ships for this product. Credentials are encrypted on the server and the first evidence sync is queued as soon as you save.'
              : 'No adapter ships for this product yet, so Sentinel cannot collect from it automatically. Registering it records the source, who is accountable for it, and how often its evidence is refreshed by hand.'}
          </DialogDescription>
        </DialogHeader>

        {profile.packagingGap ? (
          <div className="flex gap-2 text-[12px] text-[hsl(var(--text-3))] leading-relaxed">
            <Warning size={15} className="text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
            <span>
              {entry.name} has an adapter but no connection form is registered for it, so there are
              no fields to fill in. This is a packaging gap — report it rather than working around it.
            </span>
          </div>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault()
              if (canManage && missing.length === 0 && !submitting) void submit()
            }}
            className="space-y-4"
            autoComplete="off"
          >
            {profile.authMethods.length > 0 && (
              <p className="text-[11px] text-[hsl(var(--text-4))] leading-relaxed">
                {profile.productSpecific
                  // A verified product profile names the one method this
                  // product actually uses.
                  ? <><span className="text-[hsl(var(--text-3))]">Authenticates with:</span>{' '}
                      {profile.authMethods[0]}</>
                  // The fallback is parsed from the catalogue row's own prose,
                  // which on most rows is the same generic sentence — so it is
                  // labelled as coming from the catalogue, not asserted as fact
                  // about this product.
                  : <>This product’s catalogue entry names: {profile.authMethods.join(' · ')}</>}
              </p>
            )}

            {profile.setupHint && (
              <p className="flex gap-1.5 text-[11px] text-[hsl(var(--text-4))] leading-relaxed">
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                <span>{profile.setupHint}</span>
              </p>
            )}

            {profile.fields.map(field => (
              <FieldRow
                key={field.id}
                field={field}
                value={values[field.id] ?? ''}
                onChange={v => setValues(prev => ({ ...prev, [field.id]: v }))}
              />
            ))}

            <p className="flex gap-1.5 text-[11px] text-[hsl(var(--text-4))] leading-relaxed">
              {automated ? (
                <>
                  <LockKey size={13} className="flex-shrink-0 mt-0.5" />
                  <span>
                    Sent once over TLS and encrypted on the server. Credentials are stored as
                    ciphertext and never held in your browser. The credential shape is checked on
                    the first sync, so a wrong field surfaces as a sync error rather than here.
                  </span>
                </>
              ) : (
                <>
                  <Eye size={13} className="flex-shrink-0 mt-0.5" />
                  <span>
                    No credential is asked for and none is stored — there is no adapter to use one.
                    This source will show as <strong>Monitored</strong>, never as collecting.
                  </span>
                </>
              )}
            </p>

            {error && (
              <p className="text-[12px] text-[hsl(var(--s-er-tx))] leading-relaxed" role="alert">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canManage || submitting || missing.length > 0}>
                {submitting
                  ? (automated ? 'Connecting…' : 'Saving…')
                  : (automated ? 'Connect' : 'Register source')}
              </Button>
            </DialogFooter>

            {!canManage && (
              <p className="text-[11px] text-[hsl(var(--text-4))]">
                You do not have permission to change integrations.
              </p>
            )}
            {canManage && missing.length > 0 && (
              <p className="text-[11px] text-[hsl(var(--text-4))]">
                Required: {missing.map(f => f.label).join(', ')}
              </p>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ConnectDialog
