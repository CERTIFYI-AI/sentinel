// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// MetricProfileForm — create/edit a metric profile: governed model (registry
// picker, uuid), owner from the central Users directory, the tracked-metric
// list, and an inline editable thresholds table.

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash } from '@phosphor-icons/react'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserSelect } from '@/components/evals/UserSelect'
import { metricProfileHooks } from '@/hooks/queries/useEvalsCrud'
import { useModelOptions } from '@/hooks/useAiiaData'
import type { MetricProfile, MetricThresholdConfig } from '@/types/evals'

const EMPTY: MetricProfile = {
  id: '', modelId: '', modelName: '', modelVersion: '', owner: '', state: 'Draft',
  metrics: [], current: {}, thresholds: [], benchmarks: [], timeseries: [],
  objectives: { accuracy: 0, fairness: 0, robustness: 0, explainability: 0 },
  auditTrail: [],
}

/** Seed with a concrete metrics list: stored list, else the metric names already in use.
 * Tolerant of partial docs — missing collections become empty, never crash the editor. */
function seed(p: MetricProfile | null | undefined): MetricProfile {
  if (!p) return EMPTY
  const current = p.current ?? {}
  const thresholds = p.thresholds ?? []
  const metrics = p.metrics && p.metrics.length
    ? p.metrics
    : Array.from(new Set([...Object.keys(current), ...thresholds.map((t) => t.metric)]))
  return {
    ...EMPTY,
    ...p,
    modelId: p.modelId ?? '',
    modelName: p.modelName ?? '',
    modelVersion: p.modelVersion ?? '',
    owner: p.owner ?? '',
    current,
    thresholds,
    metrics,
    benchmarks: p.benchmarks ?? [],
    timeseries: p.timeseries ?? [],
    objectives: p.objectives ?? EMPTY.objectives,
    auditTrail: p.auditTrail ?? [],
  }
}

