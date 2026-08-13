// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ExplainabilityProfileForm — create/edit an XAI profile. Model is chosen from
// the platform model inventory (ai_models uuid); owner comes from the central
// Users directory; jurisdictions toggle GDPR / EU AI Act / ECOA text
// obligations downstream.

import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserSelect } from '@/components/evals/UserSelect'
import { explainProfileHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { cn } from '@/lib/utils'
import type { ExplainabilityProfile, Jurisdiction, XaiMethod } from '@/types/evals'

const ALL_JURISDICTIONS: Jurisdiction[] = ['GDPR', 'EU AI Act', 'ECOA', 'CFPB', 'NIST']
const GLOBAL_METHODS: XaiMethod[] = ['SHAP', 'PDP', 'IntegratedGradients']

const EMPTY: ExplainabilityProfile = {
  id: '', modelId: '', modelName: '', modelVersion: '', owner: '', framework: 'GDPR Art.22 / ECOA', state: 'Draft',
  global: { method: 'SHAP', computedAt: new Date().toISOString(), fidelity: 0, topFeatures: [] },
  localMethods: [],
  adequacyPolicy: {
    id: 'AP-default', name: 'Default adequacy policy', appliesTo: ['GDPR', 'ECOA'],
    targets: { completeness: 0.9, faithfulness: 0.85, accessibility: 0.9, contrastiveness: 0.85, actionability: 0.8, regulatorySufficiency: 0.85 },
  },
  jurisdictions: ['GDPR'], reports: [], templates: [], regMappings: [], auditTrail: [],
}

export function ExplainabilityProfileForm({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: ExplainabilityProfile | null
}) {
  const upsert = explainProfileHooks.useUpsert()
  const { models, loading: modelsLoading } = useModelOptions()
  const [form, setForm] = useState<ExplainabilityProfile>(initial ?? EMPTY)
  const isEdit = !!initial

  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) { setForm(initial ?? EMPTY); setSeededFor(initial?.id) }

  const set = <K extends keyof ExplainabilityProfile>(k: K, v: ExplainabilityProfile[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggleJur = (j: Jurisdiction) => set('jurisdictions',
    form.jurisdictions.includes(j) ? form.jurisdictions.filter((x) => x !== j) : [...form.jurisdictions, j])

  function setModel(id: string) {
    const m = models.find((x) => x.id === id)
    setForm((f) => ({ ...f, modelId: id, modelName: m?.name ?? '' }))
  }

  const valid = !!(form.modelId && form.modelVersion.trim() && form.owner.trim())

  function submit() {
    const rec: ExplainabilityProfile = {
      ...form,
      // PK is a generated uuid — never derived from the model id.
      id: form.id || crypto.randomUUID(),
      auditTrail: isEdit ? form.auditTrail : [{ id: `A${Date.now()}`, actor: form.owner, action: 'created profile', at: new Date().toISOString() }],
    }
    upsert.mutate(rec, {
      onSuccess: () => { toast.success(isEdit ? 'Profile updated' : 'Profile created'); onOpenChange(false) },
      onError: (err: any) => toast.error(err?.message ?? 'Failed to save profile'),
    })
  }

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.modelName || 'explainability'} profile` : 'New Explainability Profile'}
      description="Track global/local explanation methods and adequacy per jurisdiction."
      submitLabel={isEdit ? 'Save changes' : 'Create profile'}
      busy={upsert.isPending} disabled={!valid} onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Model" required hint="From the model inventory">
          <Select value={form.modelId || undefined} onValueChange={setModel}>
            <SelectTrigger><SelectValue placeholder={modelsLoading ? 'Loading models…' : 'Select a model'} /></SelectTrigger>
            <SelectContent>
              {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}{m.riskTier ? ` · ${m.riskTier}` : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Version" required><Input value={form.modelVersion} onChange={(e) => set('modelVersion', e.target.value)} placeholder="v4.0.0" /></Field>
        <Field label="Owner" required hint="From the Users directory">
          <UserSelect value={form.owner} onChange={(v) => set('owner', v)} by="name" rolesFilter={['ml', 'engineer', 'compliance']} />
        </Field>
        <Field label="Global method">
          <Select value={form.global.method} onValueChange={(v) => set('global', { ...form.global, method: v as XaiMethod })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{GLOBAL_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Framework"><Input value={form.framework} onChange={(e) => set('framework', e.target.value)} /></Field>
      </div>
      <Field label="Jurisdictions" hint="Determines which explanation templates and adequacy targets apply">
        <div className="flex flex-wrap gap-1.5">
          {ALL_JURISDICTIONS.map((j) => (
            <button key={j} type="button" onClick={() => toggleJur(j)}
              className={cn('border px-2 py-1 text-[12px]', form.jurisdictions.includes(j)
                ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
                : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]')}>
              {j}
            </button>
          ))}
        </div>
      </Field>
    </FormDialog>
  )
}

export default ExplainabilityProfileForm
