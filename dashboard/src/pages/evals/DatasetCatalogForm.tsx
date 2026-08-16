// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DatasetCatalogForm — register/edit a governed dataset catalog entry:
// identity, lineage source, sensitivity, lawful basis, retention, purposes.

import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, Field } from '@/components/evals/FormDialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { datasetCatalogHooks } from '@/hooks/queries/useEvalsCrud'
import { useDatasets } from '@/hooks/useDatasetData'
import type { DatasetCatalogEntry, RiskTier } from '@/types/evals'

const NO_LINK = '__none__'

const CATEGORIES: DatasetCatalogEntry['category'][] = ['Text', 'Tabular', 'Image', 'Audio', 'Behavioral', 'Document']

const EMPTY: DatasetCatalogEntry = {
  id: '', datasetId: '', name: '', datasetVersion: '1.0', category: 'Tabular', sensitivity: 'medium',
  lawfulBasis: '', allowedPurposes: [], retention: '',
  lineage: { source: '', transform: '', upstreamIds: [] },
  quality: { completeness: 0, duplicateRate: 0 },
  representativeness: [], biasIndicators: [], riskScore: 0,
  slices: [], governanceTags: [], auditTrail: [],
}

/** Normalize a (possibly partial) stored doc so the controlled form never crashes. */
function seed(i?: DatasetCatalogEntry | null): DatasetCatalogEntry {
  if (!i) return EMPTY
  return {
    ...EMPTY,
    ...i,
    datasetId: i.datasetId ?? '',
    name: i.name ?? '',
    datasetVersion: i.datasetVersion ?? '',
    lawfulBasis: i.lawfulBasis ?? '',
    retention: i.retention ?? '',
    allowedPurposes: i.allowedPurposes ?? [],
    lineage: {
      source: i.lineage?.source ?? '',
      transform: i.lineage?.transform ?? '',
      upstreamIds: i.lineage?.upstreamIds ?? [],
    },
    auditTrail: i.auditTrail ?? [],
  }
}

export function DatasetCatalogForm({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: DatasetCatalogEntry | null
}) {
  const upsert = datasetCatalogHooks.useUpsert()
  const { data: governedDatasets, isLoading: governedLoading } = useDatasets()
  const [form, setForm] = useState<DatasetCatalogEntry>(seed(initial))
  const isEdit = !!initial

  const [seededFor, setSeededFor] = useState<string | undefined>(initial?.id)
  if (open && (initial?.id ?? '') !== (seededFor ?? '')) { setForm(seed(initial)); setSeededFor(initial?.id) }

  const set = <K extends keyof DatasetCatalogEntry>(k: K, v: DatasetCatalogEntry[K]) => setForm((f) => ({ ...f, [k]: v }))
  const valid = form.datasetId.trim() && form.name.trim() && form.lawfulBasis.trim()

  function submit() {
    const rec: DatasetCatalogEntry = {
      ...form,
      id: form.id || form.datasetId.trim(),
      auditTrail: isEdit ? form.auditTrail : [{ id: `A${Date.now()}`, actor: 'catalog', action: 'catalogued dataset', at: new Date().toISOString() }],
    }
    upsert.mutate(rec, {
      onSuccess: () => { toast.success(isEdit ? 'Entry updated' : 'Dataset catalogued'); onOpenChange(false) },
      onError: () => toast.error('Failed to save entry'),
    })
  }

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${form.datasetId}` : 'New Dataset Entry'}
      description="EU AI Act Art.10 / GDPR Art.5 — record provenance, lawful basis and purpose limitation."
      submitLabel={isEdit ? 'Save changes' : 'Catalogue dataset'}
      busy={upsert.isPending} disabled={!valid} onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dataset ID" required><Input value={form.datasetId} disabled={isEdit} onChange={(e) => set('datasetId', e.target.value)} placeholder="DS-credit-v5" /></Field>
        <Field label="Name" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Version"><Input value={form.datasetVersion} onChange={(e) => set('datasetVersion', e.target.value)} /></Field>
        <Field label="Category">
          <Select value={form.category} onValueChange={(v) => set('category', v as DatasetCatalogEntry['category'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Sensitivity">
          <Select value={form.sensitivity} onValueChange={(v) => set('sensitivity', v as RiskTier)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(['low', 'medium', 'high', 'critical'] as RiskTier[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Retention"><Input value={form.retention} onChange={(e) => set('retention', e.target.value)} placeholder="7 years post-decision" /></Field>
        <Field label="Governed dataset" hint="Data Governance registry entry this extract derives from">
          <Select value={form.linkedDatasetId || NO_LINK} onValueChange={(v) => set('linkedDatasetId', v === NO_LINK ? undefined : v)}>
            <SelectTrigger><SelectValue placeholder={governedLoading ? 'Loading…' : 'Not linked'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LINK}>Not linked</SelectItem>
              {governedDatasets.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Lawful basis" required hint="e.g. GDPR Art.6(1)(b) contract; Art.9(2)(g) for special categories">
        <Textarea value={form.lawfulBasis} onChange={(e) => set('lawfulBasis', e.target.value)} rows={2} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Source system"><Input value={form.lineage.source} onChange={(e) => set('lineage', { ...form.lineage, source: e.target.value })} placeholder="Bureau feed + core banking" /></Field>
        <Field label="Transform"><Input value={form.lineage.transform} onChange={(e) => set('lineage', { ...form.lineage, transform: e.target.value })} placeholder="PII-tokenized, WOE-binned" /></Field>
      </div>
      <Field label="Allowed purposes" hint="Comma-separated (purpose limitation)">
        <Input value={form.allowedPurposes.join(', ')} onChange={(e) => set('allowedPurposes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="credit_model_training, fairness_eval" />
      </Field>
    </FormDialog>
  )
}

export default DatasetCatalogForm
