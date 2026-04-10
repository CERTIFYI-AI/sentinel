import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Warning, CheckCircle, Globe, EnvelopeSimple, Shield,
  Buildings, Robot, Clock, Star, CalendarBlank, FileText, Users,
  FilePdf, FileDashed, Download, UploadSimple, CurrencyDollar,
} from '@phosphor-icons/react';
import { VENDORS, MODELS, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';
import { toast } from 'sonner';

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f97316' : '#ef4444';
  const radius = (size / 2) - 10;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none" stroke="hsl(var(--bg-muted))" strokeWidth="10" strokeLinecap="butt"
        />
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="butt"
          strokeDasharray={`${progress} ${circumference}`}
        />
      </svg>
      <div style={{ position: 'absolute', bottom: 0, textAlign: 'center' }}>
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>/ 100</p>
      </div>
    </div>
  );
}

const MOCK_REVIEWS = [
  { date: '2026-03-01', reviewer: 'James Patel', score: 87, notes: 'Renewed DPA. Security posture strong, minor compliance gaps identified.', result: 'passed' },
  { date: '2025-09-15', reviewer: 'David Kim', score: 84, notes: 'Annual review completed. Data residency controls need improvement.', result: 'passed' },
  { date: '2025-03-10', reviewer: 'Emma Wilson', score: 79, notes: 'Initial vendor assessment. SOC 2 pending, some open findings.', result: 'passed' },
];

interface ContractDoc {
  name: string;
  type: string;
  status: 'active' | 'expired' | 'pending' | 'missing';
  size: string;
  uploaded: string;
  icon: typeof FilePdf;
}

function contractDocs(vendorName: string): ContractDoc[] {
  return [
    { name: `${vendorName} — Data Processing Agreement (DPA)`, type: 'DPA', status: 'active', size: '420 KB', uploaded: '2026-02-10', icon: FilePdf },
    { name: `${vendorName} — SOC 2 Type II Report`, type: 'SOC 2', status: 'active', size: '3.8 MB', uploaded: '2026-01-15', icon: FilePdf },
    { name: `${vendorName} — ISO 27001 Certificate`, type: 'ISO 27001', status: 'active', size: '180 KB', uploaded: '2025-12-01', icon: FileText },
    { name: `${vendorName} — Penetration Test Report`, type: 'PenTest', status: 'pending', size: '—', uploaded: '—', icon: FileDashed },
  ];
}

interface SubProcessor {
  name: string;
  purpose: string;
  location: string;
  transfers: string;
  risk: 'low' | 'medium' | 'high';
}

function subProcessors(): SubProcessor[] {
  return [
    { name: 'AWS (Amazon Web Services)', purpose: 'Cloud infrastructure & data storage', location: 'US East / EU West', transfers: 'SCCs in place', risk: 'low' },
    { name: 'Datadog', purpose: 'Application monitoring & logging', location: 'US (Virginia)', transfers: 'SCCs in place', risk: 'low' },
    { name: 'Snowflake', purpose: 'Data analytics warehouse', location: 'US West', transfers: 'SCCs in place', risk: 'medium' },
    { name: 'Stripe', purpose: 'Payment processing', location: 'US / EU', transfers: 'SCCs + Binding Rules', risk: 'low' },
  ];
}

function docStatusBadge(status: ContractDoc['status']) {
  const map = {
    active: { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))', label: 'Active' },
    expired: { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))', label: 'Expired' },
    pending: { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))', label: 'Pending' },
    missing: { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))', border: 'hsl(var(--border))', label: 'Missing' },
  };
  return map[status];
}

function riskColor(risk: 'low' | 'medium' | 'high') {
  if (risk === 'low') return { bg: 'hsl(var(--s-ok-bg))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--s-ok-br))' };
  if (risk === 'medium') return { bg: 'hsl(var(--s-wn-bg))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--s-wn-br))' };
  return { bg: 'hsl(var(--s-er-bg))', text: 'hsl(var(--s-er-tx))', border: 'hsl(var(--s-er-br))' };
}

