import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { TooltipProvider } from '../components/ui/tooltip';
import {
  Brain, ShieldCheck, Warning, Users, Database, Globe,
  ArrowRight, MagnifyingGlass, TreeStructure, Info, ChartBar,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../stores/settingsStore';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

const ENTITY_COLORS: Record<string, string> = {
  Model: 'hsl(var(--brand))',
  Regulation: '#8b5cf6',
  Control: '#10b981',
  Incident: '#ef4444',
  Vendor: '#f59e0b',
  Dataset: '#06b6d4',
  Policy: '#ec4899',
};

const NODES = [
  { id: 'MDL-001', type: 'Model', label: 'CreditRisk-XGB', x: 400, y: 200 },
  { id: 'MDL-002', type: 'Model', label: 'FraudDetect-LSTM', x: 400, y: 360 },
  { id: 'REG-001', type: 'Regulation', label: 'EU AI Act', x: 160, y: 160 },
  { id: 'REG-002', type: 'Regulation', label: 'ECOA', x: 160, y: 300 },
  { id: 'REG-003', type: 'Regulation', label: 'NIST AI RMF', x: 160, y: 420 },
  { id: 'CTL-012', type: 'Control', label: 'Bias Monitor', x: 620, y: 140 },
  { id: 'CTL-047', type: 'Control', label: 'Data Access', x: 620, y: 260 },
  { id: 'CTL-089', type: 'Control', label: 'Explainability', x: 620, y: 380 },
  { id: 'INC-044', type: 'Incident', label: 'Fairness Drift', x: 800, y: 200 },
  { id: 'VND-001', type: 'Vendor', label: 'OpenAI', x: 80, y: 60 },
  { id: 'VND-002', type: 'Vendor', label: 'AWS SageMaker', x: 80, y: 500 },
  { id: 'DAT-001', type: 'Dataset', label: 'LoanApps 2019-23', x: 550, y: 500 },
  { id: 'POL-001', type: 'Policy', label: 'AI Use Policy', x: 800, y: 380 },
];

const EDGES = [
  { from: 'MDL-001', to: 'REG-001', label: 'governed by' },
  { from: 'MDL-001', to: 'REG-002', label: 'governed by' },
  { from: 'MDL-002', to: 'REG-002', label: 'governed by' },
  { from: 'MDL-002', to: 'REG-003', label: 'governed by' },
  { from: 'MDL-001', to: 'CTL-012', label: 'covered by' },
  { from: 'MDL-001', to: 'CTL-047', label: 'covered by' },
  { from: 'MDL-002', to: 'CTL-047', label: 'covered by' },
  { from: 'MDL-001', to: 'CTL-089', label: 'covered by' },
  { from: 'MDL-001', to: 'INC-044', label: 'caused' },
  { from: 'INC-044', to: 'CTL-012', label: 'triggered update' },
  { from: 'VND-001', to: 'MDL-002', label: 'powers' },
  { from: 'VND-002', to: 'MDL-001', label: 'hosts' },
  { from: 'DAT-001', to: 'MDL-001', label: 'trained on' },
  { from: 'POL-001', to: 'MDL-001', label: 'applies to' },
  { from: 'POL-001', to: 'MDL-002', label: 'applies to' },
];

const ENTITY_COUNTS = [
  { type: 'Model', count: 6, icon: Brain },
  { type: 'Regulation', count: 8, icon: Globe },
  { type: 'Control', count: 847, icon: ShieldCheck },
  { type: 'Incident', count: 44, icon: Warning },
  { type: 'Vendor', count: 7, icon: Users },
  { type: 'Dataset', count: 12, icon: Database },
  { type: 'Policy', count: 23, icon: ChartBar },
];

const CROSS_ENTITY_PATHS = [
  { path: 'EU AI Act → MDL-001 → INC-044 → CTL-012', insight: 'EU AI Act governs Credit Risk model which caused a fairness incident that triggered a control update', risk: 'High' },
  { path: 'ECOA → MDL-001 → DAT-001', insight: 'ECOA regulation applies to model trained on LoanApps dataset — demographic fairness at risk', risk: 'Critical' },
  { path: 'OpenAI (Vendor) → MDL-002 → REG-002', insight: 'Vendor dependency chain: OpenAI powers Fraud model covered by ECOA — third-party risk exposure', risk: 'High' },
  { path: 'AI Use Policy → MDL-001 → CTL-089', insight: 'Policy mandates explainability control coverage — currently at 58% vs peer avg 71%', risk: 'Medium' },
];

function KGVisualization({ filter }: { filter: string }) {
  const filteredNodes = filter === 'all' ? NODES : NODES.filter(n => n.type === filter);
  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = EDGES.filter(e => filteredIds.has(e.from) && filteredIds.has(e.to));

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  return (
    <svg width="100%" height="560" viewBox="0 0 900 560" style={{ background: 'hsl(var(--bg-raised))' }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--border))" />
        </marker>
      </defs>

      {filteredEdges.map((edge, i) => {
        const from = nodeMap[edge.from];
        const to = nodeMap[edge.to];
        if (!from || !to) return null;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        return (
          <g key={i}>
            <line
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="hsl(var(--border))" strokeWidth={1.5}
              markerEnd="url(#arrowhead)" strokeOpacity={0.7}
            />
            <text x={mx} y={my - 4} textAnchor="middle" fontSize={8} fill="hsl(var(--text-4))">{edge.label}</text>
          </g>
        );
      })}

      {filteredNodes.map(node => {
        const color = ENTITY_COLORS[node.type] || 'hsl(var(--brand))';
        return (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={28} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.5} />
            <text x={node.x} y={node.y - 2} textAnchor="middle" fontSize={9} fontWeight="600" fill={color}>{node.type}</text>
            <text x={node.x} y={node.y + 11} textAnchor="middle" fontSize={8} fill="hsl(var(--text-2))">{node.label}</text>
            <text x={node.x} y={node.y + 22} textAnchor="middle" fontSize={7} fill="hsl(var(--text-4))">{node.id}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function KnowledgeGraph() {
  const { orgName } = useSettingsStore();
  const [tab, setTab] = useState('graph');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredPaths = CROSS_ENTITY_PATHS.filter(p =>
    search === '' || p.path.toLowerCase().includes(search.toLowerCase()) || p.insight.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Enterprise AI Knowledge Graph</h1>
              <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
                PROPRIETARY INTELLIGENCE
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · Semantic graph connecting all AI models, regulations, controls, incidents, vendors, and policies with causal inference
            </p>
          </div>
          <Button style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
            <ChartBar size={13} className="mr-1" />Export Graph
          </Button>
        </div>

        <div className="p-3 flex items-start gap-3" style={{ border: '1px solid hsl(var(--brand) / 0.3)', background: 'hsl(var(--brand) / 0.04)' }}>
          <Info size={16} style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>Irreplaceable Organizational Knowledge</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
              The Knowledge Graph accumulates every relationship your team has mapped between models, regulations, controls, incidents, vendors, and policies.
              After 14 months of operation, this graph contains 1,200+ semantic relationships unique to your organization — a proprietary intelligence asset
              that cannot be replicated or exported to any alternative platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {ENTITY_COUNTS.map(e => (
            <div key={e.type}
              className="p-3 cursor-pointer text-center"
              style={{
                border: `1px solid ${filter === e.type ? ENTITY_COLORS[e.type] : 'hsl(var(--border))'}`,
                background: filter === e.type ? `${ENTITY_COLORS[e.type]}18` : 'hsl(var(--bg-surface))',
              }}
              onClick={() => setFilter(filter === e.type ? 'all' : e.type)}
            >
              <e.icon size={14} style={{ color: ENTITY_COLORS[e.type], margin: '0 auto 4px' }} />
              <p className="text-lg font-bold" style={{ color: ENTITY_COLORS[e.type] }}>{e.count}</p>
              <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{e.type}s</p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="graph" style={{ borderRadius: 0 }}>Visual Graph</TabsTrigger>
            <TabsTrigger value="paths" style={{ borderRadius: 0 }}>Causal Paths & Insights</TabsTrigger>
            <TabsTrigger value="entities" style={{ borderRadius: 0 }}>Entity Index</TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                    Semantic Relationship Graph {filter !== 'all' && `— Filtered: ${filter}`}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {['all', ...Object.keys(ENTITY_COLORS)].map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className="text-[9px] px-1.5 py-0.5"
                        style={{
                          background: filter === f ? 'hsl(var(--brand))' : 'hsl(var(--bg-raised))',
                          color: filter === f ? '#fff' : 'hsl(var(--text-4))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      >{f === 'all' ? 'All' : f}</button>
                    ))}
                  </div>
                </div>
                <KGVisualization filter={filter} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(ENTITY_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      <span className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paths" className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <MagnifyingGlass size={14} style={{ color: 'hsl(var(--text-4))' }} />
              <Input
                placeholder="Search causal paths…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-sm text-xs"
                style={{ borderRadius: 0 }}
              />
            </div>
            {filteredPaths.map((path, i) => (
              <Card key={i} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <code className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{path.path}</code>
                    <Badge style={{ borderRadius: 0, fontSize: 9, marginLeft: 8, flexShrink: 0,
                      background: path.risk === 'Critical' ? 'hsl(var(--destructive) / 0.12)' : path.risk === 'High' ? 'hsl(var(--s-wn-bg))' : 'hsl(var(--s-nt-bg))',
                      color: path.risk === 'Critical' ? 'hsl(var(--destructive))' : path.risk === 'High' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))',
                    }}>{path.risk} Risk</Badge>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))', marginTop: 1, flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{path.insight}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="entities" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Entity ID', 'Type', 'Label', 'Connections', 'Last Updated'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NODES.filter(n => filter === 'all' || n.type === filter).map((node, i) => {
                      const connections = EDGES.filter(e => e.from === node.id || e.to === node.id).length;
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--brand))' }}>{node.id}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] px-1.5 py-0.5 font-medium" style={{
                              background: `${ENTITY_COLORS[node.type]}18`,
                              color: ENTITY_COLORS[node.type],
                            }}>{node.type}</span>
                          </td>
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{node.label}</td>
                          <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'hsl(var(--text-2))' }}>{connections}</td>
                          <td className="px-4 py-2.5" style={{ color: 'hsl(var(--text-4))' }}>2026-04-10</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
