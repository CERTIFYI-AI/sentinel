import { useState } from 'react'
import { TreeStructure, Export, Eye, X, ArrowRight } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface ProvenanceNode {
  id: string
  type: 'Model' | 'Dataset' | 'Pipeline' | 'Vendor' | 'Code'
  name: string
  version: string
  hash?: string
  license?: string
  provider: string
  verified: boolean
  riskLevel: 'Low' | 'Medium' | 'High'
  children?: string[]
}

interface ProvenanceChain {
  modelId: string
  modelName: string
  lastUpdated: string
  nodes: ProvenanceNode[]
  verified: boolean
  complianceFlags: string[]
}

const CHAINS: ProvenanceChain[] = [
  {
    modelId: 'MDL-001',
    modelName: 'Credit Scoring Model v2.1',
    lastUpdated: '2026-04-08',
    verified: true,
    complianceFlags: [],
    nodes: [
      { id: 'N-001', type: 'Model', name: 'Credit Scoring Model', version: 'v2.1', hash: 'sha256:a4b3c9...', provider: 'Acme Financial ML Team', verified: true, riskLevel: 'High', children: ['N-002', 'N-003', 'N-004'] },
      { id: 'N-002', type: 'Dataset', name: 'ACME Credit History', version: '2025-Q4', provider: 'Internal Data Engineering', license: 'Proprietary', verified: true, riskLevel: 'Medium', children: ['N-005'] },
      { id: 'N-003', type: 'Dataset', name: 'Experian Bureau Data', version: '2026-Q1', provider: 'Experian Inc.', license: 'Commercial', verified: true, riskLevel: 'Medium', children: [] },
      { id: 'N-004', type: 'Code', name: 'LightGBM', version: '4.3.0', provider: 'Microsoft / OSS', license: 'MIT', hash: 'sha256:c7d4e1...', verified: true, riskLevel: 'Low', children: [] },
      { id: 'N-005', type: 'Pipeline', name: 'Customer Data ETL', version: 'v3.2', provider: 'Internal Data Engineering', verified: true, riskLevel: 'Low', children: [] },
    ],
  },
  {
    modelId: 'MDL-002',
    modelName: 'Fraud Detection Engine v4.2',
    lastUpdated: '2026-03-20',
    verified: false,
    complianceFlags: ['Stale AIBOM', 'Vendor hash unverified'],
    nodes: [
      { id: 'N-101', type: 'Model', name: 'Fraud Detection Engine', version: 'v4.2', provider: 'Acme Financial ML Team', verified: false, riskLevel: 'High', children: ['N-102', 'N-103', 'N-104'] },
      { id: 'N-102', type: 'Model', name: 'GPT-4o (fine-tuned)', version: '2026-01', provider: 'OpenAI', license: 'Commercial API', verified: false, riskLevel: 'High', children: [] },
      { id: 'N-103', type: 'Dataset', name: 'Transaction History', version: '2025-Q3', provider: 'Internal', license: 'Proprietary', verified: true, riskLevel: 'Medium', children: [] },
      { id: 'N-104', type: 'Code', name: 'PyTorch', version: '2.2.0', provider: 'Meta / OSS', license: 'BSD-3', hash: 'sha256:b8f1d2...', verified: true, riskLevel: 'Low', children: [] },
    ],
  },
]

const NODE_COLORS: Record<string, string> = {
  Model: 'hsl(var(--brand))',
  Dataset: 'hsl(var(--s-ok-tx))',
  Pipeline: 'hsl(var(--s-in-tx))',
  Vendor: 'hsl(var(--tag-purple))',
  Code: 'hsl(var(--s-wn-tx))',
}

const RISK_STYLE: Record<string, { bg: string; color: string }> = {
  Low: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  Medium: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  High: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
}