export function MetricProfileForm({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: MetricProfile | null
}) {
  const upsert = metricProfileHooks.useUpsert()
  const { models, loading: modelsLoading } = useModelOptions()
  const [form, setForm] = useState<MetricProfile>(seed(initial))
  const isEdit = !!initial

  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) { setForm(seed(initial)); setSeededFor(initial?.id) }

  const set = <K extends keyof MetricProfile>(k: K, v: MetricProfile[K]) => setForm((f) => ({ ...f, [k]: v }))

  const pickModel = (id: string) => {
    const m = models.find((x) => x.id === id)
    setForm((f) => ({ ...f, modelId: id, modelName: m?.name ?? f.modelName }))
  }

  // ── Thresholds editor (fully controlled) ──────────────────────────────────
  const setThreshold = (i: number, patch: Partial<MetricThresholdConfig>) =>
    set('thresholds', form.thresholds.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const addThreshold = () =>
    set('thresholds', [...form.thresholds, {
      id: crypto.randomUUID(), metric: '', warn: 0, fail: 0, direction: 'higher_better',
    }])
  const removeThreshold = (i: number) => set('thresholds', form.thresholds.filter((_, idx) => idx !== i))

  const valid = !!(form.modelId.trim() && form.modelVersion.trim() && form.owner.trim()
    && form.thresholds.every((t) => t.metric.trim()))

  function submit() {
    const now = new Date().toISOString()
    const rec: MetricProfile = {
      ...form,
      id: form.id || crypto.randomUUID(),
      auditTrail: isEdit
        ? [...form.auditTrail, { id: crypto.randomUUID(), actor: form.owner, action: 'updated metric profile', at: now }]
        : [{ id: crypto.randomUUID(), actor: form.owner, action: 'created metric profile', at: now }],
    }
    upsert.mutate(rec, {
      onSuccess: () => { toast.success(isEdit ? 'Profile updated' : 'Profile created'); onOpenChange(false) },
      onError: (err) => toast.error(err.message),
    })
  }

  const cellInput = 'h-8 px-2 text-xs font-mono'

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.modelName} metrics` : 'New Metric Profile'}
      description="Bind a governed model/version to its metric baseline, tracked metrics and thresholds."
      submitLabel={isEdit ? 'Save changes' : 'Create profile'}
      busy={upsert.isPending} disabled={!valid} onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Model" required hint="Governed model from the registry">
          <Select value={form.modelId || undefined} onValueChange={pickModel} disabled={modelsLoading}>
            <SelectTrigger aria-label="Model">
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
        <Field label="Version" required><Input value={form.modelVersion} onChange={(e) => set('modelVersion', e.target.value)} placeholder="v4.0.0" /></Field>
        <Field label="Owner" required hint="From the Users directory">
          <UserSelect value={form.owner} onChange={(v) => set('owner', v)} by="name" rolesFilter={['ml', 'model', 'engineer']} />
        </Field>
        <Field label="Tracked metrics" hint="Comma-separated metric names">
          <Input value={(form.metrics ?? []).join(', ')}
            onChange={(e) => set('metrics', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="auc, ks, psi, gini" />
        </Field>
      </div>

      <Field label="Thresholds" hint="Warn/fail bounds per metric; breach action drives monitoring">
        <div className="space-y-2">
          {form.thresholds.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[hsl(var(--text-4))]">
                    <th className="py-1 pr-2 font-medium">Metric</th>
                    <th className="py-1 pr-2 font-medium">Warn</th>
                    <th className="py-1 pr-2 font-medium">Fail</th>
                    <th className="py-1 pr-2 font-medium">Direction</th>
                    <th className="py-1 pr-2 font-medium">Breach action</th>
                    <th className="py-1 font-medium sr-only">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {form.thresholds.map((t, i) => (
                    <tr key={t.id} className="border-t border-[hsl(var(--border))]">
                      <td className="py-1.5 pr-2">
                        <Input className={cellInput} value={t.metric} placeholder="auc"
                          onChange={(e) => setThreshold(i, { metric: e.target.value })} list="mp-metric-names" />
                      </td>
                      <td className="py-1.5 pr-2 w-20">
                        <Input className={cellInput} type="number" step="any" value={t.warn}
                          onChange={(e) => setThreshold(i, { warn: Number(e.target.value) })} />
                      </td>
                      <td className="py-1.5 pr-2 w-20">
                        <Input className={cellInput} type="number" step="any" value={t.fail}
                          onChange={(e) => setThreshold(i, { fail: Number(e.target.value) })} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <select value={t.direction}
                          onChange={(e) => setThreshold(i, { direction: e.target.value as MetricThresholdConfig['direction'] })}
                          className="h-8 w-full border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-1 text-xs text-[hsl(var(--text-2))] focus:outline-none">
                          <option value="higher_better">higher better</option>
                          <option value="lower_better">lower better</option>
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <select value={t.breachAction ?? ''}
                          onChange={(e) => setThreshold(i, { breachAction: (e.target.value || undefined) as MetricThresholdConfig['breachAction'] })}
                          className="h-8 w-full border border-[hsl(var(--border))] bg-[hsl(var(--bg-raised))] px-1 text-xs text-[hsl(var(--text-2))] focus:outline-none">
                          <option value="">—</option>
                          <option value="alert">alert</option>
                          <option value="block_promotion">block promotion</option>
                          <option value="kill_switch">kill switch</option>
                        </select>
                      </td>
                      <td className="py-1.5 text-right">
                        <button type="button" onClick={() => removeThreshold(i)} title="Remove threshold"
                          className="p-1 text-[hsl(var(--text-4))] hover:text-[hsl(var(--s-er-tx))]">
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <datalist id="mp-metric-names">
                {(form.metrics ?? []).map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
          )}
          <Button type="button" variant="ghost" size="sm" icon={<Plus />} onClick={addThreshold}>Add threshold</Button>
        </div>
      </Field>
    </FormDialog>
  )
}

export default MetricProfileForm