function daysToExpiry(dateStr: string): number {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const vendor = VENDORS.find(v => v.id === id);
  const [uploadedDocs, setUploadedDocs] = useState(false);

  if (!vendor) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: '#f97316' }} />
        <p className="mt-4 text-lg font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Vendor not found</p>
        <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>Vendor ID "{id}" does not exist in the registry.</p>
        <Button className="mt-4" onClick={() => navigate('/vendors')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Vendors
        </Button>
      </div>
    );
  }

  const linkedModels = MODELS.filter(m => vendor.linkedModels.includes(m.id));
  const sc = statusColor(vendor.status);
  const rc = severityColor(vendor.risk);
  const scoreColor = vendor.score >= 80 ? '#10b981' : vendor.score >= 60 ? '#f97316' : '#ef4444';

  const dimentionBars = [
    { label: 'Security', value: vendor.scoreBreakdown.security },
    { label: 'Compliance', value: vendor.scoreBreakdown.compliance },
    { label: 'Reliability', value: vendor.scoreBreakdown.reliability },
    { label: 'Data Privacy', value: vendor.scoreBreakdown.dataPrivacy },
  ];

  function dimColor(v: number) {
    if (v >= 80) return '#10b981';
    if (v >= 60) return '#f97316';
    return '#ef4444';
  }

  const contractExpiry = '2026-12-31';
  const contractValue = 48000;
  const dte = daysToExpiry(contractExpiry);
  const docs = contractDocs(vendor.name);
  const subs = subProcessors();

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')} style={{ marginBottom: 12, padding: '4px 8px' }}>
          <ArrowLeft size={14} className="mr-1" /> Back to Vendors
        </Button>

        {/* DPA Banner */}
        {vendor.dpaStatus === 'not_signed' && (
          <div style={{ background: '#ef444415', border: '1px solid #ef4444', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Warning size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>DPA Not Signed — Immediate Action Required</p>
              <p className="text-xs" style={{ color: '#ef4444', opacity: 0.8 }}>
                This vendor does not have a signed Data Processing Agreement. GDPR compliance is at risk. Suspend data sharing until resolved.
              </p>
            </div>
            <Button size="sm" style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', borderRadius: 0, flexShrink: 0 }}>
              Initiate DPA
            </Button>
          </div>
        )}

        {vendor.dpaStatus === 'pending' && (
          <div style={{ background: '#f9731615', border: '1px solid #f97316', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} style={{ color: '#f97316', flexShrink: 0 }} />
            <p className="text-sm font-medium" style={{ color: '#f97316' }}>DPA Pending Signature — Follow up with vendor to expedite.</p>
          </div>
        )}

        {/* Contract expiry warning */}
        {dte <= 90 && dte > 0 && (
          <div style={{ background: '#f9731615', border: '1px solid #f97316', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarBlank size={18} style={{ color: '#f97316', flexShrink: 0 }} />
            <p className="text-sm font-medium" style={{ color: '#f97316' }}>
              Master contract expires in <strong>{dte} days</strong> ({contractExpiry}) — initiate renewal to avoid service disruption.
            </p>
            <Button size="sm" variant="outline" style={{ marginLeft: 'auto', borderRadius: 0, borderColor: '#f97316', color: '#f97316', flexShrink: 0 }}>
              Start Renewal
            </Button>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>{vendor.name}</h1>
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
              {orgName} · {vendor.category} · Vendor ID: {vendor.id}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0 }}>
              {vendor.risk} risk
            </Badge>
            <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0 }}>
              {vendor.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList style={{ borderRadius: 0, background: 'hsl(var(--bg-muted))' }}>
          <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
          <TabsTrigger value="contract" style={{ borderRadius: 0 }}>Contract</TabsTrigger>
          <TabsTrigger value="documents" style={{ borderRadius: 0 }}>Documents</TabsTrigger>
          <TabsTrigger value="subprocessors" style={{ borderRadius: 0 }}>Sub-processors ({subs.length})</TabsTrigger>
          <TabsTrigger value="scorecard" style={{ borderRadius: 0 }}>Scorecard</TabsTrigger>
          <TabsTrigger value="models" style={{ borderRadius: 0 }}>Linked Models ({linkedModels.length})</TabsTrigger>
          <TabsTrigger value="reviews" style={{ borderRadius: 0 }}>Review History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Score Gauge */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '1' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Overall Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-4">
                <ScoreGauge score={vendor.score} size={160} />
                <div className="mt-3 text-center">
                  <Badge style={{ background: `${scoreColor}20`, color: scoreColor, border: `1px solid ${scoreColor}`, borderRadius: 0, fontSize: 12 }}>
                    {vendor.score >= 80 ? 'Low Risk' : vendor.score >= 60 ? 'Medium Risk' : 'High Risk'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Details */}
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))', gridColumn: '2 / 4' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Vendor Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4" style={{ color: 'hsl(var(--text-2))' }}>{vendor.description}</p>
                <div className="grid grid-cols-2 gap-x-8">
                  {[
                    { label: 'Category', value: vendor.category, icon: Buildings },
                    { label: 'Website', value: vendor.website, icon: Globe },
                    { label: 'Contact', value: vendor.contact, icon: EnvelopeSimple },
                    { label: 'Last Review', value: formatDate(vendor.lastReview), icon: CalendarBlank },
                    { label: 'DPA Status', value: vendor.dpaStatus, icon: Shield },
                    { label: 'Linked Models', value: vendor.linkedModels.length || 'None', icon: Robot },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <r.icon size={14} style={{ color: 'hsl(var(--text-3))', flexShrink: 0 }} />
                      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{r.label}</span>
                      <span className="text-xs font-medium ml-auto" style={{ color: 'hsl(var(--text-1))' }}>
                        {typeof r.value === 'number' ? r.value : r.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contract Tab */}
        <TabsContent value="contract" className="mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Contract Value', value: `$${contractValue.toLocaleString()}/yr`, icon: CurrencyDollar, color: '#6366f1' },
              { label: 'Expiry Date', value: contractExpiry, icon: CalendarBlank, color: dte <= 90 ? '#f97316' : '#10b981' },
              { label: 'Days to Expiry', value: dte > 0 ? `${dte}d` : 'Expired', icon: Clock, color: dte <= 30 ? '#ef4444' : dte <= 90 ? '#f97316' : '#10b981' },
              { label: 'SLA Uptime', value: '99.9%', icon: Star, color: '#10b981' },
            ].map(s => (
              <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                    <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
                  </div>
                  <s.icon size={22} style={{ color: s.color }} />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Master Service Agreement — Key Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {[
                { term: 'Contract Type', value: 'Enterprise SaaS Agreement' },
                { term: 'Effective Date', value: '2024-01-01' },
                { term: 'Expiry Date', value: contractExpiry },
                { term: 'Auto-Renewal', value: '60 days notice required' },
                { term: 'Governing Law', value: 'New York, USA' },
                { term: 'SLA — Uptime', value: '99.9% monthly (excl. maintenance)' },
                { term: 'SLA — Response Time', value: 'P1: 1h / P2: 4h / P3: 24h' },
                { term: 'SLA — Penalty', value: 'Service credits up to 30% monthly fee' },
                { term: 'Data Residency', value: 'EU & US regions available' },
                { term: 'Audit Rights', value: 'Annual audit clause — Article 28 GDPR' },
                { term: 'Termination', value: '90 days written notice, either party' },
                { term: 'Liability Cap', value: '12 months contract value' },
              ].map((r, i) => (
                <div key={r.term} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid hsl(var(--border))', background: i % 2 === 0 ? 'transparent' : 'hsl(var(--bg-muted) / 0.4)' }}>
                  <span className="text-xs font-medium" style={{ color: 'hsl(var(--text-3))' }}>{r.term}</span>
                  <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{r.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => toast.success('Contract renewal initiated — email sent to vendor')}>
              <CalendarBlank size={14} className="mr-1" /> Initiate Renewal
            </Button>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => toast.info('SLA report generated')}>
              <FileText size={14} className="mr-1" /> Generate SLA Report
            </Button>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'hsl(var(--text-3))' }}>
              Compliance documents, certificates, and agreements for {vendor.name}
            </p>
            <Button size="sm" style={{ borderRadius: 0 }} onClick={() => { setUploadedDocs(true); toast.success('Document uploaded to vault'); }}>
              <UploadSimple size={14} className="mr-1" /> Upload Document
            </Button>
          </div>

          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-0">
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                  <tr>
                    {['Document', 'Type', 'Status', 'Uploaded', 'Size', 'Actions'].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, i) => {
                    const ds = docStatusBadge(doc.status);
                    return (
                      <tr key={i} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <doc.icon size={16} style={{ color: doc.status === 'active' ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))', flexShrink: 0 }} />
                            <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{doc.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{doc.type}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge style={{ background: ds.bg, color: ds.text, border: `1px solid ${ds.border}`, borderRadius: 0, fontSize: 10 }}>
                            {ds.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                          {doc.uploaded !== '—' ? formatDate(doc.uploaded) : '—'}
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{doc.size}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {doc.status === 'active' ? (
                              <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.success(`Downloading ${doc.type}...`)}>
                                <Download size={13} className="mr-1" /> Download
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.info(`Request sent to ${vendor.name} for ${doc.type}`)}>
                                <UploadSimple size={13} className="mr-1" /> Request
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {uploadedDocs && (
                    <tr style={{ borderTop: '1px solid hsl(var(--border))' }}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <FileText size={16} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                          <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{vendor.name} — Custom Document</span>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>Custom</Badge></td>
                      <td className="p-3">
                        <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))', borderRadius: 0, fontSize: 10 }}>Active</Badge>
                      </td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{new Date().toISOString().split('T')[0]}</td>
                      <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>—</td>
                      <td className="p-3">
                        <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }}>
                          <Download size={13} className="mr-1" /> Download
                        </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sub-processors Tab */}
        <TabsContent value="subprocessors" className="mt-4 space-y-4">
          <div style={{ padding: '10px 14px', background: 'hsl(var(--s-in-bg))', border: '1px solid hsl(var(--s-in-br))' }}>
            <p className="text-xs" style={{ color: 'hsl(var(--s-in-tx))' }}>
              Under GDPR Article 28, {vendor.name} must maintain an up-to-date list of sub-processors and notify {orgName} of changes with 30 days notice.
              Standard Contractual Clauses (SCCs) or Binding Corporate Rules (BCRs) must be in place for any EEA data transfers.
            </p>
          </div>

          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  Sub-processors List
                </div>
              </CardTitle>
              <Badge variant="outline" style={{ borderRadius: 0 }}>Last updated: 2026-03-01</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead style={{ background: 'hsl(var(--bg-muted))' }}>
                  <tr>
                    {['Sub-processor', 'Purpose', 'Location', 'Transfer Mechanism', 'Risk', 'Actions'].map(h => (
                      <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sp, i) => {
                    const rc = riskColor(sp.risk);
                    return (
                      <tr key={i} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                        <td className="p-3">
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{sp.name}</p>
                        </td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{sp.purpose}</td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>{sp.location}</td>
                        <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{sp.transfers}</td>
                        <td className="p-3">
                          <Badge style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`, borderRadius: 0, fontSize: 10 }}>
                            {sp.risk}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => toast.info(`Reviewing ${sp.name} transfer impact...`)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between px-1">
            <p className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>
              {subs.length} sub-processors · {subs.filter(s => s.risk === 'low').length} low risk · {subs.filter(s => s.risk === 'medium').length} medium risk · {subs.filter(s => s.risk === 'high').length} high risk
            </p>
            <Button size="sm" variant="outline" style={{ borderRadius: 0 }} onClick={() => toast.success('Sub-processor change notification requested from vendor')}>
              Request Update
            </Button>
          </div>
        </TabsContent>

        {/* Scorecard Tab */}
        <TabsContent value="scorecard" className="mt-4">
          <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Risk Dimension Scorecard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {dimentionBars.map(d => {
                const color = dimColor(d.value);
                return (
                  <div key={d.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{d.label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{d.value} / 100</span>
                    </div>
                    <div style={{ height: 10, background: 'hsl(var(--bg-muted))' }}>
                      <div style={{ width: `${d.value}%`, height: '100%', background: color, transition: 'width 0.5s ease' }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                      {d.value >= 80 ? 'Meets requirements' : d.value >= 60 ? 'Partial compliance — remediation recommended' : 'Below threshold — immediate action required'}
                    </p>
                  </div>
                );
              })}

              <div style={{ padding: '12px 16px', background: 'hsl(var(--bg-muted))', borderTop: '2px solid hsl(var(--border))' }}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Overall Vendor Score</span>
                  <span className="text-2xl font-bold" style={{ color: scoreColor }}>{vendor.score} / 100</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Models Tab */}
        <TabsContent value="models" className="mt-4">
          {linkedModels.length === 0 ? (
            <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Robot size={40} style={{ color: 'hsl(var(--text-3))' }} />
                <p className="mt-3 text-sm font-medium" style={{ color: 'hsl(var(--text-3))' }}>No models linked to this vendor</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {linkedModels.map(m => (
                <Card key={m.id} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{m.id}</span>
                          <Badge style={{ background: statusColor(m.status).bg, color: statusColor(m.status).text, border: `1px solid ${statusColor(m.status).border}`, borderRadius: 0, fontSize: 10 }}>{m.status}</Badge>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{m.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>{m.type} · {m.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Accuracy</p>
                        <p className="text-lg font-bold" style={{ color: '#10b981' }}>{m.accuracy}%</p>
                        <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Fairness: {m.fairnessScore}</p>
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'hsl(var(--text-2))' }}>{m.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Review History Tab */}
        <TabsContent value="reviews" className="mt-4">
          <div className="space-y-3">
            {MOCK_REVIEWS.map((review, i) => (
              <Card key={i} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Review #{MOCK_REVIEWS.length - i}</p>
                      <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{formatDate(review.date)} · Reviewed by {review.reviewer}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold" style={{ color: dimColor(review.score) }}>{review.score}</span>
                      <Badge style={{ background: '#10b98120', color: '#10b981', border: '1px solid #10b981', borderRadius: 0, fontSize: 10 }}>
                        <CheckCircle size={10} className="mr-1" /> {review.result}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: 'hsl(var(--text-2))' }}>{review.notes}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