function ProvenanceTree({ chain }: { chain: ProvenanceChain }) {
  const root = chain.nodes[0]
  const children = chain.nodes.slice(1)

  return (
    <div className="space-y-4 p-4">
      {/* Root node */}
      <div className="flex flex-col items-start">
        <div className="p-3 border-2 bg-raised min-w-[220px]" style={{ borderColor: NODE_COLORS.Model }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS.Model }} />
            <span className="text-[10px] font-semibold uppercase" style={{ color: NODE_COLORS.Model }}>{root.type}</span>
            {root.verified ? <span className="text-[10px] text-[hsl(var(--s-ok-tx))]">✓ Verified</span> : <span className="text-[10px] text-[hsl(var(--destructive))]">⚠ Unverified</span>}
          </div>
          <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{root.name}</p>
          <p className="text-xs text-[hsl(var(--text-4))]">{root.version} · {root.provider}</p>
        </div>

        {/* Children */}
        {children.length > 0 && (
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-[hsl(var(--border))] pl-4">
            {children.map(node => (
              <div key={node.id} className="flex items-start gap-2">
                <div className="p-2.5 border bg-surface min-w-[200px]" style={{ borderColor: NODE_COLORS[node.type] }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: NODE_COLORS[node.type] }} />
                    <span className="text-[9px] font-semibold uppercase" style={{ color: NODE_COLORS[node.type] }}>{node.type}</span>
                    {!node.verified && <span className="text-[9px] text-[hsl(var(--destructive))]">⚠</span>}
                  </div>
                  <p className="text-xs font-medium text-[hsl(var(--text-1))]">{node.name}</p>
                  <p className="text-[10px] text-[hsl(var(--text-4))]">{node.version} · {node.provider}</p>
                  {node.license && <p className="text-[9px] text-[hsl(var(--text-4))] mt-0.5">{node.license}</p>}
                </div>
                <span className="text-[11px] px-1.5 py-0.5 mt-2" style={RISK_STYLE[node.riskLevel] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{node.riskLevel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProvenanceGraph() {
  const [selected, setSelected] = useState<ProvenanceChain>(CHAINS[0])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[hsl(var(--text-1))] flex items-center gap-2">
            <TreeStructure size={20} weight="fill" className="text-[hsl(var(--brand))]" />
            Provenance Graph
          </h1>
          <p className="text-sm text-[hsl(var(--text-4))] mt-0.5">Visual AI supply chain provenance — trace every component from production model to root source</p>
        </div>
        <button onClick={() => toast.success('Graph exported')} className="flex items-center gap-1.5 px-3 py-2 border border-[hsl(var(--border))] text-sm text-[hsl(var(--text-2))] hover:bg-raised"><Export size={14} /> Export</button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span className="text-xs text-[hsl(var(--text-3))]">{type}</span>
          </div>
        ))}
      </div>

      {/* Model selector */}
      <div className="flex gap-2">
        {CHAINS.map(c => (
          <button
            key={c.modelId}
            onClick={() => setSelected(c)}
            className="px-3 py-2 text-sm border transition-colors"
            style={selected.modelId === c.modelId
              ? { background: 'hsl(var(--brand))', color: 'white', borderColor: 'hsl(var(--brand))' }
              : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--text-2))' }
            }
          >
            {c.modelName}
          </button>
        ))}
      </div>

      {/* Chain header */}
      <div className="flex items-center justify-between p-3 rounded border border-[hsl(var(--border))] bg-surface">
        <div className="flex items-center gap-3">
          <TreeStructure size={16} className="text-[hsl(var(--brand))]" />
          <div>
            <p className="text-sm font-semibold text-[hsl(var(--text-1))]">{selected.modelName}</p>
            <p className="text-xs text-[hsl(var(--text-4))]">Last updated: {selected.lastUpdated} · {selected.nodes.length} nodes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selected.complianceFlags.map(f => (
            <span key={f} className="text-[10px] px-2 py-0.5" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }}>{f}</span>
          ))}
          <span className="text-[11px] px-2 py-0.5 font-medium" style={selected.verified ? { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' } : { background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }}>
            {selected.verified ? 'Provenance Verified' : 'Verification Pending'}
          </span>
        </div>
      </div>

      {/* Graph */}
      <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-auto min-h-[300px]">
        <ProvenanceTree chain={selected} />
      </div>

      {/* Node table */}
      <div className="rounded border border-[hsl(var(--border))] bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))] bg-raised">
              {['Node ID', 'Type', 'Name', 'Version', 'Provider', 'License', 'Hash', 'Risk', 'Verified'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[hsl(var(--text-4))] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selected.nodes.map(n => (
              <tr key={n.id} className="border-b border-[hsl(var(--border))] hover:bg-raised">
                <td className="px-4 py-3 font-mono text-xs text-[hsl(var(--text-3))]">{n.id}</td>
                <td className="px-4 py-3"><span className="text-[10px] font-semibold" style={{ color: NODE_COLORS[n.type] }}>{n.type}</span></td>
                <td className="px-4 py-3 text-xs font-medium text-[hsl(var(--text-1))]">{n.name}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{n.version}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-3))]">{n.provider}</td>
                <td className="px-4 py-3 text-xs text-[hsl(var(--text-4))]">{n.license ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-[hsl(var(--text-4))]">{n.hash ? n.hash.slice(0, 16) + '...' : '—'}</td>
                <td className="px-4 py-3"><span className="text-[11px] px-1.5 py-0.5" style={RISK_STYLE[n.riskLevel] || { bg: "hsl(var(--border))", color: "hsl(var(--text-4))" }}>{n.riskLevel}</span></td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] ${n.verified ? 'text-[hsl(var(--s-ok-tx))]' : 'text-[hsl(var(--destructive))]'}`}>{n.verified ? '✓' : '⚠'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
