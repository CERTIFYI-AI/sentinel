import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  ArrowLeft, CheckCircle, Warning, ClipboardText, PaperPlaneTilt,
  Shield, Lock, Certificate, FileText, Robot, Database,
  Student, Buildings, ArrowsClockwise,
} from '@phosphor-icons/react';
import { VENDORS, statusColor } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';


interface QuestionOption {
  value: string;
  label: string;
  points: number;
}

interface Question {
  id: string;
  text: string;
  icon: React.ElementType;
  category: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    id: 'Q1',
    text: 'Data encryption at rest',
    icon: Lock,
    category: 'Data Security',
    options: [
      { value: 'yes', label: 'Yes — AES-256 or equivalent', points: 10 },
      { value: 'partial', label: 'Partial — Some systems encrypted', points: 5 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q2',
    text: 'SOC 2 Type II certification',
    icon: Certificate,
    category: 'Certification',
    options: [
      { value: 'yes', label: 'Yes — Current certificate', points: 10 },
      { value: 'in_progress', label: 'In Progress', points: 5 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q3',
    text: 'GDPR Data Processing Agreement (DPA) signed',
    icon: FileText,
    category: 'Compliance',
    options: [
      { value: 'yes', label: 'Yes — Signed & current', points: 10 },
      { value: 'pending', label: 'Pending signature', points: 3 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q4',
    text: 'Documented incident response plan',
    icon: Warning,
    category: 'Incident Response',
    options: [
      { value: 'yes', label: 'Yes — Tested in last 12 months', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q5',
    text: 'Annual penetration testing',
    icon: Shield,
    category: 'Security Testing',
    options: [
      { value: 'yes', label: 'Yes — Third-party pentest', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q6',
    text: 'Data residency controls for EU/US data',
    icon: Database,
    category: 'Data Governance',
    options: [
      { value: 'yes', label: 'Yes — Full geographic controls', points: 10 },
      { value: 'partial', label: 'Partial — Limited controls', points: 4 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q7',
    text: 'AI model access logging and audit trails',
    icon: Robot,
    category: 'AI Governance',
    options: [
      { value: 'yes', label: 'Yes — Full audit logging', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q8',
    text: 'Employee security awareness training',
    icon: Student,
    category: 'People Security',
    options: [
      { value: 'quarterly', label: 'Quarterly or more frequent', points: 10 },
      { value: 'yes', label: 'Annual training', points: 6 },
      { value: 'no', label: 'No formal training', points: 0 },
    ],
  },
  {
    id: 'Q9',
    text: 'Business continuity and disaster recovery plan',
    icon: Buildings,
    category: 'Resilience',
    options: [
      { value: 'yes', label: 'Yes — Tested BCP/DRP in place', points: 10 },
      { value: 'no', label: 'No', points: 0 },
    ],
  },
  {
    id: 'Q10',
    text: 'Sub-processor disclosures provided',
    icon: ArrowsClockwise,
    category: 'Third-Party Risk',
    options: [
      { value: 'yes', label: 'Yes — Full list disclosed', points: 10 },
      { value: 'partial', label: 'Partial — Key subs only', points: 4 },
      { value: 'no', label: 'No disclosure', points: 0 },
    ],
  },
];

const MAX_SCORE = QUESTIONS.reduce((sum, q) => sum + Math.max(...q.options.map(o => o.points)), 0);

interface Answers {
  [questionId: string]: {
    value: string;
    notes: string;
  };
}

export default function VendorQuestionnaire() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgName } = useSettingsStore();

  const vendor = VENDORS.find(v => v.id === id);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(qId: string, value: string) {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], value } }));
  }

  function setNotes(qId: string, notes: string) {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], notes } }));
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]?.value).length;
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  const score = QUESTIONS.reduce((sum, q) => {
    const answer = answers[q.id]?.value;
    const option = q.options.find(o => o.value === answer);
    return sum + (option?.points || 0);
  }, 0);

  const scorePercent = Math.round((score / MAX_SCORE) * 100);

  function scoreColor(pct: number) {
    if (pct >= 80) return 'hsl(var(--s-ok-tx))';
    if (pct >= 60) return 'hsl(var(--r-hi-tx))';
    return 'hsl(var(--s-er-tx))';
  }

  function handleSubmit() {
    if (answeredCount < QUESTIONS.length) return;
    setSubmitted(true);
  }

