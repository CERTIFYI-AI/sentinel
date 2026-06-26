import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Warning, FileText, CheckCircle, Clock, User, CalendarBlank,
  Shield, Tag, ClockCounterClockwise, Scales, PencilSimple, FloppyDisk, X,
  ClipboardText, Paperclip, MagnifyingGlass,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
  POLICIES, CONTROLS, EVIDENCE, AUDIT_LOG, GAPS, FRAMEWORKS,
  statusColor, formatDate, Policy,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Per-policy extended metadata ──────────────────────────────────────────────

const POLICY_VERSIONS: Record<string, { version: string; date: string; author: string; summary: string; status: string }[]> = {
  'POL-001': [
    { version: 'v2.1', date: '2026-01-20', author: 'James Patel', summary: 'Added shadow AI detection requirements. Updated LLM usage guidelines.', status: 'current' },
    { version: 'v2.0', date: '2025-07-15', author: 'James Patel', summary: 'Major revision: aligned with ISO/IEC 42001. Added agent governance section.', status: 'superseded' },
    { version: 'v1.2', date: '2025-01-10', author: 'Emma Wilson', summary: 'Updated to reflect expanded AI use cases in lending and HR.', status: 'superseded' },
    { version: 'v1.0', date: '2024-06-01', author: 'Sarah Chen', summary: 'Initial policy publication.', status: 'superseded' },
  ],
  'POL-002': [
    { version: 'v1.3', date: '2026-02-15', author: 'Raj Gupta', summary: 'Added LLM-specific validation requirements. Updated bias testing cadence.', status: 'current' },
    { version: 'v1.2', date: '2025-09-01', author: 'Raj Gupta', summary: 'Aligned with NIST AI RMF 1.0 framework updates.', status: 'superseded' },
    { version: 'v1.0', date: '2025-02-20', author: 'Maria Santos', summary: 'Initial model risk management policy.', status: 'superseded' },
  ],
  'POL-003': [
    { version: 'v2.0', date: '2026-01-10', author: 'James Patel', summary: 'Full rewrite for GDPR Art. 22 automated decision-making compliance.', status: 'current' },
    { version: 'v1.1', date: '2025-06-01', author: 'Emma Wilson', summary: 'Added consent tracking requirements.', status: 'superseded' },
    { version: 'v1.0', date: '2024-09-15', author: 'James Patel', summary: 'Initial data privacy for AI policy.', status: 'superseded' },
  ],
};

const DEFAULT_VERSIONS = (p: Policy) => [
  { version: p.version, date: p.lastReview || p.nextReview, author: p.owner, summary: `Current published version of ${p.title}.`, status: 'current' },
  { version: `v${(parseFloat(p.version.slice(1)) - 0.1).toFixed(1)}`, date: '2025-09-01', author: p.owner, summary: 'Previous revision — minor updates and clarifications.', status: 'superseded' },
  { version: `v${(parseFloat(p.version.slice(1)) - 0.3).toFixed(1)}`, date: '2025-03-01', author: p.approver || p.owner, summary: 'Original published version.', status: 'superseded' },
];

