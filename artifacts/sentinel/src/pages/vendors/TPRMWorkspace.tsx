import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Buildings, Warning, CheckCircle, XCircle, Clock, ArrowRight,
  Shield, FileText, ClipboardText, Gauge, ArrowSquareOut,
  Siren, Eye, FileMagnifyingGlass,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  VENDORS, VENDOR_ASSESSMENTS, VENDOR_SLAS, TPRM_ISSUES, VENDOR_DOCUMENTS,
  Vendor, VendorAssessment, VendorSLA, TPRMIssue, VendorDocument, formatDate,
} from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

function criticality(v: Vendor) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', label: 'Tier 1 · Critical' },
    high: { bg: 'hsl(0 72% 51% / 0.08)', color: 'hsl(var(--destructive))', label: 'Tier 2 · High' },
    moderate: { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', label: 'Tier 3 · Moderate' },
    low: { bg: 'hsl(142 71% 45% / 0.08)', color: 'hsl(var(--s-ok-tx))', label: 'Tier 4 · Low' },
  };
  return map[v.criticality] ?? map.moderate;
}

function slaStatusStyle(status: VendorSLA['status']) {
  if (status === 'healthy') return { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))', label: 'Healthy' };
  if (status === 'at_risk') return { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', label: 'At Risk' };
  if (status === 'breached') return { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', label: 'Breached' };
  return { bg: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--text-4))', label: status };
}

function issueStyle(sev: string) {
  if (sev === 'critical') return 'hsl(var(--destructive))';
  if (sev === 'high') return 'hsl(0 72% 51% / 0.8)';
  if (sev === 'medium') return 'hsl(var(--s-wn-tx))';
  return 'hsl(var(--s-ok-tx))';
}

function docStatus(status: VendorDocument['status']) {
  if (status === 'valid') return { color: 'hsl(var(--s-ok-tx))', label: 'Valid' };
  if (status === 'expiring_soon') return { color: 'hsl(var(--s-wn-tx))', label: 'Expiring Soon' };
  if (status === 'expired') return { color: 'hsl(var(--destructive))', label: 'Expired' };
  if (status === 'requested') return { color: 'hsl(var(--s-in-tx))', label: 'Requested' };
  return { color: 'hsl(var(--destructive))', label: 'Missing' };
}

function assessmentStatusLabel(status: VendorAssessment['status']) {
  const map: Record<string, string> = {
    draft: 'Draft', in_progress: 'In Progress', submitted: 'Submitted',
    under_review: 'Under Review', approved: 'Approved',
    approved_with_conditions: 'Approved w/ Conditions',
    rejected: 'Rejected', expired: 'Expired',
  };
  return map[status] ?? status;
}

