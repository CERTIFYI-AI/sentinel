import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  FileText, MagnifyingGlass, Plus, Eye, PencilSimple, Trash,
  Download, Play, CalendarBlank, Clock, CheckCircle, FilePdf,
  FileDoc, Table,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  format: 'PDF' | 'DOCX' | 'XLSX' | 'HTML';
  frequency: string;
  lastGenerated: string;
  generationCount: number;
  recipients: string[];
  description: string;
  sections: string[];
  status: 'active' | 'draft' | 'archived';
}

interface ReportHistory {
  id: string;
  templateId: string;
  templateName: string;
  generatedAt: string;
  generatedBy: string;
  status: 'completed' | 'generating' | 'failed';
  size: string;
  format: string;
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: 'RPT-001', name: 'Weekly Security Posture Report', category: 'Security', format: 'PDF', frequency: 'Weekly', lastGenerated: '2026-03-31', generationCount: 12, recipients: ['sarah.chen@sentinel-grc.com', 'james.patel@sentinel-grc.com'], description: 'Comprehensive weekly summary of security posture including threats, vulnerabilities, and control status.', sections: ['Executive Summary', 'Threat Intelligence', 'Vulnerability Status', 'Control Effectiveness', 'Incident Metrics', 'Recommendations'], status: 'active' },
  { id: 'RPT-002', name: 'AI Security Benchmark Report', category: 'AI Security', format: 'PDF', frequency: 'Monthly', lastGenerated: '2026-03-01', generationCount: 3, recipients: ['maria.santos@sentinel-grc.com', 'raj.gupta@sentinel-grc.com'], description: 'Model security benchmark scores, red team findings, and AI-specific risk metrics.', sections: ['Model Rankings', 'Benchmark Scores', 'Red Team Findings', 'Guardrail Effectiveness', 'Recommendations'], status: 'active' },
  { id: 'RPT-003', name: 'Vulnerability Management Dashboard', category: 'Vulnerability', format: 'XLSX', frequency: 'Bi-weekly', lastGenerated: '2026-03-28', generationCount: 6, recipients: ['david.kim@sentinel-grc.com', 'maria.santos@sentinel-grc.com'], description: 'Full CVE inventory with CVSS scores, patch status, and SLA tracking.', sections: ['CVE Inventory', 'CVSS Distribution', 'Patch Progress', 'SLA Compliance', 'Assignee Workload'], status: 'active' },
  { id: 'RPT-004', name: 'Red Team Exercise Summary', category: 'Red Team', format: 'PDF', frequency: 'Per Exercise', lastGenerated: '2026-03-15', generationCount: 4, recipients: ['sarah.chen@sentinel-grc.com'], description: 'Detailed findings, methodology, and remediation recommendations from red team exercises.', sections: ['Executive Summary', 'Attack Vectors Used', 'Critical Findings', 'Finding Details', 'Remediation Roadmap', 'Risk Acceptance'], status: 'active' },
  { id: 'RPT-005', name: 'API Key Audit Report', category: 'Access Control', format: 'XLSX', frequency: 'Monthly', lastGenerated: '2026-03-01', generationCount: 3, recipients: ['james.patel@sentinel-grc.com'], description: 'Full inventory of API keys with usage statistics, expiration dates, and rotation compliance.', sections: ['Key Inventory', 'Usage Analytics', 'Expiry Status', 'Rotation Compliance', 'Revocation Log'], status: 'active' },
  { id: 'RPT-006', name: 'Executive Security Briefing', category: 'Executive', format: 'PDF', frequency: 'Monthly', lastGenerated: '2026-03-01', generationCount: 3, recipients: ['ceo@sentinel-grc.com', 'board@sentinel-grc.com'], description: 'High-level executive briefing on security posture, key risks, and investment priorities.', sections: ['Security Score', 'Key Metrics', 'Critical Risks', 'Compliance Status', 'Strategic Recommendations'], status: 'draft' },
];

