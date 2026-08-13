// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Dataset Wizard — registers a governed dataset catalog entry in the same
// org-scoped `dataset_catalog_entries` table the Data Explorer reads, so a
// created dataset shows up there immediately. Honest by design: no fabricated
// preview rows, no fake upload — ingestion is recorded as pending.

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Database, UploadSimple, FileCode, CheckCircle, ArrowRight, FileCsv, Info } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { datasetCatalogHooks } from '@/hooks/queries/useEvalsCrud';
import { useModelOptions } from '@/hooks/useAiiaData';
import type { DatasetCatalogEntry } from '@/types/evals';

const SOURCES = [
  { id: 'csv', name: 'Upload CSV/JSON', icon: FileCsv, desc: 'Register a local file (ingestion pending)' },
  { id: 's3', name: 'AWS S3 Bucket', icon: Database, desc: 'Connect to an existing S3 bucket' },
  { id: 'snowflake', name: 'Snowflake', icon: Database, desc: 'Query data from your warehouse' },
  { id: 'synthetic', name: 'Synthetic Generation', icon: FileCode, desc: 'Generate test cases via LLM' },
];

const INPUT_COLUMNS = ['user_query', 'transcript', 'ticket_body'];
const OUTPUT_COLUMNS = ['ground_truth_answer', 'resolution', '-- Ignore --'];

const STEPS = ['Source', 'Schema', 'Review'];

/**
 * What the wizard actually knows. Fields it cannot know yet (quality metrics,
 * risk score, sensitivity classification…) are deliberately NOT invented —
 * they stay absent from the doc and downstream views render them as "—".
 */
type WizardEntry = Omit<DatasetCatalogEntry, 'category' | 'sensitivity' | 'riskScore' | 'quality'> & {
  source: string;
  fileName?: string;
  linkedModelIds: string[];
  schemaMapping: { input: string; expectedOutput: string };
  ingestionStatus: 'pending';
};

