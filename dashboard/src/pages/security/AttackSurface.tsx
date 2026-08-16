// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Globe, Eye, PencilSimple, Trash, Plus, Fire,
  CheckCircle, Target, ShieldWarning, Lightning,
  MagnifyingGlass, Graph, CaretDown, CaretUp, X,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { InterlinkChip } from '../../components/ui/InterlinkChip';
import { severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useAssets } from '../../hooks/useSecurityGroup';
import type { AssetRecord } from '../../services/securityGroupService';
import { useModelsData } from '../../hooks/useModelsData';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { PageHeader } from '../../components/ui/PageHeader';


// ── Exposure Risk Score — prefer the stored riskScore, else derive from severity/exposure ──
function getExposureScore(a: AssetRecord): number {
  if (typeof a.riskScore === 'number') return Math.round(a.riskScore);
  const sevScores: Record<string, number> = { critical: 95, high: 78, medium: 55, low: 25 };
  const expMult: Record<string, number> = { public: 1.2, restricted: 0.9, internal: 0.7 };
  const base = sevScores[(a.severity || 'medium').toLowerCase()] ?? 50;
  return Math.round(base * (expMult[(a.exposure || 'internal').toLowerCase()] ?? 1));
}

// ── Metric Tile ───────────────────────────────────────────────────────────────
function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
  };
  const s = vs[variant];
  return (
    <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
          <div className="p-1.5" style={{ background: s.bg, borderRadius: 0 }}>{icon}</div>
        </div>
        <div className="text-2xl font-bold" style={{ color: s.color }}>{value}</div>
        {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────
function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{
      background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
      borderRadius: 0, color: 'hsl(var(--text-1))',
    }}>
      <p className="font-semibold mb-1">{label}</p>
      <p>Exposure Risk Score: <span className="font-bold">{payload[0].value}</span></p>
      <p>Type: {payload[0].payload.group}</p>
    </div>
  );
}

