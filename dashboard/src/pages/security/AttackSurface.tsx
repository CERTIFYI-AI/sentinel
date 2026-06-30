import { useState, useCallback } from 'react';
import {
  Globe, Eye, PencilSimple, Trash, Plus, Scan, Fire,
  CheckCircle, Warning, Clock, Target, ShieldWarning,
  MagnifyingGlass, Lock, ArrowRight, Graph, CaretDown, CaretUp,
  X,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, LabelList,
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
import { ATTACK_SURFACE, AttackSurfaceAsset, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

// ── Register Asset Form Defaults ──────────────────────────────────────────────
const EMPTY_ASSET: Omit<AttackSurfaceAsset, 'id' | 'lastScanned' | 'status'> = {
  name: '', type: 'Web Application', exposure: 'internal', risk: 'medium',
  protocol: 'HTTPS', owner: '', description: '', openPorts: 1,
};


// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Exposure Risk Score Calculation ───────────────────────────────────────────

function getExposureScore(asset: AttackSurfaceAsset): number {
  const riskScores: Record<string, number> = { critical: 95, high: 78, medium: 55, low: 25 };
  const exposureMultiplier: Record<string, number> = { public: 1.2, restricted: 0.9, internal: 0.7 };
  const base = riskScores[asset.risk] || 50;
  return Math.round(base * (exposureMultiplier[asset.exposure] || 1));
}

// ── Chart Data ────────────────────────────────────────────────────────────────

const externalAssets = ATTACK_SURFACE.filter(a => a.exposure === 'public');
const internalAssets = ATTACK_SURFACE.filter(a => a.exposure !== 'public');

const EXPOSURE_CHART_DATA = [
  ...externalAssets.map(a => ({ name: (a.name ?? '').split('.')[0], score: getExposureScore(a), group: 'External', fill: 'hsl(var(--destructive))' })),
  ...internalAssets.map(a => ({ name: (a.name ?? '').split('.')[0], score: getExposureScore(a), group: 'Internal', fill: 'hsl(var(--s-in-tx))' })),
];

// ── Metric Tile ───────────────────────────────────────────────────────────────

function MetricTile({ label, value, variant, icon, sub }: {
  label: string; value: string; variant: 'ok' | 'warn' | 'error' | 'info'; icon: React.ReactNode; sub?: string;
}) {
  const vs = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))' },
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function AttackSurface() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const [assets, setAssets] = useState<AttackSurfaceAsset[]>([...ATTACK_SURFACE]);
  const [search, setSearch] = useState('');
  const [filterExposure, setFilterExposure] = useState<string>('all');
  const [selected, setSelected] = useState<AttackSurfaceAsset | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AttackSurfaceAsset | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [topoOpen, setTopoOpen] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [formAsset, setFormAsset] = useState({ ...EMPTY_ASSET });

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const filtered = assets.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.type.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterExposure !== 'all' && a.exposure !== filterExposure) return false;
    return true;
  });

  const exposedCount = assets.filter(a => a.exposure === 'public').length;
  const criticalCount = assets.filter(a => a.risk === 'critical').length;
  const monitoredCount = assets.filter(a => a.status === 'monitored').length;

  const handleDelete = () => {
    if (!deleteTarget) return;
    setAssets(prev => prev.filter(a => a.id !== deleteTarget.id));
    toast(`Asset ${deleteTarget.name} removed`, 'info');
    setDeleteTarget(null);
  };

  const openDetail = (a: AttackSurfaceAsset) => { setSelected(a); setSheetOpen(true); };

  const handleRegister = () => {
    if (!formAsset.name.trim()) return;
    const newId = `AS-${String(assets.length + 1).padStart(3, '0')}`;
    const newAsset: AttackSurfaceAsset = {
      ...formAsset,
      id: newId,
      lastScanned: new Date().toISOString().split('T')[0],
      status: 'monitored',
    };
    setAssets(prev => [newAsset, ...prev]);
    toast(`Asset "${formAsset.name}" registered successfully`, 'success');
    setFormAsset({ ...EMPTY_ASSET });
    setRegisterOpen(false);
  };

  const isCriticalAsset = (a: AttackSurfaceAsset) =>
    a.name === 'data-warehouse.internal' || a.name === 'api.sentinel-grc.com';

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: 'hsl(var(--bg-surface))', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Globe size={22} style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Attack Surface</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} — External and internal asset exposure monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" style={{ borderRadius: 0 }}>
            <Scan size={14} className="mr-2" />Run Scan
          </Button>
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }} onClick={() => { setFormAsset({ ...EMPTY_ASSET }); setRegisterOpen(true); }}>
            <Plus size={14} className="mr-2" />Register Asset
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Assets" value={String(assets.length)} variant="info" icon={<Globe size={16} className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Exposed (Public)" value={String(exposedCount)} variant="error" icon={<ShieldWarning size={16} weight="fill" className="text-destructive" />} />
        <MetricTile label="Critical Risk" value={String(criticalCount)} variant="error" icon={<Fire size={16} weight="fill" className="text-destructive" />} sub="Immediate attention" />
        <MetricTile label="Monitored" value={String(monitoredCount)} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />} />
      </div>

      {/* Exposure Chart */}
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
            <BarChart data={EXPOSURE_CHART_DATA} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                {EXPOSURE_CHART_DATA.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── SVG Network Topology ─────────────────────────────────────────── */}
      {(() => {
        const externalAssetNodes = assets.filter(a => a.exposure === 'public');
        const internalAssetNodes = assets.filter(a => a.exposure !== 'public');
        const W = 900;
        const extY = 140;
        const intY = 250;
        const INET = { id: '_inet', x: W / 2, y: 42 };

        // Spread external assets evenly
        const extNodes = externalAssetNodes.map((a, i) => {
          const step = W / (externalAssetNodes.length + 1);
          return { ...a, x: step * (i + 1), y: extY };
        });

        // Spread internal assets evenly
        const intNodes = internalAssetNodes.map((a, i) => {
          const step = W / (internalAssetNodes.length + 1);
          return { ...a, x: step * (i + 1), y: intY };
        });

        const nodeColor = (a: AttackSurfaceAsset) => {
          if (a.risk === 'critical') return 'hsl(var(--s-er-tx))';
          if (a.risk === 'high') return 'hsl(var(--r-hi-tx))';
          if (a.risk === 'medium') return '#eab308';
          return 'hsl(var(--s-ok-tx))';
        };

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
                      {/* Pulse animation for exposed nodes */}
                      <style>{`
                        @keyframes nodePulse {
                          0%,100% { opacity: 1; r: 10; }
                          50% { opacity: 0.5; r: 15; }
                        }
                      `}</style>
                    </defs>

                    {/* Edges: Internet → external */}
                    {extNodes.map(n => (
                      <line
                        key={`ie-${n.id}`}
                        x1={INET.x} y1={INET.y + 14} x2={n.x} y2={n.y - 14}
                        stroke={n.risk === 'critical' || n.risk === 'high' ? 'hsl(0 72% 51% / 0.4)' : 'hsl(var(--border-mid))'}
                        strokeWidth={n.risk === 'critical' ? 2.5 : 1.5}
                        strokeDasharray={n.risk === 'critical' ? '4 2' : 'none'}
                        markerEnd="url(#arrowhead)"
                      />
                    ))}

                    {/* Edges: external → internal (first external to all internal) */}
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
                    <g
                      style={{ cursor: 'default' }}
                      role="img"
                      aria-label="Internet gateway"
                    >
                      <rect
                        x={INET.x - 40} y={INET.y - 14}
                        width={80} height={28}
                        fill="hsl(220 90% 56% / 0.12)"
                        stroke="hsl(220 90% 56% / 0.5)"
                        strokeWidth={1.5}
                      />
                      <text x={INET.x} y={INET.y + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="hsl(var(--s-in-tx))">
                        INTERNET
                      </text>
                    </g>

                    {/* External nodes */}
                    {extNodes.map(n => {
                      const isHov = hoveredNode === n.id;
                      const color = nodeColor(n);
                      return (
                        <g
                          key={n.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setSelected(n); setSheetOpen(true); }}
                          onMouseEnter={() => setHoveredNode(n.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                          role="button"
                          aria-label={`${n.name} — ${n.risk} risk`}
                        >
                          {/* Pulse ring for high/critical */}
                          {(n.risk === 'critical' || n.risk === 'high') && (
                            <circle cx={n.x} cy={n.y} r={isHov ? 22 : 18} fill={`${color}20`} />
                          )}
                          <rect
                            x={n.x - 36} y={n.y - 13}
                            width={72} height={26}
                            fill={isHov ? `${color}22` : 'hsl(var(--bg-surface))'}
                            stroke={color}
                            strokeWidth={isHov ? 2 : 1.5}
                          />
                          <text x={n.x} y={n.y - 0} textAnchor="middle" fontSize={8.5} fill={color} fontWeight={600}>
                            {n.name.split('.')[0].substring(0, 10)}
                          </text>
                          <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={7} fill="hsl(var(--text-4))">
                            {n.type.substring(0, 12)}
                          </text>
                          {/* Severity dot */}
                          <circle cx={n.x + 34} cy={n.y - 11} r={4} fill={color} />
                        </g>
                      );
                    })}

                    {/* Internal / restricted nodes */}
                    {intNodes.map(n => {
                      const isHov = hoveredNode === n.id;
                      const color = nodeColor(n);
                      return (
                        <g
                          key={n.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => { setSelected(n); setSheetOpen(true); }}
                          onMouseEnter={() => setHoveredNode(n.id)}
                          onMouseLeave={() => setHoveredNode(null)}
                          role="button"
                          aria-label={`${n.name} — ${n.risk} risk`}
                        >
                          <rect
                            x={n.x - 36} y={n.y - 13}
                            width={72} height={26}
                            fill={isHov ? `${color}18` : 'hsl(var(--bg-muted))'}
                            stroke={isHov ? color : 'hsl(var(--border-mid))'}
                            strokeWidth={1.5}
                            strokeDasharray={n.exposure === 'restricted' ? '3 2' : 'none'}
                          />
                          <text x={n.x} y={n.y} textAnchor="middle" fontSize={8.5} fill="hsl(var(--text-2))" fontWeight={500}>
                            {n.name.split('.')[0].substring(0, 12)}
                          </text>
                          <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize={7} fill="hsl(var(--text-4))">
                            {n.exposure === 'restricted' ? 'Restricted' : n.type.substring(0, 10)}
                          </text>
                          {n.risk === 'critical' && (
                            <circle cx={n.x + 34} cy={n.y - 11} r={4} fill={color} />
                          )}
                        </g>
                      );
                    })}

                    {/* Zone labels */}
                    <text x={8} y={extY} fontSize={8} fill="hsl(var(--text-4))" fontWeight={600}>PUBLIC</text>
                    <text x={8} y={intY} fontSize={8} fill="hsl(var(--text-4))" fontWeight={600}>INTERNAL</text>

                    {/* Zone separator line */}
                    <line x1={0} y1={(extY + intY) / 2} x2={W} y2={(extY + intY) / 2}
                      stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="6 4" />
                  </svg>

                  {/* Hover tooltip */}
                  {hoveredNode && (() => {
                    const node = [...extNodes, ...intNodes].find(n => n.id === hoveredNode);
                    if (!node) return null;
                    return (
                      <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'hsl(var(--bg-surface))',
                        border: '1px solid hsl(var(--border))',
                        padding: '8px 12px', minWidth: 200, zIndex: 10,
                        boxShadow: 'var(--shadow-md)',
                      }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--text-1))' }}>{node.name}</p>
                        <div className="space-y-0.5">
                          {[
                            ['Type', node.type],
                            ['Exposure', node.exposure],
                            ['Risk', node.risk],
                            ['Protocol', node.protocol],
                            ['Ports', String(node.openPorts)],
                          ].map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4">
                              <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{k}</span>
                              <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs mt-1.5 pt-1.5" style={{ color: 'hsl(var(--text-4))', borderTop: '1px solid hsl(var(--border))' }}>
                          Click to view details →
                        </p>
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
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 16, height: 2, borderTop: '2px dashed hsl(var(--border-mid))' }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Restricted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div style={{ width: 16, height: 2, borderTop: '2px solid hsl(0 72% 51% / 0.6)' }} />
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>High-risk flow</span>
                  </div>
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
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs" style={{ borderRadius: 0 }} />
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
                  {['Asset', 'Type', 'Exposure', 'Severity', 'Status', 'Last Scan', 'Owner', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const sc = severityColor(a.risk);
                  const isCrit = isCriticalAsset(a);
                  return (
                    <tr
                      key={a.id}
                      style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        borderLeft: isCrit ? '4px solid hsl(0 72% 51%)' : undefined,
                      }}
                      className="hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{a.type}</td>
                      <td className="px-4 py-3">
                        <Badge style={{
                          background: a.exposure === 'public' ? 'hsl(0 72% 51% / 0.12)' : a.exposure === 'restricted' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(220 90% 56% / 0.12)',
                          color: a.exposure === 'public' ? 'hsl(var(--destructive))' : a.exposure === 'restricted' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-in-tx))',
                          borderRadius: 0, fontSize: 10,
                        }}>
                          {a.exposure.charAt(0).toUpperCase() + a.exposure.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {a.risk.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: statusColor(a.status).bg, color: statusColor(a.status).text, borderRadius: 0, fontSize: 10 }}>
                          {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(a.lastScanned)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{a.owner}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(a)}>
                            <Eye size={14} style={{ color: 'hsl(var(--brand))' }} />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(a)}>
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Register Asset Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 580 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Register New Asset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Asset Name / Hostname *</Label>
                <Input
                  placeholder="e.g. api.company.com"
                  value={formAsset.name}
                  onChange={e => setFormAsset(p => ({ ...p, name: e.target.value }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Asset Type</Label>
                <select
                  value={formAsset.type}
                  onChange={e => setFormAsset(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}
                >
                  {['Web Application', 'API Gateway', 'ML Pipeline', 'Data Store', 'Admin Panel', 'CDN', 'Monitoring', 'Microservice'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Protocol</Label>
                <select
                  value={formAsset.protocol}
                  onChange={e => setFormAsset(p => ({ ...p, protocol: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}
                >
                  {['HTTPS', 'HTTPS/REST', 'gRPC', 'PostgreSQL', 'TCP', 'WebSocket', 'MQTT'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Network Exposure</Label>
                <select
                  value={formAsset.exposure}
                  onChange={e => setFormAsset(p => ({ ...p, exposure: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}
                >
                  <option value="public">Public (Internet-facing)</option>
                  <option value="internal">Internal (LAN only)</option>
                  <option value="restricted">Restricted (VPN/MFA required)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Risk Level</Label>
                <select
                  value={formAsset.risk}
                  onChange={e => setFormAsset(p => ({ ...p, risk: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Open Ports</Label>
                <Input
                  type="number" min={0} max={65535}
                  value={formAsset.openPorts}
                  onChange={e => setFormAsset(p => ({ ...p, openPorts: Number(e.target.value) }))}
                  style={{ borderRadius: 0 }}
                />
              </div>
              <div>
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Asset Owner</Label>
                <select
                  value={formAsset.owner}
                  onChange={e => setFormAsset(p => ({ ...p, owner: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '8px 10px', borderRadius: 0, fontSize: 13 }}
                >
                  <option value="">Select owner...</option>
                  {['Sarah Chen', 'Maria Santos', 'David Kim', 'James Patel', 'Raj Gupta', 'Emma Wilson'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Description</Label>
                <Textarea
                  placeholder="Brief description of this asset and its purpose..."
                  value={formAsset.description}
                  onChange={e => setFormAsset(p => ({ ...p, description: e.target.value }))}
                  style={{ borderRadius: 0, minHeight: 72 }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button
              style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
              onClick={handleRegister}
              disabled={!formAsset.name.trim()}
            >
              <Plus size={14} className="mr-2" />Register Asset
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
                  <TabsTrigger value="risks" style={{ borderRadius: 0 }}>Linked Risks</TabsTrigger>
                  <TabsTrigger value="scans" style={{ borderRadius: 0 }}>Scan History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Type</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.type}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Exposure</span>
                      <p className="text-sm font-medium mt-1" style={{ color: selected.exposure === 'public' ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                        {selected.exposure.toUpperCase()}
                      </p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Protocol</span>
                      <p className="text-sm font-mono mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.protocol}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Open Ports</span>
                      <p className="text-sm font-bold mt-1" style={{ color: selected.openPorts > 2 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>{selected.openPorts}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Owner</span>
                      <p className="text-sm font-medium mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.owner}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Last Scanned</span>
                      <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{formatDate(selected.lastScanned)}</p>
                    </div>
                  </div>
                  <div className="p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Description</span>
                    <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-1))' }}>{selected.description}</p>
                  </div>
                </TabsContent>

                <TabsContent value="exposure" className="space-y-4 mt-4">
                  <div className="p-4" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Exposure Risk Score</span>
                      <span className="text-2xl font-bold" style={{
                        color: getExposureScore(selected) >= 80 ? 'hsl(var(--destructive))' : getExposureScore(selected) >= 50 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-ok-tx))',
                      }}>{getExposureScore(selected)}</span>
                    </div>
                    <div className="w-full h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
                      <div className="h-full" style={{
                        width: `${getExposureScore(selected)}%`,
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

                <TabsContent value="risks" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>Unauthorized access attempts</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>THR-004 linked</p>
                    </div>
                    <Badge style={{ background: 'hsl(25 95% 53% / 0.12)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>HIGH</Badge>
                  </div>
                  {selected.exposure === 'public' && (
                    <div className="flex items-center justify-between p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>DDoS / resource exhaustion</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Public exposure risk</p>
                      </div>
                      <Badge style={{ background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 10 }}>MEDIUM</Badge>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="scans" className="space-y-3 mt-4">
                  {['2026-03-28', '2026-03-21', '2026-03-14'].map((date, i) => (
                    <div key={date} className="flex items-start gap-3 p-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <Scan size={14} style={{ color: i === 0 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }} className="mt-0.5" />
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                          {i === 0 ? 'Latest scan — passed' : `Scan — ${i === 1 ? '1 warning' : 'passed'}`}
                        </p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(date)}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
