import { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Database, MagnifyingGlass, Eye, DownloadSimple, Plus,
  ShieldCheck, Warning, Lock, CheckCircle, Clock,
} from '@phosphor-icons/react';
import { DATASETS, MODELS, formatDate, severityColor, statusColor } from '../../data/seed';
import type { Dataset } from '../../data/seed';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── helpers ────────────────────────────────────────────────────────────────

const sensitivityColors: Record<string, { bg: string; text: string; border: string }> = {
  PII:          { bg: '#ef444420', text: '#ef4444', border: '#ef444440' },
  confidential: { bg: '#f9731620', text: '#f97316', border: '#f9731640' },
  internal:     { bg: '#f59e0b20', text: '#f59e0b', border: '#f59e0b40' },
};

function SensitivityBadge({ sensitivity }: { sensitivity: string }) {
  const c = sensitivityColors[sensitivity] || { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  const Icon = sensitivity === 'PII' ? Lock : sensitivity === 'confidential' ? ShieldCheck : Eye;
  return (
    <Badge style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, borderRadius: 0, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <Icon size={9} /> {sensitivity}
    </Badge>
  );
}

function DatasetDetailModal({ dataset, onClose }: { dataset: Dataset; onClose: () => void }) {
  const linkedModel = MODELS.find(m => m.id === dataset.linkedModel);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'hsl(var(--bg-page)/70%)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: 560, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', maxHeight: '85vh', overflowY: 'auto', fontFamily: 'Outfit, sans-serif' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Database size={16} style={{ color: '#06b6d4' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{dataset.id}</span>
              <SensitivityBadge sensitivity={dataset.sensitivity} />
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>{dataset.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-3))', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', lineHeight: 1.6, marginBottom: 20 }}>{dataset.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Records', value: dataset.records.toLocaleString() },
              { label: 'Classification', value: dataset.classification },
              { label: 'Encryption', value: dataset.encryption },
              { label: 'Retention', value: dataset.retentionPolicy },
              { label: 'Owner', value: dataset.owner },
              { label: 'Last Audit', value: formatDate(dataset.lastAudit) },
              { label: 'Status', value: dataset.status },
              { label: 'Risk Level', value: dataset.risk },
            ].map(r => (
              <div key={r.label} style={{ padding: '10px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-4))', marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{r.value}</div>
              </div>
            ))}
          </div>
          {linkedModel && (
            <div style={{ padding: '12px 14px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-3))', marginBottom: 8 }}>Linked Model</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{linkedModel.name}</span>
                <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{linkedModel.version}</span>
                <Badge style={{ background: statusColor(linkedModel.status).bg, color: statusColor(linkedModel.status).text, border: 'none', borderRadius: 0, fontSize: 9 }}>
                  {linkedModel.status}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function DatasetHub() {
  const ct = useChartTheme();
  const [search, setSearch] = useState('');
  const [filterSensitivity, setFilterSensitivity] = useState('all');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const filtered = DATASETS.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase());
    const matchSensitivity = filterSensitivity === 'all' || d.sensitivity === filterSensitivity;
    return matchSearch && matchSensitivity;
  });

  const piiCount = DATASETS.filter(d => d.sensitivity === 'PII').length;
  const confCount = DATASETS.filter(d => d.sensitivity === 'confidential').length;
  const totalRecords = DATASETS.reduce((sum, d) => sum + d.records, 0);

  const stats = [
    { label: 'Total Datasets', value: DATASETS.length, color: '#06b6d4', icon: Database },
    { label: 'PII Datasets', value: piiCount, color: '#ef4444', icon: Lock },
    { label: 'Confidential', value: confCount, color: '#f97316', icon: ShieldCheck },
    { label: 'Total Records', value: (totalRecords / 1000000).toFixed(1) + 'M', color: '#10b981', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>Evaluation Dataset Hub</h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginTop: 4 }}>
            Manage and review datasets used for model evaluation and auditing
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', cursor: 'pointer', fontSize: 13 }}>
            <DownloadSimple size={14} /> Export
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'hsl(var(--brand))', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            <Plus size={14} /> Register Dataset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{s.label}</span>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <MagnifyingGlass size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-3))' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search datasets…"
            style={{ width: '100%', padding: '7px 10px 7px 28px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', fontSize: 13, outline: 'none' }}
          />
        </div>
        <select value={filterSensitivity} onChange={e => setFilterSensitivity(e.target.value)}
          style={{ padding: '7px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 13 }}>
          <option value="all">All Sensitivity</option>
          <option value="PII">PII</option>
          <option value="confidential">Confidential</option>
          <option value="internal">Internal</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'hsl(var(--bg-raised))' }}>
              {['ID', 'Name', 'Linked Model', 'Records', 'Sensitivity', 'Risk', 'Last Audit', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600, fontSize: 11, color: 'hsl(var(--text-3))', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid hsl(var(--border))', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((dataset, i) => {
              const linkedModel = MODELS.find(m => m.id === dataset.linkedModel);
              const rc = severityColor(dataset.risk);
              const sc = statusColor(dataset.status);
              return (
                <tr
                  key={dataset.id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--border))' : 'none', cursor: 'pointer' }}
                  onClick={() => setSelectedDataset(dataset)}
                >
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, color: 'hsl(var(--text-3))' }}>{dataset.id}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 500, color: 'hsl(var(--text-1))', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dataset.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 2 }}>{dataset.classification}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {linkedModel ? (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))' }}>{linkedModel.name}</div>
                        <div style={{ fontSize: 10, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>{dataset.linkedModel}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-1))' }}>
                      {(dataset.records / 1000000).toFixed(1)}M
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <SensitivityBadge sensitivity={dataset.sensitivity} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0, fontSize: 10 }}>
                      {dataset.risk}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'hsl(var(--text-2))', whiteSpace: 'nowrap' }}>
                    {formatDate(dataset.lastAudit)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                      {dataset.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedDataset(dataset); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', cursor: 'pointer', color: 'hsl(var(--text-2))', fontSize: 11 }}
                    >
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-3))' }}>
            <Database size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <p style={{ fontSize: 13 }}>No datasets match your search</p>
          </div>
        )}

        <div style={{ padding: '10px 14px', borderTop: '1px solid hsl(var(--border))', fontSize: 12, color: 'hsl(var(--text-4))' }}>
          {filtered.length} of {DATASETS.length} datasets
        </div>
      </div>

      {/* Detail modal */}
      {selectedDataset && (
        <DatasetDetailModal dataset={selectedDataset} onClose={() => setSelectedDataset(null)} />
      )}
    </div>
  );
}
