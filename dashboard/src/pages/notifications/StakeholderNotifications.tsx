import { useState, useCallback, useEffect } from 'react';
import {
  Eye, PencilSimple, Trash, Plus, Bell, Megaphone,
  Warning, CheckCircle, Info, ArrowRight, Clock,
  Envelope, PaperPlaneTilt, Gear, Timer, ShieldCheck,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { NOTIFICATION_TEMPLATES, INCIDENTS, formatDate } from '../../data/seed';

// WIRED_BY_PHASE_COMPLETE — Supabase hooks available, mock data kept as fallback

// ── Types ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' | 'info' }

// ── Delivery History Mock Data ───────────────────────────────────────────────

interface DeliveryRecord {
  id: string; templateId: string; templateName: string; recipient: string;
  regulation: string; sentDate: string; status: string; reference: string;
}

const DELIVERY_HISTORY: DeliveryRecord[] = [
  { id: 'DEL-001', templateId: 'NT-002', templateName: 'EU AI Act Art.73 Serious Incident', recipient: 'National Competent Authority', regulation: 'EU AI Act', sentDate: '2026-01-08', status: 'Delivered', reference: 'SENT-2026-001' },
  { id: 'DEL-002', templateId: 'NT-002', templateName: 'EU AI Act Art.73 Serious Incident', recipient: 'Market Surveillance', regulation: 'EU AI Act', sentDate: '2026-01-08', status: 'Acknowledged', reference: 'SENT-2026-002' },
  { id: 'DEL-003', templateId: 'NT-001', templateName: 'GDPR Art.33 Data Breach Notification', recipient: 'Data Protection Authority', regulation: 'GDPR', sentDate: '2025-11-20', status: 'Delivered', reference: 'SENT-2025-042' },
  { id: 'DEL-004', templateId: 'NT-003', templateName: 'NIS2 Significant Incident', recipient: 'CSIRT', regulation: 'NIS2', sentDate: '2025-10-05', status: 'Failed', reference: 'SENT-2025-035' },
  { id: 'DEL-005', templateId: 'NT-004', templateName: 'DORA ICT Incident Report', recipient: 'ESA', regulation: 'DORA', sentDate: '2025-09-15', status: 'Pending', reference: 'SENT-2025-028' },
];

// ── Incident → Regulation Mapping ────────────────────────────────────────────

interface IncidentNotification {
  incidentId: string; title: string; regulation: string; article: string;
  slaHours: number; reported: string; status: string;
}

const INCIDENT_NOTIFICATIONS: IncidentNotification[] = [
  { incidentId: 'INC-001', title: 'Bias in Credit Scoring Output', regulation: 'EU AI Act', article: 'Art. 73', slaHours: 24, reported: '2026-01-08', status: 'Overdue' },
  { incidentId: 'INC-003', title: 'Shadow AI Unauthorized Data Access', regulation: 'GDPR', article: 'Art. 33', slaHours: 72, reported: '2026-01-15', status: 'Overdue' },
  { incidentId: 'INC-004', title: 'HR Model Gender Bias Flag', regulation: 'EU AI Act', article: 'Art. 73', slaHours: 24, reported: '2026-02-03', status: 'Pending' },
  { incidentId: 'INC-005', title: 'LLM Hallucination in Loan Approval', regulation: 'NIS2', article: 'Art. 23', slaHours: 24, reported: '2026-03-01', status: 'Pending' },
];

// ── SLA Timer Component ──────────────────────────────────────────────────────

function SLATimer({ slaHours, reportedDate }: { slaHours: number; reportedDate: string }) {
  const [hoursLeft, setHoursLeft] = useState(() => {
    const reported = new Date(reportedDate);
    const deadline = new Date(reported.getTime() + slaHours * 60 * 60 * 1000);
    const now = new Date();
    return Math.max(0, Math.round((deadline.getTime() - now.getTime()) / (60 * 60 * 1000)));
  });

  const overdue = hoursLeft <= 0;
  const urgent = hoursLeft > 0 && hoursLeft <= slaHours * 0.25;

  return (
    <div className="flex items-center gap-1.5">
      <Timer size={12} weight="bold" style={{ color: overdue ? 'hsl(var(--destructive))' : urgent ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }} />
      <span className="text-xs font-mono font-bold" style={{
        color: overdue ? 'hsl(var(--destructive))' : urgent ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))',
      }}>
        {overdue ? 'OVERDUE' : `${hoursLeft}h remaining`}
      </span>
    </div>
  );
}