export default function TPRMWorkspace() {
  const { orgName } = useSettingsStore();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const criticalVendors = VENDORS.filter(v => v.criticality === 'critical');
  const highVendors = VENDORS.filter(v => v.criticality === 'high');
  const moderateVendors = VENDORS.filter(v => v.criticality === 'moderate');
  const lowVendors = VENDORS.filter(v => v.criticality === 'low');

  const breachedSLAs = VENDOR_SLAS.filter(s => s.status === 'breached');
  const atRiskSLAs = VENDOR_SLAS.filter(s => s.status === 'at_risk');
  const openIssues = TPRM_ISSUES.filter(i => ['open', 'in_progress'].includes(i.status));
  const criticalIssues = openIssues.filter(i => i.severity === 'critical');

  const now = Date.now();
  const overdue30 = VENDORS.filter(v => {
    const due = new Date(v.reassessmentDue).getTime();
    return due < now + 30 * 24 * 60 * 60 * 1000;
  });

  const expDocs = VENDOR_DOCUMENTS.filter(d => ['expired', 'expiring_soon', 'missing'].includes(d.status));
  const missingDPA = VENDORS.filter(v => v.dpaStatus === 'not_signed');
  const pendingAssessments = VENDOR_ASSESSMENTS.filter(a => ['in_progress', 'submitted', 'under_review'].includes(a.status));
  const dueAssessments = VENDOR_ASSESSMENTS.filter(a => {
    if (['approved', 'rejected'].includes(a.status)) return false;
    return new Date(a.dueDate).getTime() < now + 30 * 24 * 60 * 60 * 1000;
  });

  const tierGroups = [
    { label: 'Tier 1 — Critical', vendors: criticalVendors, color: 'hsl(var(--destructive))', bg: 'hsl(0 72% 51% / 0.08)' },
    { label: 'Tier 2 — High', vendors: highVendors, color: 'hsl(0 72% 51% / 0.8)', bg: 'hsl(0 72% 51% / 0.04)' },
    { label: 'Tier 3 — Moderate', vendors: moderateVendors, color: 'hsl(var(--s-wn-tx))', bg: 'hsl(45 93% 47% / 0.04)' },
    { label: 'Tier 4 — Low', vendors: lowVendors, color: 'hsl(var(--s-ok-tx))', bg: 'transparent' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>TPRM Workspace</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>{orgName} · Third-Party Risk Management — operational command center</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/vendors')} style={{ borderRadius: 0 }}>
            <Buildings size={14} className="mr-2" />All Vendors
          </Button>
          <Button variant="outline" onClick={() => navigate('/vendors/assessments')} style={{ borderRadius: 0 }}>
            <ClipboardText size={14} className="mr-2" />Assessments
          </Button>
          <Button variant="outline" onClick={() => navigate('/vendors/sla')} style={{ borderRadius: 0 }}>
            <Gauge size={14} className="mr-2" />SLA Monitor
          </Button>
        </div>
      </div>

      {/* Critical Alerts Row */}
      {(breachedSLAs.length > 0 || criticalIssues.length > 0 || missingDPA.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {breachedSLAs.length > 0 && (
            <div className="p-4 flex items-start gap-3 cursor-pointer" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)' }}
              onClick={() => navigate('/vendors/sla')}>
              <XCircle size={20} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-bold text-destructive">{breachedSLAs.length} SLA Breach{breachedSLAs.length > 1 ? 'es' : ''}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-2))' }}>{breachedSLAs.map(s => s.vendorName).join(', ')}</p>
              </div>
              <ArrowRight size={14} style={{ color: 'hsl(var(--destructive))', marginLeft: 'auto', marginTop: 4 }} />
            </div>
          )}
          {criticalIssues.length > 0 && (
            <div className="p-4 flex items-start gap-3 cursor-pointer" style={{ background: 'hsl(0 72% 51% / 0.08)', border: '1px solid hsl(0 72% 51% / 0.3)' }}
              onClick={() => setActiveSection('issues')}>
              <Siren size={20} style={{ color: 'hsl(var(--destructive))', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-bold text-destructive">{criticalIssues.length} Critical TPRM Issue{criticalIssues.length > 1 ? 's' : ''}</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-2))' }}>{criticalIssues.map(i => i.vendorName).join(', ')}</p>
              </div>
              <ArrowRight size={14} style={{ color: 'hsl(var(--destructive))', marginLeft: 'auto', marginTop: 4 }} />
            </div>
          )}
          {missingDPA.length > 0 && (
            <div className="p-4 flex items-start gap-3 cursor-pointer" style={{ background: 'hsl(45 93% 47% / 0.08)', border: '1px solid hsl(45 93% 47% / 0.3)' }}
              onClick={() => navigate('/vendors')}>
              <Shield size={20} style={{ color: 'hsl(var(--s-wn-tx))', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'hsl(var(--s-wn-tx))' }}>{missingDPA.length} Missing DPA — GDPR Art. 28</p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-2))' }}>{missingDPA.map(v => v.name).join(', ')}</p>
              </div>
              <ArrowRight size={14} style={{ color: 'hsl(var(--s-wn-tx))', marginLeft: 'auto', marginTop: 4 }} />
            </div>
          )}
        </div>
      )}

      {/* Executive KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Vendors', value: VENDORS.length, color: 'hsl(var(--text-1))', icon: Buildings, action: () => navigate('/vendors') },
          { label: 'Critical Vendors', value: criticalVendors.length, color: 'hsl(var(--destructive))', icon: Warning, action: () => {} },
          { label: 'Reassessment Due', value: overdue30.length, color: 'hsl(var(--s-wn-tx))', icon: Clock, action: () => {} },
          { label: 'Breached SLAs', value: breachedSLAs.length, color: 'hsl(var(--destructive))', icon: XCircle, action: () => navigate('/vendors/sla') },
          { label: 'Open Issues', value: openIssues.length, color: openIssues.length > 5 ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))', icon: FileMagnifyingGlass, action: () => setActiveSection('issues') },
          { label: 'Expiring Docs', value: expDocs.length, color: expDocs.length > 3 ? 'hsl(var(--destructive))' : 'hsl(var(--s-wn-tx))', icon: FileText, action: () => setActiveSection('docs') },
        ].map(s => (
          <Card key={s.label} onClick={s.action} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', cursor: 'pointer' }} className="hover:bg-muted/20 transition-colors">
            <CardContent className="pt-3 pb-3">
              <s.icon size={16} style={{ color: s.color, marginBottom: 4 }} />
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Risk Tiers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>Vendor Risk Tiers</h2>
            <button onClick={() => navigate('/vendors')} className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'hsl(var(--brand))' }}>
              View all <ArrowSquareOut size={11} />
            </button>
          </div>
          {tierGroups.filter(g => g.vendors.length > 0).map(group => (
            <Card key={group.label} style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-bold flex items-center justify-between" style={{ color: group.color }}>
                  <span>{group.label}</span>
                  <span>{group.vendors.length} vendor{group.vendors.length !== 1 ? 's' : ''}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {group.vendors.map((v, i) => {
                  const vAssessments = VENDOR_ASSESSMENTS.filter(a => a.vendorId === v.id);
                  const vSLAs = VENDOR_SLAS.filter(s => s.vendorId === v.id);
                  const vIssues = TPRM_ISSUES.filter(ti => ti.vendorId === v.id && ['open', 'in_progress'].includes(ti.status));
                  const breachedVSLA = vSLAs.filter(s => s.status === 'breached').length;
                  const lastAssessment = vAssessments.sort((a, b) => (b.approvedAt ?? b.dueDate).localeCompare(a.approvedAt ?? a.dueDate))[0];
                  return (
                    <div key={v.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : 'none' }}
                      onClick={() => navigate(`/vendors/${v.id}`)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div style={{ width: 32, height: 32, background: group.bg, border: '1px solid hsl(var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Buildings size={14} style={{ color: group.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: 'hsl(var(--text-1))' }}>{v.name}</p>
                          <p className="text-xs truncate" style={{ color: 'hsl(var(--text-4))' }}>{v.category} · {v.aiUse.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {breachedVSLA > 0 && <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>SLA Breach</Badge>}
                        {v.dpaStatus === 'not_signed' && <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 9 }}>No DPA</Badge>}
                        {vIssues.length > 0 && <span className="text-xs" style={{ color: 'hsl(var(--s-wn-tx))' }}>{vIssues.length} issue{vIssues.length > 1 ? 's' : ''}</span>}
                        <span className="text-xs font-bold" style={{ color: v.score >= 80 ? 'hsl(var(--s-ok-tx))' : v.score >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))' }}>{v.score}</span>
                        {lastAssessment && (
                          <Badge style={{
                            background: lastAssessment.status === 'approved' ? 'hsl(142 71% 45% / 0.12)' : lastAssessment.status === 'approved_with_conditions' ? 'hsl(45 93% 47% / 0.12)' : 'hsl(0 72% 51% / 0.12)',
                            color: lastAssessment.status === 'approved' ? 'hsl(var(--s-ok-tx))' : lastAssessment.status === 'approved_with_conditions' ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                            borderRadius: 0, fontSize: 9,
                          }}>{assessmentStatusLabel(lastAssessment.status)}</Badge>
                        )}
                        <ArrowRight size={12} style={{ color: 'hsl(var(--text-4))' }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Assessments Due */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold flex items-center justify-between" style={{ color: 'hsl(var(--text-1))' }}>
                <span className="flex items-center gap-1.5"><Clock size={13} />Assessments Due (30d)</span>
                <button onClick={() => navigate('/vendors/assessments')} className="text-xs hover:underline" style={{ color: 'hsl(var(--brand))' }}>View all</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dueAssessments.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--text-4))' }}>No assessments due in next 30 days</p>
              ) : dueAssessments.slice(0, 5).map((a, i) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/20"
                  style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : 'none' }}
                  onClick={() => navigate('/vendors/assessments')}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.vendorName} — {a.assessmentType}</p>
                    <p className="text-xs" style={{ color: new Date(a.dueDate) < new Date() ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>Due {formatDate(a.dueDate)}</p>
                  </div>
                  <Badge style={{ background: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))', borderRadius: 0, fontSize: 9 }}>
                    {assessmentStatusLabel(a.status)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Breached + At-Risk SLAs */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold flex items-center justify-between" style={{ color: 'hsl(var(--text-1))' }}>
                <span className="flex items-center gap-1.5"><Gauge size={13} />SLA Status</span>
                <button onClick={() => navigate('/vendors/sla')} className="text-xs hover:underline" style={{ color: 'hsl(var(--brand))' }}>View all</button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {[...breachedSLAs, ...atRiskSLAs].length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-4">
                  <CheckCircle size={16} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                  <p className="text-xs" style={{ color: 'hsl(var(--s-ok-tx))' }}>All SLAs healthy</p>
                </div>
              ) : [...breachedSLAs, ...atRiskSLAs].slice(0, 6).map((s, i) => {
                const ss = slaStatusStyle(s.status);
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/20"
                    style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : 'none' }}
                    onClick={() => navigate('/vendors/sla')}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{s.vendorName}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{s.serviceName} · {s.currentPerformance}</p>
                    </div>
                    <Badge style={{ background: ss.bg, color: ss.color, borderRadius: 0, fontSize: 9 }}>{ss.label}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Expiring Documents */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-bold flex items-center justify-between" style={{ color: 'hsl(var(--text-1))' }}>
                <span className="flex items-center gap-1.5"><FileText size={13} />Document Gaps</span>
                <span className="text-xs font-normal" style={{ color: 'hsl(var(--text-4))' }}>{expDocs.length} issues</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expDocs.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'hsl(var(--text-4))' }}>All documents valid</p>
              ) : expDocs.slice(0, 6).map((d, i) => {
                const ds = docStatus(d.status);
                return (
                  <div key={d.id} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/20"
                    style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : 'none' }}
                    onClick={() => navigate(`/vendors/${d.vendorId}`)}>
                    <div>
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{d.vendorName} — {d.type}</p>
                      {d.expiresAt && <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Expires {formatDate(d.expiresAt)}</p>}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: ds.color }}>{ds.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Open TPRM Issues */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-bold flex items-center justify-between" style={{ color: 'hsl(var(--text-1))' }}>
            <span className="flex items-center gap-2"><FileMagnifyingGlass size={16} />Open TPRM Issues</span>
            <span className="text-xs font-normal" style={{ color: 'hsl(var(--text-4))' }}>{openIssues.length} open · {criticalIssues.length} critical</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Issue ID', 'Vendor', 'Title', 'Severity', 'Status', 'Source', 'Owner', 'Due Date', 'Action'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openIssues.map((issue, i) => (
                  <tr key={issue.id} className="hover:bg-muted/20 transition-colors"
                    style={{ borderBottom: '1px solid hsl(var(--border))', background: issue.severity === 'critical' ? 'hsl(0 72% 51% / 0.03)' : 'transparent' }}>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-2))' }}>{issue.id}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button className="text-xs font-medium hover:underline" style={{ color: 'hsl(var(--brand))' }}
                        onClick={() => navigate(`/vendors/${issue.vendorId}`)}>
                        {issue.vendorName}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 280 }}>{issue.title}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge style={{ background: `${issueStyle(issue.severity)}20`, color: issueStyle(issue.severity), borderRadius: 0, fontSize: 10 }}>
                        {issue.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge style={{
                        background: issue.status === 'in_progress' ? 'hsl(220 90% 56% / 0.12)' : 'hsl(var(--s-nt-bg))',
                        color: issue.status === 'in_progress' ? 'hsl(var(--s-in-tx))' : 'hsl(var(--text-3))',
                        borderRadius: 0, fontSize: 10,
                      }}>{issue.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{issue.sourceType}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{issue.owner}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: new Date(issue.dueDate) < new Date() ? 'hsl(var(--destructive))' : 'hsl(var(--text-4))' }}>
                      {formatDate(issue.dueDate)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Button variant="ghost" size="sm" className="h-7 px-2" style={{ borderRadius: 0 }}
                        onClick={() => navigate(`/vendors/${issue.vendorId}`)}>
                        <Eye size={13} className="mr-1" />View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reassessment Calendar */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            Reassessment Schedule — Next 90 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Vendor', 'Criticality', 'Reassessment Due', 'Days Remaining', 'Last Reviewed', 'Owner', 'Action'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overdue30.sort((a, b) => new Date(a.reassessmentDue).getTime() - new Date(b.reassessmentDue).getTime()).map((v, i) => {
                  const daysLeft = Math.ceil((new Date(v.reassessmentDue).getTime() - now) / (1000 * 60 * 60 * 24));
                  const ct = criticality(v);
                  return (
                    <tr key={v.id} className="hover:bg-muted/20 transition-colors cursor-pointer"
                      style={{ borderBottom: '1px solid hsl(var(--border))' }}
                      onClick={() => navigate(`/vendors/${v.id}`)}>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{v.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{v.id}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge style={{ background: ct.bg, color: ct.color, borderRadius: 0, fontSize: 9 }}>{ct.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: daysLeft < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--text-2))' }}>
                        {formatDate(v.reassessmentDue)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-bold" style={{ color: daysLeft < 0 ? 'hsl(var(--destructive))' : daysLeft < 14 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-2))' }}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(v.lastReview)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{v.vendorManager}</td>
                      <td className="px-4 py-2.5">
                        <Button size="sm" variant="outline" className="h-6 text-xs px-2" style={{ borderRadius: 0 }}
                          onClick={e => { e.stopPropagation(); navigate('/vendors/assessments'); }}>
                          Start Assessment
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
