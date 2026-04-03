import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WarningCircle, ArrowUp, ArrowDown, Minus, X, ArrowRight, Download, SlidersHorizontal } from "@phosphor-icons/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { riskSeedData, LIKELIHOOD_LABELS, IMPACT_LABELS, getRiskLevel, getHeatMapColor, type Risk } from "../data/riskSeedData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  'Model Risk': '#6366f1',
  'Security': '#ef4444',
  'Regulatory': '#f59e0b',
  'Operational': '#3b82f6',
  'Ethical': '#8b5cf6',
  'Data Privacy': '#10b981',
};

const TrendIcon = ({ trend }: { trend: Risk['trend'] }) => {
  if (trend === 'increasing') return <ArrowUp className="text-red-400" size={14} weight="bold" />;
  if (trend === 'decreasing') return <ArrowDown className="text-green-400" size={14} weight="bold" />;
  return <Minus className="text-slate-400" size={14} weight="bold" />;
};

export default function RiskMatrix() {
  const navigate = useNavigate();
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const totalRisks = riskSeedData.length;
  const criticalRisks = riskSeedData.filter(r => r.inherentScore >= 15).length;
  const highRisks = riskSeedData.filter(r => r.inherentScore >= 10 && r.inherentScore < 15).length;
  const openRisks = riskSeedData.filter(r => r.status === 'open').length;
  const avgResidual = Math.round(riskSeedData.reduce((s, r) => s + r.residualScore, 0) / totalRisks);

  const categoryData = Object.entries(
    riskSeedData.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, fill: CATEGORY_COLORS[name] || '#64748b' }));

  const inherentVsResidual = riskSeedData.map(r => ({
    id: r.id,
    label: r.id,
    inherent: r.inherentScore,
    residual: r.residualScore,
    reduction: r.inherentScore - r.residualScore,
  })).sort((a, b) => b.inherent - a.inherent).slice(0, 8);

  const getRisksAtCell = (likelihood: number, impact: number) =>
    riskSeedData.filter(r => r.likelihood === likelihood && r.impact === impact);

  const statusColor: Record<string, string> = {
    open: 'bg-red-500/20 text-red-400 border-red-500/30',
    mitigating: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    accepted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    closed: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Risk Matrix</h1>
          <p className="text-sm text-slate-400 mt-1">Likelihood vs Impact heat map — {totalRisks} AI risks tracked</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/risk')} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <SlidersHorizontal size={14} className="mr-1.5" /> Register View
          </Button>
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download size={14} className="mr-1.5" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Risks', value: totalRisks, sub: 'Tracked', color: 'text-slate-300' },
          { label: 'Critical', value: criticalRisks, sub: 'Score 15+', color: 'text-red-400' },
          { label: 'High', value: highRisks, sub: 'Score 10-14', color: 'text-orange-400' },
          { label: 'Open', value: openRisks, sub: 'Unmitigated', color: 'text-yellow-400' },
        ].map(s => (
          <Card key={s.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-200">5x5 Likelihood vs Impact Heat Map</CardTitle>
              <p className="text-xs text-slate-500">Inherent risk positions — click a cell to view risks</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex flex-col justify-around pr-2">
                  {[5,4,3,2,1].map(l => (
                    <div key={l} className="text-xs text-slate-400 w-24 text-right">
                      {LIKELIHOOD_LABELS[l-1]}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  {[5,4,3,2,1].map(likelihood => (
                    <div key={likelihood} className="flex gap-1">
                      {[1,2,3,4,5].map(impact => {
                        const score = likelihood * impact;
                        const risks = getRisksAtCell(likelihood, impact);
                        const cellId = `${likelihood}-${impact}`;
                        return (
                          <div
                            key={impact}
                            className={`relative flex-1 h-16 rounded cursor-pointer transition-all border-2 ${getHeatMapColor(score)} ${hoveredCell === cellId ? 'scale-105 border-white/40 z-10' : 'border-transparent'} flex flex-col items-center justify-center gap-0.5`}
                            onMouseEnter={() => setHoveredCell(cellId)}
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => risks.length > 0 && setSelectedRisk(risks[0])}
                          >
                            <span className="text-[10px] font-bold text-white/80">{score}</span>
                            {risks.length > 0 && (
                              <div className="flex flex-wrap justify-center gap-0.5 px-1">
                                {risks.slice(0, 3).map(r => (
                                  <button
                                    key={r.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedRisk(r); }}
                                    className="text-[8px] bg-black/30 text-white px-1 rounded hover:bg-black/50 truncate max-w-full"
                                    title={r.title}
                                  >
                                    {r.id}
                                  </button>
                                ))}
                                {risks.length > 3 && <span className="text-[8px] text-white/60">+{risks.length-3}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex gap-1 mt-1">
                    <div className="w-24" />
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex-1 text-center text-xs text-slate-400">{IMPACT_LABELS[i-1].split(' ')[0]}</div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-slate-500 mt-1">→ Impact</p>
                </div>
              </div>
              <div className="flex gap-4 mt-4 justify-end">
                {[{label:'Low', cls:'bg-green-500/50'},{label:'Medium', cls:'bg-yellow-500/60'},{label:'High', cls:'bg-orange-500/70'},{label:'Critical', cls:'bg-red-500/80'}].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${l.cls}`} />
                    <span className="text-xs text-slate-400">{l.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-200">Risk by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1 mt-2">
                {categoryData.map(c => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: c.fill }} />
                      <span className="text-xs text-slate-400">{c.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-300">{c.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-200">Inherent vs Residual Risk Score (Top 8)</CardTitle>
          <p className="text-xs text-slate-500">Control effectiveness shown as score reduction</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={inherentVsResidual} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 25]} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number, name: string) => [value, name === 'inherent' ? 'Inherent Score' : 'Residual Score']}
              />
              <Bar dataKey="inherent" fill="#ef4444" opacity={0.6} radius={[2,2,0,0]} name="inherent" />
              <Bar dataKey="residual" fill="#3b82f6" opacity={0.8} radius={[2,2,0,0]} name="residual" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-end mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-500/60" /><span className="text-xs text-slate-400">Inherent</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500/80" /><span className="text-xs text-slate-400">Residual</span></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-200">All Risks — Quick Reference</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['ID','Title','Category','Likelihood','Impact','Inherent','Residual','Status','Trend','Owner'].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium px-4 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskSeedData.sort((a,b) => b.inherentScore - a.inherentScore).map(r => {
                  const level = getRiskLevel(r.inherentScore);
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedRisk(r)}
                    >
                      <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{r.id}</td>
                      <td className="px-4 py-2.5 max-w-xs">
                        <span className="text-slate-200 truncate block">{r.title}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: CATEGORY_COLORS[r.category] + '30', color: CATEGORY_COLORS[r.category] }}>{r.category}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-300 text-center">{r.likelihood}</td>
                      <td className="px-4 py-2.5 text-slate-300 text-center">{r.impact}</td>
                      <td className={`px-4 py-2.5 font-bold text-center ${level.color}`}>{r.inherentScore}</td>
                      <td className="px-4 py-2.5 text-blue-400 font-medium text-center">{r.residualScore}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-xs border ${statusColor[r.status]}`}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <TrendIcon trend={r.trend} />
                          <span className="text-xs text-slate-400 capitalize">{r.trend}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap">{r.owner}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedRisk && (
        <Sheet open={!!selectedRisk} onOpenChange={() => setSelectedRisk(null)}>
          <SheetContent className="w-[520px] bg-slate-900 border-slate-800 overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-slate-500 mb-1">{selectedRisk.id}</p>
                  <SheetTitle className="text-lg text-slate-100 leading-snug">{selectedRisk.title}</SheetTitle>
                </div>
                <button onClick={() => setSelectedRisk(null)} className="text-slate-400 hover:text-slate-200">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className={`text-xs border ${statusColor[selectedRisk.status]}`}>{selectedRisk.status}</Badge>
                <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{selectedRisk.category}</Badge>
                <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{selectedRisk.riskType}</Badge>
                <div className="flex items-center gap-1"><TrendIcon trend={selectedRisk.trend} /><span className="text-xs text-slate-400 capitalize">{selectedRisk.trend}</span></div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="bg-slate-800 w-full">
                {['overview','scores','mitigation','controls'].map(t => (
                  <TabsTrigger key={t} value={t} className="flex-1 text-xs capitalize data-[state=active]:bg-slate-700">{t}</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedRisk.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Owner', value: selectedRisk.owner },
                    { label: 'Review Date', value: selectedRisk.reviewDate },
                    { label: 'Created', value: selectedRisk.created },
                    { label: 'Risk Type', value: selectedRisk.riskType },
                  ].map(f => (
                    <div key={f.label} className="bg-slate-800 rounded p-3">
                      <p className="text-xs text-slate-500">{f.label}</p>
                      <p className="text-sm text-slate-200 mt-0.5">{f.value}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="scores" className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Likelihood', value: `${selectedRisk.likelihood}/5`, sub: LIKELIHOOD_LABELS[selectedRisk.likelihood-1], color: 'text-yellow-400' },
                    { label: 'Impact', value: `${selectedRisk.impact}/5`, sub: IMPACT_LABELS[selectedRisk.impact-1], color: 'text-orange-400' },
                    { label: 'Inherent Score', value: selectedRisk.inherentScore, sub: getRiskLevel(selectedRisk.inherentScore).label, color: getRiskLevel(selectedRisk.inherentScore).color },
                    { label: 'Residual Score', value: selectedRisk.residualScore, sub: `${Math.round((1-selectedRisk.residualScore/selectedRisk.inherentScore)*100)}% reduction`, color: 'text-blue-400' },
                  ].map(f => (
                    <div key={f.label} className="bg-slate-800 rounded p-3">
                      <p className="text-xs text-slate-500">{f.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${f.color}`}>{f.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{f.sub}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="mitigation" className="mt-4">
                <div className="bg-slate-800 rounded p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Mitigation Strategy</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selectedRisk.mitigation}</p>
                </div>
              </TabsContent>

              <TabsContent value="controls" className="mt-4 space-y-2">
                <p className="text-xs text-slate-500">{selectedRisk.controls.length} linked controls</p>
                {selectedRisk.controls.map(c => (
                  <div key={c} className="flex items-center justify-between bg-slate-800 rounded p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <span className="text-sm font-mono text-slate-300">{c}</span>
                    </div>
                    <button className="text-xs text-blue-400 hover:text-blue-300" onClick={() => navigate('/compliance/controls')}>
                      View <ArrowRight size={12} className="inline" />
                    </button>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
