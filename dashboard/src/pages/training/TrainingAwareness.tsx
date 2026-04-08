import { useState, useMemo } from 'react';
import {
  MagnifyingGlass, Export, GraduationCap, ChartBar, Warning,
  Certificate, Eye, Clock, Users, BookOpen, VideoCamera,
  FileText, Play, CheckCircle, CalendarBlank, ListChecks,
  UserCircle, ArrowRight,
} from '@phosphor-icons/react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '../../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { useSettingsStore } from '../../stores/settingsStore';

// ── Types ────────────────────────────────────────────────────────────────────
interface Course {
  id: string;
  title: string;
  category: string;
  format: 'Interactive' | 'Video' | 'Document';
  duration: string;
  assignedTo: string;
  completionPct: number;
  dueDate: string;
  status: 'Completed' | 'Active';
  description: string;
  modules: { name: string; duration: string; type: string }[];
  assignments: { name: string; role: string; assigned: string; completed: boolean; score: number | null }[];
  certificates: { holder: string; issued: string; expiry: string; credentialId: string }[];
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const COURSES: Course[] = [
  {
    id: 'TRN-001',
    title: 'AI Ethics for Engineers',
    category: 'AI Ethics',
    format: 'Interactive',
    duration: '4h',
    assignedTo: 'Engineering Team',
    completionPct: 92,
    dueDate: '2026-03-31',
    status: 'Completed',
    description: 'Comprehensive training on ethical AI development principles, covering bias mitigation, fairness metrics, transparency requirements, and responsible deployment practices for engineering teams building AI-powered products.',
    modules: [
      { name: 'Foundations of AI Ethics', duration: '45 min', type: 'Interactive' },
      { name: 'Bias Detection & Mitigation', duration: '60 min', type: 'Lab' },
      { name: 'Fairness Metrics in Practice', duration: '45 min', type: 'Interactive' },
      { name: 'Transparency & Explainability', duration: '40 min', type: 'Video' },
      { name: 'Case Studies & Assessment', duration: '50 min', type: 'Quiz' },
    ],
    assignments: [
      { name: 'Sarah Chen', role: 'ML Engineer', assigned: '2026-02-15', completed: true, score: 95 },
      { name: 'James Wilson', role: 'Senior Engineer', assigned: '2026-02-15', completed: true, score: 88 },
      { name: 'Maria Lopez', role: 'Data Scientist', assigned: '2026-02-15', completed: true, score: 92 },
      { name: 'Alex Kim', role: 'ML Engineer', assigned: '2026-02-15', completed: false, score: null },
    ],
    certificates: [
      { holder: 'Sarah Chen', issued: '2026-03-20', expiry: '2027-03-20', credentialId: 'CERT-ETH-001' },
      { holder: 'James Wilson', issued: '2026-03-22', expiry: '2027-03-22', credentialId: 'CERT-ETH-002' },
      { holder: 'Maria Lopez', issued: '2026-03-25', expiry: '2027-03-25', credentialId: 'CERT-ETH-003' },
    ],
  },
  {
    id: 'TRN-002',
    title: 'GDPR Essentials for AI Teams',
    category: 'Data Privacy',
    format: 'Video',
    duration: '2h',
    assignedTo: 'All Staff',
    completionPct: 85,
    dueDate: '2026-04-15',
    status: 'Active',
    description: 'Essential training on General Data Protection Regulation requirements as they apply to AI systems, including data processing principles, lawful basis for automated decision-making, data subject rights, and privacy-by-design implementation.',
    modules: [
      { name: 'GDPR Fundamentals for AI', duration: '30 min', type: 'Video' },
      { name: 'Lawful Basis for AI Processing', duration: '25 min', type: 'Video' },
      { name: 'Data Subject Rights & AI', duration: '30 min', type: 'Video' },
      { name: 'Privacy by Design in AI', duration: '20 min', type: 'Interactive' },
      { name: 'Assessment', duration: '15 min', type: 'Quiz' },
    ],
    assignments: [
      { name: 'All Engineering', role: 'Department', assigned: '2026-03-01', completed: true, score: 87 },
      { name: 'All Operations', role: 'Department', assigned: '2026-03-01', completed: true, score: 82 },
      { name: 'All Compliance', role: 'Department', assigned: '2026-03-01', completed: true, score: 94 },
      { name: 'All Sales', role: 'Department', assigned: '2026-03-01', completed: false, score: null },
    ],
    certificates: [
      { holder: 'Engineering Dept', issued: '2026-03-28', expiry: '2027-03-28', credentialId: 'CERT-GDPR-001' },
      { holder: 'Compliance Dept', issued: '2026-03-25', expiry: '2027-03-25', credentialId: 'CERT-GDPR-002' },
    ],
  },
  {
    id: 'TRN-003',
    title: 'SOC 2 Awareness Training',
    category: 'Compliance',
    format: 'Document',
    duration: '1.5h',
    assignedTo: 'Engineering + Ops',
    completionPct: 68,
    dueDate: '2026-04-30',
    status: 'Active',
    description: 'SOC 2 compliance awareness covering trust service criteria, security controls, availability requirements, and audit preparation procedures for teams operating cloud-based AI infrastructure.',
    modules: [
      { name: 'SOC 2 Trust Service Criteria', duration: '25 min', type: 'Document' },
      { name: 'Security Controls Overview', duration: '25 min', type: 'Document' },
      { name: 'Availability & Processing Integrity', duration: '20 min', type: 'Document' },
      { name: 'Audit Readiness Checklist', duration: '20 min', type: 'Interactive' },
    ],
    assignments: [
      { name: 'David Park', role: 'DevOps Lead', assigned: '2026-03-10', completed: true, score: 90 },
      { name: 'Lisa Wang', role: 'SRE', assigned: '2026-03-10', completed: true, score: 85 },
      { name: 'Tom Harris', role: 'Backend Engineer', assigned: '2026-03-10', completed: false, score: null },
      { name: 'Nina Patel', role: 'Cloud Architect', assigned: '2026-03-10', completed: false, score: null },
    ],
    certificates: [
      { holder: 'David Park', issued: '2026-04-02', expiry: '2027-04-02', credentialId: 'CERT-SOC2-001' },
    ],
  },
  {
    id: 'TRN-004',
    title: 'EU AI Act Compliance',
    category: 'Compliance',
    format: 'Interactive',
    duration: '3h',
    assignedTo: 'Compliance + Legal',
    completionPct: 45,
    dueDate: '2026-05-15',
    status: 'Active',
    description: 'In-depth training on the European Union Artificial Intelligence Act, covering risk classification, conformity assessment requirements, documentation obligations, and post-market monitoring for high-risk AI systems.',
    modules: [
      { name: 'EU AI Act Overview & Scope', duration: '30 min', type: 'Interactive' },
      { name: 'Risk Classification Framework', duration: '40 min', type: 'Interactive' },
      { name: 'Conformity Assessment', duration: '35 min', type: 'Lab' },
      { name: 'Documentation Requirements', duration: '30 min', type: 'Document' },
      { name: 'Post-Market Monitoring', duration: '25 min', type: 'Interactive' },
      { name: 'Final Assessment', duration: '20 min', type: 'Quiz' },
    ],
    assignments: [
      { name: 'Rebecca Torres', role: 'Compliance Officer', assigned: '2026-03-20', completed: true, score: 91 },
      { name: 'Mark Johnson', role: 'Legal Counsel', assigned: '2026-03-20', completed: false, score: null },
      { name: 'Emily Brooks', role: 'GRC Analyst', assigned: '2026-03-20', completed: false, score: null },
    ],
    certificates: [],
  },
  {
    id: 'TRN-005',
    title: 'Responsible AI Development',
    category: 'AI Ethics',
    format: 'Video',
    duration: '2.5h',
    assignedTo: 'ML Engineers',
    completionPct: 78,
    dueDate: '2026-04-01',
    status: 'Active',
    description: 'Practical training on responsible AI development methodologies, model cards, impact assessments, stakeholder engagement, and continuous monitoring practices for machine learning engineering teams.',
    modules: [
      { name: 'Responsible AI Principles', duration: '30 min', type: 'Video' },
      { name: 'Model Cards & Documentation', duration: '30 min', type: 'Video' },
      { name: 'Impact Assessments', duration: '35 min', type: 'Interactive' },
      { name: 'Stakeholder Engagement', duration: '25 min', type: 'Video' },
      { name: 'Continuous Monitoring', duration: '30 min', type: 'Video' },
    ],
    assignments: [
      { name: 'Sarah Chen', role: 'ML Engineer', assigned: '2026-02-20', completed: true, score: 94 },
      { name: 'Maria Lopez', role: 'Data Scientist', assigned: '2026-02-20', completed: true, score: 89 },
      { name: 'Raj Gupta', role: 'ML Engineer', assigned: '2026-02-20', completed: false, score: null },
    ],
    certificates: [
      { holder: 'Sarah Chen', issued: '2026-03-15', expiry: '2027-03-15', credentialId: 'CERT-RAI-001' },
      { holder: 'Maria Lopez', issued: '2026-03-18', expiry: '2027-03-18', credentialId: 'CERT-RAI-002' },
    ],
  },
  {
    id: 'TRN-006',
    title: 'Incident Response Procedures',
    category: 'Incident Response',
    format: 'Interactive',
    duration: '2h',
    assignedTo: 'Security + Ops',
    completionPct: 60,
    dueDate: '2026-05-01',
    status: 'Active',
    description: 'Hands-on training for AI incident response procedures including detection, triage, containment, remediation, and post-incident review. Covers regulatory notification requirements and escalation protocols.',
    modules: [
      { name: 'Incident Detection & Triage', duration: '25 min', type: 'Interactive' },
      { name: 'Containment Strategies', duration: '25 min', type: 'Lab' },
      { name: 'Remediation & Recovery', duration: '25 min', type: 'Interactive' },
      { name: 'Regulatory Notification', duration: '20 min', type: 'Document' },
      { name: 'Tabletop Exercise', duration: '25 min', type: 'Lab' },
    ],
    assignments: [
      { name: 'Kevin Wright', role: 'Security Lead', assigned: '2026-03-15', completed: true, score: 88 },
      { name: 'David Park', role: 'DevOps Lead', assigned: '2026-03-15', completed: true, score: 82 },
      { name: 'Amy Chen', role: 'Security Analyst', assigned: '2026-03-15', completed: false, score: null },
      { name: 'Lisa Wang', role: 'SRE', assigned: '2026-03-15', completed: false, score: null },
    ],
    certificates: [],
  },
  {
    id: 'TRN-007',
    title: 'Data Classification Standards',
    category: 'Data Privacy',
    format: 'Document',
    duration: '1h',
    assignedTo: 'All Staff',
    completionPct: 55,
    dueDate: '2026-06-01',
    status: 'Active',
    description: 'Foundational training on organizational data classification standards, covering sensitivity levels, handling procedures, labeling requirements, and access control policies for AI training data and model outputs.',
    modules: [
      { name: 'Data Classification Levels', duration: '20 min', type: 'Document' },
      { name: 'Handling & Labeling Procedures', duration: '20 min', type: 'Document' },
      { name: 'Access Control Policies', duration: '20 min', type: 'Interactive' },
    ],
    assignments: [
      { name: 'All Engineering', role: 'Department', assigned: '2026-04-01', completed: true, score: 80 },
      { name: 'All Operations', role: 'Department', assigned: '2026-04-01', completed: false, score: null },
      { name: 'All Compliance', role: 'Department', assigned: '2026-04-01', completed: false, score: null },
      { name: 'All Sales', role: 'Department', assigned: '2026-04-01', completed: false, score: null },
    ],
    certificates: [],
  },
  {
    id: 'TRN-008',
    title: 'Vendor Risk Management',
    category: 'Security',
    format: 'Video',
    duration: '1.5h',
    assignedTo: 'Procurement + Legal',
    completionPct: 40,
    dueDate: '2026-06-15',
    status: 'Active',
    description: 'Training on third-party AI vendor risk management, covering vendor assessment frameworks, contractual safeguards, ongoing monitoring requirements, and exit strategy planning for AI service providers.',
    modules: [
      { name: 'Vendor Risk Framework', duration: '25 min', type: 'Video' },
      { name: 'Assessment & Due Diligence', duration: '25 min', type: 'Video' },
      { name: 'Contractual Safeguards', duration: '20 min', type: 'Document' },
      { name: 'Monitoring & Exit Planning', duration: '20 min', type: 'Video' },
    ],
    assignments: [
      { name: 'Mark Johnson', role: 'Legal Counsel', assigned: '2026-04-10', completed: false, score: null },
      { name: 'Priya Sharma', role: 'Procurement Lead', assigned: '2026-04-10', completed: false, score: null },
      { name: 'Rebecca Torres', role: 'Compliance Officer', assigned: '2026-04-10', completed: false, score: null },
    ],
    certificates: [],
  },
];

const CATEGORIES = ['All Categories', 'AI Ethics', 'Data Privacy', 'Compliance', 'Incident Response', 'Security'];

// ── Inline Toast ─────────────────────────────────────────────────────────────
function toast(msg: string) {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: '9999',
    padding: '10px 20px', fontFamily: 'Outfit, sans-serif', fontSize: '13px',
    background: 'hsl(var(--bg-surface))', color: 'hsl(var(--text-1))',
    border: '1px solid hsl(var(--border))', borderRadius: '0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ── MetricTile ───────────────────────────────────────────────────────────────
function MetricTile({ label, value, icon, variant }: {
  label: string; value: string | number; icon: React.ReactNode;
  variant: 'default' | 'ok' | 'warn' | 'error' | 'info';
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    default: { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--text-1))', border: 'hsl(var(--border))' },
    ok:      { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--s-ok-tx))', border: 'hsl(var(--border))' },
    warn:    { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--s-wn-tx))', border: 'hsl(var(--border))' },
    error:   { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--destructive))', border: 'hsl(var(--border))' },
    info:    { bg: 'hsl(var(--bg-surface))', text: 'hsl(var(--s-in-tx))', border: 'hsl(var(--border))' },
  };
  const c = colors[variant];
  return (
    <Card style={{ borderRadius: 0, background: c.bg, border: `1px solid ${c.border}` }}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-4))', fontFamily: 'Outfit, sans-serif' }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: c.text, fontFamily: 'Outfit, sans-serif' }}>{value}</p>
          </div>
          <div style={{ color: c.text, opacity: 0.6 }}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Format Icon Helper ───────────────────────────────────────────────────────