const POLICY_APPROVALS: Record<string, { stage: string; approver: string; role: string; status: string; date: string | null; comment: string }[]> = {
  'POL-001': [
    { stage: 'Legal Review', approver: 'Emma Wilson', role: 'General Counsel', status: 'approved', date: '2026-01-18', comment: 'Policy compliant with GDPR and EU AI Act obligations.' },
    { stage: 'Risk Committee', approver: 'Raj Gupta', role: 'Chief Risk Officer', status: 'approved', date: '2026-01-19', comment: 'Acceptable use boundaries clearly defined.' },
    { stage: 'CISO Approval', approver: 'Sarah Chen', role: 'Chief Information Security Officer', status: 'approved', date: '2026-01-20', comment: 'Security controls adequate. Approved.' },
    { stage: 'Board Notification', approver: 'CEO Office', role: 'Board Secretary', status: 'approved', date: '2026-01-21', comment: 'Noted for board record.' },
  ],
  'POL-005': [
    { stage: 'Legal Review', approver: 'Emma Wilson', role: 'General Counsel', status: 'in_review', date: null, comment: 'Pending external counsel input on Art. 6 classification.' },
    { stage: 'Risk Committee', approver: 'Raj Gupta', role: 'Chief Risk Officer', status: 'pending', date: null, comment: '' },
    { stage: 'CISO Approval', approver: 'Sarah Chen', role: 'CISO', status: 'pending', date: null, comment: '' },
  ],
  'POL-008': [
    { stage: 'Legal Review', approver: 'Emma Wilson', role: 'General Counsel', status: 'pending', date: null, comment: 'Draft not yet submitted for review.' },
    { stage: 'CISO Approval', approver: 'Sarah Chen', role: 'CISO', status: 'pending', date: null, comment: '' },
  ],
};

const DEFAULT_APPROVALS = (p: Policy) => {
  const isDraft = p.status === 'draft';
  const isInReview = p.status === 'in_review';
  return [
    { stage: 'Legal Review', approver: p.approver || p.owner, role: 'Legal Counsel', status: isDraft ? 'pending' : isInReview ? 'in_review' : 'approved', date: isDraft ? null : p.lastReview || null, comment: isDraft ? '' : 'Policy reviewed and cleared for approval.' },
    { stage: 'Risk Sign-off', approver: 'Raj Gupta', role: 'Chief Risk Officer', status: isDraft ? 'pending' : isInReview ? 'pending' : 'approved', date: isDraft || isInReview ? null : p.lastReview || null, comment: isDraft || isInReview ? '' : 'Risk implications reviewed and approved.' },
    { stage: 'CISO Approval', approver: 'Sarah Chen', role: 'CISO', status: isDraft ? 'pending' : isInReview ? 'pending' : 'approved', date: isDraft || isInReview ? null : p.lastReview || null, comment: isDraft || isInReview ? '' : 'Approved.' },
  ];
};

// ── Status helpers ────────────────────────────────────────────────────────────

function policyStatusColor(status: string) {
  switch (status) {
    case 'published': return { bg: '#10b98115', text: '#10b981', border: '#10b98130' };
    case 'in_review': return { bg: '#f9731615', text: '#f97316', border: '#f9731630' };
    case 'draft': return { bg: '#6b728015', text: '#6b7280', border: '#6b728030' };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))' };
  }
}