  if (!vendor) {
    return (
      <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 400 }}>
        <Warning size={48} style={{ color: 'hsl(var(--r-hi-tx))' }} />
        <p className="mt-4 text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Vendor not found</p>
        <Button className="mt-4" onClick={() => navigate('/vendors')} style={{ borderRadius: 0 }}>
          <ArrowLeft size={14} /> Back
        </Button>
      </div>
    );
  }

  if (submitted) {
    const color = scoreColor(scorePercent);
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/vendors/${id}`)} style={{ padding: '4px 8px' }}>
          <ArrowLeft size={14} /> Back to Vendor
        </Button>
        <Card style={{ background: 'hsl(var(--bg-surface))', border: `2px solid ${color}` }}>
          <CardContent className="p-8 flex flex-col items-center text-center">
            <CheckCircle size={56} style={{ color }} />
            <h2 className="text-2xl font-bold mt-4" style={{ color: 'hsl(var(--text-1))' }}>Questionnaire Submitted</h2>
            <p className="text-sm mt-2" style={{ color: 'hsl(var(--text-3))' }}>{vendor.name} · Completed by {orgName}</p>
            <div className="mt-6 flex flex-col items-center">
              <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--text-3))' }}>AUTO-SCORE</p>
              <p className="text-6xl font-bold" style={{ color }}>{scorePercent}%</p>
              <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>{score} / {MAX_SCORE} points</p>
              <Badge style={{ marginTop: 12, background: `${color}20`, color, border: `1px solid ${color}`, borderRadius: 0, fontSize: 13, padding: '4px 12px' }}>
                {scorePercent >= 80 ? 'Low Risk — Approved' : scorePercent >= 60 ? 'Medium Risk — Review Required' : 'High Risk — Escalate to CISO'}
              </Badge>
            </div>
            <div className="mt-8 w-full max-w-md">
              <div className="grid grid-cols-2 gap-3 text-left">
                {QUESTIONS.map(q => {
                  const answer = answers[q.id];
                  const option = q.options.find(o => o.value === answer?.value);
                  return (
                    <div key={q.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{q.id}: {q.text.slice(0, 30)}</span>
                      <span className="text-xs font-semibold" style={{ color: option && option.points === 10 ? 'hsl(var(--s-ok-tx))' : option && option.points > 0 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))' }}>
                        {option?.points || 0}pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => setSubmitted(false)} variant="outline" style={{ borderRadius: 0 }}>Edit Responses</Button>
              <Button onClick={() => navigate(`/vendors/${id}`)} style={{ borderRadius: 0 }}>
                Back to Vendor Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/vendors/${id}`)} style={{ padding: '4px 8px' }}>
        <ArrowLeft size={14} /> Back to {vendor.name}
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Security Questionnaire</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {vendor.name} · {vendor.category} · {QUESTIONS.length} questions
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Live Score */}
          {answeredCount > 0 && (
            <div className="text-right">
              <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>Live Score</p>
              <p className="text-2xl font-bold" style={{ color: scoreColor(scorePercent) }}>{scorePercent}%</p>
            </div>
          )}
          {/* Progress */}
          <div className="text-right">
            <p className="text-xs mb-1" style={{ color: 'hsl(var(--text-3))' }}>{answeredCount}/{QUESTIONS.length} answered</p>
            <div style={{ width: 120, height: 6, background: 'hsl(var(--bg-muted))' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'hsl(var(--brand))' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {QUESTIONS.map((q, idx) => {
          const answered = answers[q.id]?.value;
          const selectedOption = q.options.find(o => o.value === answered);

          return (
            <Card key={q.id} style={{ background: 'hsl(var(--bg-surface))', border: `1px solid ${answered ? 'hsl(var(--brand))' : 'hsl(var(--border))'}` }}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div style={{ width: 32, height: 32, background: 'hsl(var(--bg-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <q.icon size={16} style={{ color: 'hsl(var(--brand))' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{q.id}</span>
                      <Badge variant="outline" style={{ borderRadius: 0, fontSize: 10 }}>{q.category}</Badge>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
                      {idx + 1}. {q.text}
                    </p>
                  </div>
                  {answered && (
                    <CheckCircle size={18} style={{ color: selectedOption && selectedOption.points === 10 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--r-hi-tx))', flexShrink: 0 }} />
                  )}
                </div>

                {/* Radio Options */}
                <div className="space-y-2 ml-11">
                  {q.options.map(opt => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 cursor-pointer"
                      style={{
                        padding: '8px 12px',
                        border: `1px solid ${answered === opt.value ? 'hsl(var(--brand))' : 'hsl(var(--border))'}`,
                        background: answered === opt.value ? 'hsl(var(--brand) / 0.08)' : 'transparent',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (answered !== opt.value) (e.currentTarget as HTMLElement).style.background = 'hsl(var(--bg-muted))'; }}
                      onMouseLeave={e => { if (answered !== opt.value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt.value}
                        checked={answered === opt.value}
                        onChange={() => setAnswer(q.id, opt.value)}
                        style={{ accentColor: 'hsl(var(--brand))' }}
                      />
                      <span className="text-sm flex-1" style={{ color: 'hsl(var(--text-1))' }}>{opt.label}</span>
                      <span className="text-xs font-semibold" style={{ color: opt.points === 10 ? 'hsl(var(--s-ok-tx))' : opt.points > 0 ? 'hsl(var(--r-hi-tx))' : 'hsl(var(--s-er-tx))' }}>
                        +{opt.points}pts
                      </span>
                    </label>
                  ))}

                  {/* Notes textarea */}
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      placeholder="Additional notes (optional)..."
                      value={answers[q.id]?.notes || ''}
                      onChange={e => setNotes(q.id, e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        background: 'hsl(var(--bg-muted))',
                        border: '1px solid hsl(var(--border))',
                        color: 'hsl(var(--text-1))',
                        padding: '6px 10px',
                        fontSize: 12,
                        borderRadius: 0,
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>
              {answeredCount < QUESTIONS.length
                ? `${QUESTIONS.length - answeredCount} question${QUESTIONS.length - answeredCount > 1 ? 's' : ''} remaining`
                : 'All questions answered — ready to submit'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--text-3))' }}>
              Current score: {score}/{MAX_SCORE} points ({scorePercent}%)
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={answeredCount < QUESTIONS.length}
            style={{ borderRadius: 0 }}
          >
            <PaperPlaneTilt size={14} /> Submit Questionnaire
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