export default function DatasetCreateModal() {
  const navigate = useNavigate();
  const { models } = useModelOptions();
  const upsert = datasetCatalogHooks.useUpsert();

  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [fileName, setFileName] = useState('');
  const [linkedModelIds, setLinkedModelIds] = useState<string[]>([]);
  const [inputColumn, setInputColumn] = useState(INPUT_COLUMNS[0]);
  const [outputColumn, setOutputColumn] = useState(OUTPUT_COLUMNS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slug = useMemo(() => {
    const s = datasetName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s ? `DS-${s}` : '';
  }, [datasetName]);

  const step1Valid = datasetName.trim().length > 0 && !!selectedSource;
  const sourceName = SOURCES.find((s) => s.id === selectedSource)?.name ?? selectedSource;

  const toggleModel = (id: string) =>
    setLinkedModelIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  async function handleCreate() {
    if (!slug) { toast.error('Enter a dataset name first.'); return; }
    if (!selectedSource) { toast.error('Select a data source first.'); return; }

    const entry: WizardEntry = {
      id: slug,
      datasetId: slug,
      name: datasetName.trim(),
      datasetVersion: '1.0',
      lawfulBasis: '',
      allowedPurposes: [],
      retention: '',
      lineage: { source: sourceName, transform: '', upstreamIds: [] },
      representativeness: [],
      biasIndicators: [],
      slices: [],
      governanceTags: [],
      auditTrail: [{ id: `A${Date.now()}`, actor: 'dataset-wizard', action: 'registered dataset (ingestion pending)', at: new Date().toISOString() }],
      source: selectedSource,
      ...(fileName ? { fileName } : {}),
      linkedModelIds,
      schemaMapping: { input: inputColumn, expectedOutput: outputColumn },
      ingestionStatus: 'pending',
    };

    try {
      await upsert.mutateAsync(entry as unknown as DatasetCatalogEntry);
      toast.success(`Dataset ${slug} created`);
      navigate('/evals/dataset-preview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create dataset');
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden" style={{ background: 'hsl(var(--bg-main))' }}>

      {/* Header */}
      <div className="h-16 flex items-center justify-between px-8 border-b border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-surface))' }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Create New Dataset</h1>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Register a governed dataset for evaluation runs</p>
        </div>
        <div className="flex items-center gap-2">
          <ol className="flex items-center gap-2 text-xs font-semibold mr-6 list-none" style={{ color: 'hsl(var(--text-4))' }} aria-label="Wizard steps">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                {i > 0 && <ArrowRight size={12} aria-hidden="true" />}
                <span aria-current={step === i + 1 ? 'step' : undefined} style={{ color: step >= i + 1 ? 'hsl(var(--brand))' : 'inherit' }}>
                  {i + 1}. {label}
                </span>
              </li>
            ))}
          </ol>
          <Button variant="ghost" size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/evals/dataset-preview')}>Cancel</Button>
          {step < 3 ? (
            <Button
              size="sm"
              disabled={step === 1 && !step1Valid}
              title={step === 1 && !step1Valid ? 'Enter a name and select a source to continue' : undefined}
              style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
              onClick={() => setStep(step + 1)}
            >
              Next Step
            </Button>
          ) : (
            <Button
              size="sm"
              loading={upsert.isPending}
              disabled={upsert.isPending}
              style={{ borderRadius: 0, background: 'hsl(var(--s-ok-tx))', color: 'hsl(var(--bg-surface))' }}
              onClick={handleCreate}
            >
              Create Dataset
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-3xl">

          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label htmlFor="dataset-name" className="block text-sm font-semibold mb-2" style={{ color: 'hsl(var(--text-1))' }}>Dataset Name</label>
                <Input
                  id="dataset-name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g., Q4 Customer Support Tickets"
                  className="w-full max-w-md bg-surface border-[hsl(var(--border))]"
                  style={{ borderRadius: 0 }}
                />
                {slug && <p className="mt-1 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>ID: {slug}</p>}
              </div>

              <div>
                <span id="source-label" className="block text-sm font-semibold mb-4" style={{ color: 'hsl(var(--text-1))' }}>Select Data Source</span>
                <div className="grid grid-cols-2 gap-4" role="group" aria-labelledby="source-label">
                  {SOURCES.map(source => (
                    <Card
                      key={source.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedSource === source.id}
                      onClick={() => setSelectedSource(source.id)}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSource(source.id); }
                      }}
                      className="cursor-pointer transition-colors border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))]"
                      style={{
                        background: 'hsl(var(--bg-surface))',
                        borderRadius: 0,
                        borderColor: selectedSource === source.id ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                        boxShadow: selectedSource === source.id ? '0 0 0 1px hsl(var(--brand))' : 'none'
                      }}
                    >
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{
                          background: selectedSource === source.id ? 'hsl(var(--brand-subtle))' : 'hsl(var(--bg-muted))',
                          color: selectedSource === source.id ? 'hsl(var(--brand))' : 'hsl(var(--text-3))'
                        }}>
                          <source.icon size={20} weight={selectedSource === source.id ? "duotone" : "regular"} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold mb-1" style={{ color: 'hsl(var(--text-1))' }}>{source.name}</h3>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{source.desc}</p>
                        </div>
                        {selectedSource === source.id && (
                          <CheckCircle size={20} weight="fill" className="ml-auto shrink-0" style={{ color: 'hsl(var(--brand))' }} />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedSource === 'csv' && (
                <div className="mt-8 p-8 border-2 border-dashed border-[hsl(var(--border))] flex flex-col items-center justify-center text-center bg-surface">
                  <UploadSimple size={40} style={{ color: 'hsl(var(--text-4))' }} className="mb-3" aria-hidden="true" />
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>
                    {fileName ? `Selected: ${fileName}` : 'Choose a file to register'}
                  </h3>
                  <p className="text-xs mb-4 max-w-md" style={{ color: 'hsl(var(--text-3))' }}>
                    The file name is recorded for lineage. Ingestion is not yet connected — no data is uploaded from this screen.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.jsonl"
                    className="sr-only"
                    aria-label="Choose dataset file"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                  />
                  <Button variant="outline" size="sm" style={{ borderRadius: 0 }} onClick={() => fileInputRef.current?.click()}>
                    {fileName ? 'Change File' : 'Browse Files'}
                  </Button>
                </div>
              )}

              <fieldset className="border border-[hsl(var(--border))] p-4 bg-surface">
                <legend className="px-1 text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Linked models</legend>
                <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-3))' }}>
                  Link this dataset to the registry models it evaluates or trains. It will appear on those models' filtered Data Explorer view.
                </p>
                {models.length === 0 ? (
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models in the registry yet.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {models.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'hsl(var(--text-2))' }}>
                        <input
                          type="checkbox"
                          checked={linkedModelIds.includes(m.id)}
                          onChange={() => toggleModel(m.id)}
                          className="accent-[hsl(var(--brand))]"
                        />
                        <span>{m.name}</span>
                        <span className="text-[11px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>{m.riskTier}</span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 border border-[hsl(var(--border))] bg-surface">
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--text-1))' }}>Schema Mapping</h3>
                <p className="text-xs mb-6" style={{ color: 'hsl(var(--text-3))' }}>Map your dataset columns to the required evaluation schema. The mapping is stored with the entry and applied when ingestion runs.</p>

                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="pb-2 border-b border-[hsl(var(--border))] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Eval Field</th>
                      <th className="pb-2 border-b border-[hsl(var(--border))] font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Dataset Column</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[hsl(var(--border))]">
                    <tr>
                      <td className="py-4">
                        <label htmlFor="map-input"><span className="font-mono text-xs bg-[hsl(var(--bg-muted))] px-2 py-1">input</span> <span className="text-[hsl(var(--s-er-tx))]" aria-hidden="true">*</span></label>
                      </td>
                      <td className="py-4">
                        <select
                          id="map-input"
                          value={inputColumn}
                          onChange={(e) => setInputColumn(e.target.value)}
                          className="w-full p-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] text-xs focus:outline-none focus:border-[hsl(var(--brand))]"
                        >
                          {INPUT_COLUMNS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4">
                        <label htmlFor="map-expected"><span className="font-mono text-xs bg-[hsl(var(--bg-muted))] px-2 py-1">expected_output</span></label>
                      </td>
                      <td className="py-4">
                        <select
                          id="map-expected"
                          value={outputColumn}
                          onChange={(e) => setOutputColumn(e.target.value)}
                          className="w-full p-2 border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] text-xs focus:outline-none focus:border-[hsl(var(--brand))]"
                        >
                          {OUTPUT_COLUMNS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4"><span className="font-mono text-xs bg-[hsl(var(--bg-muted))] px-2 py-1">metadata</span></td>
                      <td className="py-4 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                        All remaining columns will be imported as metadata.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 border border-[hsl(var(--border))] bg-surface">
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'hsl(var(--text-1))' }}>Review</h3>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Name</dt>
                    <dd style={{ color: 'hsl(var(--text-1))' }}>{datasetName.trim() || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>ID</dt>
                    <dd className="font-mono text-xs" style={{ color: 'hsl(var(--text-2))' }}>{slug || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Source</dt>
                    <dd style={{ color: 'hsl(var(--text-1))' }}>{sourceName || '—'}{fileName ? ` · ${fileName}` : ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Schema mapping</dt>
                    <dd className="font-mono text-xs" style={{ color: 'hsl(var(--text-2))' }}>input ← {inputColumn} · expected_output ← {outputColumn}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--text-4))' }}>Linked models</dt>
                    <dd style={{ color: 'hsl(var(--text-1))' }}>
                      {linkedModelIds.length
                        ? linkedModelIds.map((id) => models.find((m) => m.id === id)?.name ?? 'Unavailable').join(', ')
                        : 'None'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex items-start gap-3 p-4 border border-[hsl(var(--border))]" style={{ background: 'hsl(var(--bg-muted))' }}>
                <Info size={18} className="shrink-0 mt-0.5" style={{ color: 'hsl(var(--text-3))' }} aria-hidden="true" />
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                  Preview will be available after ingestion. Creating the dataset registers it in the governed catalog with ingestion pending — no rows have been imported yet, so no row counts or sample data are shown.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
