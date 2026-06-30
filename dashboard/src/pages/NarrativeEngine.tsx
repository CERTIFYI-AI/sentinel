import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { TooltipProvider } from '../components/ui/tooltip';
import { toast } from 'sonner';
import {
  Brain, FileText, Users, ChartBar, Lightning, CheckCircle,
  ClockCounterClockwise, Warning, Eye, Download, Pencil, Sparkle,
} from '@phosphor-icons/react';
import { useSettingsStore } from '../stores/settingsStore';

const AUDIENCE_NARRATIVES: Record<string, { title: string; content: string; tone: string; wordCount: number }> = {
  board: {
    title: 'Board of Directors — Q2 2026 AI Risk Summary',
    tone: 'Strategic, non-technical',
    wordCount: 312,
    content: `Sentinel Financial Corp's AI governance posture has improved materially this quarter, with our overall compliance score reaching 75% across five major frameworks. Three critical risk items require board attention before our April 20th external audit.

Our Credit Scoring model — responsible for approximately 12,000 monthly loan decisions — is currently under a mandatory bias remediation cycle following a fairness drift detected in February. We expect full remediation by April 18th, two days ahead of the audit deadline. The financial impact of a non-remediation scenario has been modelled at $2.1M in regulatory exposure.

On the positive side, our Fraud Detection model continues to deliver top-quartile performance with a 94.2% detection rate and zero fairness violations over the quarter. This positions us favorably versus the 47 financial services peers tracked in our benchmarking network, where we rank in the 67th percentile overall.

Looking ahead, two EU AI Act articles take effect in Q3 2026 that will require updated conformity assessments for our high-risk models. The compliance team has pre-staged documentation for board sign-off in May. No additional budget is required beyond the existing AI Governance operating budget.

Recommendation: Approve the presented remediation plan for MDL-001 and authorize the CISO to execute EU AI Act Q3 conformity submissions on the board's behalf.`,
  },
  regulator: {
    title: 'Regulatory Disclosure — EU AI Act Article 9 Compliance Statement',
    tone: 'Formal, legal, precise',
    wordCount: 289,
    content: `COMPLIANCE STATEMENT — Sentinel Financial Corp AI Governance
Reference: EU Artificial Intelligence Act (Regulation 2024/1689) — Article 9 Risk Management System

Pursuant to Article 9 of the EU AI Act, Sentinel Financial Corp hereby attests to the following material facts regarding its deployed high-risk AI systems as of April 12, 2026:

HIGH-RISK SYSTEMS INVENTORY: Three (3) systems classified as high-risk per Annex III are currently operational: (1) CreditRisk-XGB-v3.2 (loan decision support), (2) FraudDetect-LSTM-v1.8 (financial crime detection), and (3) CreditScoreNLP-v2.1 (creditworthiness assessment).

RISK MANAGEMENT SYSTEM: A documented risk management system per Article 9(2) is in operation, reviewed quarterly. Current risk register contains 12 open items; 3 rated Critical, 6 rated High, 3 rated Medium. Remediation plans are in place for all critical items with defined remediation dates.

BIAS & FAIRNESS: Bias audits have been conducted for all three high-risk systems per Article 9(7). One system (MDL-001) is currently undergoing bias remediation following a detected demographic parity deviation. Estimated completion: April 18, 2026.

HUMAN OVERSIGHT: Human-in-the-loop controls are operational for all high-risk decisions. Override rate: 2.3%. All HITL decisions are logged and auditable.

This statement is prepared under the authority of the Chief Information Security Officer and is subject to external audit verification commencing April 20, 2026.`,
  },
  technical: {
    title: 'Engineering Lead Briefing — Model Risk Status Q2 2026',
    tone: 'Technical, metric-driven',
    wordCount: 341,
    content: `MODEL PERFORMANCE SUMMARY — Q2 2026 (April 12, 2026)

MDL-001 | CreditRisk-XGB-v3.2 | Status: REMEDIATION
- Accuracy: 87.3% (vs 88.1% baseline, -0.8% drift detected Jan 15)
- Demographic Parity Difference: 0.12 (threshold: 0.10 — VIOLATION)
- Equal Opportunity Difference: 0.08 (threshold: 0.10 — PASS)
- Root cause: Training data imbalance post-2024 resampling. Retraining scheduled Apr 17.
- SHA-256: a3f8c12e9b74d105… (last verified Apr 10, 08:00 UTC — PASS)
- SHAP feature importance: income_ratio (0.31), credit_history_len (0.22), utilization_rate (0.19)

MDL-002 | FraudDetect-LSTM-v1.8 | Status: HEALTHY
- F1-Score: 0.942 | Precision: 0.951 | Recall: 0.933
- False Positive Rate: 0.031 (SLA threshold: 0.05 — PASS)
- Latency p99: 142ms (SLA: 200ms — PASS)
- No fairness drift detected. Last bias audit: Dec 5, 2025 — PASSED.

MODEL INFRASTRUCTURE:
- Trust Engine: 14,823 requests/day | 2.1% escalation rate | 99.7% uptime
- Kill Switch: Blast radius tested Mar 1. Recovery time objective: <4min.
- Agent Registry: 4 active agents | 0 unauthorized | IAM last rotated Apr 1.

ACTION ITEMS (Engineering):
1. [HIGH] Retrain MDL-001 with balanced SMOTE dataset by Apr 17 [Owner: Raj Mehta]
2. [MEDIUM] Upgrade MDL-004 inference layer to TensorRT 8.6 by Apr 30 [Owner: ML Platform]
3. [LOW] Refresh SHA-256 verification schedule to bi-weekly for all prod models [Owner: MLOps]`,
  },
};