function FormatIcon({ format }: { format: string }) {
  switch (format) {
    case 'Interactive': return <Play size={14} style={{ color: 'hsl(var(--brand))' }} />;
    case 'Video': return <VideoCamera size={14} style={{ color: 'hsl(var(--s-in-tx))' }} />;
    case 'Document': return <FileText size={14} style={{ color: 'hsl(var(--s-wn-tx))' }} />;
    default: return <BookOpen size={14} style={{ color: 'hsl(var(--text-4))' }} />;
  }
}

// ── Completion Bar ───────────────────────────────────────────────────────────
function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'hsl(var(--s-ok-tx))' : pct >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5" style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 0 }} />
      </div>
      <span className="text-xs font-mono font-medium" style={{ color, minWidth: 32, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function TrainingAwareness() {
  const { orgName } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return COURSES.filter(c => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q)) return false;
      }
      if (filterCategory !== 'All Categories' && c.category !== filterCategory) return false;
      return true;
    });
  }, [search, filterCategory]);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const totalCourses = COURSES.length;
  const avgCompletion = Math.round(COURSES.reduce((s, c) => s + c.completionPct, 0) / COURSES.length);
  const overdueCount = COURSES.filter(c => c.status === 'Active' && new Date(c.dueDate) < new Date()).length;
  const certExpiring = COURSES.reduce((count, c) => {
    return count + c.certificates.filter(cert => {
      const exp = new Date(cert.expiry);
      const now = new Date();
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      return exp >= now && exp <= threeMonths;
    }).length;
  }, 0);

  // ── Open detail ────────────────────────────────────────────────────────────
  const openDetail = (course: Course) => {
    setSelectedCourse(course);
    setSheetOpen(true);
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Course ID', 'Title', 'Category', 'Format', 'Duration', 'Assigned To', 'Completion %', 'Due Date', 'Status'];
    const rows = filtered.map(c => [c.id, c.title, c.category, c.format, c.duration, c.assignedTo, c.completionPct, c.dueDate, c.status]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-courses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported successfully');
  };

  // ── Status badge helpers ───────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    if (status === 'Completed') return { bg: 'hsl(var(--s-ok-tx))', text: '#fff' };
    return { bg: 'hsl(var(--brand))', text: '#fff' };
  };

  const categoryBadge = (category: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      'AI Ethics': { bg: 'hsla(var(--s-in-tx), 0.12)', text: 'hsl(var(--s-in-tx))' },
      'Data Privacy': { bg: 'hsla(var(--s-wn-tx), 0.12)', text: 'hsl(var(--s-wn-tx))' },
      'Compliance': { bg: 'hsla(var(--brand), 0.12)', text: 'hsl(var(--brand))' },
      'Incident Response': { bg: 'hsla(var(--destructive), 0.12)', text: 'hsl(var(--destructive))' },
      'Security': { bg: 'hsla(var(--s-ok-tx), 0.12)', text: 'hsl(var(--s-ok-tx))' },
    };
    return map[category] || { bg: 'hsl(var(--bg-muted))', text: 'hsl(var(--text-3))' };
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Training & Awareness</h1>
          <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>
            {orgName} &middot; AI governance training programs & compliance awareness
          </p>
        </div>
        <Button onClick={exportCSV} style={{ borderRadius: 0, background: 'hsl(var(--brand))', color: '#fff' }}>
          <Export size={14} className="mr-1" />Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <MetricTile label="Total Courses" value={totalCourses} icon={<GraduationCap size={24} />} variant="default" />
        <MetricTile label="Completion Rate" value={`${avgCompletion}%`} icon={<ChartBar size={24} />} variant="ok" />
        <MetricTile label="Overdue Assignments" value={overdueCount} icon={<Warning size={24} />} variant="error" />
        <MetricTile label="Certifications Expiring" value={certExpiring} icon={<Certificate size={24} />} variant="warn" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-4))' }} />
          <Input
            placeholder="Search courses by title, ID, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            style={{ borderRadius: 0 }}
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 h-8 text-xs" style={{ borderRadius: 0 }}>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent style={{ borderRadius: 0 }}>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Course Table */}
      <Card style={{ borderRadius: 0, background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  {['Course ID', 'Title', 'Category', 'Format', 'Duration', 'Assigned To', 'Completion %', 'Due Date', 'Status', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(course => {
                  const sBadge = statusBadge(course.status);
                  const cBadge = categoryBadge(course.category);
                  const isOverdue = course.status === 'Active' && new Date(course.dueDate) < new Date();
                  return (
                    <tr
                      key={course.id}
                      className="hover:bg-[hsl(var(--bg-muted))] cursor-pointer"
                      style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        borderLeft: isOverdue ? '4px solid hsl(var(--destructive))' : '4px solid transparent',
                      }}
                      onClick={() => openDetail(course)}
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-medium" style={{ color: 'hsl(var(--brand))' }}>{course.id}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{course.title}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge style={{ background: cBadge.bg, color: cBadge.text, borderRadius: 0, fontSize: 11 }}>
                          {course.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <FormatIcon format={course.format} />
                          <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{course.format}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Clock size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{course.duration}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Users size={12} style={{ color: 'hsl(var(--text-4))' }} />
                          <span className="text-xs" style={{ color: 'hsl(var(--text-1))' }}>{course.assignedTo}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2" style={{ minWidth: 120 }}>
                        <CompletionBar pct={course.completionPct} />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs font-mono" style={{ color: isOverdue ? 'hsl(var(--destructive))' : 'hsl(var(--text-1))' }}>
                          {isOverdue ? 'OVERDUE' : course.dueDate}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge style={{ background: sBadge.bg, color: sBadge.text, borderRadius: 0, fontSize: 11 }}>
                          {course.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openDetail(course)}>
                          <Eye size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-4))' }}>
                      No courses match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary row */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'hsl(var(--text-4))' }}>
        <span>Showing {filtered.length} of {COURSES.length} courses</span>
        <span>Acme Financial Corp &middot; Training & Awareness Module</span>
      </div>

      {/* ── Detail Drawer ──────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[580px] sm:max-w-[580px] overflow-y-auto" style={{ borderRadius: 0 }}>
          {selectedCourse && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold" style={{ color: 'hsl(var(--brand))' }}>{selectedCourse.id}</span>
                  <Badge style={{
                    background: categoryBadge(selectedCourse.category).bg,
                    color: categoryBadge(selectedCourse.category).text,
                    borderRadius: 0, fontSize: 11,
                  }}>
                    {selectedCourse.category}
                  </Badge>
                  <Badge style={{
                    background: statusBadge(selectedCourse.status).bg,
                    color: statusBadge(selectedCourse.status).text,
                    borderRadius: 0, fontSize: 11,
                  }}>
                    {selectedCourse.status}
                  </Badge>
                </div>
                <SheetTitle style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.title}</SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="w-full" style={{ borderRadius: 0 }}>
                  <TabsTrigger value="overview" style={{ borderRadius: 0 }}>Overview</TabsTrigger>
                  <TabsTrigger value="curriculum" style={{ borderRadius: 0 }}>Curriculum</TabsTrigger>
                  <TabsTrigger value="assignments" style={{ borderRadius: 0 }}>Assignments</TabsTrigger>
                  <TabsTrigger value="completions" style={{ borderRadius: 0 }}>Completions</TabsTrigger>
                  <TabsTrigger value="certificates" style={{ borderRadius: 0 }}>Certificates</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Format</p>
                      <div className="flex items-center gap-1.5">
                        <FormatIcon format={selectedCourse.format} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.format}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Duration</p>
                      <div className="flex items-center gap-1">
                        <Clock size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.duration}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Assigned To</p>
                      <div className="flex items-center gap-1">
                        <Users size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.assignedTo}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Due Date</p>
                      <div className="flex items-center gap-1">
                        <CalendarBlank size={14} style={{ color: 'hsl(var(--text-4))' }} />
                        <span className="text-sm" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Completion Progress</p>
                    <CompletionBar pct={selectedCourse.completionPct} />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Description</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Modules</p>
                      <p className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.modules.length}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Assignees</p>
                      <p className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.assignments.length}</p>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Certificates</p>
                      <p className="text-lg font-bold" style={{ color: 'hsl(var(--text-1))' }}>{selectedCourse.certificates.length}</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Curriculum Tab */}
                <TabsContent value="curriculum" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Course Modules</p>
                  {selectedCourse.modules.map((mod, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3"
                      style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}
                    >
                      <div
                        className="flex items-center justify-center w-7 h-7 text-xs font-bold"
                        style={{ background: 'hsl(var(--brand))', color: '#fff', borderRadius: 0, minWidth: 28 }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{mod.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px]" style={{ color: 'hsl(var(--text-4))' }}>{mod.duration}</span>
                          <Badge style={{ borderRadius: 0, fontSize: 10, padding: '0 6px' }}>
                            {mod.type}
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight size={14} style={{ color: 'hsl(var(--text-4))' }} />
                    </div>
                  ))}
                  <div className="text-xs pt-2" style={{ color: 'hsl(var(--text-4))' }}>
                    Total duration: {selectedCourse.duration} &middot; {selectedCourse.modules.length} modules
                  </div>
                </TabsContent>

                {/* Assignments Tab */}
                <TabsContent value="assignments" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Assigned Personnel</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          {['Name', 'Role', 'Assigned', 'Status', 'Score'].map(h => (
                            <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCourse.assignments.map((a, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5">
                                <UserCircle size={14} style={{ color: 'hsl(var(--text-4))' }} />
                                <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{a.role}</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{a.assigned}</span>
                            </td>
                            <td className="px-2 py-2">
                              {a.completed ? (
                                <Badge style={{ background: 'hsl(var(--s-ok-tx))', color: '#fff', borderRadius: 0, fontSize: 10 }}>
                                  Completed
                                </Badge>
                              ) : (
                                <Badge style={{ background: 'hsl(var(--s-wn-tx))', color: '#fff', borderRadius: 0, fontSize: 10 }}>
                                  In Progress
                                </Badge>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {a.score !== null ? (
                                <span className="text-xs font-mono font-medium" style={{
                                  color: a.score >= 85 ? 'hsl(var(--s-ok-tx))' : a.score >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                                }}>{a.score}%</span>
                              ) : (
                                <span className="text-xs" style={{ color: 'hsl(var(--text-4))' }}>&mdash;</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-4 pt-2 text-xs" style={{ color: 'hsl(var(--text-4))' }}>
                    <span>Total: {selectedCourse.assignments.length}</span>
                    <span>Completed: {selectedCourse.assignments.filter(a => a.completed).length}</span>
                    <span>Pending: {selectedCourse.assignments.filter(a => !a.completed).length}</span>
                  </div>
                </TabsContent>

                {/* Completions Tab */}
                <TabsContent value="completions" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Completion Summary</p>

                  <div className="p-4" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>Overall Progress</span>
                      <span className="text-lg font-bold" style={{
                        color: selectedCourse.completionPct >= 80 ? 'hsl(var(--s-ok-tx))' : selectedCourse.completionPct >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                      }}>{selectedCourse.completionPct}%</span>
                    </div>
                    <div className="h-3 w-full" style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
                      <div style={{
                        width: `${selectedCourse.completionPct}%`,
                        height: '100%',
                        background: selectedCourse.completionPct >= 80 ? 'hsl(var(--s-ok-tx))' : selectedCourse.completionPct >= 60 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                        borderRadius: 0,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} style={{ color: 'hsl(var(--s-ok-tx))' }} />
                        <div>
                          <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Completed</p>
                          <p className="text-lg font-bold" style={{ color: 'hsl(var(--s-ok-tx))' }}>
                            {selectedCourse.assignments.filter(a => a.completed).length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <div className="flex items-center gap-2">
                        <ListChecks size={16} style={{ color: 'hsl(var(--s-wn-tx))' }} />
                        <div>
                          <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>In Progress</p>
                          <p className="text-lg font-bold" style={{ color: 'hsl(var(--s-wn-tx))' }}>
                            {selectedCourse.assignments.filter(a => !a.completed).length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedCourse.assignments.filter(a => a.completed && a.score !== null).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Score Distribution</p>
                      {selectedCourse.assignments.filter(a => a.completed && a.score !== null).map((a, i) => (
                        <div key={i} className="flex items-center gap-3 p-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                          <span className="text-xs font-medium w-28 truncate" style={{ color: 'hsl(var(--text-1))' }}>{a.name}</span>
                          <div className="flex-1 h-1.5" style={{ background: 'hsl(var(--bg-muted))', borderRadius: 0 }}>
                            <div style={{
                              width: `${a.score}%`,
                              height: '100%',
                              background: a.score! >= 85 ? 'hsl(var(--s-ok-tx))' : a.score! >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                              borderRadius: 0,
                            }} />
                          </div>
                          <span className="text-xs font-mono font-medium" style={{
                            color: a.score! >= 85 ? 'hsl(var(--s-ok-tx))' : a.score! >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--destructive))',
                            minWidth: 32,
                            textAlign: 'right',
                          }}>{a.score}%</span>
                        </div>
                      ))}
                      <div className="text-xs pt-1" style={{ color: 'hsl(var(--text-4))' }}>
                        Average score: {Math.round(
                          selectedCourse.assignments
                            .filter(a => a.score !== null)
                            .reduce((s, a) => s + (a.score || 0), 0) /
                          selectedCourse.assignments.filter(a => a.score !== null).length
                        )}%
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Certificates Tab */}
                <TabsContent value="certificates" className="space-y-3 mt-4">
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'hsl(var(--text-4))' }}>Issued Certificates</p>

                  {selectedCourse.certificates.length > 0 ? (
                    <>
                      {selectedCourse.certificates.map((cert, i) => {
                        const expDate = new Date(cert.expiry);
                        const now = new Date();
                        const threeMonths = new Date();
                        threeMonths.setMonth(threeMonths.getMonth() + 3);
                        const isExpiring = expDate >= now && expDate <= threeMonths;
                        const isExpired = expDate < now;

                        return (
                          <div
                            key={i}
                            className="p-3"
                            style={{
                              background: 'hsl(var(--bg-muted))',
                              border: `1px solid ${isExpired ? 'hsl(var(--destructive))' : isExpiring ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--border))'}`,
                              borderRadius: 0,
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <Certificate size={18} style={{ color: 'hsl(var(--brand))' }} />
                                <div>
                                  <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{cert.holder}</p>
                                  <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{cert.credentialId}</p>
                                </div>
                              </div>
                              {isExpired ? (
                                <Badge style={{ background: 'hsl(var(--destructive))', color: '#fff', borderRadius: 0, fontSize: 10 }}>Expired</Badge>
                              ) : isExpiring ? (
                                <Badge style={{ background: 'hsl(var(--s-wn-tx))', color: '#fff', borderRadius: 0, fontSize: 10 }}>Expiring Soon</Badge>
                              ) : (
                                <Badge style={{ background: 'hsl(var(--s-ok-tx))', color: '#fff', borderRadius: 0, fontSize: 10 }}>Valid</Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <p className="text-[10px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>Issued</p>
                                <p className="text-xs font-mono" style={{ color: 'hsl(var(--text-1))' }}>{cert.issued}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase" style={{ color: 'hsl(var(--text-4))' }}>Expiry</p>
                                <p className="text-xs font-mono" style={{
                                  color: isExpired ? 'hsl(var(--destructive))' : isExpiring ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--text-1))',
                                }}>{cert.expiry}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="text-xs pt-1" style={{ color: 'hsl(var(--text-4))' }}>
                        {selectedCourse.certificates.length} certificate{selectedCourse.certificates.length !== 1 ? 's' : ''} issued for this course
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center" style={{ background: 'hsl(var(--bg-muted))', border: '1px solid hsl(var(--border))', borderRadius: 0 }}>
                      <Certificate size={32} style={{ color: 'hsl(var(--text-4))', margin: '0 auto 8px' }} />
                      <p className="text-sm" style={{ color: 'hsl(var(--text-4))' }}>No certificates issued yet.</p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-4))' }}>
                        Certificates are issued upon course completion with a passing score.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