const REPORT_HISTORY: ReportHistory[] = [
  { id: 'RH-001', templateId: 'RPT-001', templateName: 'Weekly Security Posture Report', generatedAt: '2026-03-31T09:00:00', generatedBy: 'Scheduled', status: 'completed', size: '2.4 MB', format: 'PDF' },
  { id: 'RH-002', templateId: 'RPT-003', templateName: 'Vulnerability Management Dashboard', generatedAt: '2026-03-28T14:30:00', generatedBy: 'David Kim', status: 'completed', size: '890 KB', format: 'XLSX' },
  { id: 'RH-003', templateId: 'RPT-004', templateName: 'Red Team Exercise Summary', generatedAt: '2026-03-15T16:00:00', generatedBy: 'Sarah Chen', status: 'completed', size: '5.1 MB', format: 'PDF' },
  { id: 'RH-004', templateId: 'RPT-001', templateName: 'Weekly Security Posture Report', generatedAt: '2026-03-24T09:00:00', generatedBy: 'Scheduled', status: 'completed', size: '2.2 MB', format: 'PDF' },
  { id: 'RH-005', templateId: 'RPT-002', templateName: 'AI Security Benchmark Report', generatedAt: '2026-03-01T10:00:00', generatedBy: 'Maria Santos', status: 'completed', size: '3.8 MB', format: 'PDF' },
  { id: 'RH-006', templateId: 'RPT-005', templateName: 'API Key Audit Report', generatedAt: '2026-04-05T11:00:00', generatedBy: 'Scheduled', status: 'generating', size: '—', format: 'XLSX' },
];

function statusStyle(status: string) {
  switch (status) {
    case 'active': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    case 'draft': return { bg: '#eab30820', text: '#eab308', border: '#eab30840' };
    case 'archived': return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
    case 'completed': return { bg: '#10b98120', text: '#10b981', border: '#10b98140' };
    case 'generating': return { bg: '#3b82f620', text: '#3b82f6', border: '#3b82f640' };
    case 'failed': return { bg: '#ef444420', text: '#ef4444', border: '#ef444440' };
    default: return { bg: '#6b728020', text: '#6b7280', border: '#6b728040' };
  }
}

function formatIcon(format: string) {
  if (format === 'PDF') return <FilePdf size={14} style={{ color: '#ef4444' }} />;
  if (format === 'XLSX') return <Table size={14} style={{ color: '#10b981' }} />;
  if (format === 'DOCX') return <FileDoc size={14} style={{ color: '#3b82f6' }} />;
  return <FileText size={14} style={{ color: 'hsl(var(--text-3))' }} />;
}

const EMPTY_TEMPLATE: Omit<ReportTemplate, 'id'> = {
  name: '', category: 'Security', format: 'PDF', frequency: 'Monthly',
  lastGenerated: '', generationCount: 0, recipients: [], description: '',
  sections: [], status: 'draft',
};