const NARRATIVE_HISTORY = [
  { id: 'NAR-021', title: 'Board Q1 2026 AI Risk Summary', audience: 'Board', date: '2026-01-12', status: 'Approved', approvedBy: 'James Patel' },
  { id: 'NAR-020', title: 'EU AI Act Article 13 Transparency Statement', audience: 'Regulator', date: '2026-02-28', status: 'Submitted', approvedBy: 'Sarah Chen' },
  { id: 'NAR-019', title: 'Q4 2025 Engineering Risk Briefing', audience: 'Technical', date: '2025-12-15', status: 'Approved', approvedBy: 'Raj Mehta' },
  { id: 'NAR-018', title: 'Board Q4 2025 AI Risk Summary', audience: 'Board', date: '2025-10-12', status: 'Approved', approvedBy: 'James Patel' },
];

const CALIBRATION_SIGNALS = [
  { signal: 'Risk Appetite', org: 'Conservative', effect: 'Narratives lead with risk mitigation evidence and downplay upside exposure' },
  { signal: 'Regulatory Posture', org: 'Proactive Compliance', effect: 'Regulatory narratives emphasize advance preparation and article-level mapping' },
  { signal: 'Board Technical Level', org: 'Non-technical', effect: 'Board narratives use business impact language; no model metrics in executive summaries' },
  { signal: 'Preferred Tone', org: 'Formal / Conservative', effect: 'Avoids colloquialisms; uses passive voice where appropriate for regulatory tone' },
  { signal: 'Priority Framework', org: 'EU AI Act + ISO 27001', effect: 'Narratives foreground EU AI Act article references and ISO control mappings' },
  { signal: 'Calibration Period', org: '14 months of approved narratives', effect: 'Style drift < 2% from approved baseline (NAR-001 through NAR-021)' },
];

