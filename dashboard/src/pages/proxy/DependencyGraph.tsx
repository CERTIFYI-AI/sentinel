import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import {
  Robot, Database, ArrowRight, ArrowDown, CheckCircle, Warning, Lock,
  Eye, Funnel, MagnifyingGlass,
} from '@phosphor-icons/react';
import { MODELS, AGENTS, DATASETS, statusColor, severityColor } from '../../data/seed';

// ── dependency data ────────────────────────────────────────────────────────

interface Dependency {
  modelId: string;
  agentIds: string[];
  datasetIds: string[];
}

const DEPENDENCIES: Dependency[] = [
  { modelId: 'MDL-001', agentIds: ['AGT-001', 'AGT-002'], datasetIds: ['DS-001'] },
  { modelId: 'MDL-002', agentIds: ['AGT-004'], datasetIds: ['DS-002'] },
  { modelId: 'MDL-003', agentIds: ['AGT-001'], datasetIds: ['DS-003'] },
  { modelId: 'MDL-004', agentIds: ['AGT-003', 'AGT-008'], datasetIds: ['DS-004', 'DS-007'] },
  { modelId: 'MDL-005', agentIds: ['AGT-004', 'AGT-005'], datasetIds: ['DS-005'] },
  { modelId: 'MDL-006', agentIds: ['AGT-009'], datasetIds: ['DS-006'] },
];

// ── helpers ────────────────────────────────────────────────────────────────

const riskColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#10b981',
};

const sensitivityColors: Record<string, string> = {
  PII: '#ef4444',
  confidential: '#f97316',
  internal: '#f59e0b',
};

function ModelCard({ modelId, selected, onClick }: { modelId: string; selected: boolean; onClick: () => void }) {
  const model = MODELS.find(m => m.id === modelId);
  if (!model) return null;
  const driftColor = model.driftStatus === 'critical' ? '#ef4444' : model.driftStatus === 'warning' ? '#f97316' : '#10b981';
  const tierColors: Record<string, string> = { high: '#ef4444', limited: '#f97316', minimal: '#10b981', unacceptable: '#dc2626' };
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        background: selected ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-surface))',
        border: `1px solid ${selected ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        borderLeft: `3px solid ${tierColors[model.riskTier] || 'hsl(var(--border))'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Robot size={14} style={{ color: tierColors[model.riskTier] || 'hsl(var(--text-3))', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{model.id}</span>
        <Badge style={{
          background: statusColor(model.status).bg,
          color: statusColor(model.status).text,
          border: `1px solid ${statusColor(model.status).border}`,
          borderRadius: 0, fontSize: 9, marginLeft: 'auto',
        }}>
          {model.status}
        </Badge>
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))', marginBottom: 4 }}>{model.name}</p>
      <p style={{ fontSize: 10, color: 'hsl(var(--text-3))', marginBottom: 6 }}>{model.version} · {model.type.split(' — ')[0]}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: tierColors[model.riskTier] }}>
          {model.riskTier} risk
        </span>
        <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>·</span>
        <span style={{ fontSize: 10, color: driftColor }}>
          drift: {model.driftStatus}
        </span>
        <span style={{ fontSize: 10, color: 'hsl(var(--text-4))' }}>·</span>
        <span style={{ fontSize: 10, color: model.fairnessScore >= 85 ? '#10b981' : '#ef4444' }}>
          fairness: {model.fairnessScore}%
        </span>
      </div>
    </div>
  );
}