export default function ReportGenerator() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();

  const [templates, setTemplates] = useState<ReportTemplate[]>(REPORT_TEMPLATES);
  const [history, setHistory] = useState<ReportHistory[]>(REPORT_HISTORY);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('templates');

  const [viewItem, setViewItem] = useState<ReportTemplate | null>(null);
  const [editItem, setEditItem] = useState<ReportTemplate | null>(null);
  const [deleteItem, setDeleteItem] = useState<ReportTemplate | null>(null);
  const [generateItem, setGenerateItem] = useState<ReportTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<ReportTemplate, 'id'>>(EMPTY_TEMPLATE);

  const filteredTemplates = templates.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    const matchCat = filterCategory === 'all' || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const categoryData = Array.from(
    templates.reduce((acc, t) => {
      acc.set(t.category, (acc.get(t.category) || 0) + t.generationCount);
      return acc;
    }, new Map<string, number>())
  ).map(([name, count]) => ({ name, count }));

  const categories = Array.from(new Set(templates.map(t => t.category)));

  const stats = [
    { label: 'Report Templates', value: templates.length, icon: FileText },
    { label: 'Generated (Total)', value: templates.reduce((s, t) => s + t.generationCount, 0), icon: FilePdf },
    { label: 'Scheduled', value: templates.filter(t => t.frequency !== 'Manual' && t.status === 'active').length, icon: CalendarBlank },
    { label: 'In Queue', value: history.filter(h => h.status === 'generating').length, icon: Clock },
  ];

  function handleGenerate() {
    if (!generateItem) return;
    const id = `RH-${String(history.length + 1).padStart(3, '0')}`;
    const newHistory: ReportHistory = {
      id, templateId: generateItem.id, templateName: generateItem.name,
      generatedAt: new Date().toISOString(), generatedBy: 'Current User',
      status: 'generating', size: '—', format: generateItem.format,
    };
    setHistory(prev => [newHistory, ...prev]);
    setTemplates(prev => prev.map(t => t.id === generateItem.id ? { ...t, generationCount: t.generationCount + 1, lastGenerated: new Date().toISOString().split('T')[0] } : t));
    setGenerateItem(null);
    setActiveTab('history');
  }

  function handleCreate() {
    const id = `RPT-${String(templates.length + 1).padStart(3, '0')}`;
    setTemplates(prev => [...prev, { ...formData, id }]);
    setCreateOpen(false);
    setFormData(EMPTY_TEMPLATE);
  }

  function handleEdit() {
    if (!editItem) return;
    setTemplates(prev => prev.map(t => t.id === editItem.id ? editItem : t));
    setEditItem(null);
  }

  function handleDelete() {
    if (!deleteItem) return;
    setTemplates(prev => prev.filter(t => t.id !== deleteItem.id));
    setDeleteItem(null);
  }

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Report Generator</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Security report templates, generation & scheduling
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><CalendarBlank size={14} className="mr-1" /> Schedule</Button>
          <Button size="sm" onClick={() => { setFormData(EMPTY_TEMPLATE); setCreateOpen(true); }}>
            <Plus size={14} className="mr-1" /> New Template
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: 'hsl(var(--brand))' }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Chart */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Generation Count by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.axis }} />
              <YAxis tick={{ fontSize: 11, fill: ct.axis }} allowDecimals={false} label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: ct.axis } }} />
              <Tooltip contentStyle={{ background: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, color: ct.tooltipText, borderRadius: 0 }} />
              <Bar dataKey="count" fill={ct.brand} radius={0} name="Reports Generated" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs: Templates + History */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
            <TabsTrigger value="templates" style={{ borderRadius: 0 }}>Templates</TabsTrigger>
            <TabsTrigger value="history" style={{ borderRadius: 0 }}>Generation History</TabsTrigger>
          </TabsList>

          {activeTab === 'templates' && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-3))' }} />
                <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" style={{ borderRadius: 0, width: 200 }} />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', fontSize: 13, borderRadius: 0 }}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'hsl(var(--text-3))' }}>
              <FileText size={40} />
              <p className="mt-3 text-sm font-medium">No templates match your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map(t => (
                <Card
                  key={t.id}
                  style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {formatIcon(t.format)}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{t.name}</p>
                            <Badge style={{ background: statusStyle(t.status).bg, color: statusStyle(t.status).text, border: `1px solid ${statusStyle(t.status).border}`, borderRadius: 0, fontSize: 10 }}>
                              {t.status}
                            </Badge>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
                            {t.category} · {t.format} · {t.frequency} · {t.generationCount} generated
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-2))' }}>{t.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.sections.slice(0, 3).map(s => (
                              <Badge key={s} variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{s}</Badge>
                            ))}
                            {t.sections.length > 3 && (
                              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>+{t.sections.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                          Last: {t.lastGenerated ? formatDate(t.lastGenerated) : 'Never'}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => setGenerateItem(t)}>
                            <Play size={12} className="mr-1" /> Generate
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setViewItem(t)}>
                            <Eye size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }} onClick={() => setEditItem({ ...t })}>
                            <PencilSimple size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => setDeleteItem(t)}>
                            <Trash size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                  <tr>
                    {['ID', 'Report Name', 'Generated At', 'By', 'Status', 'Format', 'Size', 'Actions'].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr
                      key={h.id}
                      style={{ borderTop: '1px solid hsl(var(--border))' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--bg-muted))')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{h.id}</td>
                      <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-1))' }}>{h.templateName}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                        {new Date(h.generatedAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{h.generatedBy}</td>
                      <td className="p-3">
                        <Badge style={{ background: statusStyle(h.status).bg, color: statusStyle(h.status).text, border: `1px solid ${statusStyle(h.status).border}`, borderRadius: 0, fontSize: 11 }}>
                          {h.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {formatIcon(h.format)}
                          <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{h.format}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{h.size}</td>
                      <td className="p-3">
                        {h.status === 'completed' && (
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px' }}>
                            <Download size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Sheet */}
      <Sheet open={!!viewItem} onOpenChange={o => !o && setViewItem(null)}>
        <SheetContent style={{ width: 520, background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          {viewItem && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{viewItem.name}</SheetTitle>
                <div className="flex gap-2 flex-wrap">
                  <Badge style={{ background: statusStyle(viewItem.status).bg, color: statusStyle(viewItem.status).text, border: `1px solid ${statusStyle(viewItem.status).border}`, borderRadius: 0 }}>
                    {viewItem.status}
                  </Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.format}</Badge>
                  <Badge variant="outline" style={{ borderRadius: 0 }}>{viewItem.frequency}</Badge>
                </div>
              </SheetHeader>
              <Tabs defaultValue="details">
                <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
                  <TabsTrigger value="details" style={{ borderRadius: 0 }}>Details</TabsTrigger>
                  <TabsTrigger value="sections" style={{ borderRadius: 0 }}>Sections</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 space-y-3">
                  {[
                    { label: 'Template ID', value: viewItem.id },
                    { label: 'Category', value: viewItem.category },
                    { label: 'Frequency', value: viewItem.frequency },
                    { label: 'Last Generated', value: viewItem.lastGenerated ? formatDate(viewItem.lastGenerated) : 'Never' },
                    { label: 'Generated Count', value: String(viewItem.generationCount) },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-2))' }}>Recipients</p>
                    {viewItem.recipients.map(r => (
                      <p key={r} className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{r}</p>
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{viewItem.description}</p>
                </TabsContent>
                <TabsContent value="sections" className="mt-4">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>Report Sections</p>
                  <ol className="space-y-2">
                    {viewItem.sections.map((s, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold w-5 text-center" style={{ color: 'hsl(var(--brand))' }}>{i + 1}</span>
                        <span className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{s}</span>
                      </li>
                    ))}
                  </ol>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 mt-6">
                <Button size="sm" onClick={() => { setGenerateItem(viewItem); setViewItem(null); }}>
                  <Play size={14} className="mr-1" /> Generate
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditItem({ ...viewItem }); setViewItem(null); }}>
                  <PencilSimple size={14} className="mr-1" /> Edit
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
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Report Template</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {[{ label: 'Name', key: 'name' }, { label: 'Description', key: 'description' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                  <Input value={(editItem as any)[f.key] || ''} onChange={e => setEditItem(prev => prev ? { ...prev, [f.key]: e.target.value } : null)} style={{ borderRadius: 0 }} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                  <select value={editItem.category} onChange={e => setEditItem(prev => prev ? { ...prev, category: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['Security', 'AI Security', 'Vulnerability', 'Red Team', 'Access Control', 'Executive', 'Compliance'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Format</label>
                  <select value={editItem.format} onChange={e => setEditItem(prev => prev ? { ...prev, format: e.target.value as any } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['PDF', 'DOCX', 'XLSX', 'HTML'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Frequency</label>
                  <select value={editItem.frequency} onChange={e => setEditItem(prev => prev ? { ...prev, frequency: e.target.value } : null)}
                    style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                    {['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Per Exercise', 'Manual'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleEdit} style={{ borderRadius: 0 }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader><DialogTitle style={{ color: 'hsl(var(--text-1))' }}>New Report Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[{ label: 'Template Name', key: 'name' }, { label: 'Description', key: 'description' }].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>{f.label}</label>
                <Input value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ borderRadius: 0 }} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Category</label>
                <select value={formData.category} onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['Security', 'AI Security', 'Vulnerability', 'Red Team', 'Access Control', 'Executive', 'Compliance'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Format</label>
                <select value={formData.format} onChange={e => setFormData(prev => ({ ...prev, format: e.target.value as any }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['PDF', 'DOCX', 'XLSX', 'HTML'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(var(--text-2))' }}>Frequency</label>
                <select value={formData.frequency} onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                  style={{ width: '100%', background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', padding: '6px 10px', borderRadius: 0 }}>
                  {['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Per Exercise', 'Manual'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={handleCreate} style={{ borderRadius: 0 }} disabled={!formData.name}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Confirm */}
      <AlertDialog open={!!generateItem} onOpenChange={o => !o && setGenerateItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Generate Report</AlertDialogTitle>
            <AlertDialogDescription>
              Generate <strong>{generateItem?.name}</strong> in {generateItem?.format} format? This will be queued for processing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerate} style={{ background: 'hsl(var(--brand))', borderRadius: 0 }}>
              <Play size={14} className="mr-1" /> Generate Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={o => !o && setDeleteItem(null)}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>? This cannot be undone.
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