export default function NarrativeEngine() {
  const { orgName } = useSettingsStore();
  const [tab, setTab] = useState('generate');
  const [audience, setAudience] = useState('board');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(AUDIENCE_NARRATIVES['board'].content);

  const handleGenerate = () => {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      setContent(AUDIENCE_NARRATIVES[audience].content);
      toast.success(`${AUDIENCE_NARRATIVES[audience].title} generated`);
    }, 1800);
  };

  const narrative = AUDIENCE_NARRATIVES[audience];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Executive AI Narrative Engine</h1>
              <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--brand) / 0.12)', color: 'hsl(var(--brand))', border: '1px solid hsl(var(--brand) / 0.3)' }}>
                PROPRIETARY AI
              </Badge>
            </div>
            <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
              {orgName} · AI-generated board, regulatory, and technical narratives calibrated to your organization's risk appetite, terminology, and communication style
            </p>
          </div>
        </div>

        <div className="p-3 flex items-start gap-3" style={{ border: '1px solid hsl(var(--brand) / 0.3)', background: 'hsl(var(--brand) / 0.04)' }}>
          <Brain size={16} style={{ color: 'hsl(var(--brand))', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>Continuously Calibrated Intelligence — Built on 14 Months of Approved Narratives</p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
              Every approved narrative is used to further calibrate the engine to your organization's unique risk language, board preferences, and regulatory posture.
              Competitors cannot replicate this calibration without your 21 approved narratives as training signal.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={{ borderRadius: 0 }}>
            <TabsTrigger value="generate" style={{ borderRadius: 0 }}>Generate Narrative</TabsTrigger>
            <TabsTrigger value="history" style={{ borderRadius: 0 }}>Narrative History</TabsTrigger>
            <TabsTrigger value="calibration" style={{ borderRadius: 0 }}>Org Calibration Signals</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-4">
                <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Narrative Configuration</p>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Target Audience</Label>
                      <Select value={audience} onValueChange={a => { setAudience(a); setGenerated(false); }}>
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="board">Board of Directors</SelectItem>
                          <SelectItem value="regulator">Regulatory Body</SelectItem>
                          <SelectItem value="technical">Engineering / Technical Lead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Time Period</Label>
                      <Select defaultValue="q2-2026">
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="q2-2026">Q2 2026</SelectItem>
                          <SelectItem value="q1-2026">Q1 2026</SelectItem>
                          <SelectItem value="ytd">Year-to-Date 2026</SelectItem>
                          <SelectItem value="custom">Custom period…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Length</Label>
                      <Select defaultValue="standard">
                        <SelectTrigger style={{ borderRadius: 0 }}><SelectValue /></SelectTrigger>
                        <SelectContent style={{ borderRadius: 0 }}>
                          <SelectItem value="brief">Brief (150 words)</SelectItem>
                          <SelectItem value="standard">Standard (300 words)</SelectItem>
                          <SelectItem value="detailed">Detailed (500 words)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block" style={{ color: 'hsl(var(--text-4))' }}>Include Sections</Label>
                      <div className="space-y-1.5">
                        {['Risk Status Overview', 'Model Performance', 'Regulatory Compliance', 'Recommended Actions', 'Forward-Looking Statements'].map(s => (
                          <div key={s} className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked style={{ accentColor: 'hsl(var(--brand))' }} />
                            <span className="text-xs" style={{ color: 'hsl(var(--text-2))' }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: 'hsl(var(--bg-surface))' }}
                      onClick={handleGenerate} disabled={generating}>
                      {generating ? (
                        <><ClockCounterClockwise size={13} className="mr-2 animate-spin" />Generating…</>
                      ) : (
                        <><Sparkle size={13} className="mr-2" />Generate Narrative</>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <div className="p-3 space-y-1.5" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                  <p className="text-[10px] font-semibold" style={{ color: 'hsl(var(--text-4))' }}>CALIBRATION ACTIVE</p>
                  <div className="text-[10px] space-y-1" style={{ color: 'hsl(var(--text-3))' }}>
                    <div>Tone: <strong style={{ color: 'hsl(var(--text-1))' }}>{narrative.tone}</strong></div>
                    <div>Org risk appetite: <strong style={{ color: 'hsl(var(--text-1))' }}>Conservative</strong></div>
                    <div>Framework focus: <strong style={{ color: 'hsl(var(--text-1))' }}>EU AI Act + ISO 27001</strong></div>
                    <div>Approved examples: <strong style={{ color: 'hsl(var(--brand))' }}>21 narratives (14 months)</strong></div>
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                {generated && (
                  <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{narrative.title}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--text-4))' }}>
                            Generated {new Date().toLocaleString()} · ~{narrative.wordCount} words · Audience: {narrative.tone}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" style={{ borderRadius: 0 }}
                            onClick={() => setEditing(!editing)}>
                            <Pencil size={11} className="mr-1" />{editing ? 'Lock' : 'Edit'}
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2" style={{ borderRadius: 0 }}
                            onClick={() => { toast.success('Narrative approved and added to calibration corpus'); }}>
                            <CheckCircle size={11} className="mr-1" />Approve
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2" style={{ borderRadius: 0 }}
                            onClick={() => { toast.success('Downloading narrative PDF'); }}>
                            <Download size={11} className="mr-1" />Export
                          </Button>
                        </div>
                      </div>
                      {editing ? (
                        <Textarea
                          value={content}
                          onChange={e => setContent(e.target.value)}
                          className="text-xs leading-relaxed"
                          style={{ borderRadius: 0, minHeight: 380, fontFamily: 'inherit' }}
                        />
                      ) : (
                        <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'hsl(var(--text-2))' }}>
                          {content}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                {!generated && !generating && (
                  <div className="flex items-center justify-center h-60" style={{ border: '2px dashed hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
                    <div className="text-center">
                      <Brain size={32} style={{ color: 'hsl(var(--text-4))', margin: '0 auto 8px' }} />
                      <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>Select audience and click Generate</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['ID', 'Title', 'Audience', 'Generated', 'Status', 'Approved By', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {NARRATIVE_HISTORY.map((n, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'hsl(var(--brand))' }}>{n.id}</td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{n.title}</td>
                        <td className="px-4 py-2.5">
                          <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--s-nt-bg))', color: 'hsl(var(--s-nt-tx))' }}>{n.audience}</Badge>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'hsl(var(--text-4))' }}>{n.date}</td>
                        <td className="px-4 py-2.5">
                          <Badge style={{ borderRadius: 0, fontSize: 9, background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))' }}>{n.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'hsl(var(--text-3))' }}>{n.approvedBy}</td>
                        <td className="px-4 py-2.5">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" style={{ borderRadius: 0 }}>
                            <Eye size={10} className="mr-1" />View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calibration" className="mt-4 space-y-4">
            <div className="p-3" style={{ border: '1px solid hsl(var(--brand) / 0.3)', background: 'hsl(var(--brand) / 0.04)' }}>
              <p className="text-xs font-semibold" style={{ color: 'hsl(var(--brand))' }}>How Calibration Creates a Moat</p>
              <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-3))' }}>
                Each approved narrative enriches the engine's understanding of your organization's unique communication style. After 21 approved narratives across 3 audience types,
                the engine produces output that reads as if written by your own team — adapting automatically as your risk posture, frameworks, and leadership evolve.
                This calibration is exclusively yours and cannot be transferred to any other platform.
              </p>
            </div>
            <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      {['Calibration Signal', 'Org Setting', 'Effect on Narratives'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CALIBRATION_SIGNALS.map((sig, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--text-1))' }}>{sig.signal}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-1.5 py-0.5" style={{ background: 'hsl(var(--brand) / 0.1)', color: 'hsl(var(--brand))' }}>{sig.org}</span>
                        </td>
                        <td className="px-4 py-3" style={{ color: 'hsl(var(--text-3))' }}>{sig.effect}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