function AgentCard({ agentId }: { agentId: string }) {
  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) {
    return (
      <div style={{ padding: '8px 12px', background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-br))' }}>
        <span style={{ fontSize: 11, color: '#ef4444', fontFamily: 'monospace' }}>{agentId}</span>
        <span style={{ fontSize: 10, color: '#ef4444', marginLeft: 6 }}>Shadow / Unregistered</span>
      </div>
    );
  }
  const agentStatus = agent.status === 'shadow' ? { bg: 'hsl(var(--s-er-bg))', text: '#ef4444', border: 'hsl(var(--s-er-br))' }
    : agent.status === 'quarantined' ? { bg: 'hsl(var(--s-er-bg))', text: '#ef4444', border: 'hsl(var(--s-er-br))' }
    : agent.status === 'confirmed' ? { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' }
    : { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };

  return (
    <div style={{
      padding: '8px 12px',
      background: 'hsl(var(--bg-muted))',
      border: '1px solid hsl(var(--border))',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Robot size={12} style={{ color: riskColors[agent.risk] || 'hsl(var(--text-3))', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.name}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{agent.id}</span>
          <span style={{ fontSize: 9, color: 'hsl(var(--text-4))' }}>{agent.department}</span>
        </div>
      </div>
      <Badge style={{ background: agentStatus.bg, color: agentStatus.text, border: `1px solid ${agentStatus.border}`, borderRadius: 0, fontSize: 9 }}>
        {agent.status}
      </Badge>
    </div>
  );
}

function DatasetCard({ datasetId }: { datasetId: string }) {
  const dataset = DATASETS.find(d => d.id === datasetId);
  if (!dataset) return (
    <div style={{ padding: '8px 12px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-3))' }}>{datasetId}</span>
    </div>
  );
  const sensitivityColor = sensitivityColors[dataset.sensitivity] || 'hsl(var(--text-3))';
  return (
    <div style={{
      padding: '8px 12px',
      background: 'hsl(var(--bg-muted))',
      border: '1px solid hsl(var(--border))',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Database size={12} style={{ color: '#06b6d4', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {dataset.name}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{dataset.id}</span>
          <span style={{ fontSize: 9, color: 'hsl(var(--text-4))' }}>{(dataset.records / 1000000).toFixed(1)}M records</span>
        </div>
      </div>
      <Badge style={{ background: sensitivityColor + '20', color: sensitivityColor, border: `1px solid ${sensitivityColor}40`, borderRadius: 0, fontSize: 9 }}>
        {dataset.sensitivity}
      </Badge>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function DependencyGraph() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filteredDeps = DEPENDENCIES.filter(d => {
    if (filter === 'all') return true;
    const model = MODELS.find(m => m.id === d.modelId);
    return model?.riskTier === filter || model?.status === filter;
  });

  const selectedDep = selectedModelId ? DEPENDENCIES.find(d => d.modelId === selectedModelId) : null;

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0 }}>Agent → Model → Dataset Dependencies</h3>
          <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginTop: 3 }}>
            {DEPENDENCIES.length} models · {AGENTS.length} agents · {DATASETS.length} datasets
          </p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: '6px 10px', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))', fontSize: 12 }}
        >
          <option value="all">All Models</option>
          <option value="high">High Risk</option>
          <option value="production">Production</option>
          <option value="staging">Staging</option>
        </select>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '8px 14px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
        {[
          { icon: Robot, label: 'Model', color: '#6366f1' },
          { icon: Robot, label: 'Agent', color: '#10b981' },
          { icon: Database, label: 'Dataset', color: '#06b6d4' },
          { icon: ArrowRight, label: 'Depends on', color: 'hsl(var(--text-3))' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <item.icon size={12} style={{ color: item.color }} />
            <span style={{ fontSize: 11, color: 'hsl(var(--text-3))' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Dependency cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredDeps.map(dep => {
          const model = MODELS.find(m => m.id === dep.modelId);
          if (!model) return null;
          const isSelected = selectedModelId === dep.modelId;
          const connectedAgents = AGENTS.filter(a => dep.agentIds.includes(a.id));
          const hasRisk = model.riskTier === 'high' || model.driftStatus !== 'stable';

          return (
            <div
              key={dep.modelId}
              style={{
                background: 'hsl(var(--bg-surface))',
                border: `1px solid ${isSelected ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                overflow: 'hidden',
              }}
            >
              {/* Row layout: Model → Agents → Datasets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr 24px 1fr', alignItems: 'start' }}>
                {/* Model column */}
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-4))', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Robot size={10} style={{ color: '#6366f1' }} /> Model
                    {hasRisk && <Warning size={10} style={{ color: '#f97316', marginLeft: 'auto' }} />}
                  </div>
                  <ModelCard modelId={dep.modelId} selected={isSelected} onClick={() => setSelectedModelId(isSelected ? null : dep.modelId)} />
                </div>

                {/* Arrow 1 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 50 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <ArrowRight size={14} style={{ color: 'hsl(var(--text-4))' }} />
                  </div>
                </div>

                {/* Agents column */}
                <div style={{ padding: '14px 14px 14px 0' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-4))', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Robot size={10} style={{ color: '#10b981' }} /> Agents ({dep.agentIds.length})
                    {connectedAgents.some(a => a.status === 'shadow' || a.status === 'quarantined') && (
                      <Lock size={10} style={{ color: '#ef4444', marginLeft: 4 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dep.agentIds.map(aid => (
                      <AgentCard key={aid} agentId={aid} />
                    ))}
                  </div>
                </div>

                {/* Arrow 2 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 50 }}>
                  <ArrowRight size={14} style={{ color: 'hsl(var(--text-4))' }} />
                </div>

                {/* Datasets column */}
                <div style={{ padding: '14px 14px 14px 0' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--text-4))', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Database size={10} style={{ color: '#06b6d4' }} /> Datasets ({dep.datasetIds.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dep.datasetIds.map(did => (
                      <DatasetCard key={did} datasetId={did} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Expanded risk summary */}
              {isSelected && model && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 8 }}>
                    Risk Summary for {model.name}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'hsl(var(--text-3))' }}>
                    <span>EU AI Act: <strong style={{ color: 'hsl(var(--text-2))' }}>{model.euAiActArticle.split(' — ')[0]}</strong></span>
                    <span>Fairness: <strong style={{ color: model.fairnessScore >= 85 ? '#10b981' : '#ef4444' }}>{model.fairnessScore}%</strong></span>
                    <span>Drift: <strong style={{ color: model.driftStatus === 'stable' ? '#10b981' : model.driftStatus === 'warning' ? '#f97316' : '#ef4444' }}>{model.driftStatus}</strong></span>
                    <span>Framework: <strong style={{ color: 'hsl(var(--text-2))' }}>{model.framework}</strong></span>
                    <span>Accuracy: <strong style={{ color: 'hsl(var(--text-2))' }}>{model.accuracy}%</strong></span>
                    <span>Monthly Inferences: <strong style={{ color: 'hsl(var(--text-2))' }}>{model.monthlyInferences}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
