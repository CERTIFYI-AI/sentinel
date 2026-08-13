// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ScenarioTemplateForm — create/edit a multi-turn scenario: metadata, the
// governed model under test, guardrail expectations, and the turn-by-turn
// script itself (inline editor; at least one turn is required to save).

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowsClockwise, Plus, Trash } from '@phosphor-icons/react'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { scenarioTemplateHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { ScenarioTemplate } from '@/types/evals'

// Deterministic guardrail policy rules available server-side (policy_rules.py).
const GUARDRAIL_KEYS = [
  'check_pii_leakage', 'check_injection_rate', 'check_hallucination_rate',
  'check_bias', 'check_human_oversight', 'check_trust_score',
]

const RISK_TAG_PRESETS = ['EU AI Act Annex III', 'high-risk', 'PII', 'financial-advice', 'jailbreak']

type Turn = ScenarioTemplate['turns'][number]

const EMPTY: ScenarioTemplate = {
  id: '', name: '', description: '', state: 'Draft', modelId: undefined,
  turns: [{ role: 'user', content: '' }],
  guardrailChecks: [], policiesReferenced: [], riskTags: [], campaignIds: [], auditTrail: [],
}

/** Normalize a (possibly partial) stored doc so the controlled editor never crashes. */
function seed(i?: ScenarioTemplate | null): ScenarioTemplate {
  if (!i) return EMPTY
  return {
    ...EMPTY,
    ...i,
    name: i.name ?? '',
    description: i.description ?? '',
    turns: Array.isArray(i.turns) && i.turns.length ? i.turns.map((t) => ({ ...t, content: t?.content ?? '' })) : [{ role: 'user', content: '' }],
    guardrailChecks: i.guardrailChecks ?? [],
    policiesReferenced: i.policiesReferenced ?? [],
    riskTags: i.riskTags ?? [],
    campaignIds: i.campaignIds ?? [],
    auditTrail: i.auditTrail ?? [],
  }
}

export function ScenarioTemplateForm({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: ScenarioTemplate | null
}) {
  const upsert = scenarioTemplateHooks.useUpsert()
  const { models, loading: modelsLoading } = useModelOptions()
  const actor = useAuthStore((s) => s.user?.name ?? 'Unknown')
  const [form, setForm] = useState<ScenarioTemplate>(seed(initial))
  const isEdit = !!initial

  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) { setForm(seed(initial)); setSeededFor(initial?.id) }

  const set = <K extends keyof ScenarioTemplate>(k: K, v: ScenarioTemplate[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggle = (k: 'guardrailChecks' | 'riskTags', v: string) =>
    set(k, form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v])

  // ── Turns editor (fully controlled) ───────────────────────────────────────
  const setTurn = (i: number, patch: Partial<Turn>) =>
    set('turns', form.turns.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const addTurn = () => {
    const last = form.turns[form.turns.length - 1]
    set('turns', [...form.turns, { role: last?.role === 'user' ? 'assistant' : 'user', content: '' }])
  }
  const removeTurn = (i: number) => set('turns', form.turns.filter((_, idx) => idx !== i))
  const toggleRole = (i: number) =>
    setTurn(i, { role: form.turns[i].role === 'user' ? 'assistant' : 'user' })

  const valid = !!(form.name.trim() && form.description.trim()
    && form.turns.length >= 1 && form.turns.every((t) => t.content.trim()))

  function submit() {
    const now = new Date().toISOString()
    const rec: ScenarioTemplate = {
      ...form,
      id: form.id || crypto.randomUUID(),
      auditTrail: isEdit
        ? [...form.auditTrail, { id: crypto.randomUUID(), actor, action: 'updated scenario', at: now }]
        : [{ id: crypto.randomUUID(), actor, action: 'created scenario', at: now }],
    }
    upsert.mutate(rec, {
      onSuccess: () => { toast.success(isEdit ? 'Scenario updated' : 'Scenario created'); onOpenChange(false) },
      onError: (err) => toast.error(err.message),
    })
  }

  const chip = (active: boolean) => cn('border px-2 py-1 text-[12px]', active
    ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))] text-[hsl(var(--bg-surface))]'
    : 'border-[hsl(var(--border))] text-[hsl(var(--text-3))]')

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.name}` : 'New Scenario'}
      description="Define intent, the model under test, guardrail checks, risk tags — and script the turns inline."
      submitLabel={isEdit ? 'Save changes' : 'Create scenario'}
      busy={upsert.isPending} disabled={!valid} onSubmit={submit}
    >
      <Field label="Name" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Adverse-action explanation under duress" /></Field>
      <Field label="Description" required>
        <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
          placeholder="What behaviour does this scenario probe, and what must the model refuse or disclose?" />
      </Field>
      <Field label="Model under test" hint="Governed model from the registry">
        <Select value={form.modelId ?? ''} onValueChange={(v) => set('modelId', v || undefined)} disabled={modelsLoading}>
          <SelectTrigger aria-label="Model under test">
            <SelectValue placeholder={modelsLoading ? 'Loading models…' : 'Select model…'} />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2">
                  <span className="text-[hsl(var(--text-1))]">{m.name}</span>
                  {m.riskTier && <span className="text-[11px] text-[hsl(var(--text-4))]">{m.riskTier}</span>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Conversation turns" required hint="At least one turn is required. Toggle role per turn; 'expected' documents the required assistant behaviour.">
        <div className="space-y-2">
          {form.turns.map((t, i) => (
            <div key={i} className="border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <button type="button" onClick={() => toggleRole(i)} title="Toggle role"
                  className={cn('inline-flex items-center gap-1 border px-2 py-[2px] text-[11px] font-medium uppercase tracking-wide',
                    t.role === 'user'
                      ? 'border-[hsl(var(--border))] text-[hsl(var(--text-2))]'
                      : 'border-[hsl(var(--brand))] text-[hsl(var(--brand))]')}>
                  <ArrowsClockwise size={11} />{t.role}
                </button>
                <button type="button" onClick={() => removeTurn(i)} disabled={form.turns.length <= 1}
                  title={form.turns.length <= 1 ? 'A scenario needs at least one turn' : 'Remove turn'}
                  className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-er-tx))] disabled:cursor-not-allowed disabled:opacity-40">
                  <Trash size={14} />
                </button>
              </div>
              <Textarea value={t.content} onChange={(e) => setTurn(i, { content: e.target.value })} rows={2}
                placeholder={t.role === 'user' ? 'User message…' : 'Scripted assistant reply (optional wording)…'} />
              {t.role === 'assistant' && (
                <Input className="mt-1.5" value={t.expected ?? ''}
                  onChange={(e) => setTurn(i, { expected: e.target.value || undefined })}
                  placeholder="Expected behaviour (e.g. refuses and cites policy)…" />
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" icon={<Plus />} onClick={addTurn}>Add turn</Button>
        </div>
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