// Canonical asset statuses (matches seeds/migration): active | monitored |
// decommissioned. Display labels are prettified.
const ASSET_STATUSES = ['active', 'monitored', 'decommissioned'];
const assetStatusLabel = (s?: string) => {
  const raw = s || 'active';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

type AssetForm = {
  name: string; type: string; exposure: string; severity: string; status: string;
  protocol: string; owner: string; description: string; openPorts: string;
  linkedModelIds: string[];
};
const EMPTY_ASSET: AssetForm = {
  name: '', type: 'Web Application', exposure: 'internal', severity: 'medium', status: 'active',
  protocol: 'HTTPS', owner: '', description: '', openPorts: '', linkedModelIds: [],
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function AttackSurface() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const { items: assets, isLoading, error, save, remove, isSaving } = useAssets();
  const { models } = useModelsData();
  const [searchParams, setSearchParams] = useSearchParams();
  const modelParam = searchParams.get('model');

  const [search, setSearch] = useState('');
  const [filterExposure, setFilterExposure] = useState<string>('all');
  const [selected, setSelected] = useState<AssetRecord | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null);
  const [topoOpen, setTopoOpen] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [formAsset, setFormAsset] = useState<AssetForm>({ ...EMPTY_ASSET });
  const [editingAsset, setEditingAsset] = useState<AssetRecord | null>(null);

  const modelName = (id: string) => models.find(m => m.id === id)?.name ?? 'Unavailable';

  if (isLoading) return <PageSkeleton title="Attack Surface" showStats rows={6} />;

  const filtered = assets.filter(a => {
    if (modelParam && !(a.linkedModelIds ?? []).includes(modelParam)) return false;
    if (search && !(a.name ?? '').toLowerCase().includes(search.toLowerCase()) && !(a.type ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterExposure !== 'all' && a.exposure !== filterExposure) return false;
    return true;
  });

  const exposedCount = assets.filter(a => a.exposure === 'public').length;
  const criticalCount = assets.filter(a => (a.severity || '').toLowerCase() === 'critical').length;
  const activeCount = assets.filter(a => a.status === 'active').length;
  const monitoredCount = assets.filter(a => a.status === 'monitored').length;

  // Chart data derived from real assets
  const chartData = assets.map(a => ({
    name: (a.name ?? '').split('.')[0] || a.name || '—',
    score: getExposureScore(a),
    group: a.exposure === 'public' ? 'External' : 'Internal',
    fill: a.exposure === 'public' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
  }));

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await remove(deleteTarget.id);
      if (selected?.id === deleteTarget.id) { setSheetOpen(false); setSelected(null); }
      setDeleteTarget(null);
    } catch { /* hook toasts error */ }
  };

  const openDetail = (a: AssetRecord) => { setSelected(a); setSheetOpen(true); };

  const openRegister = () => {
    setEditingAsset(null);
    setFormAsset({ ...EMPTY_ASSET });
    setRegisterOpen(true);
  };

  const openEdit = (a: AssetRecord) => {
    setEditingAsset(a);
    setFormAsset({
      name: a.name ?? '',
      type: a.type ?? 'Web Application',
      exposure: a.exposure ?? 'internal',
      severity: a.severity ?? 'medium',
      status: a.status ?? 'active',
      protocol: a.protocol ?? 'HTTPS',
      owner: a.owner ?? '',
      description: a.description ?? '',
      openPorts: (a.openPorts ?? []).join(', '),
      linkedModelIds: a.linkedModelIds ?? [],
    });
    setRegisterOpen(true);
  };

  const handleRegister = async () => {
    if (!formAsset.name.trim()) { toast.error('Asset name is required'); return; }
    const openPorts = formAsset.openPorts
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(n => !Number.isNaN(n));
    try {
      await save({
        ...(editingAsset?.id ? { id: editingAsset.id } : {}),
        name: formAsset.name,
        type: formAsset.type,
        description: formAsset.description || undefined,
        exposure: formAsset.exposure,
        protocol: formAsset.protocol,
        openPorts,
        // 'active' matches the seed vocabulary; editable in the form.
        status: formAsset.status || 'active',
        severity: formAsset.severity,
        lastScannedAt: editingAsset ? editingAsset.lastScannedAt : new Date().toISOString(),
        owner: formAsset.owner || undefined,
        linkedModelIds: formAsset.linkedModelIds,
        ...(editingAsset ? { tags: editingAsset.tags, riskScore: editingAsset.riskScore } : {}),
      });
      setFormAsset({ ...EMPTY_ASSET });
      setEditingAsset(null);
      setRegisterOpen(false);
    } catch { /* hook toasts error */ }
  };

  const toggleFormModel = (id: string) =>
    setFormAsset(p => ({
      ...p,
      linkedModelIds: p.linkedModelIds.includes(id)
        ? p.linkedModelIds.filter(m => m !== id)
        : [...p.linkedModelIds, id],
    }));

  const nodeColor = (a: AssetRecord) => {
    const sev = (a.severity || 'low').toLowerCase();
    if (sev === 'critical') return 'hsl(var(--s-er-tx))';
    if (sev === 'high') return 'hsl(var(--r-hi-tx))';
    if (sev === 'medium') return '#eab308';
    return 'hsl(var(--s-ok-tx))';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attack Surface"
        subtitle={`${orgName} — External and internal asset exposure monitoring`}
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Security', href: '/security' }, { label: 'Attack Surface' }]}
        actions={
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={openRegister}>
            <Plus size={14} />Register Asset
          </Button>
        }
      />

      {/* Real query error state */}
      {error && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Failed to load attack surface assets</p>
          <p className="text-xs text-[hsl(var(--text-3))] mt-0.5">{(error as Error).message}</p>
        </div>
      )}

      {/* Model-scoped filter chip */}
      {modelParam && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-[hsl(var(--brand-subtle))] border border-[hsl(var(--brand))/30] text-[hsl(var(--brand))] rounded-none">
            <span>Filtered to <strong>{modelName(modelParam)}</strong></span>
            <button aria-label="Clear model filter" onClick={() => setSearchParams({})} className="inline-flex items-center hover:text-[hsl(var(--text-1))] cursor-pointer">
              <X size={14} />
            </button>
          </span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <MetricTile label="Total Assets" value={String(assets.length)} variant="info" icon={<Globe size={16} className="text-[hsl(var(--s-in-tx))]" />} />
        <MetricTile label="Exposed (Public)" value={String(exposedCount)} variant="error" icon={<ShieldWarning size={16} weight="fill" className="text-destructive" />} />
        <MetricTile label="Critical Risk" value={String(criticalCount)} variant="error" icon={<Fire size={16} weight="fill" className="text-destructive" />} sub="Immediate attention" />
        <MetricTile label="Active" value={String(activeCount)} variant="warn" icon={<Lightning size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} sub="In service" />
        <MetricTile label="Monitored" value={String(monitoredCount)} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-[hsl(var(--s-ok-tx))]" />} />
      </div>

      {assets.length === 0 ? (
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardContent className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
            <Globe size={40} />
            <p className="mt-3 text-sm font-medium">No assets registered yet</p>
            <p className="text-xs mt-1">Register an asset to begin monitoring your attack surface.</p>
            <Button className="mt-4" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={openRegister}>
              <Plus size={14} />Register Asset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Exposure Chart — derived from real assets */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Exposure Risk Score by Asset</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3" style={{ background: 'hsl(var(--destructive))', borderRadius: 0 }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>External</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3" style={{ background: 'hsl(var(--s-in-tx))', borderRadius: 0 }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Internal</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: ct.axis, fontSize: 10 }} axisLine={{ stroke: ct.grid }} tickLine={false} />
                  <YAxis
                    label={{ value: 'Exposure Risk Score', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }}
                    tick={{ fill: ct.axis, fontSize: 11 }}
                    axisLine={{ stroke: ct.grid }}
                    tickLine={false}
                    domain={[0, 120]}
                  />
                  <ReTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" maxBarSize={36}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ── SVG Network Topology (derived from real assets) ────────────── */}
          {(() => {
            const externalAssetNodes = assets.filter(a => a.exposure === 'public');
            const internalAssetNodes = assets.filter(a => a.exposure !== 'public');
            const W = 900;
            const extY = 140;
            const intY = 250;
            const INET = { id: '_inet', x: W / 2, y: 42 };

            const extNodes = externalAssetNodes.map((a, i) => {
              const step = W / (externalAssetNodes.length + 1);
              return { ...a, x: step * (i + 1), y: extY };
            });
            const intNodes = internalAssetNodes.map((a, i) => {
              const step = W / (internalAssetNodes.length + 1);
              return { ...a, x: step * (i + 1), y: intY };
            });

            return (
              <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardHeader className="pb-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Graph size={15} style={{ color: 'hsl(var(--brand))' }} />
                      <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Network Topology</CardTitle>
                      <span className="text-xs px-1.5 py-0.5" style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-4))' }}>
                        {assets.length} assets · {externalAssetNodes.length} public exposure
                      </span>
                    </div>
                    <button
                      onClick={() => setTopoOpen(o => !o)}
                      className="flex items-center gap-1 text-xs"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-4))' }}
                    >
                      {topoOpen ? <CaretUp size={13} /> : <CaretDown size={13} />}
                      {topoOpen ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </CardHeader>
                {topoOpen && (
                  <CardContent className="pt-0 pb-2">
                    <div style={{ position: 'relative' }}>
                      <svg
                        viewBox={`0 0 ${W} 300`}
                        style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
                        aria-label="Attack surface network topology"
                      >
                        <defs>
                          <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                            <polygon points="0 0, 6 2, 0 4" fill="hsl(var(--border-mid))" />
                          </marker>
                        </defs>

                        {/* Edges: Internet → external */}
                        {extNodes.map(n => {
                          const sev = (n.severity || 'low').toLowerCase();
                          return (
                            <line
                              key={`ie-${n.id}`}
                              x1={INET.x} y1={INET.y + 14} x2={n.x} y2={n.y - 14}
                              stroke={sev === 'critical' || sev === 'high' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--border-mid))'}
                              strokeWidth={sev === 'critical' ? 2.5 : 1.5}
                              strokeDasharray={sev === 'critical' ? '4 2' : 'none'}
                              markerEnd="url(#arrowhead)"
                            />
                          );
                        })}

                        {/* Edges: external → internal */}
                        {extNodes.slice(0, 2).map(en =>
                          intNodes.map(n => (
                            <line
                              key={`ei-${en.id}-${n.id}`}
                              x1={en.x} y1={en.y + 14} x2={n.x} y2={n.y - 14}
                              stroke="hsl(var(--border))"
                              strokeWidth={1}
                            />
                          ))
                        )}

                        {/* Internet gateway node */}
                        <g role="img" aria-label="Internet gateway">
                          <rect x={INET.x - 40} y={INET.y - 14} width={80} height={28} fill="hsl(var(--s-in-bg))" stroke="hsl(var(--s-in-bg))" strokeWidth={1.5} />
                          <text x={INET.x} y={INET.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="hsl(var(--s-in-tx))">INTERNET</text>
                        </g>

                        {/* External nodes */}
                        {extNodes.map(n => {
                          const isHov = hoveredNode === n.id;
                          const color = nodeColor(n);
                          const sev = (n.severity || 'low').toLowerCase();
                          return (
                            <g
                              key={n.id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => openDetail(n)}
                              onMouseEnter={() => setHoveredNode(n.id ?? null)}
                              onMouseLeave={() => setHoveredNode(null)}
                              role="button"
                              aria-label={`${n.name} — ${n.severity || 'low'} severity`}
                            >
                              {(sev === 'critical' || sev === 'high') && (
                                <circle cx={n.x} cy={n.y} r={isHov ? 22 : 18} fill={`${color}20`} />
                              )}
                              <rect x={n.x - 36} y={n.y - 13} width={72} height={26} fill={isHov ? `${color}22` : 'hsl(var(--bg-surface))'} stroke={color} strokeWidth={isHov ? 2 : 1.5} />
                              <text x={n.x} y={n.y - 0} textAnchor="middle" fontSize={8.5} fill={color} fontWeight={600}>{(n.name ?? '').split('.')[0].substring(0, 10)}</text>
                              <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={7} fill="hsl(var(--text-4))">{(n.type ?? '').substring(0, 12)}</text>
                              <circle cx={n.x + 34} cy={n.y - 11} r={4} fill={color} />
                            </g>
                          );
                        })}

                        {/* Internal / restricted nodes */}
                        {intNodes.map(n => {
                          const isHov = hoveredNode === n.id;
                          const color = nodeColor(n);
                          const sev = (n.severity || 'low').toLowerCase();
                          return (
                            <g
                              key={n.id}
                              style={{ cursor: 'pointer' }}
                              onClick={() => openDetail(n)}
                              onMouseEnter={() => setHoveredNode(n.id ?? null)}
                              onMouseLeave={() => setHoveredNode(null)}
                              role="button"
                              aria-label={`${n.name} — ${n.severity || 'low'} severity`}
                            >
                              <rect x={n.x - 36} y={n.y - 13} width={72} height={26} fill={isHov ? `${color}18` : 'hsl(var(--bg-muted))'} stroke={isHov ? color : 'hsl(var(--border-mid))'} strokeWidth={1.5} strokeDasharray={n.exposure === 'restricted' ? '3 2' : 'none'} />
                              <text x={n.x} y={n.y} textAnchor="middle" fontSize={8.5} fill="hsl(var(--text-2))" fontWeight={500}>{(n.name ?? '').split('.')[0].substring(0, 12)}</text>
                              <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={7} fill="hsl(var(--text-4))">{n.exposure === 'restricted' ? 'Restricted' : (n.type ?? '').substring(0, 10)}</text>
                              {sev === 'critical' && (<circle cx={n.x + 34} cy={n.y - 11} r={4} fill={color} />)}
                            </g>
                          );
                        })}

                        {/* Zone labels */}
                        <text x={8} y={extY} fontSize={8} fill="hsl(var(--text-4))" fontWeight={600}>PUBLIC</text>
                        <text x={8} y={intY} fontSize={8} fill="hsl(var(--text-4))" fontWeight={600}>INTERNAL</text>
                        <line x1={0} y1={(extY + intY) / 2} x2={W} y2={(extY + intY) / 2} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="6 4" />
                      </svg>

                      {/* Hover tooltip */}
                      {hoveredNode && (() => {
                        const node = [...extNodes, ...intNodes].find(n => n.id === hoveredNode);
                        if (!node) return null;
                        return (
                          <div style={{
                            position: 'absolute', bottom: 8, right: 8,
                            background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))',
                            padding: '8px 12px', minWidth: 200, zIndex: 10, boxShadow: 'var(--shadow-md)',
                          }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>{node.name}</p>
                            <div className="space-y-0.5">
                              {[
                                ['Type', node.type || '—'],
                                ['Exposure', node.exposure || '—'],
                                ['Severity', node.severity || '—'],
                                ['Protocol', node.protocol || '—'],
                                ['Ports', (node.openPorts ?? []).join(', ') || '—'],
                              ].map(([k, v]) => (
                                <div key={k as string} className="flex justify-between gap-4">
                                  <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{k}</span>
                                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v}</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs mt-1.5 pt-1.5" style={{ color: 'hsl(var(--text-4))', borderTop: '1px solid hsl(var(--border))' }}>Click to view details →</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 px-2 pb-1 flex-wrap">
                      {[
                        { color: 'hsl(var(--s-er-tx))', label: 'Critical' },
                        { color: 'hsl(var(--r-hi-tx))', label: 'High' },
                        { color: '#eab308', label: 'Medium' },
                        { color: 'hsl(var(--s-ok-tx))', label: 'Low' },
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div style={{ width: 10, height: 10, background: color, borderRadius: 0 }} />
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{label}</span>
                        </div>
                      ))}
                      <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>Click any node to inspect</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })()}

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
              <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" style={{ borderRadius: 0 }} />
            </div>
            <Select value={filterExposure} onValueChange={setFilterExposure}>
              <SelectTrigger className="h-8 w-36 text-xs" style={{ borderRadius: 0 }}><SelectValue placeholder="Exposure" /></SelectTrigger>
              <SelectContent style={{ borderRadius: 0 }}>
                <SelectItem value="all">All Exposure</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Asset', 'Type', 'Exposure', 'Severity', 'Status', 'Linked Models', 'Last Scan', 'Owner', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(a => {
                      const sc = severityColor(a.severity);
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</span>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.type || '—'}</td>
                          <td className="px-4 py-3">
                            <Badge style={{
                              background: a.exposure === 'public' ? 'hsl(var(--s-er-bg))' : a.exposure === 'restricted' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-in-bg))',
                              color: a.exposure === 'public' ? 'hsl(var(--destructive))' : a.exposure === 'restricted' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-in-tx))',
                              borderRadius: 0, fontSize: 10,
                            }}>
                              {(a.exposure || 'internal').charAt(0).toUpperCase() + (a.exposure || 'internal').slice(1)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                              {(a.severity || 'medium').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge style={{ background: statusColor(a.status || 'active').bg, color: statusColor(a.status || 'active').text, borderRadius: 0, fontSize: 10 }}>
                              {assetStatusLabel(a.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(a.linkedModelIds ?? []).length > 0
                                ? (a.linkedModelIds ?? []).map(id => (
                                    <InterlinkChip key={id} label={modelName(id)} to={`/models/inventory/${id}`} />
                                  ))
                                : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.lastScannedAt ? formatDate(a.lastScannedAt) : '—'}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{a.owner || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(a)}>
                                <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                                <PencilSimple size={14} style={{ color: 'hsl(var(--text-4))' }} />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDeleteTarget(a)}>
                                <Trash size={14} className="text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-10 text-center text-xs" style={{ color: 'hsl(var(--text-4))' }}>No assets match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Register / Edit Asset Dialog */}
      <Dialog open={registerOpen} onOpenChange={o => { setRegisterOpen(o); if (!o) setEditingAsset(null); }}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 580 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>{editingAsset ? 'Edit Asset' : 'Register New Asset'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Asset Name / Hostname *</Label>
                <Input placeholder="e.g. api.company.com" value={formAsset.name} onChange={e => setFormAsset(p => ({ ...p, name: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Asset Type</Label>
                <select value={formAsset.type} onChange={e => setFormAsset(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  {['Web Application', 'API Gateway', 'ML Pipeline', 'Data Store', 'Admin Panel', 'CDN', 'Monitoring', 'Microservice'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Protocol</Label>
                <select value={formAsset.protocol} onChange={e => setFormAsset(p => ({ ...p, protocol: e.target.value }))} style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  {['HTTPS', 'HTTPS/REST', 'gRPC', 'PostgreSQL', 'TCP', 'WebSocket', 'MQTT'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Network Exposure</Label>
                <select value={formAsset.exposure} onChange={e => setFormAsset(p => ({ ...p, exposure: e.target.value }))} style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  <option value="public">Public (Internet-facing)</option>
                  <option value="internal">Internal (LAN only)</option>
                  <option value="restricted">Restricted (VPN/MFA required)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Severity</Label>
                <select value={formAsset.severity} onChange={e => setFormAsset(p => ({ ...p, severity: e.target.value }))} style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</Label>
                <select value={formAsset.status} onChange={e => setFormAsset(p => ({ ...p, status: e.target.value }))} style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}>
                  {ASSET_STATUSES.map(s => <option key={s} value={s}>{assetStatusLabel(s)}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Open Ports (comma-separated)</Label>
                <Input placeholder="e.g. 443, 8080" value={formAsset.openPorts} onChange={e => setFormAsset(p => ({ ...p, openPorts: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Asset Owner</Label>
                <Input placeholder="e.g. Platform Team" value={formAsset.owner} onChange={e => setFormAsset(p => ({ ...p, owner: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Linked Models</Label>
                {models.length === 0 ? (
                  <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>No models in registry to link.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2" style={{ border: '1px solid hsl(var(--border))' }}>
                    {models.map(m => {
                      const on = formAsset.linkedModelIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleFormModel(m.id)}
                          className="text-xs px-2 py-0.5 border transition-colors"
                          style={{
                            borderRadius: 0,
                            borderColor: on ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                            background: on ? 'hsl(var(--brand-subtle))' : 'transparent',
                            color: on ? 'hsl(var(--brand))' : 'hsl(var(--text-3))',
                          }}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</Label>
                <Textarea placeholder="Brief description of this asset and its purpose..." value={formAsset.description} onChange={e => setFormAsset(p => ({ ...p, description: e.target.value }))} style={{ borderRadius: 0, minHeight: 72 }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRegisterOpen(false); setEditingAsset(null); }} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={handleRegister} disabled={!formAsset.name.trim() || isSaving}>
              {editingAsset ? (isSaving ? 'Saving…' : 'Save Changes') : <><Plus size={14} />Register Asset</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        type="danger"
        title="Remove Asset"
        message={<p>Remove <strong>{deleteTarget?.name}</strong> from monitoring? This creates an audit entry.</p>}
        confirmLabel="Remove"
      />

      {/* Asset Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
                  <Globe size={18} style={{ color: 'hsl(var(--brand))' }} />
                  {selected.name}
                </SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="exposure" style={{ borderRadius: 0 }}>Exposure Analysis</TabsTrigger>
                  <TabsTrigger value="models" style={{ borderRadius: 0 }}>Linked Models</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Type</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.type || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Exposure</span>
                      <p className="text-sm font-medium mt-1" style={{ color: selected.exposure === 'public' ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>{(selected.exposure || 'internal').toUpperCase()}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Protocol</span>
                      <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.protocol || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Open Ports</span>
                      <p className="text-sm font-bold mt-1" style={{ color: (selected.openPorts ?? []).length > 2 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>{(selected.openPorts ?? []).join(', ') || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Owner</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.owner || '—'}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Last Scanned</span>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.lastScannedAt ? formatDate(selected.lastScannedAt) : '—'}</p>
                    </div>
                  </div>
                  {(selected.tags ?? []).length > 0 && (
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Tags</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(selected.tags ?? []).map(t => (
                          <Badge key={t} variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.description && (
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.description}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="exposure" className="space-y-4 mt-4">
                  <div className="p-4" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Exposure Risk Score</span>
                      <span className="text-2xl font-bold" style={{ color: getExposureScore(selected) >= 80 ? 'hsl(var(--destructive))' : getExposureScore(selected) >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))' }}>{getExposureScore(selected)}</span>
                    </div>
                    <div className="w-full h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                      <div className="h-full" style={{
                        width: `${Math.min(100, getExposureScore(selected))}%`,
                        background: getExposureScore(selected) >= 80 ? 'hsl(var(--destructive))' : getExposureScore(selected) >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                        borderRadius: 0,
                      }} />
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Analysis</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>
                      {selected.exposure === 'public'
                        ? 'Public-facing asset with external network exposure. Higher risk of attack surface exploitation.'
                        : selected.exposure === 'restricted'
                        ? 'Restricted access asset. Limited external exposure with access controls in place.'
                        : 'Internal asset behind network perimeter. Lower exposure but requires monitoring for lateral movement.'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="models" className="space-y-3 mt-4">
                  {(selected.linkedModelIds ?? []).length > 0 ? (
                    (selected.linkedModelIds ?? []).map(id => (
                      <div key={id} className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                        <div className="flex items-center gap-2">
                          <Target size={14} style={{ color: 'hsl(var(--brand))' }} />
                          <InterlinkChip label={modelName(id)} to={`/models/inventory/${id}`} />
                        </div>
                        <Badge style={{ background: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>Linked</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs py-6 text-center" style={{ color: 'hsl(var(--text-4))' }}>No models linked to this asset.</p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
