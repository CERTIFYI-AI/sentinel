import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Warning, Globe, EnvelopeSimple, Shield,
  Buildings, Robot, Clock, CalendarBlank, FileText, Users,
  FilePdf, Download, UploadSimple, CurrencyDollar,
  CheckCircle, XCircle, ArrowsClockwise, Plugs,
  ClipboardText, Star, Eye, SealCheck, ChartLine,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import {
  VENDORS, MODELS, VENDOR_ASSESSMENTS, VENDOR_SLAS, TPRM_ISSUES, VENDOR_DOCUMENTS,
  severityColor, statusColor, formatDate,
  type VendorAssessment, type VendorSLA, type TPRMIssue, type VendorDocument,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { toast } from 'sonner';


const Activity = Clock;

// ── helpers ──────────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const color = score >= 80 ? 'hsl(var(--s-ok-tx))' : score >= 60 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))';
  const radius = (size / 2) - 10;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`} fill="none" stroke="hsl(var(--bg-muted))" strokeWidth="10" strokeLinecap="butt" />
        <path d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="butt" strokeDasharray={`${progress} ${circumference}`} />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, textAlign: 'center' }}>
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>/ 100</p>
      </div>
    </div>
  );
}

function dimColor(v: number) {
  if (v >= 80) return 'hsl(var(--s-ok-tx))';
  if (v >= 60) return 'hsl(var(--r-hi-tx))';
  return 'hsl(var(--s-er-tx))';
}

function daysToExpiry(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function assessmentStatusBadge(status: VendorAssessment['status']) {
  const map: Record<VendorAssessment['status'], { bg: string; text: string; label: string }> = {
    draft:                    { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--brand))', label: 'Draft' },
    in_progress:              { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', label: 'In Progress' },
    submitted:                { bg: '#3b82f620', text: '#3b82f6', label: 'Submitted' },
    under_review:             { bg: '#eab30820', text: '#eab308', label: 'Under Review' },
    approved:                 { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', label: 'Approved' },
    approved_with_conditions: { bg: '#84cc1620', text: '#65a30d', label: 'Approved w/ Conditions' },
    rejected:                 { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', label: 'Rejected' },
    expired:                  { bg: '#94a3b820', text: '#64748b', label: 'Expired' },
  };
  return map[status] ?? { bg: '#94a3b820', text: '#64748b', label: status };
}

function slaStatusBadge(status: VendorSLA['status']) {
  const map: Record<VendorSLA['status'], { bg: string; text: string; label: string }> = {
    healthy:  { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', label: 'Healthy' },
    at_risk:  { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', label: 'At Risk' },
    breached: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', label: 'Breached' },
    waived:   { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--brand))', label: 'Waived' },
    retired:  { bg: '#94a3b820', text: '#64748b', label: 'Retired' },
  };
  return map[status] ?? { bg: '#94a3b820', text: '#64748b', label: status };
}

function issueStatusBadge(status: TPRMIssue['status']) {
  const map: Record<TPRMIssue['status'], { bg: string; text: string; label: string }> = {
    open:        { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', label: 'Open' },
    in_progress: { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', label: 'In Progress' },
    mitigated:   { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', label: 'Mitigated' },
    accepted:    { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--brand))', label: 'Accepted' },
    closed:      { bg: '#94a3b820', text: '#64748b', label: 'Closed' },
  };
  return map[status] ?? { bg: '#94a3b820', text: '#64748b', label: status };
}

function docStatusBadge(status: VendorDocument['status']) {
  const map: Record<VendorDocument['status'], { bg: string; text: string; label: string }> = {
    valid:          { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', label: 'Valid' },
    expiring_soon:  { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', label: 'Expiring Soon' },
    expired:        { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', label: 'Expired' },
    requested:      { bg: '#3b82f620', text: '#3b82f6', label: 'Requested' },
    missing:        { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', label: 'Missing' },
  };
  return map[status] ?? { bg: '#94a3b820', text: '#64748b', label: status };
}

function severityBadge(sev: string) {
  if (sev === 'critical') return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', label: 'Critical' };
  if (sev === 'high')     return { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', label: 'High' };
  if (sev === 'medium')   return { bg: '#eab30820', text: '#eab308', label: 'Medium' };
  return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', label: 'Low' };
}

// ── static activity data ──────────────────────────────────────────────────────

interface ActivityEvent {
  ts: string;
  actor: string;
  action: string;
  detail: string;
  type: 'assessment' | 'sla' | 'issue' | 'document' | 'review' | 'contract' | 'risk';
}

function buildActivity(vendorId: string): ActivityEvent[] {
  const base: ActivityEvent[] = [
    { ts: '2026-04-01T14:30:00Z', actor: 'Emma Wilson',   action: 'Updated remediation plan', detail: 'TI-001: EU AI Act Art. 10 data lineage gap', type: 'issue' },
    { ts: '2026-03-26T14:00:00Z', actor: 'James Patel',   action: 'Raised TPRM issue',         detail: 'Critical finding escalated to CISO', type: 'issue' },
    { ts: '2026-03-15T10:00:00Z', actor: 'James Patel',   action: 'SLA measured',              detail: 'Monthly SLA measurement recorded', type: 'sla' },
    { ts: '2026-03-05T10:00:00Z', actor: 'Emma Wilson',   action: 'Assessment approved',        detail: 'AI Governance assessment VA-002 approved with conditions', type: 'assessment' },
    { ts: '2026-02-15T09:00:00Z', actor: 'David Kim',     action: 'Assessment approved',        detail: 'Security assessment VA-001 approved', type: 'assessment' },
    { ts: '2026-02-10T11:00:00Z', actor: 'James Patel',   action: 'Document uploaded',          detail: 'DPA v4 uploaded and marked valid', type: 'document' },
    { ts: '2026-01-28T09:00:00Z', actor: 'Emma Wilson',   action: 'Assessment submitted',       detail: 'AI Governance assessment submitted for review', type: 'assessment' },
    { ts: '2026-01-20T14:00:00Z', actor: 'Emma Wilson',   action: 'Document uploaded',          detail: 'GPT-4o Model Card uploaded', type: 'document' },
    { ts: '2025-12-01T10:00:00Z', actor: 'David Kim',     action: 'Annual review initiated',    detail: 'Vendor scheduled for annual re-assessment Q1 2026', type: 'review' },
    { ts: '2025-09-15T12:00:00Z', actor: 'David Kim',     action: 'Risk linked',               detail: 'Vendor linked to RSK-004 (Supply Chain Risk)', type: 'risk' },
  ];
  void vendorId;
  return base;
}

function activityTypeColor(type: ActivityEvent['type']) {
  const map: Record<ActivityEvent['type'], string> = {
    assessment: 'hsl(var(--brand))', sla: 'hsl(var(--r-hi-tx))', issue: 'hsl(var(--s-er-tx))',
    document: '#3b82f6', review: 'hsl(var(--s-ok-tx))', contract: '#eab308', risk: 'hsl(var(--r-hi-tx))',
  };
  return map[type];
}

// ── sub-processors static data ────────────────────────────────────────────────

interface SubProcessor { name: string; purpose: string; location: string; transfers: string; risk: 'low' | 'medium' | 'high'; }
function subProcessors(): SubProcessor[] {
  return [
    { name: 'AWS (Amazon Web Services)', purpose: 'Cloud infrastructure & data storage', location: 'US East / EU West', transfers: 'SCCs in place', risk: 'low' },
    { name: 'Datadog', purpose: 'Application monitoring & logging', location: 'US (Virginia)', transfers: 'SCCs in place', risk: 'low' },
    { name: 'Snowflake', purpose: 'Data analytics warehouse', location: 'US West', transfers: 'SCCs in place', risk: 'medium' },
    { name: 'Stripe', purpose: 'Payment processing', location: 'US / EU', transfers: 'SCCs + Binding Rules', risk: 'low' },
  ];
}

function spRiskColor(risk: 'low' | 'medium' | 'high') {
  if (risk === 'low')    return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
  if (risk === 'medium') return { bg: 'hsl(var(--r-hi-bg))', text: 'hsl(var(--r-hi-tx))', border: 'hsl(var(--r-hi-br))' };
  return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
}

// ── component ─────────────────────────────────────────────────────────────────

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();
  const [uploadedDoc, setUploadedDoc] = useState(false);

  const vendor = VENDORS.find(v => v.id === id);

  if (!vendor) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--r-hi-tx))' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Vendor not found</p>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Vendor ID &ldquo;{id}&rdquo; does not exist in the registry.</p>
        <Button className="mt-4" onClick={() => navigate('/vendors')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Vendors
        </Button>
      </div>
    );
  }

  const linkedModels   = MODELS.filter(m => vendor.linkedModels.includes(m.id));
  const assessments    = VENDOR_ASSESSMENTS.filter(a => a.vendorId === vendor.id);
  const slas           = VENDOR_SLAS.filter(s => s.vendorId === vendor.id);
  const issues         = TPRM_ISSUES.filter(i => i.vendorId === vendor.id);
  const documents      = VENDOR_DOCUMENTS.filter(d => d.vendorId === vendor.id);
  const activityLog    = buildActivity(vendor.id);
  const subs           = subProcessors();

  const sc          = statusColor(vendor.status);
  const rc          = severityColor(vendor.risk);
  const scoreColor  = vendor.score >= 80 ? 'hsl(var(--s-ok-tx))' : vendor.score >= 60 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))';
  const contractExpiry = '2026-12-31';
  const dte = daysToExpiry(contractExpiry);

  const dimBars = [
    { label: 'Security',     value: vendor.scoreBreakdown.security },
    { label: 'Compliance',   value: vendor.scoreBreakdown.compliance },
    { label: 'Reliability',  value: vendor.scoreBreakdown.reliability },
    { label: 'Data Privacy', value: vendor.scoreBreakdown.dataPrivacy },
  ];

  const openIssues      = issues.filter(i => i.status === 'open' || i.status === 'in_progress');
  const criticalIssues  = issues.filter(i => i.severity === 'critical');
  const breachedSLAs    = slas.filter(s => s.status === 'breached');
  const missingDocs     = documents.filter(d => d.status === 'missing' || d.status === 'expired');

  return (
    <div className="space-y-6">

      {/* Back + Alert Banners */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')} style={{ marginBottom: 12, padding: '4px 8px' }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Vendors
        </Button>

        {vendor.dpaStatus === 'not_signed' && (
          <div style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-tx))', padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Warning size={18} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>DPA Not Signed — Immediate Action Required</p>
              <p className="text-xs" style={{ color: 'hsl(var(--s-er-tx))', opacity: 0.8 }}>GDPR Art. 28 compliance is at risk. Suspend data sharing until DPA is executed.</p>
            </div>
            <Button size="sm" style={{ marginLeft: 'auto', background: 'hsl(var(--s-er-tx))', color: 'white', borderRadius: 0, flexShrink: 0 }} onClick={() => toast.success('DPA initiation email sent to legal')}>Initiate DPA</Button>
          </div>
        )}
        {vendor.dpaStatus === 'pending' && (
          <div style={{ background: 'hsl(var(--r-hi-bg))', border: '1px solid hsl(var(--r-hi-tx))', padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} style={{ color: 'hsl(var(--r-hi-tx))', flexShrink: 0 }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--r-hi-tx))' }}>DPA Pending Signature — Follow up with vendor to expedite execution.</p>
          </div>
        )}
        {dte <= 90 && dte > 0 && (
          <div style={{ background: 'hsl(var(--r-hi-bg))', border: '1px solid hsl(var(--r-hi-tx))', padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarBlank size={18} style={{ color: 'hsl(var(--r-hi-tx))', flexShrink: 0 }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--r-hi-tx))' }}>
              Master contract expires in <strong>{dte} days</strong> ({contractExpiry}) — initiate renewal to avoid disruption.
            </p>
            <Button size="sm" variant="outline" style={{ marginLeft: 'auto', borderRadius: 0, borderColor: 'hsl(var(--r-hi-tx))', color: 'hsl(var(--r-hi-tx))', flexShrink: 0 }} onClick={() => toast.success('Renewal workflow initiated')}>
              Start Renewal
            </Button>
          </div>
        )}
        {breachedSLAs.length > 0 && (
          <div style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-tx))', padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Warning size={18} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
            <p className="text-sm font-medium" style={{ color: 'hsl(var(--s-er-tx))' }}>
              <strong>{breachedSLAs.length} SLA{breachedSLAs.length > 1 ? 's' : ''} currently breached</strong> — immediate escalation required.
            </p>
          </div>
        )}

        <PageHeader 
          title={vendor.name}
          description={`${orgName} · ${vendor.category} · ${vendor.id}`}
          icon={Buildings}
          actions={
            <div className="flex items-center gap-2">
              <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0 }}>{vendor.risk} risk</Badge>
              <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>{vendor.status}</Badge>
              <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => toast.info('Edit vendor form opened')}>Edit</Button>
              <Button size="sm" variant="outline" style={{ borderRadius: 0, borderColor: 'hsl(var(--s-er-tx))', color: 'hsl(var(--s-er-tx))' }} onClick={() => toast.warning('Archive workflow initiated')}>Archive</Button>
            </div>
          }
        />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Vendor Score',       value: `${vendor.score}/100`, color: scoreColor },
          { label: 'Open Issues',        value: openIssues.length,     color: openIssues.length > 0 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))' },
          { label: 'Critical Findings',  value: criticalIssues.length, color: criticalIssues.length > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' },
          { label: 'Breached SLAs',      value: breachedSLAs.length,   color: breachedSLAs.length > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' },
          { label: 'Doc Gaps',           value: missingDocs.length,    color: missingDocs.length > 0 ? 'hsl(var(--s-er-tx))' : 'hsl(var(--s-ok-tx))' },
        ].map(k => (
          <Card key={k.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{k.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview"     style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="assessments"  style={{ borderRadius: 0 }}>Assessments ({assessments.length})</TabsTrigger>
          <TabsTrigger value="sla"          style={{ borderRadius: 0 }}>SLA ({slas.length})</TabsTrigger>
          <TabsTrigger value="issues"       style={{ borderRadius: 0 }}>Issues ({issues.length})</TabsTrigger>
          <TabsTrigger value="documents"    style={{ borderRadius: 0 }}>Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="activity"     style={{ borderRadius: 0 }}>Activity</TabsTrigger>
          <TabsTrigger value="linked"       style={{ borderRadius: 0 }}>Linked Objects</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Overall Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-4">
                <ScoreGauge score={vendor.score} size={160} />
                <Badge style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}40`, borderRadius: 0, fontSize: 12, marginTop: 12 }}>
                  {vendor.score >= 80 ? 'Low Risk' : vendor.score >= 60 ? 'Medium Risk' : 'High Risk'}
                </Badge>
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '2 / 4' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Vendor Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-2))' }}>{vendor.description}</p>
                <div className="grid grid-cols-2 gap-x-8">
                  {[
                    { label: 'Category',       value: vendor.category,                  icon: Buildings },
                    { label: 'Website',        value: vendor.website,                   icon: Globe },
                    { label: 'Contact',        value: vendor.contact,                   icon: EnvelopeSimple },
                    { label: 'Last Review',    value: formatDate(vendor.lastReview),    icon: CalendarBlank },
                    { label: 'DPA Status',     value: vendor.dpaStatus.replace('_', ' '), icon: Shield },
                    { label: 'Linked Models',  value: `${vendor.linkedModels.length} model${vendor.linkedModels.length !== 1 ? 's' : ''}`, icon: Robot },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <r.icon size={14} style={{ color: 'hsl(var(--text-3))', flexShrink: 0 }} />
                      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-xs font-medium ml-auto" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scorecard + Contract */}
          <div className="grid grid-cols-2 gap-4">
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk Dimension Scorecard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dimBars.map(d => {
                  const color = dimColor(d.value);
                  return (
                    <div key={d.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-2))' }}>{d.label}</span>
                        <span className="text-xs font-bold" style={{ color }}>{d.value}/100</span>
                      </div>
                      <div style={{ height: 8, background: 'hsl(var(--bg-muted))' }}>
                        <div style={{ width: `${d.value}%`, height: '100%', background: color, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Contract Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 p-0">
                {[
                  { term: 'Contract Type',  value: 'Enterprise SaaS Agreement' },
                  { term: 'Effective Date', value: '2024-01-01' },
                  { term: 'Expiry Date',    value: contractExpiry },
                  { term: 'Auto-Renewal',   value: '60 days notice required' },
                  { term: 'SLA — Uptime',   value: '99.9% monthly' },
                  { term: 'SLA — Response', value: 'P1: 1h / P2: 4h / P3: 24h' },
                  { term: 'Audit Rights',   value: 'Annual — GDPR Art. 28' },
                  { term: 'Liability Cap',  value: '12 months contract value' },
                ].map((r, i) => (
                  <div key={r.term} className="flex justify-between px-4 py-2" style={{ borderBottom: '1px solid hsl(var(--border))', background: i % 2 === 0 ? 'transparent' : 'hsl(var(--bg-muted) / 0.4)' }}>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.term}</span>
                    <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── ASSESSMENTS ── */}
        <TabsContent value="assessments" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
              {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} on record for {vendor.name}
            </p>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => toast.success('New assessment draft created')}>
              <ClipboardText size={14} className="mr-1" /> New Assessment
            </Button>
          </div>

          {assessments.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ClipboardText size={36} style={{ color: 'hsl(var(--text-3))' }} />
                <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No assessments yet</p>
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>Create an assessment to evaluate this vendor against your risk frameworks.</p>
              </CardContent>
            </Card>
          ) : (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                    <tr>
                      {['ID', 'Type', 'Framework', 'Status', 'Score', 'Findings', 'Owner', 'Due / Approved', 'Recommendation', 'Actions'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map(a => {
                      const sb = assessmentStatusBadge(a.status);
                      const cf = a.criticalFindingsCount > 0;
                      return (
                        <tr key={a.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                          <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{a.id}</td>
                          <td className="p-3">
                            <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{a.assessmentType}</Badge>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.frameworkBasis}</td>
                          <td className="p-3">
                            <Badge style={{ background: sb.bg, color: sb.text, borderRadius: 0, fontSize: 10 }}>{sb.label}</Badge>
                          </td>
                          <td className="p-3">
                            {a.score !== null ? (
                              <span className="text-sm font-bold" style={{ color: a.score >= 80 ? 'hsl(var(--s-ok-tx))' : a.score >= 60 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))' }}>{a.score}</span>
                            ) : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>}
                          </td>
                          <td className="p-3">
                            <span className="text-xs" style={{ color: cf ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-2))' }}>
                              {a.riskFindingsCount} total{cf ? `, ${a.criticalFindingsCount} critical` : ''}
                            </span>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{a.owner}</td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                            {a.approvedAt ? formatDate(a.approvedAt) : formatDate(a.dueDate)}
                          </td>
                          <td className="p-3">
                            {a.recommendation ? (
                              <Badge style={{
                                background: a.recommendation === 'Approve' ? 'hsl(var(--s-ok-bg))' : a.recommendation === 'Reject' ? 'hsl(var(--s-er-bg))' : 'hsl(var(--r-hi-bg))',
                                color: a.recommendation === 'Approve' ? 'hsl(var(--s-ok-tx))' : a.recommendation === 'Reject' ? 'hsl(var(--s-er-tx))' : 'hsl(var(--r-hi-tx))',
                                borderRadius: 0, fontSize: 10
                              }}>{a.recommendation}</Badge>
                            ) : <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Pending</span>}
                          </td>
                          <td className="p-3">
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.info(`Viewing assessment ${a.id}`)}>
                              <Eye size={12} className="mr-1" /> View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── SLA ── */}
        <TabsContent value="sla" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
              {slas.length} SLA obligation{slas.length !== 1 ? 's' : ''} tracked for {vendor.name}
            </p>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => navigate('/vendors/sla')}>
              <ArrowSquareOut size={14} className="mr-1" /> SLA Monitor
            </Button>
          </div>

          {slas.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Star size={36} style={{ color: 'hsl(var(--text-3))' }} />
                <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No SLAs defined</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {breachedSLAs.length > 0 && (
                <div style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-tx))', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Warning size={16} style={{ color: 'hsl(var(--s-er-tx))', flexShrink: 0 }} />
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>
                    {breachedSLAs.length} SLA{breachedSLAs.length > 1 ? 's' : ''} currently in breach: {breachedSLAs.map(s => s.serviceName).join(', ')}
                  </p>
                </div>
              )}
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                      <tr>
                        {['Service', 'Type', 'Target', 'Current', 'Status', 'Owner', 'Last Measured', 'Escalation', 'Actions'].map(h => (
                          <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slas.map(s => {
                        const sb = slaStatusBadge(s.status);
                        const isBreached = s.status === 'breached';
                        return (
                          <tr key={s.id} style={{ borderTop: '1px solid hsl(var(--border))', background: isBreached ? 'hsl(var(--s-er-bg))' : 'transparent' }}>
                            <td className="p-3">
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{s.serviceName}</p>
                              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{s.id}</p>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{s.slaType}</Badge>
                            </td>
                            <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{s.target}</td>
                            <td className="p-3 text-xs font-bold" style={{ color: isBreached ? 'hsl(var(--s-er-tx))' : s.status === 'at_risk' ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-ok-tx))' }}>
                              {s.currentPerformance}
                            </td>
                            <td className="p-3">
                              <Badge style={{ background: sb.bg, color: sb.text, borderRadius: 0, fontSize: 10 }}>{sb.label}</Badge>
                            </td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s.owner}</td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(s.lastMeasuredAt)}</td>
                            <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(s.escalationPath ?? '').split('→')[0].trim()} →
                            </td>
                            <td className="p-3">
                              <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.info(`Viewing SLA ${s.id}`)}>
                                <Eye size={12} className="mr-1" /> View
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── ISSUES ── */}
        <TabsContent value="issues" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
              {openIssues.length} open · {issues.filter(i => i.status === 'mitigated' || i.status === 'closed').length} resolved
            </p>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => toast.success('New TPRM issue created')}>
              <Warning size={14} className="mr-1" /> Raise Issue
            </Button>
          </div>

          {issues.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle size={36} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-2))' }}>No open issues</p>
              </CardContent>
            </Card>
          ) : (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full">
                  <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                    <tr>
                      {['ID', 'Title', 'Source', 'Severity', 'Status', 'Owner', 'Due Date', 'Remediation Plan', 'Actions'].map(h => (
                        <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map(i => {
                      const sev = severityBadge(i.severity);
                      const ist = issueStatusBadge(i.status);
                      const overdue = new Date(i.dueDate) < new Date() && (i.status === 'open' || i.status === 'in_progress');
                      return (
                        <tr key={i.id} style={{ borderTop: '1px solid hsl(var(--border))', background: i.severity === 'critical' && i.status === 'open' ? 'hsl(var(--s-er-bg))' : 'transparent' }}>
                          <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{i.id}</td>
                          <td className="p-3" style={{ maxWidth: 200 }}>
                            <p className="text-sm font-medium leading-tight" style={{ color: 'hsl(var(--text-1))' }}>{i.title}</p>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{i.sourceType}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge style={{ background: sev.bg, color: sev.text, borderRadius: 0, fontSize: 10 }}>{sev.label}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge style={{ background: ist.bg, color: ist.text, borderRadius: 0, fontSize: 10 }}>{ist.label}</Badge>
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{i.owner}</td>
                          <td className="p-3 text-xs" style={{ color: overdue ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>
                            {formatDate(i.dueDate)}{overdue ? ' ⚠' : ''}
                          </td>
                          <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {i.remediationPlan.substring(0, 60)}…
                          </td>
                          <td className="p-3">
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.info(`Viewing issue ${i.id}`)}>
                              <Eye size={12} className="mr-1" /> View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── DOCUMENTS ── */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
              {documents.filter(d => d.status === 'valid').length} valid · {missingDocs.length} gaps requiring attention
            </p>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => { setUploadedDoc(true); toast.success('Document uploaded'); }}>
              <UploadSimple size={14} className="mr-1" /> Upload Document
            </Button>
          </div>

          {missingDocs.length > 0 && (
            <div style={{ background: 'hsl(var(--s-er-bg))', border: '1px solid hsl(var(--s-er-tx))', padding: '10px 16px' }}>
              <p className="text-sm font-semibold" style={{ color: 'hsl(var(--s-er-tx))' }}>
                {missingDocs.length} document gap{missingDocs.length > 1 ? 's' : ''}: {missingDocs.map(d => d.type).join(', ')}
              </p>
            </div>
          )}

          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                  <tr>
                    {['Document', 'Type', 'Status', 'Owner', 'Uploaded', 'Expires', 'Actions'].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, idx) => {
                    const ds = docStatusBadge(doc.status);
                    const isExpiring = doc.status === 'expiring_soon' || doc.status === 'expired';
                    return (
                      <tr key={doc.id} style={{ borderTop: '1px solid hsl(var(--border))', background: (idx % 2 === 1) ? 'hsl(var(--bg-muted) / 0.4)' : 'transparent' }}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FilePdf size={16} style={{ color: isExpiring ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))', flexShrink: 0 }} />
                            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{doc.fileName}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{doc.type}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge style={{ background: ds.bg, color: ds.text, borderRadius: 0, fontSize: 10 }}>{ds.label}</Badge>
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{doc.owner}</td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{doc.uploadedAt ? formatDate(doc.uploadedAt) : '—'}</td>
                        <td className="p-3 text-xs" style={{ color: isExpiring ? 'hsl(var(--s-er-tx))' : 'hsl(var(--text-3))' }}>
                          {doc.expiresAt ? formatDate(doc.expiresAt) : '—'}
                        </td>
                        <td className="p-3">
                          {doc.status === 'valid' || doc.status === 'expiring_soon' ? (
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.success(`Downloading ${doc.type}`)}>
                              <Download size={12} className="mr-1" /> Download
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.info(`Request sent for ${doc.type}`)}>
                              <UploadSimple size={12} className="mr-1" /> Request
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {uploadedDoc && (
                    <tr style={{ borderTop: '1px solid hsl(var(--border))' }}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{vendor.name} — Uploaded Document</span>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>Custom</Badge></td>
                      <td className="p-3"><Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', borderRadius: 0, fontSize: 10 }}>Valid</Badge></td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>You</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{new Date().toISOString().split('T')[0]}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>—</td>
                      <td className="p-3">
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }}>
                          <Download size={12} className="mr-1" /> Download
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACTIVITY ── */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>Immutable audit trail of all vendor-related activity</p>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => toast.info('Activity log exported')}>
              <Download size={14} className="mr-1" /> Export Log
            </Button>
          </div>

          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4">
              <div className="relative">
                <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: 'hsl(var(--border))' }} />
                <div className="space-y-4">
                  {activityLog.map((evt, idx) => {
                    const color = activityTypeColor(evt.type);
                    return (
                      <div key={idx} className="flex gap-4 relative">
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}20`, border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                          <Activity size={12} style={{ color }} />
                        </div>
                        <div className="flex-1 pb-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{evt.action}</p>
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{new Date(evt.ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{evt.detail}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>by {evt.actor}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LINKED OBJECTS ── */}
        <TabsContent value="linked" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">

            {/* Linked Models */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  <div className="flex items-center gap-2"><Robot size={14} /> Linked AI Models ({linkedModels.length})</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {linkedModels.length === 0 ? (
                  <p className="px-4 pb-4 text-xs" style={{ color: 'hsl(var(--text-4))' }}>No linked models.</p>
                ) : linkedModels.map((m, i) => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : undefined }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{m.type} · {m.status} · Risk: {m.riskTier}</p>
                    </div>
                    <Button size="sm" variant="ghost" style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: 11 }} onClick={() => navigate(`/models/inventory/${m.id}`)}>
                      <ArrowSquareOut size={12} />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Linked Assessments */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  <div className="flex items-center gap-2"><ClipboardText size={14} /> Assessments ({assessments.length})</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {assessments.length === 0 ? (
                  <p className="px-4 pb-4 text-xs" style={{ color: 'hsl(var(--text-4))' }}>No assessments.</p>
                ) : assessments.slice(0, 4).map((a, i) => {
                  const sb = assessmentStatusBadge(a.status);
                  return (
                    <div key={a.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : undefined }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{a.assessmentType} — {a.frameworkBasis}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{a.id} · {a.owner}</p>
                      </div>
                      <Badge style={{ background: sb.bg, color: sb.text, borderRadius: 0, fontSize: 10, flexShrink: 0 }}>{sb.label}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Sub-processors */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                    <div className="flex items-center gap-2"><Users size={14} /> Sub-processors ({subs.length})</div>
                  </CardTitle>
                  <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>Last updated 2026-03-01</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {subs.map((sp, i) => {
                  const rc = spRiskColor(sp.risk);
                  return (
                    <div key={i} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : undefined }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{sp.name}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{sp.purpose} · {sp.location} · {sp.transfers}</p>
                      </div>
                      <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0, fontSize: 10, flexShrink: 0 }}>{sp.risk}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Open Issues summary */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  <div className="flex items-center gap-2"><Warning size={14} /> Open Issues ({openIssues.length})</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {openIssues.length === 0 ? (
                  <div className="px-4 pb-4 flex items-center gap-2">
                    <CheckCircle size={16} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                    <p className="text-xs" style={{ color: 'hsl(var(--s-ok-tx))' }}>No open issues — vendor is in good standing.</p>
                  </div>
                ) : openIssues.slice(0, 4).map((iss, i) => {
                  const sev = severityBadge(iss.severity);
                  return (
                    <div key={iss.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : undefined }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{iss.title}</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{iss.id} · Due {formatDate(iss.dueDate)}</p>
                      </div>
                      <Badge style={{ background: sev.bg, color: sev.text, borderRadius: 0, fontSize: 10, flexShrink: 0 }}>{sev.label}</Badge>
                    </div>
                  );
                })}
                {openIssues.length > 4 && (
                  <p className="px-4 py-2 text-xs" style={{ color: 'hsl(var(--text-4))', borderTop: '1px solid hsl(var(--border))' }}>
                    + {openIssues.length - 4} more — view the Issues tab for all findings
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Integrations / linked policies / controls placeholder */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '1 / 3' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                  <div className="flex items-center gap-2"><Plugs size={14} /> Related Governance Objects</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Linked Risks',     count: 2, icon: Warning,      color: 'hsl(var(--r-hi-tx))', route: '/risks' },
                    { label: 'Linked Controls',  count: 4, icon: SealCheck,    color: 'hsl(var(--brand))', route: '/compliance/controls' },
                    { label: 'Linked Policies',  count: 3, icon: ClipboardText,color: '#3b82f6', route: '/policies' },
                    { label: 'Linked Incidents', count: 1, icon: XCircle,      color: 'hsl(var(--s-er-tx))', route: '/risk/incidents' },
                  ].map(obj => (
                    <button
                      key={obj.label}
                      onClick={() => navigate(obj.route)}
                      className="flex flex-col items-center justify-center py-4 gap-2 transition-colors hover:bg-raised"
                      style={{ border: '1px solid hsl(var(--border))' }}
                    >
                      <obj.icon size={22} style={{ color: obj.color }} />
                      <span className="text-2xl font-bold" style={{ color: obj.color }}>{obj.count}</span>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{obj.label}</span>
                      <ArrowsClockwise size={12} style={{ color: 'hsl(var(--text-4))' }} />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
