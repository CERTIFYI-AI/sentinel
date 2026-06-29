import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Plus, ArrowsLeftRight, MagnifyingGlass, DownloadSimple, Sparkle, X, Warning,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {

  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../components/ui/sheet';

type Coverage = 'Full' | 'Partial' | 'Gap' | 'N/A';

interface FrameworkMapping {
  id: string;
  control: string;
  controlDesc: string;
  mappings: { framework: string; clause: string; coverage: Coverage }[];
  coveragePct: number;
  gaps: number;
}

const FRAMEWORKS = ['EU AI Act', 'ISO 42001', 'NIST AI RMF', 'GDPR', 'SOC 2', 'ISO 27001', 'OWASP LLM'];

const SEED: FrameworkMapping[] = [
  {
    id: 'CTRL-001', control: 'AI System Inventory', controlDesc: 'Maintain complete registry of all AI systems in use',
    mappings: [
      { framework: 'ISO 42001', clause: 'Cl.8.3', coverage: 'Full' },
      { framework: 'EU AI Act', clause: 'Art.9', coverage: 'Full' },
      { framework: 'NIST AI RMF', clause: 'MAP-1.1', coverage: 'Full' },
      { framework: 'GDPR', clause: 'Art.30', coverage: 'Partial' },
      { framework: 'SOC 2', clause: 'CC2.1', coverage: 'Full' },
    ],
    coveragePct: 92, gaps: 1,
  },
  {
    id: 'CTRL-002', control: 'Impact Assessment', controlDesc: 'Conduct AI impact assessments for high-risk systems',
    mappings: [
      { framework: 'ISO 42001', clause: 'Cl.6.1', coverage: 'Full' },
      { framework: 'EU AI Act', clause: 'Art.9', coverage: 'Full' },
      { framework: 'GDPR', clause: 'Art.35', coverage: 'Partial' },
      { framework: 'NIST AI RMF', clause: 'MAP-1.5', coverage: 'Gap' },
    ],
    coveragePct: 71, gaps: 2,
  },
  {
    id: 'CTRL-003', control: 'Human Oversight', controlDesc: 'Ensure meaningful human oversight of AI decisions',
    mappings: [
      { framework: 'EU AI Act', clause: 'Art.14', coverage: 'Full' },
      { framework: 'ISO 42001', clause: 'Cl.8.4', coverage: 'Partial' },
      { framework: 'NIST AI RMF', clause: 'GOV-1.2', coverage: 'Full' },
      { framework: 'SOC 2', clause: 'CC6.8', coverage: 'Partial' },
    ],
    coveragePct: 78, gaps: 1,
  },
  {
    id: 'CTRL-004', control: 'Training Data Quality', controlDesc: 'Validate training data quality per Art.10 requirements',
    mappings: [
      { framework: 'EU AI Act', clause: 'Art.10', coverage: 'Full' },
      { framework: 'ISO 42001', clause: 'Cl.8.2', coverage: 'Partial' },
      { framework: 'NIST AI RMF', clause: 'MAP-2.1', coverage: 'Gap' },
    ],
    coveragePct: 58, gaps: 2,
  },
  {
    id: 'CTRL-005', control: 'Bias Monitoring', controlDesc: 'Continuously monitor AI systems for bias and discrimination',
    mappings: [
      { framework: 'EU AI Act', clause: 'Art.10', coverage: 'Full' },
      { framework: 'NIST AI RMF', clause: 'MEASURE-2.5', coverage: 'Full' },
      { framework: 'GDPR', clause: 'Art.22', coverage: 'Partial' },
      { framework: 'ISO 42001', clause: 'Cl.8.5', coverage: 'Full' },
    ],
    coveragePct: 88, gaps: 1,
  },
  {
    id: 'CTRL-006', control: 'Model Documentation', controlDesc: 'Maintain technical documentation for all AI models',
    mappings: [
      { framework: 'EU AI Act', clause: 'Art.11', coverage: 'Full' },
      { framework: 'ISO 42001', clause: 'Cl.7.5', coverage: 'Full' },
      { framework: 'SOC 2', clause: 'CC2.2', coverage: 'Full' },
    ],
    coveragePct: 85, gaps: 0,
  },
  {
    id: 'CTRL-007', control: 'Incident Reporting', controlDesc: 'Report serious AI incidents to supervisory authorities',
    mappings: [
      { framework: 'EU AI Act', clause: 'Art.73', coverage: 'Full' },
      { framework: 'ISO 42001', clause: 'Cl.10.1', coverage: 'Partial' },
      { framework: 'SOC 2', clause: 'CC7.3', coverage: 'Full' },
    ],
    coveragePct: 80, gaps: 0,
  },
  {
    id: 'CTRL-008', control: 'Vendor Risk Management', controlDesc: 'Assess and manage AI vendor risks throughout supply chain',
    mappings: [
      { framework: 'ISO 42001', clause: 'Cl.8.6', coverage: 'Full' },
      { framework: 'SOC 2', clause: 'CC9.2', coverage: 'Full' },
      { framework: 'GDPR', clause: 'Art.28', coverage: 'Full' },
      { framework: 'NIST AI RMF', clause: 'MAP-5.1', coverage: 'Partial' },
    ],
    coveragePct: 91, gaps: 1,
  },
  {
    id: 'CTRL-009', control: 'Transparency Obligations', controlDesc: 'Provide transparency disclosures per EU AI Act Art.13/52',
    mappings: [
      { framework: 'EU AI Act', clause: 'Art.13', coverage: 'Full' },
      { framework: 'EU AI Act', clause: 'Art.52', coverage: 'Full' },
      { framework: 'GDPR', clause: 'Art.14', coverage: 'Partial' },
    ],
    coveragePct: 82, gaps: 1,
  },
  {
    id: 'CTRL-010', control: 'Post-Market Monitoring', controlDesc: 'Implement continuous post-deployment surveillance plans',
    mappings: [
      { framework: 'EU AI Act', clause: 'Art.72', coverage: 'Full' },
      { framework: 'ISO 42001', clause: 'Cl.9.1', coverage: 'Partial' },
      { framework: 'NIST AI RMF', clause: 'MANAGE-4.1', coverage: 'Full' },
    ],
    coveragePct: 75, gaps: 1,
  },
];

function coverageColor(c: Coverage) {
  switch (c) {
    case 'Full': return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', symbol: '✓' };
    case 'Partial': return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', symbol: '⚠' };
    case 'Gap': return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', symbol: '—' };
    case 'N/A': return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))', symbol: 'N/A' };
    default: return { bg: 'hsl(var(--bg-raised))', text: 'hsl(var(--text-4))', symbol: '?' };
  }
}

