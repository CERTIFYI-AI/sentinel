import { useFrameworksData } from "@/hooks/useFrameworksData";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  StackSimple, Plus, PencilSimple, Trash, Info, CalendarCheck, ShieldCheck,
  Warning, ArrowRight, Eye, ArrowsLeftRight,
} from '@phosphor-icons/react';
import { FRAMEWORKS, CONTROLS, GAPS, Framework, formatDate } from '../data/seed';
import { useSettingsStore } from '../stores/settingsStore';

const EMPTY_FRAMEWORK: Omit<Framework, 'id'> = {
  name: '', description: '', controlsTotal: 0, controlsImplemented: 0,
  complianceScore: 0, status: 'Partial', nextAudit: '', category: '',
};

function complianceBadge(score: number) {
  if (score >= 85) return { label: 'Compliant', bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
  if (score >= 65) return { label: 'Partial', bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
  return { label: 'Non-Compliant', bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
}

function scoreBarColor(score: number): string {
  if (score >= 85) return '#10b981';
  if (score >= 65) return '#f97316';
  return '#ef4444';
}

function ragBorderColor(score: number): string {
  if (score >= 85) return '#10b981';
  if (score >= 65) return '#f97316';
  return '#ef4444';
}

const CATEGORY_COLORS: Record<string, string> = {
  'AI Governance': '#8b5cf6',
  'Security': '#3b82f6',
  'Trust': '#06b6d4',
  'AI Regulation': '#f97316',
  'Risk Management': '#f59e0b',
  'LLM Security': '#ef4444',
};

// Audit date helpers
function auditDateStatus(dateStr: string): 'overdue' | 'due-soon' | 'normal' {
  if (!dateStr) return 'normal';
  const d = new Date(dateStr);
  const now = new Date();
  if (d < now) return 'overdue';
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (d <= thirtyDaysFromNow) return 'due-soon';
  return 'normal';
}

function AuditDateDisplay({ dateStr }: { dateStr: string }) {
  const status = auditDateStatus(dateStr);
  if (status === 'overdue') {
    return (
      <div className="flex items-center gap-1">
        <CalendarCheck size={12} style={{ color: '#ef4444' }} />
        <span className="text-xs font-medium" style={{ color: '#ef4444' }}>{formatDate(dateStr)}</span>
        <Badge style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 0, fontSize: 9, padding: '0 4px' }}>
          OVERDUE
        </Badge>
      </div>
    );
  }
  if (status === 'due-soon') {
    return (
      <div className="flex items-center gap-1">
        <CalendarCheck size={12} style={{ color: '#f97316' }} />
        <span className="text-xs font-medium" style={{ color: '#f97316' }}>{formatDate(dateStr)}</span>
        <Badge style={{ background: '#f9731620', color: '#f97316', border: '1px solid #f9731640', borderRadius: 0, fontSize: 9, padding: '0 4px' }}>
          Due Soon
        </Badge>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <CalendarCheck size={12} style={{ color: 'hsl(var(--text-3))' }} />
      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(dateStr)}</span>
    </div>
  );
}

export default function Frameworks() {
  const { orgName } = useSettingsStore();
  const navigate = useNavigate();

  const [frameworks, setFrameworks] = useState<Framework[]>(FRAMEWORKS);
  const { frameworks: supabaseFrameworks } = useFrameworksData();
  useEffect(() => { if (supabaseFrameworks.length > 0) setFrameworks(supabaseFrameworks as any); }, [supabaseFrameworks]);
  const [viewItem, setViewItem] = useState<Framework | null>(null);
  const [editItem, setEditItem] = useState<Framework | null>(null);
  const [deleteItem, setDeleteItem] = useState<Framework | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Framework, 'id'>>(EMPTY_FRAMEWORK);

  function handleCreate() {
    const id = `FW-${String(frameworks.length + 1).padStart(3, '0')}`;
    setFrameworks(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_FRAMEWORK);
  }

  function handleEdit() {
    if (!editItem) return;
    setFrameworks(prev => prev.map(f => f.id === editItem.id ? editItem : f));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setFrameworks(prev => prev.filter(f => f.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Compliance Frameworks</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · {frameworks.length} active frameworks
          </p>
        </div>
        <Button size="sm" onClick={() => { setFormData(EMPTY_FRAMEWORK); setCreateOpen(true); }}>
          <Plus size={14} className="mr-1" /> Add Framework
        </Button>
      </div>

      {/* Color threshold legend */}
      <div className="flex items-center gap-6 p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
        <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>Score thresholds:</span>
        {[
          { label: '≥85% — Compliant', color: '#10b981' },
          { label: '65–84% — Partial', color: '#f97316' },
          { label: '<65% — Non-Compliant', color: '#ef4444' },
        ].map(t => (
          <div key={t.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3" style={{ background: t.color }} />
            <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Framework Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {frameworks.map(fw => {
          const badge = complianceBadge(fw.complianceScore);
          const controls = CONTROLS.filter(c => c.framework === fw.name);
          const categoryColor = CATEGORY_COLORS[fw.category] || 'hsl(var(--brand))';
          const borderColor = ragBorderColor(fw.complianceScore);
          const isNonCompliant = fw.complianceScore < 65;

          return (
            <Card
              key={fw.id}
              className="cursor-pointer transition-all"
              style={{
                background: 'hsl(var(--bg-surface))',
                border: '1px solid hsl(var(--border))',
                borderLeft: `4px solid ${borderColor}`,
                transition: 'transform 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
              }}
              onClick={() => setViewItem(fw)}
            >
              <CardContent className="p-5">
                {/* Top: category + warning + actions */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge style={{ background: categoryColor + '22', color: categoryColor, border: `1px solid ${categoryColor}44`, borderRadius: 0, fontSize: 10 }}>
                      {fw.category}
                    </Badge>
                    {isNonCompliant && (
                      <Warning size={16} style={{ color: '#ef4444' }} weight="fill" />
                    )}
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" style={{ padding: '2px 6px' }} onClick={() => setEditItem({ ...fw })}>
                      <PencilSimple size={12} />
                    </Button>
                    <Button size="sm" variant="ghost" style={{ padding: '2px 6px', color: '#ef4444' }} onClick={() => setDeleteItem(fw)}>
                      <Trash size={12} />
                    </Button>
                  </div>
                </div>

                {/* Name */}
                <h3 className="text-base font-bold mb-1" style={{ color: 'hsl(var(--text-1))' }}>{fw.name}</h3>
                <p className="text-xs mb-4 line-clamp-2" style={{ color: 'hsl(var(--text-3))' }}>{fw.description}</p>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'hsl(var(--text-3))' }}>Compliance Score</span>
                    <span className="font-bold" style={{ color: scoreBarColor(fw.complianceScore) }}>
                      {fw.complianceScore}%
                    </span>
                  </div>
                  <div style={{ background: 'hsl(var(--bg-muted))', height: 8 }}>
                    <div style={{
                      width: fw.complianceScore + '%',
                      height: '100%',
                      background: scoreBarColor(fw.complianceScore),
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>

                {/* Controls ratio */}
                <div className="flex justify-between text-xs mb-3">
                  <span style={{ color: 'hsl(var(--text-3))' }}>Controls</span>
                  <span style={{ color: 'hsl(var(--text-1))' }}>
                    {fw.controlsImplemented}/{fw.controlsTotal} implemented
                  </span>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  <Badge style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, borderRadius: 0, fontSize: 10 }}>
                    {badge.label}
                  </Badge>
                  <AuditDateDisplay dateStr={fw.nextAudit} />
                </div>

                {/* View Controls button */}
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }} onClick={e => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    style={{ borderRadius: 0, fontSize: 11 }}
                    onClick={() => navigate(`/compliance/controls?framework=${encodeURIComponent(fw.name)}`)}
                  >
                    <Eye size={12} className="mr-1" /> View Controls <ArrowRight size={10} className="ml-auto" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Framework Crosswalk Matrix */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ArrowsLeftRight size={18} style={{ color: 'hsl(var(--brand))' }} />
            <CardTitle className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>
              Framework Crosswalk
            </CardTitle>
          </div>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            Control mapping across ISO 27001, SOC 2, NIST AI RMF, and EU AI Act
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '2px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>Control Domain</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>
                    <Badge style={{ background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644', borderRadius: 0, fontSize: 10 }}>ISO 27001</Badge>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>
                    <Badge style={{ background: '#06b6d422', color: '#06b6d4', border: '1px solid #06b6d444', borderRadius: 0, fontSize: 10 }}>SOC 2</Badge>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>
                    <Badge style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: 0, fontSize: 10 }}>NIST AI RMF</Badge>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>
                    <Badge style={{ background: '#f9731622', color: '#f97316', border: '1px solid #f9731644', borderRadius: 0, fontSize: 10 }}>EU AI Act</Badge>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    domain: 'Access Control',
                    iso: 'A.9 Access Control',
                    soc: 'CC6.1 Logical Access',
                    nist: 'PR.AC Access Control',
                    eu: 'Art. 9(4)(b) Access Mgmt',
                  },
                  {
                    domain: 'Risk Assessment',
                    iso: 'A.8.2 Information Classification',
                    soc: 'CC3.2 Risk Assessment',
                    nist: 'GV.1 Risk Governance',
                    eu: 'Art. 9(1) Risk Mgmt System',
                  },
                  {
                    domain: 'Data Governance',
                    iso: 'A.8.1 Asset Management',
                    soc: 'CC6.5 Data Processing',
                    nist: 'MP.1 Data Governance',
                    eu: 'Art. 10 Data Quality',
                  },
                  {
                    domain: 'Monitoring & Logging',
                    iso: 'A.12.4 Logging & Monitoring',
                    soc: 'CC7.2 System Monitoring',
                    nist: 'MN.3 Performance Monitoring',
                    eu: 'Art. 12 Record-keeping',
                  },
                  {
                    domain: 'Incident Response',
                    iso: 'A.16.1 Incident Management',
                    soc: 'CC7.4 Incident Response',
                    nist: 'GV.5 Incident Governance',
                    eu: 'Art. 62 Incident Reporting',
                  },
                  {
                    domain: 'Transparency',
                    iso: 'A.18.1 Compliance Requirements',
                    soc: 'CC1.4 Reporting Obligations',
                    nist: 'MP.5 Explainability',
                    eu: 'Art. 13 Transparency',
                  },
                  {
                    domain: 'Human Oversight',
                    iso: 'A.7.2 Competence & Awareness',
                    soc: 'CC1.3 Board Oversight',
                    nist: 'GV.3 Human Oversight',
                    eu: 'Art. 14 Human Oversight',
                  },
                  {
                    domain: 'Change Management',
                    iso: 'A.14.2 Change Control',
                    soc: 'CC8.1 Change Management',
                    nist: 'GV.6 Change Governance',
                    eu: 'Art. 9(2)(b) Modification Mgmt',
                  },
                ].map((row, idx) => (
                  <tr key={row.domain} style={{
                    borderBottom: '1px solid hsl(var(--border))',
                    background: idx % 2 === 0 ? 'transparent' : 'hsl(var(--bg-muted))',
                  }}>
                    <td className="px-4 py-2.5 font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{row.domain}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.iso}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.soc}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.nist}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--text-3))' }}>{row.eu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}>
            <Info size={14} style={{ color: 'hsl(var(--text-4))' }} />
            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              Crosswalk mappings show approximate equivalences between framework controls. Actual compliance requirements may vary.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 560, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2">
                  {(() => {
                    const badge = complianceBadge(viewItem.complianceScore);
                    return (
                      <Badge style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`, borderRadius: 0 }}>
                        {badge.label}
                      </Badge>
                    );
                  })()}
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.category}</Badge>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="controls" style={{ borderRadius: 0 }}>Controls</TabsTrigger>
                  <TabsTrigger value="gaps" style={{ borderRadius: 0 }}>Gaps</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                  {[
                    { label: 'Framework ID', value: viewItem.id },
                    { label: 'Compliance Score', value: viewItem.complianceScore + '%' },
                    { label: 'Controls Implemented', value: `${viewItem.controlsImplemented}/${viewItem.controlsTotal}` },
                    { label: 'Status', value: viewItem.status },
                    { label: 'Next Audit', value: formatDate(viewItem.nextAudit) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  {/* Score bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'hsl(var(--text-3))' }}>Compliance Progress</span>
                      <span style={{ color: scoreBarColor(viewItem.complianceScore) }}>{viewItem.complianceScore}%</span>
                    </div>
                    <div style={{ background: 'hsl(var(--bg-muted))', height: 10 }}>
                      <div style={{ width: viewItem.complianceScore + '%', height: '100%', background: scoreBarColor(viewItem.complianceScore) }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                      <span>&lt;65% Non-Compliant</span>
                      <span>65-84% Partial</span>
                      <span>≥85% Compliant</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="controls" className="mt-4">
                  {CONTROLS.filter(c => c.framework === viewItem.name).length === 0 ? (
                    <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>No controls mapped to this framework in current view.</p>
                  ) : (
                    <div className="space-y-2">
                      {CONTROLS.filter(c => c.framework === viewItem.name).map(c => {
                        const sc_c = (() => {
                          if (c.status === 'implemented') return { color: '#10b981', label: 'Implemented' };
                          if (c.status === 'partial') return { color: '#f97316', label: 'Partial' };
                          return { color: '#6b7280', label: c.status };
                        })();
                        return (
                          <div
                            key={c.id}
                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-[hsl(var(--bg-raised))] transition-colors"
                            style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}
                            onClick={() => navigate(`/compliance/controls/${c.id}`)}
                          >
                            <div>
                              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{c.title}</p>
                              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{c.clause}</p>
                            </div>
                            <span className="text-xs font-bold" style={{ color: sc_c.color }}>{c.score}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="gaps" className="mt-4">
                  {GAPS.filter(g => g.framework === viewItem.name).length === 0 ? (
                    <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>No gaps for this framework.</p>
                  ) : (
                    <div className="space-y-2">
                      {GAPS.filter(g => g.framework === viewItem.name).map(g => (
                        <div key={g.id} className="p-3" style={{ border: '1px solid hsl(var(--border))' }}>
                          <p className="text-sm font-medium mb-1" style={{ color: 'hsl(var(--text-1))' }}>{g.title}</p>
                          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{g.controlRef} · Due {formatDate(g.dueDate)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigate(`/compliance/controls?framework=${encodeURIComponent(viewItem.name)}`);
                    setViewItem(null);
                  }}
                  style={{ borderRadius: 0 }}
                >
                  <Eye size={12} className="mr-1" /> View Controls
                </Button>
                <Button size="sm" variant="outline" onClick={() => setViewItem(null)}>Close</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Framework</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[
                { label: 'Name', key: 'name' },
                { label: 'Description', key: 'description' },
                { label: 'Category', key: 'category' },
                { label: 'Next Audit Date', key: 'nextAudit', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input type={f.type || 'text'} value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Compliance Score</label>
                  <Input type="number" min={0} max={100} value={editItem.complianceScore}
                    onChange={e => setEditItem(prev => prev ? { ...prev, complianceScore: Number(e.target.value) } : null)}
                    style={{ borderRadius: 0 }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Status</label>
                  <select value={editItem.status} onChange={e => setEditItem(prev => prev ? { ...prev, status: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['Compliant', 'Partial', 'Non-Compliant'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} style={{ borderRadius: 0 }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Add Framework</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {[
              { label: 'Name', key: 'name' },
              { label: 'Description', key: 'description' },
              { label: 'Category', key: 'category' },
              { label: 'Next Audit Date', key: 'nextAudit', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input type={f.type || 'text'} value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formData.name} style={{ borderRadius: 0 }}>Add Framework</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Framework</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} style={{ background: '#ef4444', borderRadius: 0 }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
