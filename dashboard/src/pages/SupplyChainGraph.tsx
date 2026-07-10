import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TreeStructure, Warning, CheckCircle, Eye, X, Export,
  ArrowRight, MagnifyingGlass, Globe, ShieldWarning,
  Database, Robot, Brain, Cpu, ChartLine,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { PageHeader } from '../components/ui/PageHeader';
import { useSettingsStore } from '../stores/settingsStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type NodeType = 'data_source' | 'dataset' | 'model' | 'agent' | 'use_case' | 'output';
type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  riskLevel: RiskLevel;
  x: number;
  y: number;
  metadata: { owner?: string; framework?: string; status?: string; description?: string; crossBorder?: boolean };
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  edgeType: string;
  crossBorder?: boolean;
  dataVolume?: string;
}

// ── Colors ────────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<NodeType, string> = {
  data_source: '#3b82f6',
  dataset: 'hsl(var(--s-wn-tx))',
  model: 'hsl(var(--tag-purple))',
  agent: 'hsl(var(--r-hi-tx))',
  use_case: 'hsl(var(--s-ok-tx))',
  output: 'hsl(var(--s-in-tx))',
};

const RISK_RING: Record<RiskLevel, string> = {
  critical: 'hsl(var(--s-er-tx))',
  high: 'hsl(var(--r-hi-tx))',
  medium: '#eab308',
  low: 'hsl(var(--s-ok-tx))',
};

const NODE_ICON: Record<NodeType, React.ElementType> = {
  data_source: Database,
  dataset: ChartLine,
  model: Brain,
  agent: Robot,
  use_case: Cpu,
  output: Eye,
};

// ── Graph data ────────────────────────────────────────────────────────────────

const NODES: GraphNode[] = [
  // Data Sources (column 1)
  { id: 'DS-001', type: 'data_source', label: 'Experian Credit Bureau', riskLevel: 'high', x: 80, y: 120, metadata: { owner: 'David Kim', framework: 'FCRA', status: 'Connected', description: 'Real-time credit bureau data', crossBorder: true } },
  { id: 'DS-002', type: 'data_source', label: 'Transaction Records', riskLevel: 'medium', x: 80, y: 260, metadata: { owner: 'Maria Santos', framework: 'PCI DSS', status: 'Connected', description: 'Stripe transaction history' } },
  { id: 'DS-003', type: 'data_source', label: 'Employment Database', riskLevel: 'high', x: 80, y: 400, metadata: { owner: 'David Kim', status: 'Connected', description: 'Third-party employment verification', crossBorder: true } },
  { id: 'DS-004', type: 'data_source', label: 'Medical Records API', riskLevel: 'critical', x: 80, y: 520, metadata: { owner: 'James Patel', framework: 'HIPAA', status: 'Review', description: 'HL7 FHIR medical records integration' } },
  // Datasets (column 2)
  { id: 'DAT-001', type: 'dataset', label: 'Credit Training Set', riskLevel: 'high', x: 280, y: 160, metadata: { owner: 'Maria Santos', description: '890K labeled credit applications', status: 'Active' } },
  { id: 'DAT-002', type: 'dataset', label: 'Fraud Dataset', riskLevel: 'medium', x: 280, y: 300, metadata: { owner: 'David Kim', description: '15.2M transaction records', status: 'Active' } },
  { id: 'DAT-003', type: 'dataset', label: 'Medical Claims Dataset', riskLevel: 'critical', x: 280, y: 470, metadata: { owner: 'Emma Wilson', description: 'De-identified claims data', status: 'Restricted' } },
  // Models (column 3)
  { id: 'MDL-001', type: 'model', label: 'Credit Risk Scorer', riskLevel: 'high', x: 480, y: 140, metadata: { owner: 'Maria Santos', framework: 'EU AI Act', status: 'production', description: 'Consumer credit risk scoring v3.2.1' } },
  { id: 'MDL-002', type: 'model', label: 'Fraud Detection Engine', riskLevel: 'medium', x: 480, y: 300, metadata: { owner: 'David Kim', framework: 'SOC 2', status: 'production', description: 'Real-time fraud detection v2.1.0' } },
  { id: 'MDL-003', type: 'model', label: 'Health Risk Predictor', riskLevel: 'critical', x: 480, y: 460, metadata: { owner: 'Emma Wilson', framework: 'HIPAA', status: 'staging', description: 'Clinical risk stratification v1.0' } },
  // Agents (column 4)
  { id: 'AGT-001', type: 'agent', label: 'LoanProcessorAgent', riskLevel: 'high', x: 680, y: 200, metadata: { owner: 'Raj Gupta', framework: 'EU AI Act', status: 'Active', description: 'Autonomous loan decision agent' } },
  { id: 'AGT-002', type: 'agent', label: 'FraudInvestigatorAgent', riskLevel: 'medium', x: 680, y: 360, metadata: { owner: 'David Kim', status: 'Active', description: 'Automated fraud case investigation' } },
  // Use Cases (column 5)
  { id: 'UC-001', type: 'use_case', label: 'Loan Origination', riskLevel: 'high', x: 860, y: 200, metadata: { owner: 'Raj Gupta', description: 'Automated consumer lending decisions', status: 'Live' } },
  { id: 'UC-002', type: 'use_case', label: 'Fraud Prevention', riskLevel: 'medium', x: 860, y: 360, metadata: { owner: 'David Kim', description: 'Real-time transaction fraud prevention', status: 'Live' } },
  { id: 'UC-003', type: 'use_case', label: 'Health Risk Assessment', riskLevel: 'critical', x: 860, y: 480, metadata: { owner: 'Emma Wilson', description: 'Patient risk stratification', status: 'Review' } },
];