function pctColor(pct: number) {
  if (pct >= 85) return 'hsl(var(--s-ok-tx))';
  if (pct >= 65) return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--s-er-tx))';
}

export default function FrameworkMappingPage() {
  const [mappings, setMappings] = useState<FrameworkMapping[]>(SEED);
  const [search, setSearch] = useState('');
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(['EU AI Act', 'ISO 42001', 'NIST AI RMF', 'GDPR']);
  const [addOpen, setAddOpen] = useState(false);
  const [autoMapping, setAutoMapping] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState(false);
  const [gapPanelOpen, setGapPanelOpen] = useState(false);

  const [wControl, setWControl] = useState('');
  const [wFramework, setWFramework] = useState('EU AI Act');
  const [wClause, setWClause] = useState('');
  const [wCoverage, setWCoverage] = useState<Coverage>('Full');
  const [wNotes, setWNotes] = useState('');

  const filtered = useMemo(() => mappings.filter(m =>
    !search || m.control.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())
  ), [mappings, search]);

  const totalControls = mappings.length;
  const totalRequirements = mappings.reduce((a, m) => a + m.mappings.length, 0);
  const avgCoverage = Math.round(mappings.reduce((a, m) => a + m.coveragePct, 0) / mappings.length);

  function runAutoMap() {
    setAutoMapping(true);
    setTimeout(() => { setAutoMapping(false); setAutoSuggestions(true); }, 2000);
  }

  // Build matrix — columns are active frameworks
  const activeFrameworks = selectedFrameworks.length > 0 ? selectedFrameworks : FRAMEWORKS;

  function getCoverage(mapping: FrameworkMapping, fw: string): Coverage {
    const found = mapping.mappings.find(m => m.framework === fw);
    return found ? found.coverage : 'N/A';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Cross-Framework Control Mapping</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Map controls across frameworks to eliminate redundancy and identify gaps</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setGapPanelOpen(true)}>
            <Warning size={14} className="mr-1.5" /> Gap Analysis
          </Button>
          <Button variant="outline" style={{ borderRadius: 0 }} onClick={runAutoMap} disabled={autoMapping}>
            <Sparkle size={14} className="mr-1.5" /> {autoMapping ? 'Analyzing...' : 'Auto-Map'}
          </Button>
          <Button onClick={() => setAddOpen(true)} style={{ borderRadius: 0 }}>
            <Plus size={15} className="mr-1.5" /> Add Mapping
          </Button>
        </div>
      </div>

      {/* Efficiency banner */}
      <div className="px-4 py-3 border" style={{ background: 'hsl(var(--brand-subtle))', borderColor: 'hsl(var(--brand)/30%)', borderRadius: 0 }}>
        <p className="text-sm font-medium" style={{ color: 'hsl(var(--brand))' }}>
          <ArrowsLeftRight size={14} className="inline mr-2" />
          {totalControls} controls satisfy {totalRequirements} framework requirements — avg coverage {avgCoverage}%
        </p>
      </div>

      {/* Auto-suggestions banner */}
      {autoSuggestions && (
        <div className="p-3 border" style={{ borderColor: 'hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))', borderRadius: 0 }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--s-ok-tx))' }}>✓ Auto-map complete — 12 new mappings suggested</p>
            <div className="flex gap-2">
              <Button size="sm" style={{ borderRadius: 0, height: 26 }}>Accept All</Button>
              <Button size="sm" variant="outline" style={{ borderRadius: 0, height: 26 }} onClick={() => setAutoSuggestions(false)}>Dismiss</Button>
            </div>
          </div>
        </div>
      )}

      {/* Framework selector */}
      <div className="flex flex-wrap gap-2">
        {FRAMEWORKS.map(fw => (
          <button key={fw}
            onClick={() => setSelectedFrameworks(prev => prev.includes(fw) ? prev.filter(f => f !== fw) : [...prev, fw])}
            className="px-3 py-1 text-xs font-medium border transition-colors"
            style={{ borderRadius: 0, borderColor: selectedFrameworks.includes(fw) ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: selectedFrameworks.includes(fw) ? 'hsl(var(--brand-subtle))' : 'transparent', color: selectedFrameworks.includes(fw) ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
            {fw}
          </button>
        ))}
      </div>

      {/* Matrix */}
      <Card style={{ borderRadius: 0 }}>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'hsl(var(--border))' }}>
            <MagnifyingGlass size={15} style={{ color: 'hsl(var(--text-4))' }} />
            <Input placeholder="Search controls..." value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 p-0 focus-visible:ring-0 bg-transparent" style={{ color: 'hsl(var(--text-1))' }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-raised))' }}>
                  <th className="text-left px-3 py-2.5 font-semibold sticky left-0 bg-raised min-w-[180px]" style={{ color: 'hsl(var(--text-4))' }}>Control</th>
                  {activeFrameworks.map(fw => (
                    <th key={fw} className="text-center px-2 py-2.5 font-semibold min-w-[90px]" style={{ color: 'hsl(var(--text-4))' }}>{fw}</th>
                  ))}
                  <th className="text-center px-3 py-2.5 font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Coverage</th>
                  <th className="text-center px-3 py-2.5 font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Gaps</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b hover:bg-raised transition-colors" style={{ borderColor: 'hsl(var(--border))' }}>
                    <td className="px-3 py-2.5 sticky left-0 bg-surface">
                      <div>
                        <span className="font-mono text-[10px] px-1 py-0.5 mr-1.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))' }}>{m.id}</span>
                        <span className="font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.control}</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{m.controlDesc}</p>
                    </td>
                    {activeFrameworks.map(fw => {
                      const cov = getCoverage(m, fw);
                      const cc = coverageColor(cov);
                      const clause = m.mappings.find(mp => mp.framework === fw)?.clause;
                      return (
                        <td key={fw} className="px-2 py-2.5 text-center">
                          <div title={clause ? `${fw} ${clause}` : 'Not mapped'}
                            className="inline-flex items-center justify-center w-8 h-6 font-bold text-[10px] cursor-help"
                            style={{ background: cc.bg, color: cc.text, borderRadius: 0 }}>
                            {cc.symbol}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold" style={{ color: pctColor(m.coveragePct) }}>{m.coveragePct}%</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {m.gaps > 0 ? (
                        <span className="text-xs font-semibold px-1.5 py-0.5" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>{m.gaps}</span>
                      ) : (
                        <span style={{ color: 'hsl(var(--s-ok-tx))' }}>✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {(['Full', 'Partial', 'Gap', 'N/A'] as Coverage[]).map(c => {
          const cc = coverageColor(c);
          return (
            <div key={c} className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-6 h-5 text-[10px] font-bold" style={{ background: cc.bg, color: cc.text, borderRadius: 0 }}>{cc.symbol}</span>
              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{c === 'Full' ? 'Full coverage' : c === 'Partial' ? 'Partial' : c === 'Gap' ? 'Gap' : 'Not applicable'}</span>
            </div>
          );
        })}
        <div className="flex-1" />
        <Button variant="outline" size="sm" style={{ borderRadius: 0 }}>
          <DownloadSimple size={13} className="mr-1.5" /> Export as CSV
        </Button>
      </div>

      {/* Gap Analysis Sheet */}
      <Sheet open={gapPanelOpen} onOpenChange={setGapPanelOpen}>
        <SheetContent style={{ width: 560, borderRadius: 0, overflowY: 'auto' }}>
          <SheetHeader className="pb-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <SheetTitle className="flex items-center gap-2">
              <Warning size={16} style={{ color: 'hsl(var(--s-wn-tx))' }} />
              Gap Analysis Report
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Controls with coverage gaps across selected frameworks — prioritised by gap count.</p>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Controls with Gaps', value: mappings.filter(m => m.gaps > 0).length, color: 'hsl(var(--s-er-tx))' },
                { label: 'Total Gaps', value: mappings.reduce((a, m) => a + m.gaps, 0), color: 'hsl(var(--s-wn-tx))' },
                { label: 'Avg Coverage', value: `${Math.round(mappings.reduce((a, m) => a + m.coveragePct, 0) / mappings.length)}%`, color: pctColor(Math.round(mappings.reduce((a, m) => a + m.coveragePct, 0) / mappings.length)) },
              ].map(s => (
                <div key={s.label} className="p-3 border text-center" style={{ borderColor: 'hsl(var(--border))' }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Gap items */}
            <div className="space-y-2">
              {[...mappings].filter(m => m.gaps > 0).sort((a, b) => b.gaps - a.gaps).map(m => (
                <div key={m.id} className="p-3 border" style={{ borderColor: m.coveragePct < 65 ? 'hsl(var(--s-er-br))' : 'hsl(var(--s-wn-br))', background: m.coveragePct < 65 ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-[10px] px-1 py-0.5 mr-1.5" style={{ background: 'hsl(var(--brand-subtle))', color: 'hsl(var(--brand))', borderRadius: 0 }}>{m.id}</span>
                      <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{m.control}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5" style={{ background: m.coveragePct < 65 ? 'hsl(var(--s-er-bg))' : 'hsl(var(--s-wn-bg))', color: m.coveragePct < 65 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-wn-tx))', borderRadius: 0 }}>
                        {m.gaps} gap{m.gaps !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs font-bold" style={{ color: pctColor(m.coveragePct) }}>{m.coveragePct}%</span>
                    </div>
                  </div>
                  <p className="text-[11px] mb-2" style={{ color: 'hsl(var(--text-4))' }}>{m.controlDesc}</p>
                  <div className="flex flex-wrap gap-1">
                    {FRAMEWORKS.map(fw => {
                      const found = m.mappings.find(mp => mp.framework === fw);
                      if (!found || found.coverage === 'Gap' || !found) {
                        return (
                          <span key={fw} className="text-[10px] px-1.5 py-0.5 font-medium" style={{ background: 'hsl(var(--s-er-bg))', color: 'hsl(var(--s-er-tx))', borderRadius: 0 }}>
                            {fw}: Gap
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" style={{ borderRadius: 0, fontSize: 11, height: 24 }}>Create Remediation Task</Button>
                    <Button size="sm" variant="outline" style={{ borderRadius: 0, fontSize: 11, height: 24 }}>Assign Owner</Button>
                  </div>
                </div>
              ))}
            </div>

            {mappings.filter(m => m.gaps > 0).length === 0 && (
              <div className="p-4 border text-center" style={{ borderColor: 'hsl(var(--s-ok-br))', background: 'hsl(var(--s-ok-bg))' }}>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--s-ok-tx))' }}>✓ No coverage gaps detected across selected frameworks</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Mapping Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent style={{ borderRadius: 0, maxWidth: 480 }}>
          <DialogHeader>
            <DialogTitle>Add Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Control *</label>
              <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wControl} onChange={e => setWControl(e.target.value)}>
                <option value="">Select control...</option>
                {SEED.map(m => <option key={m.id} value={m.id}>{m.id} — {m.control}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Framework *</label>
                <select className="w-full text-sm border p-2" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                  value={wFramework} onChange={e => setWFramework(e.target.value)}>
                  {FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Clause/Article *</label>
                <Input style={{ borderRadius: 0 }} value={wClause} onChange={e => setWClause(e.target.value)} placeholder="e.g. Art.9" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Coverage *</label>
              <div className="flex gap-2">
                {(['Full', 'Partial', 'N/A'] as Coverage[]).map(c => (
                  <button key={c} onClick={() => setWCoverage(c)}
                    className="flex-1 py-1.5 text-sm border font-medium transition-colors"
                    style={{ borderRadius: 0, borderColor: wCoverage === c ? 'hsl(var(--brand))' : 'hsl(var(--border))', background: wCoverage === c ? 'hsl(var(--brand-subtle))' : 'transparent', color: wCoverage === c ? 'hsl(var(--brand))' : 'hsl(var(--text-3))' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>Notes</label>
              <textarea className="w-full text-sm border p-2 min-h-[60px]" style={{ borderRadius: 0, borderColor: 'hsl(var(--border))', background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))' }}
                value={wNotes} onChange={e => setWNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button style={{ borderRadius: 0 }} onClick={() => {
              if (!wControl || !wClause) { toast.error('Please fill in Control and Clause/Article'); return; }
              setMappings(prev => prev.map(m => m.id === wControl ? { ...m, mappings: [...m.mappings, { framework: wFramework, clause: wClause, coverage: wCoverage }] } : m));
              toast.success(`Mapping added: ${wControl} → ${wFramework} ${wClause}`);
              setAddOpen(false); setWControl(''); setWClause(''); setWNotes('');
            }}>Save Mapping</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
