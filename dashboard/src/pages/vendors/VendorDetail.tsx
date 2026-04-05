import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  ArrowLeft, Warning, CheckCircle, Globe, EnvelopeSimple, Shield,
  Buildings, Robot, Clock, Star, CalendarBlank,
} from '@phosphor-icons/react';
import { VENDORS, MODELS, severityColor, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f97316' : '#ef4444';
  const radius = (size / 2) - 10;
  const circumference = Math.PI * radius; // half circle
  const progress = (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size / 2 + 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        {/* Background arc */}
        <path
          d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
          fill="none" stroke="hsl(var(--bg-muted))" strokeWidth="10" strokeLinecap="butt"
        />
        {/* Score arc */}
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

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const vendor = VENDORS.find(v => v.id === id);

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
