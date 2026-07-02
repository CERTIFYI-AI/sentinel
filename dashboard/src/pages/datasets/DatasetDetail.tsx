import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, Lock, Clock, Robot } from '@phosphor-icons/react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { DATASETS, MODELS, severityColor, statusColor, formatDate, formatNumber } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

const schemaByDataset: Record<string, { column: string; type: string; pii: boolean; nullable: boolean; description: string }[]> = {
  'DS-001': [
    { column: 'applicant_id', type: 'UUID', pii: false, nullable: false, description: 'Anonymous applicant identifier' },
    { column: 'credit_score', type: 'INT', pii: false, nullable: false, description: 'Credit bureau score (300–850)' },
    { column: 'annual_income', type: 'DECIMAL(15,2)', pii: true, nullable: true, description: 'Self-reported annual income' },
    { column: 'zip_code', type: 'VARCHAR(10)', pii: true, nullable: true, description: 'ZIP code — geographic proxy risk' },
    { column: 'loan_amount', type: 'DECIMAL(15,2)', pii: false, nullable: false, description: 'Requested loan amount' },
    { column: 'loan_term_months', type: 'INT', pii: false, nullable: false, description: 'Loan term in months' },
    { column: 'default_flag', type: 'BOOLEAN', pii: false, nullable: false, description: 'Historical default (label)' },
    { column: 'created_at', type: 'TIMESTAMP', pii: false, nullable: false, description: 'Record creation timestamp' },
  ],
  'DS-002': [
    { column: 'transaction_id', type: 'UUID', pii: false, nullable: false, description: 'Unique transaction identifier' },
    { column: 'amount', type: 'DECIMAL(15,2)', pii: false, nullable: false, description: 'Transaction amount' },
    { column: 'merchant_id', type: 'VARCHAR(50)', pii: false, nullable: false, description: 'Anonymized merchant identifier' },
    { column: 'user_id', type: 'UUID', pii: true, nullable: false, description: 'Customer user identifier (PII)' },
    { column: 'is_fraud', type: 'BOOLEAN', pii: false, nullable: false, description: 'Fraud label (ground truth)' },
    { column: 'timestamp', type: 'TIMESTAMP', pii: false, nullable: false, description: 'Transaction timestamp' },
  ],
  default: [
    { column: 'id', type: 'UUID', pii: false, nullable: false, description: 'Primary key' },
    { column: 'created_at', type: 'TIMESTAMP', pii: false, nullable: false, description: 'Creation timestamp' },
    { column: 'updated_at', type: 'TIMESTAMP', pii: false, nullable: true, description: 'Last update timestamp' },
    { column: 'label', type: 'VARCHAR(255)', pii: false, nullable: false, description: 'Target label' },
    { column: 'features', type: 'JSONB', pii: false, nullable: false, description: 'Feature vector' },
  ],
};

const auditHistory = [
  { date: '2026-02-15', auditor: 'Emma Wilson', framework: 'GDPR', result: 'passed', notes: 'Data processing basis confirmed. Consent records verified.' },
  { date: '2025-11-20', auditor: 'James Patel', framework: 'ISO 27001', result: 'passed', notes: 'Encryption at rest and in transit verified.' },
  { date: '2025-08-10', auditor: 'Maria Santos', framework: 'NIST AI RMF', result: 'failed', notes: 'Missing data lineage documentation. Remediation required.' },
];

