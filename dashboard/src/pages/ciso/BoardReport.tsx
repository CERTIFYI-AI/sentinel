import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  FilePdf, FileDoc, ShareNetwork, CalendarBlank, Warning,
  CheckCircle, Brain, Shield, Fire, Buildings, Lightbulb,
  TrendUp, TrendDown, Minus, ArrowUpRight, Download, Printer,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { RISKS, INCIDENTS, MODELS, CONTROLS, FRAMEWORKS, VENDORS, BIAS_AUDITS, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

const REPORT_DATE = 'April 5, 2026';
const REPORT_PERIOD = 'Q1 2026 (January – March)';

function StatBox({ label, value, sub, color = 'hsl(var(--text-1))' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '16px', background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))' }}>
      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>{sub}</p>}
    </div>
  );
}

function TrendBadge({ trend }: { trend: 'up' | 'down' | 'stable'; label?: string }) {
  if (trend === 'up') return <TrendUp size={14} style={{ color: '#ef4444' }} />;
  if (trend === 'down') return <TrendDown size={14} style={{ color: '#10b981' }} />;
  return <Minus size={14} style={{ color: '#6b7280' }} />;
}

export default function BoardReport() {
  const { orgName } = useSettingsStore();
  const [shareClicked, setShareClicked] = useState(false);

  const openCriticalRisks = RISKS.filter(r => r.severity === 'critical' && r.status === 'open').length;
  const openHighRisks = RISKS.filter(r => r.severity === 'high' && r.status === 'open').length;
  const avgComplianceScore = Math.round(FRAMEWORKS.reduce((s, f) => s + f.complianceScore, 0) / FRAMEWORKS.length);
  const avgControlScore = Math.round(CONTROLS.reduce((s, c) => s + c.score, 0) / CONTROLS.length);
  const resolvedIncidents = INCIDENTS.filter(i => i.status === 'resolved').length;
  const activeIncidents = INCIDENTS.filter(i => i.status !== 'resolved').length;
  const failedAudits = BIAS_AUDITS.filter(a => a.result === 'failed').length;
  const productionModels = MODELS.filter(m => m.status === 'production').length;
  const highRiskVendors = VENDORS.filter(v => v.risk === 'high' || v.status === 'high_risk').length;

  const sections = [
    'Executive Summary',
    'Risk Overview',
    'Compliance Status',
    'Incident Summary',
    'Model Inventory',
    'Key Recommendations',
  ];

  const recommendations = [
    { priority: 'critical' as const, text: 'Immediately remediate Loan Approval Assistant bias (MDL-004) — blocked from production until gender/age/disability disparity resolved.', owner: 'Raj Gupta', deadline: '2026-04-15' },
    { priority: 'critical' as const, text: 'Execute amended OpenAI DPA covering EU citizen data to address GDPR Art. 28 non-compliance.', owner: 'James Patel', deadline: '2026-04-10' },
    { priority: 'high' as const, text: 'Complete EU AI Act Article 11 technical documentation for all 4 high-risk AI systems before August 2026 enforcement.', owner: 'Emma Wilson', deadline: '2026-05-30' },
    { priority: 'high' as const, text: 'Implement automated shadow AI detection to reduce unauthorized LLM deployments (currently 3 shadow agents identified).', owner: 'Sarah Chen', deadline: '2026-04-30' },
    { priority: 'high' as const, text: 'Deploy SHAP explainability for Credit Risk Scorer to satisfy GDPR Art. 22 automated decision rights.', owner: 'Raj Gupta', deadline: '2026-04-20' },
    { priority: 'medium' as const, text: 'Increase MFA adoption from 63% to 95%+ across all AI system administrators within Q2 2026.', owner: 'Sarah Chen', deadline: '2026-06-30' },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Board Report Generator</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · {REPORT_PERIOD} · Generated: {REPORT_DATE}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}
            onClick={() => {
              toast.loading('Generating PDF report…', { id: 'pdf' });
              setTimeout(() => toast.success('Board Report PDF ready — download started', { id: 'pdf' }), 1800);
            }}>
            <FilePdf size={14} className="mr-1" /> Generate PDF
          </Button>
          <Button variant="outline" size="sm" style={{ borderRadius: 0 }}
            onClick={() => {
              toast.loading('Generating PowerPoint deck…', { id: 'pptx' });
              setTimeout(() => toast.success('Board Report PPTX ready — download started', { id: 'pptx' }), 2200);
            }}>
            <FileDoc size={14} className="mr-1" /> Generate PPTX
          </Button>
          <Button
            size="sm"
            style={{ borderRadius: 0 }}
            onClick={() => { setShareClicked(true); setTimeout(() => setShareClicked(false), 2000); }}
          >
            <ShareNetwork size={14} className="mr-1" />
            {shareClicked ? 'Link Copied!' : 'Share Report'}
          </Button>
        </div>
      </div>

      {/* Section Nav */}
      <div className="flex gap-1 flex-wrap">
        {sections.map(s => (
          <a
            key={s}
            href={`#${s.toLowerCase().replace(/ /g, '-')}`}
            style={{
              padding: '4px 12px',
              background: 'hsl(var(--bg-muted))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--text-2))',
              fontSize: 12,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            {s}
          </a>
        ))}
      </div>

      {/* ─── SECTION: Executive Summary ─── */}
      <Card id="executive-summary" style={{ background: 'hsl(var(--bg-surface))', border: '2px solid hsl(var(--brand))' }}>
        <CardHeader style={{ background: 'hsl(var(--brand) / 0.08)', borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle className="text-base font-bold" style={{ color: 'hsl(var(--text-1))' }}>
            Executive Summary
          </CardTitle>
          <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{orgName} · AI Governance & Risk Report · {REPORT_PERIOD}</p>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-2))' }}>
            {orgName}'s AI Governance posture in Q1 2026 reflects significant regulatory pressure from the approaching EU AI Act enforcement deadline (August 1, 2026) and critical bias findings in two high-risk models.
            The overall risk score has improved from 16.8 to <strong style={{ color: 'hsl(var(--text-1))' }}>14.2/25</strong>, driven by proactive remediation of the Fraud Model latency risk and quarantine of shadow AI agents.
            However, <strong style={{ color: '#ef4444' }}>{openCriticalRisks} critical risks</strong> remain open, and the Loan Approval Assistant has been blocked from production use pending bias remediation.
            Compliance score stands at <strong style={{ color: '#10b981' }}>{avgComplianceScore}%</strong> overall, with EU AI Act at 65% — requiring urgent attention before the August deadline.
          </p>
        </CardContent>
      </Card>

      {/* ─── SECTION: Risk Overview ─── */}
      <Card id="risk-overview" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Warning size={16} style={{ color: '#ef4444' }} /> Risk Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Overall Risk Score" value="14.2" sub="Out of 25 (lower = better)" color="#ef4444" />
            <StatBox label="Open Critical Risks" value={openCriticalRisks} sub="Require immediate action" color="#ef4444" />
            <StatBox label="Open High Risks" value={openHighRisks} sub="Require near-term action" color="#f97316" />
            <StatBox label="Risk Score Trend" value="↓ 2.6 pts" sub="vs Q4 2025 (improving)" color="#10b981" />
          </div>

          <div>
            <p className="text-xs font-semibold mb-3" style={{ color: 'hsl(var(--text-2))' }}>TOP RISKS BY SCORE</p>
            <table className="w-full">
              <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                <tr>
                  {['Risk ID', 'Title', 'Category', 'Score', 'Trend', 'Status'].map(h => (
                    <th key={h} className="text-left p-2 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RISKS.filter(r => r.status === 'open').sort((a, b) => b.score - a.score).slice(0, 6).map(r => {
                  const sc = severityColor(r.severity);
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                      <td className="p-2 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{r.id}</td>
                      <td className="p-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{r.title}</td>
                      <td className="p-2 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{r.category}</td>
                      <td className="p-2">
                        <span className="text-sm font-bold" style={{ color: sc.text }}>{r.score}</span>
                      </td>
                      <td className="p-2">
                        {r.trending === 'up' ? <TrendUp size={14} style={{ color: '#ef4444' }} /> : r.trending === 'down' ? <TrendDown size={14} style={{ color: '#10b981' }} /> : <Minus size={14} style={{ color: '#6b7280' }} />}
                      </td>
                      <td className="p-2">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{r.severity}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── SECTION: Compliance Status ─── */}
      <Card id="compliance-status" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Shield size={16} style={{ color: '#10b981' }} /> Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Overall Compliance" value={`${avgComplianceScore}%`} sub="Across 6 frameworks" color="#10b981" />
            <StatBox label="Avg Control Score" value={`${avgControlScore}`} sub="Out of 100" color="#3b82f6" />
            <StatBox label="Controls Failing" value={CONTROLS.filter(c => c.testResult === 'fail').length} sub="Require remediation" color="#ef4444" />
            <StatBox label="Open Gaps" value={10} sub="Across all frameworks" color="#f97316" />
          </div>
          <div className="space-y-3">
            {FRAMEWORKS.map(f => {
              const color = f.complianceScore >= 80 ? '#10b981' : f.complianceScore >= 65 ? '#f97316' : '#ef4444';
              const sc = statusColor(f.status.toLowerCase());
              return (
                <div key={f.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</span>
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{f.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      <span>{f.controlsImplemented}/{f.controlsTotal} controls</span>
                      <span className="font-bold" style={{ color }}>{f.complianceScore}%</span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: 'hsl(var(--bg-muted))' }}>
                    <div style={{ width: `${f.complianceScore}%`, height: '100%', background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── SECTION: Incident Summary ─── */}
      <Card id="incident-summary" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Fire size={16} style={{ color: '#f97316' }} /> Incident Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Total Incidents Q1" value={INCIDENTS.length} sub="YTD 2026" />
            <StatBox label="Active Incidents" value={activeIncidents} sub="Require attention" color="#f97316" />
            <StatBox label="Resolved" value={resolvedIncidents} sub="Successfully closed" color="#10b981" />
            <StatBox label="Critical Bias Audits Failed" value={failedAudits} sub="Require remediation" color="#ef4444" />
          </div>
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Title', 'Severity', 'Category', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left p-2 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INCIDENTS.map(inc => {
                const sc = severityColor(inc.severity);
                const ist = statusColor(inc.status);
                return (
                  <tr key={inc.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="p-2 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{inc.id}</td>
                    <td className="p-2 text-xs" style={{ color: 'hsl(var(--text-1))' }}>{inc.title}</td>
                    <td className="p-2">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{inc.severity}</Badge>
                    </td>
                    <td className="p-2 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{inc.category}</td>
                    <td className="p-2">
                      <Badge style={{ background: ist.bg, color: ist.text, border: `1px solid ${ist.border}`, borderRadius: 0, fontSize: 10 }}>{inc.status}</Badge>
                    </td>
                    <td className="p-2 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(inc.reportedDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ─── SECTION: Model Inventory Summary ─── */}
      <Card id="model-inventory" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Brain size={16} style={{ color: '#3b82f6' }} /> Model Inventory Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <StatBox label="Total AI Models" value={MODELS.length} sub="Registered in inventory" />
            <StatBox label="In Production" value={productionModels} sub="Live systems" color="#10b981" />
            <StatBox label="High-Risk Models" value={MODELS.filter(m => m.riskTier === 'high').length} sub="EU AI Act Annex III" color="#ef4444" />
            <StatBox label="Avg Accuracy" value={`${(MODELS.reduce((s, m) => s + m.accuracy, 0) / MODELS.length).toFixed(1)}%`} sub="Across all models" color="#3b82f6" />
          </div>
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Model', 'Status', 'Risk Tier', 'Accuracy', 'Fairness', 'Drift', 'Owner'].map(h => (
                  <th key={h} className="text-left p-2 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODELS.map(m => {
                const sc = statusColor(m.status);
                const driftColor = m.driftStatus === 'stable' ? '#10b981' : m.driftStatus === 'warning' ? '#f97316' : '#ef4444';
                return (
                  <tr key={m.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="p-2 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{m.id}</td>
                    <td className="p-2 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</td>
                    <td className="p-2">
                      <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{m.status}</Badge>
                    </td>
                    <td className="p-2 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{m.riskTier}</td>
                    <td className="p-2 text-xs font-semibold" style={{ color: '#10b981' }}>{m.accuracy}%</td>
                    <td className="p-2 text-xs" style={{ color: m.fairnessScore >= 85 ? '#10b981' : '#f97316' }}>{m.fairnessScore}</td>
                    <td className="p-2 text-xs" style={{ color: driftColor }}>{m.driftStatus}</td>
                    <td className="p-2 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{m.owner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ─── SECTION: Key Recommendations ─── */}
      <Card id="key-recommendations" style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'hsl(var(--text-1))' }}>
            <Lightbulb size={16} style={{ color: '#f59e0b' }} /> Key Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-3">
            {recommendations.map((rec, i) => {
              const pc = severityColor(rec.priority);
              return (
                <div key={i} style={{ padding: '12px 16px', border: `1px solid ${pc.border}`, background: `${pc.bg}` }}>
                  <div className="flex items-start gap-3">
                    <Badge style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, borderRadius: 0, fontSize: 10, flexShrink: 0, marginTop: 2 }}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{rec.text}</p>
                      <div className="flex gap-4 mt-1.5">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Owner: {rec.owner}</span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Deadline: {formatDate(rec.deadline)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
          {orgName} — Sentinel AI GRC Platform · Report Generated: {REPORT_DATE} · CONFIDENTIAL
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled style={{ borderRadius: 0, opacity: 0.6 }}>
            <Download size={13} className="mr-1" /> Export PDF
          </Button>
          <Button
            size="sm"
            style={{ borderRadius: 0 }}
            onClick={() => { setShareClicked(true); setTimeout(() => setShareClicked(false), 2000); }}
          >
            <ShareNetwork size={13} className="mr-1" />
            {shareClicked ? 'Copied!' : 'Share'}
          </Button>
        </div>
      </div>
    </div>
  );
}
