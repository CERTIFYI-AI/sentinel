// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// KnowledgeGraph — governed-entity graph built from live platform data:
// datasets → models (used_in_models), datasets → use cases (used_in_use_cases),
// use cases → models (linked_model_ids), agents → models (model_id).
// Nothing here is fabricated: nodes are real records (deep-linked to their
// detail routes) and every edge derives from a stored link column.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { EmptyState } from '../components/evals/states';
import {
  Brain, Briefcase, Database, Robot, TreeStructure, ArrowRight, Warning,
} from '@phosphor-icons/react';
import { useModelOptions, useUseCases } from '../hooks/useAiiaData';
import { useDatasets } from '../hooks/useDatasetData';
import { agentRecordHooks } from '../hooks/queries/useAgentGovCrud';

type EntityType = 'Model' | 'Use Case' | 'Dataset' | 'Agent';

const ENTITY_COLORS: Record<EntityType, string> = {
  Model: 'hsl(var(--brand))',
  'Use Case': 'hsl(var(--tag-purple))',
  Dataset: 'hsl(var(--s-in-tx))',
  Agent: 'hsl(var(--s-wn-tx))',
};

const ENTITY_ICONS: Record<EntityType, typeof Brain> = {
  Model: Brain, 'Use Case': Briefcase, Dataset: Database, Agent: Robot,
};

interface GraphNode {
  key: string          // type-qualified unique key
  id: string           // record id (uuid / text pk)
  type: EntityType
  label: string
  route: string
  flag?: string        // factual annotation (e.g. "PII")
  x: number
  y: number
}

interface GraphEdge { from: string; to: string; label: string }

// Column x-positions per entity type; y is spread within the column.
const COLUMN_X: Record<EntityType, number> = { Dataset: 120, Model: 400, 'Use Case': 690, Agent: 690 };
const MAX_PER_COLUMN = 14;