export default function DatasetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useSettingsStore(s => s.orgName);

  const dataset = DATASETS.find(d => d.id === id);

  if (!dataset) {
    return (
      <div className="p-6">
        <Button variant="outline" onClick={() => navigate('/datasets')} className="gap-2 mb-4">
          <ArrowLeft size={16} /> Back to Registry
        </Button>
        <div className="text-[hsl(var(--text-4))]">Dataset not found: {id}</div>
      </div>
    );
  }

  const rc = severityColor(dataset.risk);
  const sc = statusColor(dataset.status);
  const model = MODELS.find(m => m.id === dataset.linkedModel);
  const schema = schemaByDataset[dataset.id] || schemaByDataset['default'];

  const sensitivityColor: Record<string, string> = {
    PII: 'bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))] border-[hsl(var(--s-er-br))]',
    PHI: 'bg-[hsl(var(--tag-purple-bg))] text-[hsl(var(--tag-purple))] border-[hsl(var(--tag-purple-border))]',
    confidential: 'bg-[hsl(var(--s-wn-tx))] text-[hsl(var(--s-wn-tx))] border-[hsl(var(--s-wn-br))]',
    internal: 'bg-[hsl(var(--s-in-tx))] text-[hsl(var(--s-in-tx))] border-[hsl(var(--s-in-br))]',
    public: 'bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--s-ok-tx))] border-[hsl(var(--s-ok-br))]',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="outline" onClick={() => navigate('/datasets')} className="gap-2 mb-4">
          <ArrowLeft size={16} /> Back to Registry
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-surface border border-[hsl(var(--border))]">
              <Database size={24} className="text-[hsl(var(--brand))]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[hsl(var(--text-1))]">{dataset.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-[hsl(var(--text-4))]">{dataset.id}</span>
                <span className={`px-2 py-0.5 text-xs border ${sensitivityColor[dataset.sensitivity] || ''}`}>{dataset.sensitivity}</span>
                <span className="px-2 py-0.5 text-xs" style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>{dataset.risk} risk</span>
                <span className="px-2 py-0.5 text-xs" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{dataset.status}</span>
              </div>
              <p className="text-sm text-[hsl(var(--text-4))] mt-1">{dataset.description}</p>
            </div>
          </div>
          <div className="text-right text-xs text-[hsl(var(--text-4))]">
            <div>Owner: {dataset.owner}</div>
            <div className="mt-0.5">Last Audit: {formatDate(dataset.lastAudit)}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="linked">Linked Models</TabsTrigger>
          <TabsTrigger value="audit">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Records</div>
              <div className="text-2xl font-bold text-[hsl(var(--text-1))] mt-1">{formatNumber(dataset.records)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Encryption</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1 flex items-center gap-1"><Lock size={14} /> {dataset.encryption}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Retention</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1 flex items-center gap-1"><Clock size={14} /> {dataset.retentionPolicy}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-[hsl(var(--text-4))]">Classification</div>
              <div className="text-sm font-medium text-[hsl(var(--text-1))] mt-1">{dataset.classification}</div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schema" className="mt-4">
          <Card>
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <div className="text-sm font-medium text-[hsl(var(--text-1))]">Column Definitions</div>
              <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{schema.length} columns · {schema.filter(c => c.pii).length} PII columns</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    {['Column', 'Type', 'Nullable', 'PII', 'Description'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schema.map(col => (
                    <tr key={col.column} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-surface))/50]">
                      <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-1))]">{col.column}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{col.type}</td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{col.nullable ? 'YES' : 'NO'}</td>
                      <td className="px-4 py-3">
                        {col.pii && <span className="px-1.5 py-0.5 text-xs bg-[hsl(var(--s-er-tx))] text-[hsl(var(--s-er-tx))] border border-[hsl(var(--s-er-br))]">PII</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="linked" className="mt-4">
          {model ? (
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-surface border border-[hsl(var(--border))]">
                  <Robot size={18} className="text-[hsl(var(--brand))]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[hsl(var(--text-1))]">{model.name}</div>
                      <div className="text-xs text-[hsl(var(--text-4))] mt-0.5">{model.id} · {model.version} · {model.type}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/models/inventory')}>View Model</Button>
                  </div>
                  <div className="text-sm text-[hsl(var(--text-3))] mt-2">{model.description}</div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-xs"><span className="text-[hsl(var(--text-4))]">Status:</span> <span className="text-[hsl(var(--text-1))]">{model.status}</span></div>
                    <div className="text-xs"><span className="text-[hsl(var(--text-4))]">Risk Tier:</span> <span className="text-[hsl(var(--text-1))]">{model.riskTier}</span></div>
                    <div className="text-xs"><span className="text-[hsl(var(--text-4))]">Accuracy:</span> <span className="text-[hsl(var(--text-1))]">{model.accuracy}%</span></div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="text-sm text-[hsl(var(--text-4))]">No linked models for this dataset.</div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <div className="space-y-3">
            {auditHistory.map((a, i) => {
              const statusC = statusColor(a.result);
              return (
                <Card key={i} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[hsl(var(--text-1))]">{a.framework} Audit</span>
                        <span className="px-2 py-0.5 text-xs" style={{ background: statusC.bg, color: statusC.text, border: `1px solid ${statusC.border}` }}>{a.result}</span>
                      </div>
                      <div className="text-xs text-[hsl(var(--text-4))] mt-1">Auditor: {a.auditor} · {formatDate(a.date)}</div>
                      <div className="text-sm text-[hsl(var(--text-3))] mt-2">{a.notes}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
