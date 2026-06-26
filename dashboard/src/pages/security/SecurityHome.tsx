// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ShieldWarning, Bug, Crosshair, Sword, Scan,
  Lightning, Warning, Clock, ArrowRight, Fire, Eye, Globe,
  Lock, Target, CaretRight, Package, Certificate, DownloadSimple,
  CheckCircle, XCircle, ArrowSquareOut,
} from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCardRow } from '../../components/ui/StatCardRow';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';
import { THREATS, VULNERABILITIES, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { useChartTheme } from '../../hooks/useChartTheme';
import { useSecurityScansData } from '../../hooks/useSecurityScansData';
import { useAttackSurfaceData } from '../../hooks/useAttackSurfaceData';

// ── SBOM Data ─────────────────────────────────────────────────────────────────

interface SbomEntry {
  component: string;
  version: string;
  type: 'ML Framework' | 'LLM API' | 'Data Pipeline' | 'Infra' | 'Monitoring';
  license: string;
  cveCount: number;
  cvssMax: number | null;
  supplier: string;
  integrityVerified: boolean;
}

const SBOM_ENTRIES: SbomEntry[] = [
  { component: 'PyTorch', version: '2.2.1', type: 'ML Framework', license: 'BSD-3-Clause', cveCount: 0, cvssMax: null, supplier: 'Meta AI', integrityVerified: true },
  { component: 'scikit-learn', version: '1.4.0', type: 'ML Framework', license: 'BSD-3-Clause', cveCount: 0, cvssMax: null, supplier: 'scikit-learn', integrityVerified: true },
  { component: 'OpenAI Python SDK', version: '1.12.0', type: 'LLM API', license: 'MIT', cveCount: 1, cvssMax: 5.3, supplier: 'OpenAI', integrityVerified: true },
  { component: 'Anthropic SDK', version: '0.18.1', type: 'LLM API', license: 'MIT', cveCount: 0, cvssMax: null, supplier: 'Anthropic', integrityVerified: true },
  { component: 'Apache Spark', version: '3.5.0', type: 'Data Pipeline', license: 'Apache-2.0', cveCount: 2, cvssMax: 7.5, supplier: 'Apache', integrityVerified: false },
  { component: 'Airflow', version: '2.8.1', type: 'Data Pipeline', license: 'Apache-2.0', cveCount: 1, cvssMax: 6.1, supplier: 'Apache', integrityVerified: true },
  { component: 'NVIDIA CUDA', version: '12.3', type: 'Infra', license: 'NVIDIA', cveCount: 0, cvssMax: null, supplier: 'NVIDIA', integrityVerified: true },
  { component: 'MLflow', version: '2.11.1', type: 'Monitoring', license: 'Apache-2.0', cveCount: 0, cvssMax: null, supplier: 'Databricks', integrityVerified: true },
  { component: 'Prometheus', version: '2.49.1', type: 'Monitoring', license: 'Apache-2.0', cveCount: 0, cvssMax: null, supplier: 'CNCF', integrityVerified: true },
  { component: 'Transformers (HF)', version: '4.38.2', type: 'ML Framework', license: 'Apache-2.0', cveCount: 1, cvssMax: 4.8, supplier: 'Hugging Face', integrityVerified: true },
];

function downloadSBOM() {
  const cycloneDX = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:sentinel-sbom-${Date.now()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'Certifyi', name: 'Sentinel AI GRC', version: '2.1.0' }],
      component: { type: 'platform', name: 'Sentinel AI Platform', version: '2.1.0', description: 'AI GRC Platform AIBOM' },
    },
    components: SBOM_ENTRIES.map((e, i) => ({
      type: 'library',
      'bom-ref': `comp-${i + 1}`,
      name: e.component,
      version: e.version,
      licenses: [{ license: { id: e.license } }],
      supplier: { name: e.supplier },
      externalReferences: [],
    })),
    vulnerabilities: SBOM_ENTRIES.filter(e => e.cveCount > 0).map((e, i) => ({
      'bom-ref': `vuln-${i + 1}`,
      id: `CVE-2026-${5000 + i}`,
      source: { name: 'NVD' },
      ratings: [{ score: e.cvssMax, severity: (e.cvssMax || 0) >= 7 ? 'high' : 'medium', method: 'CVSSv3' }],
      affects: [{ ref: e.component }],
    })),
  };
  const blob = new Blob([JSON.stringify(cycloneDX, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sentinel-aibom-${new Date().toISOString().split('T')[0]}.cdx.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Red Team Summary Data ─────────────────────────────────────────────────────

const RED_TEAM_FINDINGS = [
  { id: 'RT-001', name: 'Prompt Injection via Jailbreak', severity: 'critical', model: 'ComplianceBot', status: 'Remediated', cvss: 9.2, technique: 'T1055', fixPR: 'PR-2491' },
  { id: 'RT-002', name: 'Data Exfiltration via Tool Call', severity: 'high', model: 'LoanAssistant', status: 'In Progress', cvss: 8.1, technique: 'T1041', fixPR: 'PR-2510' },
  { id: 'RT-003', name: 'System Prompt Extraction', severity: 'high', model: 'SupportBot', status: 'Remediated', cvss: 7.4, technique: 'T1552', fixPR: 'PR-2488' },
  { id: 'RT-004', name: 'Hallucination in High-Stakes Decision', severity: 'medium', model: 'CreditRiskScorer', status: 'Open', cvss: 6.5, technique: 'T1590', fixPR: null },
  { id: 'RT-005', name: 'Context Window Poisoning', severity: 'medium', model: 'FraudAlert-Watcher', status: 'Remediated', cvss: 5.9, technique: 'T1055', fixPR: 'PR-2476' },
];

// ── Security Score Data ───────────────────────────────────────────────────────

const SECURITY_SCORES = [
  { module: 'Vulnerability', score: 72, color: 'hsl(var(--s-wn-tx))' },
  { module: 'Threat Intel', score: 68, color: 'hsl(var(--s-wn-tx))' },
  { module: 'Red Team', score: 61, color: 'hsl(var(--destructive))' },
  { module: 'Attack Surface', score: 75, color: 'hsl(var(--s-wn-tx))' },
  { module: 'Access Control', score: 79, color: 'hsl(var(--s-ok-tx))' },
];

// ── Metric Tiles ──────────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string;
  variant: 'ok' | 'warn' | 'error' | 'info';
  icon: React.ReactNode;
  sub?: string;
}

function MetricTile({ label, value, variant, icon, sub }: MetricTileProps) {
  const variantStyles = {
    ok: { bg: 'hsl(142 71% 45% / 0.10)', border: 'hsl(142 71% 45% / 0.3)', color: 'hsl(var(--s-ok-tx))' },
    warn: { bg: 'hsl(45 93% 47% / 0.10)', border: 'hsl(45 93% 47% / 0.3)', color: 'hsl(var(--s-wn-tx))' },
    error: { bg: 'hsl(0 72% 51% / 0.10)', border: 'hsl(0 72% 51% / 0.3)', color: 'hsl(var(--destructive))' },
    info: { bg: 'hsl(220 90% 56% / 0.10)', border: 'hsl(220 90% 56% / 0.3)', color: 'hsl(var(--s-in-tx))' },
  };
  const s = variantStyles[variant];
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

// ── Sub-Navigation Cards ──────────────────────────────────────────────────────

interface SubNavCardProps {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  statusLabel: string;
  statusVariant: string;
  count: number;
  countLabel: string;
}

function SubNavCard({ title, description, path, icon, statusLabel, statusVariant, count, countLabel }: SubNavCardProps) {
  const navigate = useNavigate();
  const sc = statusColor(statusVariant);
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md group"
      style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}
      onClick={() => navigate(path)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{title}</span>
          </div>
          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
            {statusLabel}
          </Badge>
        </div>
        <p className="text-xs mb-3" style={{ color: 'hsl(var(--text-4))' }}>{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-4))' }}>
            <span className="text-sm font-bold" style={{ color: 'hsl(var(--text-1))' }}>{count}</span> {countLabel}
          </span>
          <CaretRight size={14} className="group-hover:translate-x-1 transition-transform" style={{ color: 'hsl(var(--brand))' }} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Recent Security Events ────────────────────────────────────────────────────

function getRecentEvents() {
  const threatEvents = THREATS.slice(0, 3).map(t => ({
    id: t.id,
    icon: <Lightning size={14} weight="fill" style={{ color: severityColor(t.severity).text }} />,
    severity: t.severity,
    title: t.name,
    target: t.affectedModels.length > 0 ? t.affectedModels.join(', ') : 'Platform',
    date: t.detected,
    type: 'Threat' as const,
  }));
  const vulnEvents = VULNERABILITIES.slice(0, 3).map(v => ({
    id: v.id,
    icon: <Bug size={14} weight="fill" style={{ color: severityColor(v.severity).text }} />,
    severity: v.severity,
    title: v.title,
    target: v.component,
    date: v.discovered,
    type: 'Vulnerability' as const,
  }));
  return [...threatEvents, ...vulnEvents]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

// ── Custom Chart Tooltip ──────────────────────────────────────────────────────

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 text-xs shadow-lg" style={{
      background: 'hsl(var(--bg-surface))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 0,
      color: 'hsl(var(--text-1))',
    }}>
      <p className="font-semibold mb-1">{label}</p>
      <p>Score: <span className="font-bold">{payload[0].value}</span>/100</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SecurityHome() {
  const { orgName } = useSettingsStore();
  const ct = useChartTheme();
  const { items: scans } = useSecurityScansData();
  const { items: attackSurface } = useAttackSurfaceData();
  const recentEvents = getRecentEvents();
  const [sbomFilter, setSbomFilter] = useState<string>('all');
  const totalCVEs = SBOM_ENTRIES.reduce((a, e) => a + e.cveCount, 0);
  const unverified = SBOM_ENTRIES.filter(e => !e.integrityVerified).length;
  const filteredSBOM = sbomFilter === 'all' ? SBOM_ENTRIES : SBOM_ENTRIES.filter(e => e.type === sbomFilter);
  const sbomTypes = Array.from(new Set(SBOM_ENTRIES.map(e => e.type)));

  const subNavItems: SubNavCardProps[] = [
    {
      title: 'Threat Intelligence',
      description: 'Monitor and investigate active threats, attack vectors, and MITRE ATT&CK mappings.',
      path: '/security/threats',
      icon: <Lightning size={16} weight="fill" className="text-destructive" />,
      statusLabel: '3 Active',
      statusVariant: 'open',
      count: 6,
      countLabel: 'tracked threats',
    },
    {
      title: 'Vulnerability Tracker',
      description: 'Track CVEs, CVSS scores, patch status, and remediation timelines.',
      path: '/security/vulnerabilities',
      icon: <Bug size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      statusLabel: '2 Open',
      statusVariant: 'in_review',
      count: 6,
      countLabel: 'vulnerabilities',
    },
    {
      title: 'Red Team Lab',
      description: 'Adversarial testing campaigns, jailbreak tests, and attack simulations.',
      path: '/security/red-team',
      icon: <Sword size={16} weight="fill" className="text-destructive" />,
      statusLabel: '1 Active',
      statusVariant: 'running',
      count: 4,
      countLabel: 'campaigns',
    },
    {
      title: 'Attack Surface',
      description: 'External and internal asset exposure monitoring and risk assessment.',
      path: '/security/attack-surface',
      icon: <Globe size={16} style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      statusLabel: '3 Exposed',
      statusVariant: 'in_review',
      count: 8,
      countLabel: 'assets monitored',
    },
    {
      title: 'Security Scanner',
      description: 'Automated vulnerability scanning, compliance checks, and policy enforcement.',
      path: '/security/scanner',
      icon: <Scan size={16} style={{ color: 'hsl(var(--brand))' }} />,
      statusLabel: 'Operational',
      statusVariant: 'active',
      count: 24,
      countLabel: 'scans today',
    },
  ];

  const securityKpiCards: StatCardRowItem[] = [
    {
      label: 'Open Vulnerabilities',
      value: String(VULNERABILITIES.filter(v => v.status !== 'patched').length),
      icon: <Bug size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      delta: '1 critical CVSS 9+',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Active Threats',
      value: String(THREATS.filter(t => t.status === 'active' || t.status === 'investigating').length),
      icon: <Fire size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />,
      delta: '2 critical',
      deltaDir: 'up' as const,
      isPositiveUp: false,
    },
    {
      label: 'Scans Today',
      value: '24',
      icon: <Scan size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />,
      delta: 'All passed',
      deltaDir: 'up' as const,
      isPositiveUp: true,
    },
    {
      label: 'Security Posture',
      value: '79%',
      icon: <ShieldWarning size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      delta: 'Target: 85%',
      deltaDir: 'down' as const,
      isPositiveUp: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Security"
        subtitle="Threat monitoring, vulnerability management and access control"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Security' }]}
        actions={
          <div className="flex items-center gap-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
            <Clock size={13} />
            <span>Last scan: {formatDate('2026-04-05')} at 23:45 UTC</span>
          </div>
        }
      />

      {/* Security KPI Row */}
      <StatCardRow cards={securityKpiCards} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="sbom" style={{ borderRadius: 0 }}>
            <Package size={13} className="mr-1.5" />AI SBOM
            {totalCVEs > 0 && (
              <span style={{ marginLeft: 6, background: 'hsl(0 72% 51% / 0.15)', color: 'hsl(var(--destructive))', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 0 }}>{totalCVEs} CVEs</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="red-team" style={{ borderRadius: 0 }}>
            <Sword size={13} className="mr-1.5" />Red Team
            <span style={{ marginLeft: 6, background: 'hsl(25 95% 53% / 0.15)', color: 'hsl(var(--s-wn-tx))', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 0 }}>5 findings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* Security Score Chart + Recent Events */}
      <div className="grid grid-cols-3 gap-4">
        {/* Security Score per Module Chart */}
        <Card className="col-span-2" style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Security Score per Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={SECURITY_SCORES} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
                <XAxis
                  dataKey="module"
                  tick={{ fill: ct.axis, fontSize: 11 }}
                  axisLine={{ stroke: ct.grid }}
                  tickLine={false}
                />
                <YAxis
                  label={{ value: 'Security Score (0-100)', angle: -90, position: 'insideLeft', offset: 10, style: { fill: ct.axis, fontSize: 11 } }}
                  tick={{ fill: ct.axis, fontSize: 11 }}
                  axisLine={{ stroke: ct.grid }}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <ReTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="score" maxBarSize={48}>
                  {SECURITY_SCORES.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Security Events Feed */}
        <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {recentEvents.map(ev => {
                const sc = severityColor(ev.severity);
                const daysAgo = Math.floor((Date.now() - new Date(ev.date).getTime()) / 86400000);
                return (
                  <div key={ev.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="mt-0.5 p-1" style={{ background: sc.bg, borderRadius: 0 }}>
                      {ev.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 9, padding: '1px 5px' }}>
                          {ev.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{ev.type}</span>
                      </div>
                      <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-1))' }}>{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                          <Target size={10} className="inline mr-1" />{ev.target}
                        </span>
                        <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{daysAgo}d ago</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Navigation Cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Security Modules</h2>
        <div className="grid grid-cols-5 gap-4">
          {subNavItems.map(item => (
            <SubNavCard key={item.path} {...item} />
          ))}
        </div>
      </div>

        </TabsContent>

        {/* ── AI SBOM Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="sbom" className="space-y-4">
          {/* SBOM Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricTile label="Components Tracked" value={String(SBOM_ENTRIES.length)} variant="info" icon={<Package size={16} weight="fill" style={{ color: 'hsl(var(--s-in-tx))' }} />} sub="AI/ML supply chain" />
            <MetricTile label="Open CVEs" value={String(totalCVEs)} variant={totalCVEs > 0 ? 'error' : 'ok'} icon={<Bug size={16} weight="fill" className="text-destructive" />} sub={`${totalCVEs} across ${SBOM_ENTRIES.filter(e => e.cveCount > 0).length} components`} />
            <MetricTile label="Unverified Integrity" value={String(unverified)} variant={unverified > 0 ? 'warn' : 'ok'} icon={<Certificate size={16} style={{ color: 'hsl(var(--s-wn-tx))' }} />} sub="Sigstore not verified" />
            <MetricTile label="SBOM Format" value="CycloneDX 1.5" variant="ok" icon={<CheckCircle size={16} className="text-green-600 dark:text-green-400" />} sub="NTIA min. elements compliant" />
          </div>

          {/* Generate SBOM Banner */}
          <div className="flex items-center justify-between px-4 py-3" style={{ background: 'hsl(220 90% 56% / 0.08)', border: '1px solid hsl(220 90% 56% / 0.25)', borderRadius: 0 }}>
            <div className="flex items-center gap-3">
              <Package size={18} style={{ color: 'hsl(var(--s-in-tx))' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>AI/ML Bill of Materials (AIBOM)</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>CycloneDX 1.5 · {SBOM_ENTRIES.length} components · EU CRA & NTIA SBOM minimum elements compliant · Last updated: Apr 8, 2026</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => { downloadSBOM(); toast.success('AIBOM exported as CycloneDX JSON'); }}
              style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}
            >
              <DownloadSimple size={14} className="mr-1.5" />Generate AIBOM
            </Button>
          </div>

          {/* Filter by type */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all', ...sbomTypes].map(t => (
              <button
                key={t}
                onClick={() => setSbomFilter(t)}
                style={{
                  padding: '3px 10px', fontSize: 11, borderRadius: 0, cursor: 'pointer',
                  background: sbomFilter === t ? 'hsl(var(--brand))' : 'hsl(var(--bg-surface))',
                  color: sbomFilter === t ? '#fff' : 'hsl(var(--text-4))',
                  border: sbomFilter === t ? '1px solid hsl(var(--brand))' : '1px solid hsl(var(--border))',
                  fontWeight: sbomFilter === t ? 600 : 400,
                }}
              >
                {t === 'all' ? 'All Components' : t}
              </button>
            ))}
            <span className="text-xs ml-auto" style={{ color: 'hsl(var(--text-4))' }}>{filteredSBOM.length} components</span>
          </div>

          {/* SBOM Table */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Component', 'Version', 'Type', 'Supplier', 'License', 'CVEs', 'CVSS Max', 'Integrity'].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSBOM.map(entry => (
                      <tr key={entry.component} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{entry.component}</td>
                        <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{entry.version}</td>
                        <td className="px-3 py-2.5">
                          <Badge style={{ background: 'hsl(220 90% 56% / 0.1)', color: 'hsl(var(--s-in-tx))', borderRadius: 0, fontSize: 10 }}>{entry.type}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{entry.supplier}</td>
                        <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--text-4))' }}>{entry.license}</td>
                        <td className="px-3 py-2.5">
                          {entry.cveCount === 0 ? (
                            <span className="text-xs font-mono" style={{ color: 'hsl(var(--s-ok-tx))' }}>None</span>
                          ) : (
                            <Badge style={{ background: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))', borderRadius: 0, fontSize: 10 }}>{entry.cveCount} CVEs</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono" style={{ color: entry.cvssMax && entry.cvssMax >= 7 ? 'hsl(var(--destructive))' : entry.cvssMax ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-4))' }}>
                          {entry.cvssMax ? entry.cvssMax.toFixed(1) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {entry.integrityVerified ? (
                            <div className="flex items-center gap-1"><CheckCircle size={13} style={{ color: 'hsl(var(--s-ok-tx))' }} /><span className="text-xs" style={{ color: 'hsl(var(--s-ok-tx))' }}>Verified</span></div>
                          ) : (
                            <div className="flex items-center gap-1"><XCircle size={13} style={{ color: 'hsl(var(--destructive))' }} /><span className="text-xs" style={{ color: 'hsl(var(--destructive))' }}>Unverified</span></div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Red Team Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="red-team" className="space-y-4">
          {/* Red Team Score Banner */}
          <div className="flex items-center gap-6 px-5 py-4" style={{ background: 'hsl(0 72% 51% / 0.07)', border: '1px solid hsl(0 72% 51% / 0.25)', borderRadius: 0 }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-4))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Red Team Resilience Score</p>
              <p className="text-4xl font-bold" style={{ color: 'hsl(var(--destructive))' }}>61<span className="text-base font-normal">/100</span></p>
              <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Adversarial robustness — Below 70% threshold</p>
            </div>
            <div className="flex-1 h-2" style={{ background: 'hsl(var(--border))', borderRadius: 0 }}>
              <div style={{ width: '61%', height: '100%', background: 'hsl(0 72% 51%)', borderRadius: 0 }} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(var(--destructive))' }}>1</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Critical</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(var(--s-wn-tx))' }}>2</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>High</p>
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>3</p>
                <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>Remediated</p>
              </div>
            </div>
          </div>

          {/* Findings Table */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Adversarial Findings</CardTitle>
                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>MITRE ATLAS · Campaign RED-2026-Q1</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    {['ID', 'Finding', 'Severity', 'Model', 'CVSS', 'Technique', 'Status', 'Fix'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RED_TEAM_FINDINGS.map(f => {
                    const sc = severityColor(f.severity as any);
                    const statusStyle = f.status === 'Remediated'
                      ? { bg: 'hsl(142 71% 45% / 0.12)', color: 'hsl(var(--s-ok-tx))' }
                      : f.status === 'In Progress'
                      ? { bg: 'hsl(45 93% 47% / 0.12)', color: 'hsl(var(--s-wn-tx))' }
                      : { bg: 'hsl(0 72% 51% / 0.12)', color: 'hsl(var(--destructive))' };
                    return (
                      <tr key={f.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{f.id}</td>
                        <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.name}</td>
                        <td className="px-3 py-2.5">
                          <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{f.severity}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-xs" style={{ color: 'hsl(var(--text-4))' }}>{f.model}</td>
                        <td className="px-3 py-2.5 text-xs font-mono font-bold" style={{ color: f.cvss >= 9 ? 'hsl(var(--destructive))' : f.cvss >= 7 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>{f.cvss.toFixed(1)}</td>
                        <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{f.technique}</td>
                        <td className="px-3 py-2.5">
                          <Badge style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 0, fontSize: 10 }}>{f.status}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          {f.fixPR ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono" style={{ color: 'hsl(var(--s-ok-tx))' }}>{f.fixPR}</span>
                              <ArrowSquareOut size={11} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