const EDGES: GraphEdge[] = [
  { id: 'E-001', source: 'DS-001', target: 'DAT-001', edgeType: 'feeds', crossBorder: true, dataVolume: '890K/day' },
  { id: 'E-002', source: 'DS-003', target: 'DAT-001', edgeType: 'feeds', crossBorder: true, dataVolume: '45K/day' },
  { id: 'E-003', source: 'DS-002', target: 'DAT-002', edgeType: 'feeds', dataVolume: '15.2M/day' },
  { id: 'E-004', source: 'DS-004', target: 'DAT-003', edgeType: 'feeds', dataVolume: '12K/day' },
  { id: 'E-005', source: 'DAT-001', target: 'MDL-001', edgeType: 'trains', dataVolume: 'v3.2.1' },
  { id: 'E-006', source: 'DAT-002', target: 'MDL-002', edgeType: 'trains', dataVolume: 'v2.1.0' },
  { id: 'E-007', source: 'DAT-003', target: 'MDL-003', edgeType: 'trains', dataVolume: 'v1.0' },
  { id: 'E-008', source: 'MDL-001', target: 'AGT-001', edgeType: 'uses', dataVolume: '890K/mo' },
  { id: 'E-009', source: 'MDL-002', target: 'AGT-002', edgeType: 'uses', dataVolume: '15.2M/mo' },
  { id: 'E-010', source: 'AGT-001', target: 'UC-001', edgeType: 'produces', dataVolume: '50K decisions/mo' },
  { id: 'E-011', source: 'AGT-002', target: 'UC-002', edgeType: 'produces', dataVolume: '2M checks/mo' },
  { id: 'E-012', source: 'MDL-003', target: 'UC-003', edgeType: 'produces', dataVolume: '12K/mo' },
  { id: 'E-013', source: 'MDL-001', target: 'UC-001', edgeType: 'feeds', dataVolume: '50K/mo' },
];

const NODE_W = 130;
const NODE_H = 54;