export default function KnowledgeGraph() {
  const nav = useNavigate();
  const { models } = useModelOptions();
  const { data: useCases } = useUseCases();
  const { data: datasets } = useDatasets();
  const { data: agents = [] } = agentRecordHooks.useList();

  const [tab, setTab] = useState('graph');
  const [filter, setFilter] = useState<'all' | EntityType>('all');

  const { allNodes, nodes, edges, truncated } = useMemo(() => {
    const modelIds = new Set(models.map((m) => m.id));
    const useCaseIds = new Set(useCases.map((u) => u.id));

    const columns: { type: EntityType; items: Omit<GraphNode, 'x' | 'y'>[] }[] = [
      {
        type: 'Dataset',
        items: datasets.map((d) => ({
          key: `ds:${d.id}`, id: d.id, type: 'Dataset' as const, label: d.name,
          route: `/datasets/${d.id}`, flag: d.containsPii ? 'PII' : undefined,
        })),
      },
      {
        type: 'Model',
        items: models.map((m) => ({
          key: `mdl:${m.id}`, id: m.id, type: 'Model' as const, label: m.name,
          route: `/models/inventory/${m.id}`,
        })),
      },
      {
        type: 'Use Case',
        items: useCases.map((u) => ({
          key: `uc:${u.id}`, id: u.id, type: 'Use Case' as const, label: u.title,
          route: `/use-cases/${u.id}`,
        })),
      },
      {
        type: 'Agent',
        items: (agents as any[]).map((a) => ({
          key: `agt:${a.id}`, id: a.id, type: 'Agent' as const, label: a.name,
          route: `/agents/${a.id}`,
        })),
      },
    ];
    const allNodes = columns.flatMap((c) => c.items);

    // Edges span the full entity set; the SVG below only draws the capped subset.
    const edges: GraphEdge[] = [];
    for (const d of datasets) {
      for (const mid of d.usedInModels) if (modelIds.has(mid)) edges.push({ from: `ds:${d.id}`, to: `mdl:${mid}`, label: 'trains' });
      for (const uid of d.usedInUseCases) if (useCaseIds.has(uid)) edges.push({ from: `ds:${d.id}`, to: `uc:${uid}`, label: 'supports' });
    }
    for (const u of useCases) {
      for (const mid of u.linkedModelIds) if (modelIds.has(mid)) edges.push({ from: `uc:${u.id}`, to: `mdl:${mid}`, label: 'uses' });
    }
    for (const a of agents as any[]) {
      if (a.modelId && modelIds.has(a.modelId)) edges.push({ from: `agt:${a.id}`, to: `mdl:${a.modelId}`, label: 'runs on' });
    }

    // Cap each drawn column so the SVG stays legible; report what was cut
    // instead of hiding it. Use Cases stack above Agents in the shared column.
    const truncated: string[] = [];
    const placed: GraphNode[] = [];
    const height = 620;
    for (const col of columns) {
      const items = col.items.slice(0, MAX_PER_COLUMN);
      if (col.items.length > MAX_PER_COLUMN) truncated.push(`${col.items.length - MAX_PER_COLUMN} ${col.type.toLowerCase()}s`);
      const isShared = col.type === 'Use Case' || col.type === 'Agent';
      const bandTop = col.type === 'Agent' ? height / 2 : 40;
      const bandHeight = isShared ? height / 2 - 60 : height - 80;
      items.forEach((n, i) => {
        placed.push({
          ...n,
          x: COLUMN_X[col.type],
          y: bandTop + (items.length === 1 ? bandHeight / 2 : (i * bandHeight) / Math.max(items.length - 1, 1)),
        });
      });
    }

    return { allNodes, nodes: placed, edges, truncated };
  }, [models, useCases, datasets, agents]);

  // Derived, factual multi-hop chains: dataset → model → use case, plus PII
  // datasets feeding models. No invented risk narratives.
  const chains = useMemo(() => {
    const out: { path: string; note: string; warn: boolean }[] = [];
    const modelName = (id: string) => models.find((m) => m.id === id)?.name;
    for (const d of datasets) {
      for (const mid of d.usedInModels) {
        const mName = modelName(mid);
        if (!mName) continue;
        const consumers = useCases.filter((u) => u.linkedModelIds.includes(mid));
        if (consumers.length) {
          for (const u of consumers) {
            out.push({
              path: `${d.name} → ${mName} → ${u.title}`,
              note: `Dataset feeds a model used by the "${u.title}" use case${d.containsPii ? ' — dataset contains PII' : ''}.`,
              warn: d.containsPii,
            });
          }
        } else if (d.containsPii) {
          out.push({
            path: `${d.name} → ${mName}`,
            note: 'PII dataset feeds this model; no approved use case is linked to the model yet.',
            warn: true,
          });
        }
      }
    }
    return out;
  }, [datasets, models, useCases]);

  const counts: { type: EntityType; count: number }[] = [
    { type: 'Model', count: models.length },
    { type: 'Use Case', count: useCases.length },
    { type: 'Dataset', count: datasets.length },
    { type: 'Agent', count: (agents as any[]).length },
  ];

  const visibleNodes = filter === 'all' ? nodes : nodes.filter((n) => n.type === filter);
  const visibleKeys = new Set(visibleNodes.map((n) => n.key));
  const visibleEdges = edges.filter((e) => visibleKeys.has(e.from) && visibleKeys.has(e.to));
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.key, n]));
  const isEmpty = allNodes.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Graph"
        subtitle="Live graph of governed entities — datasets, models, use cases and agents — built from their stored links"
        icon={TreeStructure}
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {counts.map((e) => {
          const Icon = ENTITY_ICONS[e.type];
          const active = filter === e.type;
          return (
            <button
              key={e.type}
              className="p-3 text-center"
              style={{
                border: `1px solid ${active ? ENTITY_COLORS[e.type] : 'hsl(var(--border))'}`,
                background: active ? 'hsl(var(--bg-raised))' : 'hsl(var(--bg-surface))',
              }}
              onClick={() => setFilter(active ? 'all' : e.type)}
            >
              <Icon size={14} style={{ color: ENTITY_COLORS[e.type], margin: '0 auto 4px' }} />
              <p className="text-lg font-bold" style={{ color: ENTITY_COLORS[e.type] }}>{e.count}</p>
              <p className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{e.type}s</p>
            </button>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger value="graph" style={{ borderRadius: 0 }}>Visual Graph</TabsTrigger>
          <TabsTrigger value="chains" style={{ borderRadius: 0 }}>Data-to-Use-Case Chains</TabsTrigger>
          <TabsTrigger value="entities" style={{ borderRadius: 0 }}>Entity Index</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-3">
              {isEmpty ? (
                <EmptyState
                  title="No governed entities yet"
                  message="Register models, datasets, use cases or agents — their stored links appear here as a live graph." />
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                      {visibleEdges.length} relationships across {visibleNodes.length} entities
                      {filter !== 'all' && ` — filtered: ${filter}`}
                    </p>
                    {truncated.length > 0 && (
                      <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>
                        Graph shows the first {MAX_PER_COLUMN} per type ({truncated.join(', ')} not drawn — see Entity Index)
                      </p>
                    )}
                  </div>
                  <svg width="100%" height="620" viewBox="0 0 820 620" style={{ background: 'hsl(var(--bg-raised))' }}>
                    <defs>
                      <marker id="kg-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--border))" />
                      </marker>
                    </defs>
                    {visibleEdges.map((edge, i) => {
                      const from = nodeMap[edge.from];
                      const to = nodeMap[edge.to];
                      if (!from || !to) return null;
                      return (
                        <g key={i}>
                          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                            stroke="hsl(var(--border))" strokeWidth={1.5}
                            markerEnd="url(#kg-arrow)" strokeOpacity={0.7} />
                          <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}
                            textAnchor="middle" fontSize={8} fill="hsl(var(--text-4))">{edge.label}</text>
                        </g>
                      );
                    })}
                    {visibleNodes.map((node) => {
                      const color = ENTITY_COLORS[node.type];
                      const label = node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label;
                      return (
                        <g key={node.key} style={{ cursor: 'pointer' }} onClick={() => nav(node.route)}>
                          <circle cx={node.x} cy={node.y} r={26} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1.5} />
                          <text x={node.x} y={node.y - 2} textAnchor="middle" fontSize={8} fontWeight="600" fill={color}>{node.type}</text>
                          <text x={node.x} y={node.y + 10} textAnchor="middle" fontSize={8} fill="hsl(var(--text-2))">{label}</text>
                          {node.flag && (
                            <text x={node.x} y={node.y + 20} textAnchor="middle" fontSize={7} fontWeight="700" fill="hsl(var(--s-er-tx))">{node.flag}</text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {(Object.entries(ENTITY_COLORS) as [EntityType, string][]).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                        <span className="text-[9px]" style={{ color: 'hsl(var(--text-4))' }}>{type}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chains" className="mt-4 space-y-3">
          {chains.length === 0 ? (
            <EmptyState
              title="No complete chains yet"
              message="Chains appear when a dataset is linked to a model that a use case (or nothing, for PII flags) consumes." />
          ) : (
            chains.map((c, i) => (
              <Card key={i} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <code className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{c.path}</code>
                    {c.warn && (
                      <span className="ml-2 inline-flex flex-shrink-0 items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))' }}>
                        <Warning size={10} /> PII
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))', marginTop: 1, flexShrink: 0 }} />
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{c.note}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="entities" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              {isEmpty ? (
                <div className="p-6">
                  <EmptyState title="No governed entities yet" message="Register entities to populate the index." />
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Type', 'Name', 'Connections', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allNodes.filter((n) => filter === 'all' || n.type === filter).map((node) => {
                      const connections = edges.filter((e) => e.from === node.key || e.to === node.key).length;
                      return (
                        <tr key={node.key} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5">
                            <span className="px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ background: 'hsl(var(--bg-raised))', color: ENTITY_COLORS[node.type] }}>{node.type}</span>
                          </td>
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'hsl(var(--text-1))' }}>
                            {node.label}
                            {node.flag && <span className="ml-2 text-[9px] font-bold" style={{ color: 'hsl(var(--s-er-tx))' }}>{node.flag}</span>}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'hsl(var(--text-2))' }}>{connections}</td>
                          <td className="px-4 py-2.5">
                            <button className="text-[10px] font-medium hover:underline" style={{ color: 'hsl(var(--brand))' }}
                              onClick={() => nav(node.route)}>Open</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