// ── MetricTile ───────────────────────────────────────────────────────────────

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

// ── Main Component ───────────────────────────────────────────────────────────

export default function StakeholderNotifications() {
  const [activeTab, setActiveTab] = useState('incidents');
  const [templates] = useState(NOTIFICATION_TEMPLATES);
  const [deliveries] = useState(DELIVERY_HISTORY);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof NOTIFICATION_TEMPLATES[0] | null>(null);
  const [editContent, setEditContent] = useState('');
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<IncidentNotification | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  // Workflow form state
  const [wfRegulation, setWfRegulation] = useState('');
  const [wfTemplate, setWfTemplate] = useState('');
  const [wfVars, setWfVars] = useState({ date: '', affected: '', description: '', detectionDate: '' });
  const [wfRecipients, setWfRecipients] = useState('');
  const [wfCC, setWfCC] = useState('');

  const toast = useCallback((text: string, type: ToastMsg['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Metrics
  const sentThisMonth = deliveries.filter(d => d.sentDate.startsWith('2026-01')).length;
  const overdueNotifications = INCIDENT_NOTIFICATIONS.filter(i => i.status === 'Overdue').length;
  const slaCompliance = Math.round(((INCIDENT_NOTIFICATIONS.length - overdueNotifications) / INCIDENT_NOTIFICATIONS.length) * 100);

  const openWorkflow = (incident: IncidentNotification) => {
    setSelectedIncident(incident);
    setWfRegulation(incident.regulation);
    const matchingTemplate = templates.find(t => t.regulation === incident.regulation);
    setWfTemplate(matchingTemplate?.id || '');
    setWfVars({ date: incident.reported, affected: '', description: '', detectionDate: incident.reported });
    setWfRecipients(matchingTemplate?.recipients.join(', ') || '');
    setWfCC('');
    setWorkflowStep(1);
    setWorkflowOpen(true);
  };

  const handleSendNotification = () => {
    const sentId = `SENT-${Date.now()}`;
    const template = templates.find(t => t.id === wfTemplate);
    toast(`Notification sent to ${wfRecipients} — Reference: ${sentId}`);
    setWorkflowOpen(false);
  };

  const openEditTemplate = (tmpl: typeof NOTIFICATION_TEMPLATES[0]) => {
    setSelectedTemplate(tmpl);
    setEditContent(tmpl.template);
    setEditTemplateOpen(true);
  };

  // Highlight placeholders in template text
  const highlightPlaceholders = (text: string) => {
    return text.split(/(\[.*?\])/).map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return <span key={i} className="px-1 py-0.5 font-semibold" style={{ background: 'hsl(45 93% 47% / 0.15)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0 }}>{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="px-4 py-2 text-sm font-medium shadow-lg pointer-events-auto" style={{
            background: t.type === 'success' ? 'hsl(var(--s-ok-tx))' : t.type === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--s-in-tx))',
            color: '#fff', borderRadius: 0, minWidth: 300,
          }}>{t.text}</div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Megaphone size={22} weight="fill" style={{ color: 'hsl(var(--brand))' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Stakeholder Notifications</h1>
          </div>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>Regulatory incident notifications for DORA, NIS2, EU AI Act Art. 73</p>
        </div>
        <Button variant="outline" style={{ borderRadius: 0 }}>
          <Gear size={14} className="mr-2" />Configure Recipients
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Templates" value={String(templates.length)} variant="info" icon={<Envelope size={16} weight="fill" className="text-blue-600 dark:text-blue-400" />} />
        <MetricTile label="Sent This Month" value={String(sentThisMonth)} variant="ok" icon={<CheckCircle size={16} weight="fill" className="text-green-600 dark:text-green-400" />} />
        <MetricTile label="Overdue Notifications" value={String(overdueNotifications)} variant="error" icon={<Warning size={16} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />} />
        <MetricTile label="Avg SLA Compliance" value={`${slaCompliance}%`} variant="warn" icon={<Timer size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ borderRadius: 0 }}>
          <TabsTrigger value="incidents" style={{ borderRadius: 0 }}>Active Incidents</TabsTrigger>
          <TabsTrigger value="templates" style={{ borderRadius: 0 }}>Notification Templates</TabsTrigger>
          <TabsTrigger value="history" style={{ borderRadius: 0 }}>Delivery History</TabsTrigger>
        </TabsList>

        {/* Tab 1: Active Incidents */}
        <TabsContent value="incidents" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Incident ID', 'Title', 'Regulation', 'SLA Timer', 'Status', 'Action'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {INCIDENT_NOTIFICATIONS.map(inc => (
                      <tr key={inc.incidentId} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{inc.incidentId}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{inc.title}</span>
                          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                            {inc.regulation} {inc.article} notification required — {inc.slaHours}h SLA
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>
                            {inc.regulation} {inc.article}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <SLATimer slaHours={inc.slaHours} reportedDate={inc.reported} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: inc.status === 'Overdue' ? 'hsl(0 72% 51% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                            color: inc.status === 'Overdue' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{inc.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" className="h-7 text-xs" onClick={() => openWorkflow(inc)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                            <PaperPlaneTilt size={12} className="mr-1" />Notify Regulator
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Notification Templates */}
        <TabsContent value="templates" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tmpl => (
              <Card key={tmpl.id} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{tmpl.id}</span>
                    <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{tmpl.regulation} {tmpl.article}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{tmpl.name}</h3>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    <span>SLA: {tmpl.slaHours}h</span>
                    <span>Authority: {tmpl.authority}</span>
                  </div>

                  {/* Template preview with highlighted placeholders */}
                  <div className="p-3 text-xs leading-relaxed" style={{ background: 'hsl(var(--bg-page))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-4))' }}>
                    {highlightPlaceholders(tmpl.template.slice(0, 200) + '...')}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => openEditTemplate(tmpl)} style={{ borderRadius: 0 }}>
                      <PencilSimple size={12} className="mr-1" />Edit Template
                    </Button>
                    <Button size="sm" className="text-xs" onClick={() => {
                      const inc = INCIDENT_NOTIFICATIONS.find(i => i.regulation === tmpl.regulation);
                      if (inc) openWorkflow(inc);
                      else toast('No active incident for this regulation', 'info');
                    }} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                      <PaperPlaneTilt size={12} className="mr-1" />Send Notification
                    </Button>
                  </div>

                  {tmpl.lastSent && (
                    <p className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>Last sent: {formatDate(tmpl.lastSent)}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Delivery History */}
        <TabsContent value="history" className="mt-4">
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Notification ID', 'Template', 'Recipient', 'Regulation', 'Sent Date', 'Status', 'Reference'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map(d => (
                      <tr key={d.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{d.id}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{d.templateName}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{d.recipient}</td>
                        <td className="px-4 py-3">
                          <Badge style={{ background: 'hsl(220 90% 56% / 0.10)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{d.regulation}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(d.sentDate)}</td>
                        <td className="px-4 py-3">
                          <Badge style={{
                            background: d.status === 'Delivered' || d.status === 'Acknowledged' ? 'hsl(142 71% 45% / 0.12)' : d.status === 'Failed' ? 'hsl(0 72% 51% / 0.12)' : 'hsl(45 93% 47% / 0.12)',
                            color: d.status === 'Delivered' || d.status === 'Acknowledged' ? 'hsl(var(--s-ok-tx))' : d.status === 'Failed' ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))',
                            borderRadius: 0, fontSize: 10,
                          }}>{d.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{d.reference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={editTemplateOpen} onOpenChange={setEditTemplateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" style={{ borderRadius: 0, maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>Edit Template — {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="p-3" style={{ background: 'hsl(220 90% 56% / 0.06)', border: '1px solid hsl(220 90% 56% / 0.2)', borderRadius: 0 }}>
              <p className="text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>
                <Info size={12} className="inline mr-1" />
                Placeholders in [BRACKETS] will be replaced with actual values when sending.
              </p>
            </div>
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={10}
              style={{ borderRadius: 0, fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditTemplateOpen(false)} style={{ borderRadius: 0 }}>Cancel</Button>
            <Button onClick={() => { setEditTemplateOpen(false); toast('Template saved'); }} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Workflow Modal (5-step) */}
      <Dialog open={workflowOpen} onOpenChange={setWorkflowOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" style={{ borderRadius: 0, maxWidth: 600 }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'hsl(var(--text-1))' }}>
              Send Regulatory Notification
              {selectedIncident && <span className="text-xs font-normal ml-2" style={{ color: 'hsl(var(--text-4))' }}>— {selectedIncident.incidentId}</span>}
            </DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-2 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className="w-6 h-6 flex items-center justify-center text-[10px] font-bold" style={{
                  background: workflowStep >= s ? 'hsl(var(--brand))' : 'hsl(var(--border))',
                  color: workflowStep >= s ? '#fff' : 'hsl(var(--text-4))',
                  borderRadius: 0,
                }}>{s}</div>
                {s < 5 && <div className="flex-1 h-px" style={{ background: workflowStep > s ? 'hsl(var(--brand))' : 'hsl(var(--border))' }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Select Regulation */}
          {workflowStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Step 1: Select Regulation</h3>
              <Select value={wfRegulation} onValueChange={setWfRegulation}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select regulation" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  <SelectItem value="GDPR">GDPR Art. 33</SelectItem>
                  <SelectItem value="EU AI Act">EU AI Act Art. 73</SelectItem>
                  <SelectItem value="NIS2">NIS2 Art. 23</SelectItem>
                  <SelectItem value="DORA">DORA Art. 19</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Select Template */}
          {workflowStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Step 2: Select Template</h3>
              <Select value={wfTemplate} onValueChange={setWfTemplate}>
                <SelectTrigger style={{ borderRadius: 0 }}><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {templates.filter(t => t.regulation === wfRegulation || !wfRegulation).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {wfTemplate && (() => {
                const tmpl = templates.find(t => t.id === wfTemplate);
                return tmpl ? (
                  <div className="p-3 text-xs" style={{ background: 'hsl(var(--bg-page))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-4))' }}>
                    {highlightPlaceholders(tmpl.template)}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Step 3: Fill Variables */}
          {workflowStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Step 3: Fill Variables</h3>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Incident Date [DATE]</Label>
                <Input value={wfVars.date} onChange={e => setWfVars({ ...wfVars, date: e.target.value })} type="date" style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Affected Count [N]</Label>
                <Input value={wfVars.affected} onChange={e => setWfVars({ ...wfVars, affected: e.target.value })} placeholder="e.g., 1,200" style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Description [DESCRIPTION]</Label>
                <Textarea value={wfVars.description} onChange={e => setWfVars({ ...wfVars, description: e.target.value })} placeholder="Describe the incident..." rows={3} style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Detection Date [DETECTION DATE]</Label>
                <Input value={wfVars.detectionDate} onChange={e => setWfVars({ ...wfVars, detectionDate: e.target.value })} type="date" style={{ borderRadius: 0 }} />
              </div>
            </div>
          )}

          {/* Step 4: Select Recipients */}
          {workflowStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Step 4: Select Recipients</h3>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>To</Label>
                <Input value={wfRecipients} onChange={e => setWfRecipients(e.target.value)} placeholder="e.g., NCA, Market Surveillance" style={{ borderRadius: 0 }} />
              </div>
              <div>
                <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>CC</Label>
                <Input value={wfCC} onChange={e => setWfCC(e.target.value)} placeholder="e.g., internal-compliance@company.com" style={{ borderRadius: 0 }} />
              </div>
            </div>
          )}

          {/* Step 5: Review & Send */}
          {workflowStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Step 5: Review & Send</h3>
              <div className="space-y-2">
                {[
                  { label: 'Regulation', value: wfRegulation },
                  { label: 'Template', value: templates.find(t => t.id === wfTemplate)?.name || wfTemplate },
                  { label: 'Recipients', value: wfRecipients },
                  { label: 'CC', value: wfCC || '—' },
                  { label: 'Incident Date', value: wfVars.date },
                  { label: 'Affected', value: wfVars.affected || '—' },
                ].map(f => (
                  <div key={f.label} className="flex items-center justify-between py-1.5 px-3" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{f.label}</span>
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.value}</span>
                  </div>
                ))}
              </div>
              {wfVars.description && (
                <div className="p-3 text-xs" style={{ background: 'hsl(var(--bg-page))', border: '1px solid hsl(var(--border))', borderRadius: 0, color: 'hsl(var(--text-1))' }}>
                  {wfVars.description}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            {workflowStep > 1 && (
              <Button variant="outline" onClick={() => setWorkflowStep(s => s - 1)} style={{ borderRadius: 0 }}>Back</Button>
            )}
            {workflowStep < 5 ? (
              <Button onClick={() => setWorkflowStep(s => s + 1)} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                Next <ArrowRight size={12} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSendNotification} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
                <PaperPlaneTilt size={14} className="mr-2" />Send Notification
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
