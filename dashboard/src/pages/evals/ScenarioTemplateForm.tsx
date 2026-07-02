// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ScenarioTemplateForm — create/edit a multi-turn scenario's metadata and
// guardrail expectations. Turn-by-turn scripting happens in the script editor.

import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { scenarioTemplateHooks } from '@/hooks/queries/useEvalsCrud'
import { cn } from '@/lib/utils'
import type { ScenarioTemplate } from '@/types/evals'

// Deterministic guardrail policy rules available server-side (policy_rules.py).
const GUARDRAIL_KEYS = [
  'check_pii_leakage', 'check_injection_rate', 'check_hallucination_rate',
  'check_bias', 'check_human_oversight', 'check_trust_score',
]

const RISK_TAG_PRESETS = ['EU AI Act Annex III', 'high-risk', 'PII', 'financial-advice', 'jailbreak']

const EMPTY: ScenarioTemplate = {
  id: '', name: '', description: '', state: 'Draft',
  turns: [
    { role: 'user', content: '' },
    { role: 'assistant', content: '', expected: '' },
  ],
  guardrailChecks: [], policiesReferenced: [], riskTags: [], campaignIds: [], auditTrail: [],
}

export function ScenarioTemplateForm({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: ScenarioTemplate | null
}) {
  const upsert = scenarioTemplateHooks.useUpsert()
  const [form, setForm] = useState<ScenarioTemplate>(initial ?? EMPTY)
  const isEdit = !!initial

  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) { setForm(initial ?? EMPTY); setSeededFor(initial?.id) }

  const set = <K extends keyof ScenarioTemplate>(k: K, v: ScenarioTemplate[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggle = (k: 'guardrailChecks' | 'riskTags', v: string) =>
    set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v])

  const valid = form.name.trim() && form.description.trim()

  function submit() {
    const rec: ScenarioTemplate = {
      ...form,
      id: form.id || `SC-${String(Date.now()).slice(-6)}`,
      auditTrail: isEdit ? form.auditTrail : [{ id: `A${Date.now()}`, actor: 'author', action: 'created scenario', at: new Date().toISOString() }],
    }
    upsert.mutate(rec, {
      onSuccess: () => { toast.success(isEdit ? 'Scenario updated' : 'Scenario created'); onOpenChange(false) },
      onError: () => toast.error('Failed to save scenario'),
    })
  }

  const chip = (active: boolean) => cn('border px-2 py-1 text-[12px]', active
    ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
    : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]')

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.name}` : 'New Scenario'}
      description="Define intent, guardrail checks and risk tags. Script the turns in the editor afterwards."
      submitLabel={isEdit ? 'Save changes' : 'Create scenario'}
      busy={upsert.isPending} disabled={!valid} onSubmit={submit}
    >
      <Field label="Name" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Adverse-action explanation under duress" /></Field>
      <Field label="Description" required>
        <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
          placeholder="What behaviour does this scenario probe, and what must the model refuse or disclose?" />
      </Field>
      <Field label="Guardrail checks" hint="Deterministic policy rules evaluated per turn">
        <div className="flex flex-wrap gap-1.5">
          {GUARDRAIL_KEYS.map((g) => (
            <button key={g} type="button" onClick={() => toggle('guardrailChecks', g)} className={chip(form.guardrailChecks.includes(g))}>
              <span className="font-mono">{g}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Risk tags">
        <div className="flex flex-wrap gap-1.5">
          {RISK_TAG_PRESETS.map((t) => (
            <button key={t} type="button" onClick={() => toggle('riskTags', t)} className={chip(form.riskTags.includes(t))}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Policies referenced" hint="Comma-separated policy identifiers">
        <Input value={form.policiesReferenced.join(', ')}
          onChange={(e) => set('policiesReferenced', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          placeholder="ECOA-adverse-action, GDPR-Art22" />
      </Field>
    </FormDialog>
  )
}

export default ScenarioTemplateForm
