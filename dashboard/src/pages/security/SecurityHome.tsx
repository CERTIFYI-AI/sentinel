// SPDX-License-Identifier: Apache-2.0
// Security group landing page — on the platform contract (CLAUDE.md):
// every number on this page is computed from the real org-scoped security
// tables via the useSecurityGroup hooks. No seed arrays, no invented KPIs,
// no fabricated dates. Empty tables render honest empty states.
import { useNavigate } from 'react-router-dom';
import {
  Bug, Sword, Scan, Lightning, Clock, Globe, Funnel,
  CaretRight, Package, Fire, ShieldWarning, ArrowSquareOut,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { PageSkeleton } from '../../components/ui/PageSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatCardRow } from '../../components/ui/StatCardRow';
import type { StatCardRowItem } from '../../components/ui/StatCardRow';
import { severityColor, formatDate } from '../../data/seed';
import {
  useThreats, useScans, useVulns, useAssets, useFindings, useCampaigns, useFirewall,
} from '../../hooks/useSecurityGroup';
import type {
  ThreatRecord, VulnRecord, FindingRecord,
} from '../../services/securityGroupService';

// ── Sub-Navigation Cards ──────────────────────────────────────────────────────

interface SubNavCardProps {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  count: number;
  countLabel: string;
  badge?: { label: string; bg: string; color: string };
}

function SubNavCard({ title, description, path, icon, count, countLabel, badge }: SubNavCardProps) {
  const navigate = useNavigate();
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
          {badge && (
            <Badge style={{ background: badge.bg, color: badge.color, borderRadius: 0, fontSize: 10 }}>
              {badge.label}
            </Badge>
          )}
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

// ── Canonical vocabulary helpers ──────────────────────────────────────────────
// Statuses follow the security-group migrations/seeds (lowercase snake_case);
// display labels are prettified at render time.

const pretty = (s?: string) => {
  const raw = (s || '').replace(/_/g, ' ');
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '—';
};

const isOpenThreat = (t: ThreatRecord) => t.status === 'open' || t.status === 'investigating';
const isUnresolvedVuln = (v: VulnRecord) => v.status !== 'resolved' && v.status !== 'false_positive';
const isOpenFinding = (f: FindingRecord) => f.status === 'open' || f.status === 'in_remediation';

const FINDING_STS: Record<string, { bg: string; color: string }> = {
  open: { bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' },
  in_remediation: { bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' },
  resolved: { bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' },
  accepted: { bg: 'hsl(var(--s-in-bg))', color: 'hsl(var(--s-in-tx))' },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function SecurityHome() {
  const navigate = useNavigate();
  const threatsQ = useThreats();
  const scansQ = useScans();
  const vulnsQ = useVulns();
  const assetsQ = useAssets();
  const findingsQ = useFindings();
  const campaignsQ = useCampaigns();
  const firewallQ = useFirewall();

  const isLoading =
    threatsQ.isLoading || scansQ.isLoading || vulnsQ.isLoading || assetsQ.isLoading ||
    findingsQ.isLoading || campaignsQ.isLoading || firewallQ.isLoading;

  if (isLoading) return <PageSkeleton title="Security" showStats rows={6} />;

  const threats = threatsQ.items;
  const scans = scansQ.items;
  const vulns = vulnsQ.items;
  const assets = assetsQ.items;
  const findings = findingsQ.items as FindingRecord[];
  const campaigns = campaignsQ.items;
  const firewall = firewallQ.items;

  const loadErrors = [
    { label: 'threats', error: threatsQ.error },
    { label: 'scans', error: scansQ.error },
    { label: 'vulnerabilities', error: vulnsQ.error },
    { label: 'attack surface assets', error: assetsQ.error },
    { label: 'red team findings', error: findingsQ.error },
    { label: 'red team campaigns', error: campaignsQ.error },
    { label: 'firewall rules', error: firewallQ.error },
  ].filter(e => e.error);

  // ── Real counts (canonical status vocabulary) ──────────────────────────────
  const openThreats = threats.filter(isOpenThreat).length;
  const criticalThreats = threats.filter(t => t.severity === 'critical' && isOpenThreat(t)).length;
  const unresolvedVulns = vulns.filter(isUnresolvedVuln).length;
  const criticalVulns = vulns.filter(v => v.severity === 'critical' && isUnresolvedVuln(v)).length;
  const activeCampaigns = campaigns.filter(c => (c.status ?? '').toLowerCase() === 'in_progress').length;
  const enabledRules = firewall.filter(r => r.enabled).length;
  const openFindings = findings.filter(isOpenFinding).length;

  // Scans today = scans whose started_at falls on the current local date.
  const today = new Date();
  const isToday = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  };
  const scansToday = scans.filter(s => isToday(s.startedAt)).length;

  // Last scan = max(started_at) across real scans; honest empty otherwise.
  const lastScanAt = scans.reduce<string | null>((max, s) => {
    if (!s.startedAt) return max;
    return !max || s.startedAt > max ? s.startedAt : max;
  }, null);

  // ── Recent Security Events — latest threats + vulns by detected/created ────
  const recentEvents = [
    ...threats.map(t => ({
      id: `thr-${t.id}`,
      icon: <Lightning size={14} weight="fill" style={{ color: severityColor(t.severity).text }} />,
      severity: t.severity || 'medium',
      title: t.title,
      date: t.detectedAt ?? t.createdAt ?? '',
      type: 'Threat' as const,
      path: '/security/threats',
    })),
    ...vulns.map(v => ({
      id: `vul-${v.id}`,
      icon: <Bug size={14} weight="fill" style={{ color: severityColor(v.severity).text }} />,
      severity: v.severity || 'medium',
      title: v.title,
      date: v.discoveredAt ?? v.createdAt ?? '',
      type: 'Vulnerability' as const,
      path: '/security/vuln-tracker',
    })),
  ]
    .filter(e => e.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const subNavItems: SubNavCardProps[] = [
    {
      title: 'Threat Intelligence',
      description: 'Monitor and investigate active threats, attack vectors, and MITRE ATT&CK mappings.',
      path: '/security/threats',
      icon: <Lightning size={16} weight="fill" className="text-destructive" />,
      count: threats.length,
      countLabel: 'tracked threats',
      badge: openThreats > 0
        ? { label: `${openThreats} open`, bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }
        : undefined,
    },
    {
      title: 'Vulnerability Tracker',
      description: 'Track CVEs, CVSS scores, patch status, and remediation timelines.',
      path: '/security/vuln-tracker',
      icon: <Bug size={16} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      count: vulns.length,
      countLabel: 'vulnerabilities',
      badge: unresolvedVulns > 0
        ? { label: `${unresolvedVulns} unresolved`, bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
        : undefined,
    },
    {
      title: 'Red Team Lab',
      description: 'Adversarial testing campaigns, jailbreak tests, and attack simulations.',
      path: '/security/red-team',
      icon: <Sword size={16} weight="fill" className="text-destructive" />,
      count: campaigns.length,
      countLabel: 'campaigns',
      badge: activeCampaigns > 0
        ? { label: `${activeCampaigns} active`, bg: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))' }
        : undefined,
    },
    {
      title: 'Attack Surface',
      description: 'External and internal asset exposure monitoring and risk assessment.',
      path: '/security/attack-surface',
      icon: <Globe size={16} style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      count: assets.length,
      countLabel: 'assets',
      badge: (() => {
        const exposed = assets.filter(a => a.exposure === 'public').length;
        return exposed > 0
          ? { label: `${exposed} public`, bg: 'hsl(var(--s-er-bg))', color: 'hsl(var(--destructive))' }
          : undefined;
      })(),
    },
    {
      title: 'Scan Center',
      description: 'Automated vulnerability scanning, compliance checks, and policy enforcement.',
      path: '/security/scans',
      icon: <Scan size={16} style={{ color: 'hsl(var(--brand))' }} />,
      count: scans.length,
      countLabel: 'scans recorded',
      badge: scansToday > 0
        ? { label: `${scansToday} today`, bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
        : undefined,
    },
    {
      title: 'Policy Firewall',
      description: 'AI guardrail rules — prompt injection, PII, jailbreak and exfiltration filters.',
      path: '/security/policies',
      icon: <Funnel size={16} style={{ color: 'hsl(var(--brand))' }} />,
      count: firewall.length,
      countLabel: 'rules',
      badge: enabledRules > 0
        ? { label: `${enabledRules} enabled`, bg: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }
        : undefined,
    },
  ];

  const securityKpiCards: StatCardRowItem[] = [
    {
      label: 'Open Vulnerabilities',
      value: String(unresolvedVulns),
      icon: <Bug size={18} weight="fill" style={{ color: 'hsl(var(--s-wn-tx))' }} />,
      delta: criticalVulns > 0 ? `${criticalVulns} critical` : undefined,
      deltaDir: criticalVulns > 0 ? ('up' as const) : undefined,
      isPositiveUp: false,
    },
    {
      label: 'Open Threats',
      value: String(openThreats),
      icon: <Fire size={18} weight="fill" style={{ color: 'hsl(var(--destructive))' }} />,
      delta: criticalThreats > 0 ? `${criticalThreats} critical` : undefined,
      deltaDir: criticalThreats > 0 ? ('up' as const) : undefined,
      isPositiveUp: false,
    },
    {
      label: 'Scans Today',
      value: String(scansToday),
      icon: <Scan size={18} style={{ color: 'hsl(var(--s-ok-tx))' }} />,
    },
    {
      label: 'Enabled Firewall Rules',
      value: String(enabledRules),
      icon: <ShieldWarning size={18} weight="fill" style={{ color: 'hsl(var(--brand))' }} />,
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
            <span>{lastScanAt ? `Last scan: ${formatDate(lastScanAt)}` : 'No scans yet'}</span>
          </div>
        }
      />

      {/* Real load errors, if any */}
      {loadErrors.length > 0 && (
        <div className="border border-[hsl(var(--destructive)/0.4)] bg-[hsl(var(--destructive)/0.06)] p-4">
          <p className="text-sm font-semibold text-[hsl(var(--destructive))]">Some security data could not be loaded</p>
          {loadErrors.map(e => (
            <p key={e.label} className="text-xs text-[hsl(var(--text-3))] mt-0.5">
              {e.label}: {(e.error as Error).message}
            </p>
          ))}
        </div>
      )}

      {/* Security KPI Row — real counts only */}
      <StatCardRow cards={securityKpiCards} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="sbom" style={{ borderRadius: 0 }}>
            <Package size={13} className="mr-1.5" />AI SBOM
          </TabsTrigger>
          <TabsTrigger value="red-team" style={{ borderRadius: 0 }}>
            <Sword size={13} className="mr-1.5" />Red Team
            {openFindings > 0 && (
              <span style={{ marginLeft: 6, background: 'hsl(var(--s-wn-bg))', color: 'hsl(var(--s-wn-tx))', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 0 }}>
                {openFindings} open
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recent Security Events — latest real threats + vulnerabilities */}
          <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                Recent Security Events
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentEvents.length === 0 ? (
                <p className="text-xs py-10 text-center" style={{ color: 'hsl(var(--text-4))' }}>
                  No threats or vulnerabilities recorded yet.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {recentEvents.map(ev => {
                    const sc = severityColor(ev.severity);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => navigate(ev.path)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
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
                          <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>{formatDate(ev.date)}</span>
                        </div>
                        <CaretRight size={13} className="mt-1 flex-shrink-0" style={{ color: 'hsl(var(--brand))' }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sub-Navigation Cards — real counts */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: 'hsl(var(--text-1))' }}>Security Modules</h2>
            <div className="grid grid-cols-3 gap-4">
              {subNavItems.map(item => (
                <SubNavCard key={item.path} {...item} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── AI SBOM Tab — honest empty state, no fabricated components ──────── */}
        <TabsContent value="sbom">
          <EmptyState
            icon={<Package size={32} weight="duotone" />}
            title="SBOM generation is not wired yet"
            description="This view will list AI/ML supply-chain components once SBOM generation is connected to a real inventory source. Model supply-chain records live in the AIBOM Registry."
            action={
              <Button variant="outline" onClick={() => navigate('/aibom')}>
                <ArrowSquareOut size={14} /> Open AIBOM Registry
              </Button>
            }
          />
        </TabsContent>

        {/* ── Red Team Tab — real findings from red_team_findings ─────────────── */}
        <TabsContent value="red-team" className="space-y-4">
          {findings.length === 0 ? (
            <EmptyState
              icon={<Sword size={32} weight="duotone" />}
              title="No red team findings yet"
              description="Findings logged in Red Team Findings will appear here."
              action={<Button variant="outline" onClick={() => navigate('/red-team-findings')}>Open Red Team Findings</Button>}
            />
          ) : (
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Adversarial Findings</CardTitle>
                  <Button variant="ghost" size="sm" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => navigate('/red-team-findings')}>
                    View All <CaretRight size={12} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        {['Ref', 'Finding', 'Severity', 'CVSS', 'OWASP LLM', 'Status'].map(h => (
                          <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {findings.slice(0, 8).map(f => {
                        const sc = severityColor(f.severity);
                        const sts = FINDING_STS[f.status ?? ''] ?? { bg: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))' };
                        return (
                          <tr key={f.id} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{f.findingRef || (f.id ? f.id.slice(0, 8) : '—')}</td>
                            <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'hsl(var(--text-1))' }}>{f.title}</td>
                            <td className="px-3 py-2.5">
                              <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>{pretty(f.severity)}</Badge>
                            </td>
                            <td className="px-3 py-2.5 text-xs font-mono font-bold" style={{ color: f.cvss != null && f.cvss >= 9 ? 'hsl(var(--destructive))' : f.cvss != null && f.cvss >= 7 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))' }}>
                              {f.cvss != null ? f.cvss.toFixed(1) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-xs font-mono" style={{ color: 'hsl(var(--brand))' }}>{f.owaspLlmRef || '—'}</td>
                            <td className="px-3 py-2.5">
                              <Badge style={{ background: sts.bg, color: sts.color, borderRadius: 0, fontSize: 10 }}>{pretty(f.status)}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