function getNodeColor(node: GraphNode, selected: string | null, impact: Set<string>) {
  if (selected === node.id) return NODE_COLORS[node.type];
  if (impact.size > 0) {
    if (impact.has(node.id)) return 'hsl(var(--s-er-tx))';
    return '#4b5563';
  }
  return NODE_COLORS[node.type];
}

function getNodeOpacity(node: GraphNode, selected: string | null, impact: Set<string>) {
  if (!selected && impact.size === 0) return 1;
  if (impact.size > 0) return impact.has(node.id) ? 1 : 0.3;
  return 1;
}

export default function SupplyChainGraph() {
  const { orgName } = useSettingsStore();
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  const [nodes] = useState<GraphNode[]>(NODES);
  const [edges] = useState<GraphEdge[]>(EDGES);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [impactNodes, setImpactNodes] = useState<Set<string>>(new Set());
  const [showCrossBorder, setShowCrossBorder] = useState(false);
  const [impactMode, setImpactMode] = useState(false);
  const [zoom, setZoom] = useState(0.9);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  // Compute downstream impact
  const computeImpact = useCallback((nodeId: string): Set<string> => {
    const visited = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      edges.filter(e => e.source === current).forEach(e => queue.push(e.target));
    }
    return visited;
  }, [edges]);

  function handleNodeClick(node: GraphNode) {
    setSelectedNode(node);
    if (impactMode) {
      setImpactNodes(computeImpact(node.id));
    } else {
      setImpactNodes(new Set());
    }
  }

  function handleSvgMouseDown(e: React.MouseEvent) {
    if (e.target === svgRef.current) {
      setDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
    }
  }

  function handleSvgMouseMove(e: React.MouseEvent) {
    if (dragging) {
      setPan({ x: dragStart.panX + (e.clientX - dragStart.x), y: dragStart.panY + (e.clientY - dragStart.y) });
    }
  }

  function handleSvgMouseUp() { setDragging(false); }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }

  // Arrow marker
  const CANVAS_W = 1060;
  const CANVAS_H = 620;

  const crossBorderEdges = edges.filter(e => e.crossBorder);
  const unattestedNodes = nodes.filter(n => n.riskLevel === 'critical').length;
  const riskScore = Math.round(nodes.reduce((s, n) => s + (n.riskLevel === 'critical' ? 4 : n.riskLevel === 'high' ? 3 : n.riskLevel === 'medium' ? 2 : 1), 0) / nodes.length * 25);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <PageHeader
        title="AI Supply Chain Graph"
        subtitle={`${orgName} · Interactive provenance graph — Data Sources → Datasets → Models → Agents → Use Cases`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => toast.success('AIBOM exported as CycloneDX JSON')} className="flex items-center gap-1.5 px-3 py-2 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
              <Export size={14} /> Export AIBOM
            </button>
            <button onClick={() => toast.success('Graph exported as SVG')} className="flex items-center gap-1.5 px-3 py-2 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>
              <Export size={14} /> Export Graph
            </button>
          </div>
        }
      />

      {/* ── Metric tiles ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Nodes', value: nodes.length, color: 'hsl(var(--brand))', icon: TreeStructure },
          { label: 'Cross-Border Transfers', value: crossBorderEdges.length, color: 'hsl(var(--r-hi-tx))', icon: Globe, warn: true },
          { label: 'High-Risk Nodes', value: nodes.filter(n => n.riskLevel === 'critical' || n.riskLevel === 'high').length, color: 'hsl(var(--s-er-tx))', icon: ShieldWarning, warn: true },
          { label: 'Supply Chain Risk Score', value: `${riskScore}/100`, color: riskScore > 60 ? 'hsl(var(--s-er-tx))' : riskScore > 40 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))', icon: ChartLine },
        ].map(s => (
          <div key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${s.warn ? `${s.color}30` : 'hsl(var(--border))'}`, padding: '14px' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
              <s.icon size={14} style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setImpactMode(!impactMode); setImpactNodes(new Set()); setSelectedNode(null); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
          style={{ background: impactMode ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))', color: impactMode ? 'white' : 'hsl(var(--text-2))', border: `1px solid ${impactMode ? 'hsl(var(--brand))' : 'hsl(var(--border))'}` }}>
          <Eye size={14} /> Impact Analysis {impactMode ? '(ON)' : '(OFF)'}
        </button>
        <button onClick={() => setShowCrossBorder(!showCrossBorder)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
          style={{ background: showCrossBorder ? 'hsl(var(--r-hi-bg))' : 'hsl(var(--bg-surface))', color: showCrossBorder ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--text-2))', border: `1px solid ${showCrossBorder ? 'hsl(var(--r-hi-br))' : 'hsl(var(--border))'}` }}>
          <Globe size={14} /> Data Transfers {showCrossBorder ? '(ON)' : '(OFF)'}
        </button>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="px-3 py-1.5 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>+ Zoom</button>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="px-3 py-1.5 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>− Zoom</button>
        <button onClick={() => { setZoom(0.9); setPan({ x: 0, y: 0 }); }} className="px-3 py-1.5 text-sm border" style={{ border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-2))' }}>Reset</button>
        <div className="ml-auto flex items-center gap-4 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className="w-3 h-3" style={{ background: color }} />
              <span>{type.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Graph canvas ── */}
      <div className="relative overflow-hidden" style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', height: 600 }}>
        <svg
          ref={svgRef}
          width="100%" height="100%"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onWheel={handleWheel}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="hsl(var(--text-3))" />
            </marker>
            <marker id="arrow-cb" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="hsl(var(--r-hi-tx))" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.source)!;
              const tgt = nodes.find(n => n.id === edge.target)!;
              if (!src || !tgt) return null;
              const x1 = src.x + NODE_W;
              const y1 = src.y + NODE_H / 2;
              const x2 = tgt.x;
              const y2 = tgt.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              const isCrossB = edge.crossBorder && showCrossBorder;
              const isSelected = selectedNode?.id === edge.source || selectedNode?.id === edge.target;
              return (
                <g key={edge.id}>
                  <path
                    d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                    fill="none"
                    stroke={isCrossB ? 'hsl(var(--r-hi-tx))' : isSelected ? 'hsl(var(--brand))' : '#4b5563'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    strokeDasharray={isCrossB ? '6 3' : 'none'}
                    strokeOpacity={impactNodes.size > 0 && !impactNodes.has(edge.source) ? 0.15 : 0.7}
                    markerEnd={isCrossB ? 'url(#arrow-cb)' : 'url(#arrow)'}
                  />
                  {isCrossB && (
                    <text x={mx} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={9} fill="hsl(var(--r-hi-tx))" fontFamily="Outfit">
                      SCCs required
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const color = getNodeColor(node, selectedNode?.id ?? null, impactNodes);
              const opacity = getNodeOpacity(node, selectedNode?.id ?? null, impactNodes);
              const Icon = NODE_ICON[node.type];
              const isSelected = selectedNode?.id === node.id;
              return (
                <g key={node.id} transform={`translate(${node.x},${node.y})`} style={{ opacity, cursor: 'pointer' }}
                  onClick={() => handleNodeClick(node)}>
                  {/* Risk halo */}
                  <rect x={-4} y={-4} width={NODE_W + 8} height={NODE_H + 8}
                    fill="none" stroke={RISK_RING[node.riskLevel]} strokeWidth={2}
                    opacity={isSelected ? 1 : 0.4} />
                  {/* Node body */}
                  <rect width={NODE_W} height={NODE_H}
                    fill={`${color}18`} stroke={isSelected ? color : `${color}60`}
                    strokeWidth={isSelected ? 2 : 1} />
                  {/* Left accent bar */}
                  <rect width={4} height={NODE_H} fill={color} />
                  {/* Content */}
                  <text x={14} y={19} fontSize={9} fill={color} fontWeight="bold" fontFamily="Outfit" textAnchor="start">
                    {node.type.replace('_', ' ').toUpperCase()}
                  </text>
                  <text x={14} y={35} fontSize={11} fill="hsl(var(--text-1))" fontFamily="Outfit" textAnchor="start"
                    style={{ maxWidth: 110 }}>
                    {node.label.length > 16 ? node.label.slice(0, 16) + '…' : node.label}
                  </text>
                  <text x={14} y={48} fontSize={9} fill={RISK_RING[node.riskLevel]} fontFamily="Outfit">
                    {node.riskLevel} risk
                  </text>
                  {/* Cross-border indicator */}
                  {node.metadata.crossBorder && showCrossBorder && (
                    <text x={NODE_W - 8} y={12} fontSize={10} fill="hsl(var(--r-hi-tx))" textAnchor="middle">🌐</text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Impact mode banner */}
        {impactMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs flex items-center gap-2"
            style={{ background: 'hsl(var(--brand) / 0.9)', color: 'white' }}>
            <Eye size={12} /> Click any node to highlight downstream dependencies
          </div>
        )}
      </div>

      {/* ── Node Detail Panel ── */}
      {selectedNode && (
        <div style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', padding: '20px' }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div style={{ background: `${NODE_COLORS[selectedNode.type]}15`, padding: '10px', border: `2px solid ${NODE_COLORS[selectedNode.type]}40` }}>
                {(() => { const Icon = NODE_ICON[selectedNode.type]; return <Icon size={20} style={{ color: NODE_COLORS[selectedNode.type] }} />; })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{selectedNode.label}</p>
                  <span className="text-xs px-1.5 py-0.5" style={{ background: `${RISK_RING[selectedNode.riskLevel]}15`, color: RISK_RING[selectedNode.riskLevel], border: `1px solid ${RISK_RING[selectedNode.riskLevel]}30` }}>
                    {selectedNode.riskLevel} risk
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: NODE_COLORS[selectedNode.type] }}>{selectedNode.type.replace('_', ' ').toUpperCase()} · {selectedNode.id}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {impactNodes.size > 1 && (
                <div className="text-xs px-2 py-1" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' }}>
                  Removing this node affects {impactNodes.size - 1} downstream nodes
                </div>
              )}
              <button onClick={() => { setSelectedNode(null); setImpactNodes(new Set()); }}
                style={{ color: 'hsl(var(--text-3))', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Owner', value: selectedNode.metadata.owner ?? 'N/A' },
              { label: 'Framework', value: selectedNode.metadata.framework ?? 'N/A' },
              { label: 'Status', value: selectedNode.metadata.status ?? 'N/A' },
              { label: 'Cross-Border', value: selectedNode.metadata.crossBorder ? 'Yes — SCCs Required' : 'No' },
            ].map(f => (
              <div key={f.label} style={{ background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))', padding: '10px' }}>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{f.label}</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: f.label === 'Cross-Border' && selectedNode.metadata.crossBorder ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--text-1))' }}>{f.value}</p>
              </div>
            ))}
          </div>
          {selectedNode.metadata.description && (
            <p className="text-xs mt-3" style={{ color: 'hsl(var(--text-3))' }}>{selectedNode.metadata.description}</p>
          )}
          {impactNodes.size > 1 && (
            <div className="mt-3">
              <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--s-er-tx))' }}>
                Downstream impact ({impactNodes.size - 1} affected nodes):
              </p>
              <div className="flex flex-wrap gap-2">
                {[...impactNodes].filter(id => id !== selectedNode.id).map(id => {
                  const n = nodes.find(x => x.id === id);
                  return n ? (
                    <span key={id} className="text-xs px-2 py-1" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', border: '1px solid hsl(var(--s-er-br))' }}>{n.label}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