function approvalStatusColor(status: string) {
  switch (status) {
    case 'approved': return { bg: '#10b98115', text: '#10b981', border: '#10b98130', icon: CheckCircle };
    case 'in_review': return { bg: '#f9731615', text: '#f97316', border: '#f9731630', icon: MagnifyingGlass };
    case 'pending': return { bg: '#6b728015', text: '#6b7280', border: '#6b728030', icon: Clock };
    default: return { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))', icon: Clock };
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const policy = POLICIES.find(p => p.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<Partial<Policy>>({});

  if (!policy) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, }}>
        <Warning size={48} style={{ color: '#f97316' }} />
        <p style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: 'hsl(var(--text-1))' }}>Policy not found</p>
        <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', marginTop: 4 }}>Policy ID "{id}" does not exist.</p>
        <Button style={{ marginTop: 16, borderRadius: 0 }} onClick={() => navigate('/policies')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to Policies
        </Button>
      </div>
    );
  }

  const sc = policyStatusColor(policy.status);
  const versions = POLICY_VERSIONS[policy.id] || DEFAULT_VERSIONS(policy);
  const approvals = POLICY_APPROVALS[policy.id] || DEFAULT_APPROVALS(policy);

  const FRAMEWORK_MAP: Record<string, string[]> = {
    'ISO/IEC 42001': ['EU AI Act', 'ISO 27001'],
    'ISO 42001': ['EU AI Act', 'ISO 27001'],
    'NIST AI RMF': ['NIST AI RMF'],
    'GDPR': ['GDPR'],
    'EU AI Act': ['EU AI Act'],
    'ISO 27001': ['ISO 27001'],
    'SOC 2': ['SOC 2'],
    'OWASP LLM': ['OWASP LLM'],
  };
  const matchFrameworks = FRAMEWORK_MAP[policy.framework] || [policy.framework];
  const linkedControls = CONTROLS.filter(c => matchFrameworks.includes(c.framework)).slice(0, 6);
  const linkedEvidence = EVIDENCE.filter(e => matchFrameworks.includes(e.framework) || e.framework === policy.framework).slice(0, 5);
  const linkedGaps = GAPS.filter(g => matchFrameworks.includes(g.framework) || g.framework === policy.framework).slice(0, 4);
  const framework = FRAMEWORKS.find(f => f.name === policy.framework);

  const auditEntries = [
    { id: 'AUD-P1', date: policy.lastReview || '2026-03-01', user: policy.owner, action: `Policy "${policy.title}" reviewed and approved v${policy.version}.` },
    { id: 'AUD-P2', date: '2026-02-15', user: 'System', action: `Automated compliance scan linked ${linkedControls.length} controls to ${policy.framework}.` },
    { id: 'AUD-P3', date: '2026-01-20', user: policy.approver || policy.owner, action: `Policy "${policy.title}" published after approval workflow completion.` },
    { id: 'AUD-P4', date: '2025-12-10', user: policy.owner, action: `Draft of ${policy.title} submitted for review.` },
    { id: 'AUD-P5', date: '2025-11-01', user: 'System', action: `Evidence collection mapped to ${policy.framework} framework.` },
  ].filter(e => e.date);

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/policies')} style={{ borderRadius: 0, marginTop: 2 }}>
          <ArrowLeft size={16} />
        </Button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-4))', fontFamily: 'monospace' }}>{policy.id}</span>
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{policy.status.replace('_', ' ').toUpperCase()}</Badge>
            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{policy.category}</Badge>
            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{policy.version}</Badge>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--text-1))', margin: 0, lineHeight: 1.3 }}>{policy.title}</h1>
          <p style={{ fontSize: 13, color: 'hsl(var(--text-3))', margin: '4px 0 0 0' }}>
            {orgName} · {policy.framework} · Owner: {policy.owner}
          </p>
        </div>
        <Button style={{ borderRadius: 0 }} onClick={() => { setEditData({ ...policy }); setEditOpen(true); }}>
          <PencilSimple size={14} style={{ marginRight: 6 }} /> Edit Policy
        </Button>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Version', value: policy.version, sub: 'Current version', color: 'hsl(var(--text-1))' },
          { label: 'Framework', value: policy.framework.split(' ')[0], sub: policy.framework, color: '#6366f1' },
          { label: 'Next Review', value: policy.nextReview ? new Date(policy.nextReview).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A', sub: 'Review due', color: policy.nextReview && new Date(policy.nextReview) < new Date() ? '#ef4444' : '#f97316' },
          { label: 'Controls', value: linkedControls.length, sub: `${policy.framework} controls`, color: '#10b981' },
        ].map(kpi => (
          <Card key={kpi.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardContent style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginBottom: 4 }}>{kpi.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: kpi.color, margin: 0, lineHeight: 1 }}>{kpi.value}</p>
              <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0, gap: 2 }}>
          {['details', 'versions', 'approvals', 'controls', 'evidence', 'audit-trail'].map(t => (
            <TabsTrigger key={t} value={t} style={{ borderRadius: 0, textTransform: 'capitalize', fontSize: 13 }}>
              {t.replace('-', ' ')}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Details ── */}
        <TabsContent value="details" className="mt-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Description</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 16px' }}>
                  <p style={{ fontSize: 13, color: 'hsl(var(--text-2))', lineHeight: 1.6 }}>{policy.description}</p>
                </CardContent>
              </Card>

              <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                <CardHeader style={{ padding: '14px 16px 10px' }}>
                  <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Policy Metadata</CardTitle>
                </CardHeader>
                <CardContent style={{ padding: '0 16px 16px' }}>
                  {[
                    { label: 'Category', value: policy.category, icon: Tag },
                    { label: 'Framework', value: policy.framework, icon: Shield },
                    { label: 'Owner', value: policy.owner, icon: User },
                    { label: 'Approver', value: policy.approver || 'Pending', icon: CheckCircle },
                    { label: 'Last Review', value: policy.lastReview ? formatDate(policy.lastReview) : 'Not yet reviewed', icon: CalendarBlank },
                    { label: 'Next Review', value: policy.nextReview ? formatDate(policy.nextReview) : 'N/A', icon: Clock },
                    { label: 'Version', value: policy.version, icon: ClipboardText },
                    { label: 'Status', value: policy.status.replace('_', ' '), icon: Scales },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={13} style={{ color: 'hsl(var(--text-4))' }} />
                        <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 13, color: 'hsl(var(--text-1))', fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {framework && (
                <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <CardHeader style={{ padding: '14px 16px 10px' }}>
                    <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Framework Coverage</CardTitle>
                  </CardHeader>
                  <CardContent style={{ padding: '0 16px 16px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: 'hsl(var(--text-2))' }}>{framework.name}</span>
                        <span style={{ fontSize: 15, fontWeight: 700, color: framework.complianceScore >= 80 ? '#10b981' : framework.complianceScore >= 60 ? '#f97316' : '#ef4444' }}>{framework.complianceScore}%</span>
                      </div>
                      <div style={{ height: 6, background: 'hsl(var(--bg-muted))' }}>
                        <div style={{ width: `${framework.complianceScore}%`, height: '100%', background: framework.complianceScore >= 80 ? '#10b981' : framework.complianceScore >= 60 ? '#f97316' : '#ef4444' }} />
                      </div>
                    </div>
                    {[
                      { label: 'Total Controls', value: framework.controlsTotal },
                      { label: 'Implemented', value: framework.controlsImplemented },
                      { label: 'Open Gaps', value: framework.controlsTotal - framework.controlsImplemented },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                        <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {linkedGaps.length > 0 && (
                <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                  <CardHeader style={{ padding: '14px 16px 10px' }}>
                    <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Compliance Gaps</CardTitle>
                  </CardHeader>
                  <CardContent style={{ padding: '0 16px 16px' }}>
                    {linkedGaps.map(gap => {
                      const gc = gap.severity === 'critical' ? '#ef4444' : gap.severity === 'high' ? '#f97316' : '#eab308';
                      return (
                        <div key={gap.id} style={{ padding: '8px 12px', border: `1px solid ${gc}30`, background: `${gc}08`, marginBottom: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))', margin: 0 }}>{gap.id} · {gap.controlRef}</p>
                              <p style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--text-1))', margin: '2px 0 0 0' }}>{gap.title}</p>
                            </div>
                            <Badge style={{ background: `${gc}15`, color: gc, border: `1px solid ${gc}40`, borderRadius: 0, fontSize: 10 }}>{gap.severity}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Versions ── */}
        <TabsContent value="versions" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardHeader style={{ padding: '14px 16px 10px' }}>
              <CardTitle style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCounterClockwise size={15} /> Version History
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 16px 16px' }}>
              {versions.map((v, i) => (
                <div key={v.version} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: v.status === 'current' ? 'hsl(var(--brand))' : 'hsl(var(--bg-muted))',
                      border: `2px solid ${v.status === 'current' ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: v.status === 'current' ? '#fff' : 'hsl(var(--text-3))' }}>{v.version}</span>
                    </div>
                    {i < versions.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 4, background: 'hsl(var(--border))' }} />}
                  </div>
                  <div style={{ paddingBottom: 8, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{v.version}</span>
                      {v.status === 'current' && (
                        <Badge style={{ background: '#10b98115', color: '#10b981', border: '1px solid #10b98130', borderRadius: 0, fontSize: 10 }}>CURRENT</Badge>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', margin: 0, lineHeight: 1.5 }}>{v.summary}</p>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 4 }}>{v.date ? formatDate(v.date) : 'N/A'} · {v.author}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Approvals ── */}
        <TabsContent value="approvals" className="mt-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardHeader style={{ padding: '14px 16px 10px' }}>
                <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Approval Workflow</CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 16px' }}>
                {approvals.map((appr, i) => {
                  const ac = approvalStatusColor(appr.status);
                  const AIcon = ac.icon;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: ac.bg, border: `2px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AIcon size={14} style={{ color: ac.text }} />
                        </div>
                        {i < approvals.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 4, background: 'hsl(var(--border))' }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>{appr.stage}</p>
                            <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', margin: '2px 0 0 0' }}>{appr.approver} · {appr.role}</p>
                          </div>
                          <Badge style={{ background: ac.bg, color: ac.text, border: `1px solid ${ac.border}`, borderRadius: 0, fontSize: 10 }}>{appr.status.replace('_', ' ')}</Badge>
                        </div>
                        {appr.comment && <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', margin: '6px 0 0 0', fontStyle: 'italic' }}>"{appr.comment}"</p>}
                        {appr.date && <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', margin: '4px 0 0 0' }}>{formatDate(appr.date)}</p>}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardHeader style={{ padding: '14px 16px 10px' }}>
                <CardTitle style={{ fontSize: 14, fontWeight: 600 }}>Approval Summary</CardTitle>
              </CardHeader>
              <CardContent style={{ padding: '0 16px 16px' }}>
                {(() => {
                  const approved = approvals.filter(a => a.status === 'approved').length;
                  const inReview = approvals.filter(a => a.status === 'in_review').length;
                  const pending = approvals.filter(a => a.status === 'pending').length;
                  return (
                    <>
                      {[
                        { label: 'Total Stages', value: approvals.length, color: 'hsl(var(--text-1))' },
                        { label: 'Approved', value: approved, color: '#10b981' },
                        { label: 'In Review', value: inReview, color: '#f97316' },
                        { label: 'Pending', value: pending, color: '#6b7280' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                          <span style={{ fontSize: 12, color: 'hsl(var(--text-3))' }}>{label}</span>
                          <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 12 }}>
                        <div style={{ height: 6, background: 'hsl(var(--bg-muted))' }}>
                          <div style={{ width: `${Math.round(approved / approvals.length * 100)}%`, height: '100%', background: approved === approvals.length ? '#10b981' : '#f97316' }} />
                        </div>
                        <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 4 }}>{Math.round(approved / approvals.length * 100)}% approval completion</p>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Controls ── */}
        <TabsContent value="controls" className="mt-4">
          {linkedControls.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <Shield size={40} style={{ color: 'hsl(var(--text-4))', opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-3))' }}>No controls mapped to {policy.framework}.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linkedControls.map(ctrl => {
                const csc = statusColor(ctrl.status);
                const scoreC = ctrl.score >= 85 ? '#10b981' : ctrl.score >= 65 ? '#f97316' : '#ef4444';
                return (
                  <Card
                    key={ctrl.id}
                    onClick={() => navigate(`/controls/${ctrl.id}`)}
                    style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, cursor: 'pointer' }}
                  >
                    <CardContent style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'hsl(var(--text-4))' }}>{ctrl.id}</span>
                            <Badge style={{ background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))', borderRadius: 0, fontSize: 10 }}>{ctrl.clause}</Badge>
                            <Badge style={{ background: csc.bg, color: csc.text, border: `1px solid ${csc.border}`, borderRadius: 0, fontSize: 10 }}>{ctrl.status}</Badge>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>{ctrl.title}</p>
                          <p style={{ fontSize: 12, color: 'hsl(var(--text-2))', marginTop: 3 }}>{ctrl.description}</p>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: 16 }}>
                          <p style={{ fontSize: 24, fontWeight: 700, color: scoreC, margin: 0 }}>{ctrl.score}</p>
                          <p style={{ fontSize: 10, color: 'hsl(var(--text-4))', margin: 0 }}>score</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Evidence ── */}
        <TabsContent value="evidence" className="mt-4">
          {linkedEvidence.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
              <CardContent style={{ padding: 40, textAlign: 'center' }}>
                <Paperclip size={40} style={{ color: 'hsl(var(--text-4))', opacity: 0.4, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'hsl(var(--text-3))' }}>No evidence items linked to {policy.framework}.</p>
              </CardContent>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linkedEvidence.map(ev => {
                const evColor = ev.status === 'synced' ? '#10b981' : ev.status === 'pending' ? '#f97316' : ev.status === 'expired' ? '#ef4444' : '#6b7280';
                return (
                  <Card key={ev.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <CardContent style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                          <div style={{ width: 36, height: 36, background: 'hsl(var(--bg-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={16} style={{ color: 'hsl(var(--brand))' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', margin: 0 }}>{ev.title}</p>
                            <p style={{ fontSize: 11, color: 'hsl(var(--text-3))', margin: '3px 0 0 0' }}>{ev.type} · {ev.source} · {ev.fileSize}</p>
                            <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', margin: '2px 0 0 0' }}>{formatDate(ev.lastSync)} · {ev.control}</p>
                          </div>
                        </div>
                        <Badge style={{ background: `${evColor}15`, color: evColor, border: `1px solid ${evColor}30`, borderRadius: 0, fontSize: 10 }}>{ev.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Audit Trail ── */}
        <TabsContent value="audit-trail" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
            <CardHeader style={{ padding: '14px 16px 10px' }}>
              <CardTitle style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClockCounterClockwise size={15} /> Policy Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '0 16px 16px' }}>
              {auditEntries.map((entry, i) => (
                <div key={entry.id} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 10, height: 10, marginTop: 4, borderRadius: '50%', background: 'hsl(var(--brand))', flexShrink: 0 }} />
                    {i < auditEntries.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 4, background: 'hsl(var(--border))' }} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', margin: 0 }}>{entry.date ? formatDate(entry.date) : 'N/A'} · {entry.user}</p>
                    <p style={{ fontSize: 13, color: 'hsl(var(--text-1))', lineHeight: 1.4, marginTop: 2 }}>{entry.action}</p>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid hsl(var(--border))' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-2))', marginBottom: 10 }}>System Audit Log</p>
                {AUDIT_LOG.filter(e => e.action.toLowerCase().includes('policy') || e.action.toLowerCase().includes('compli')).slice(0, 5).map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid hsl(var(--border))' }}>
                    <span style={{ fontSize: 12, color: 'hsl(var(--text-2))' }}>{e.action}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-4))' }}>{e.user}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', borderRadius: 0, maxWidth: 520 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 15, fontWeight: 600 }}>Edit Policy — {policy.id}</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
            {([
              { label: 'Title', key: 'title' },
              { label: 'Owner', key: 'owner' },
              { label: 'Version', key: 'version' },
              { label: 'Approver', key: 'approver' },
            ] as { label: string; key: keyof Policy }[]).map(({ label, key }) => (
              <div key={key as string}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  type="text"
                  value={(editData[key] ?? policy[key]) as string}
                  onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>Status</label>
              <select
                value={(editData.status ?? policy.status)}
                onChange={e => setEditData(prev => ({ ...prev, status: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none' }}
              >
                {['published', 'in_review', 'draft'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--text-2))', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea
                rows={3}
                value={(editData.description ?? policy.description)}
                onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--text-1))', borderRadius: 0, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" style={{ borderRadius: 0 }} onClick={() => setEditOpen(false)}>
              <X size={13} style={{ marginRight: 4 }} /> Cancel
            </Button>
            <Button style={{ borderRadius: 0 }} onClick={() => setEditOpen(false)}>
              <FloppyDisk size={13} style={{ marginRight: 4 }} /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
