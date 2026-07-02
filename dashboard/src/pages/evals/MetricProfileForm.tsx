// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MetricProfileForm — create/edit a metric profile. Owner from the central
// Users directory; thresholds/benchmarks are managed on the detail page.

import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { UserSelect } from '@/components/evals/UserSelect'
import { metricProfileHooks } from '@/hooks/queries/useEvalsCrud'
import type { MetricProfile } from '@/types/evals'

const EMPTY: MetricProfile = {
  id: '', modelId: '', modelName: '', modelVersion: '', owner: '', state: 'Draft',
  current: {}, thresholds: [], benchmarks: [], timeseries: [],
  objectives: { accuracy: 0, fairness: 0, robustness: 0, explainability: 0 },
  auditTrail: [],
}

export function MetricProfileForm({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: MetricProfile | null
}) {
  const upsert = metricProfileHooks.useUpsert()
  const [form, setForm] = useState<MetricProfile>(initial ?? EMPTY)
  const isEdit = !!initial

  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) { setForm(initial ?? EMPTY); setSeededFor(initial?.id) }

  const set = <K extends keyof MetricProfile>(k: K, v: MetricProfile[K]) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form.modelId.trim() && form.modelName.trim() && form.modelVersion.trim() && form.owner.trim()

  function submit() {
    const rec: MetricProfile = {
      ...form,
      id: form.id || `MP-${form.modelId.replace(/\D/g, '') || Date.now()}`,
      auditTrail: isEdit ? form.auditTrail : [{ id: `A${Date.now()}`, actor: form.owner, action: 'created metric profile', at: new Date().toISOString() }],
    }
    upsert.mutate(rec, {
      onSuccess: () => { toast.success(isEdit ? 'Profile updated' : 'Profile created'); onOpenChange(false) },
      onError: () => toast.error('Failed to save profile'),
    })
  }

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.modelName} metrics` : 'New Metric Profile'}
      description="Bind a model/version to its metric baseline; add thresholds and benchmarks from the detail view."
      submitLabel={isEdit ? 'Save changes' : 'Create profile'}
      busy={upsert.isPending} disabled={!valid} onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Model ID" required><Input value={form.modelId} onChange={(e) => set('modelId', e.target.value)} placeholder="MDL-003" /></Field>
        <Field label="Model name" required><Input value={form.modelName} onChange={(e) => set('modelName', e.target.value)} /></Field>
        <Field label="Version" required><Input value={form.modelVersion} onChange={(e) => set('modelVersion', e.target.value)} placeholder="v4.0.0" /></Field>
        <Field label="Owner" required hint="From the Users directory">
          <UserSelect value={form.owner} onChange={(v) => set('owner', v)} by="name" rolesFilter={['ml', 'model', 'engineer']} />
        </Field>
      </div>
    </FormDialog>
  )
}

export default MetricProfileForm
