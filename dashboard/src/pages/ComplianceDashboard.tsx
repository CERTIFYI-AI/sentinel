import { useState } from "react";
import { Scale, Download, ChevronDown, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCardRow, type StatCardRowItem } from "@/components/ui/StatCardRow";
import { ShieldCheck, CheckCircle, Warning, ChartBar } from "@phosphor-icons/react";

interface Framework {
  id: string; name: string; flag: string; score: number; passing: number; total: number;
  status: "mandatory" | "certifiable" | "voluntary"; enabled: boolean; lastEvidence: string;
}

const FRAMEWORKS: Framework[] = [
  { id: "eu-ai-act", name: "EU AI Act", flag: "\u{1F1EA}\u{1F1FA}", score: 87, passing: 34, total: 39, status: "mandatory", enabled: true, lastEvidence: "2m ago" },
  { id: "gdpr", name: "GDPR", flag: "\u{1F1EA}\u{1F1FA}", score: 92, passing: 44, total: 48, status: "mandatory", enabled: true, lastEvidence: "5m ago" },
  { id: "nist-ai-rmf", name: "NIST AI RMF", flag: "\u{1F1FA}\u{1F1F8}", score: 78, passing: 28, total: 36, status: "certifiable", enabled: true, lastEvidence: "12m ago" },
  { id: "iso-42001", name: "ISO 42001", flag: "\u{1F310}", score: 71, passing: 22, total: 31, status: "certifiable", enabled: true, lastEvidence: "1h ago" },
  { id: "soc2", name: "SOC 2 Type II", flag: "\u{1F1FA}\u{1F1F8}", score: 95, passing: 19, total: 20, status: "certifiable", enabled: true, lastEvidence: "3m ago" },
  { id: "ieee-7000", name: "IEEE 7000", flag: "\u{1F310}", score: 64, passing: 9, total: 14, status: "voluntary", enabled: false, lastEvidence: "45m ago" },
  { id: "iso-27001", name: "ISO 27001", flag: "\u{1F310}", score: 83, passing: 31, total: 37, status: "certifiable", enabled: true, lastEvidence: "8m ago" },
];

const statusBadgeStyle: Record<string, { bg: string; tx: string; br: string }> = {
  mandatory:   { bg: 'hsl(var(--s-er-bg))', tx: 'hsl(var(--s-er-tx))', br: 'hsl(var(--s-er-br))' },
  certifiable: { bg: 'hsl(var(--s-in-bg))', tx: 'hsl(var(--s-in-tx))', br: 'hsl(var(--s-in-br))' },
  voluntary:   { bg: 'hsl(var(--s-ok-bg))', tx: 'hsl(var(--s-ok-tx))', br: 'hsl(var(--s-ok-br))' },
};
const statusFallback = { bg: 'hsl(var(--s-nt-bg))', tx: 'hsl(var(--s-nt-tx))', br: 'hsl(var(--s-nt-br))' };

const scoreColor = (s: number) => s >= 85 ? 'hsl(var(--s-ok-tx))' : s >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))';
const barBg = (s: number) => s >= 85 ? 'hsl(var(--s-ok-tx))' : s >= 70 ? 'hsl(var(--s-wn-tx))' : 'hsl(var(--s-er-tx))';

export default function ComplianceDashboard() {
  const [frameworks, setFrameworks] = useState(FRAMEWORKS);
  const [generating, setGenerating] = useState(false);
  const [reportReady, setReportReady] = useState(false);
  const [selectedFw, setSelectedFw] = useState<string | null>(null);

  const toggle = (id: string) => setFrameworks(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));

  const generateReport = () => {
    setGenerating(true);
    setReportReady(false);
    setTimeout(() => { setGenerating(false); setReportReady(true); }, 2000);
  };

  const enabled = frameworks.filter(f => f.enabled);
  const overallScore = enabled.length ? Math.round(enabled.reduce((s, f) => s + f.score, 0) / enabled.length) : 0;
  const totalControls = enabled.reduce((s, f) => s + f.total, 0);
  const passingControls = enabled.reduce((s, f) => s + f.passing, 0);

  const statCards: StatCardRowItem[] = [
    { label: 'Overall Score', value: `${overallScore}%`, variant: overallScore >= 85 ? 'success' : overallScore >= 70 ? 'warning' : 'danger', icon: <ChartBar size={14} weight="fill" /> },
    { label: 'Frameworks Active', value: `${enabled.length}/${frameworks.length}`, icon: <ShieldCheck size={14} weight="fill" /> },
    { label: 'Controls Passing', value: `${passingControls}/${totalControls}`, variant: 'success', icon: <CheckCircle size={14} weight="fill" /> },
    { label: 'Mandatory Gaps', value: frameworks.filter(f => f.status === 'mandatory' && f.score < 90).length, variant: 'danger', icon: <Warning size={14} weight="fill" /> },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Compliance"
        subtitle={`Real-time evidence accumulation across ${frameworks.length} global AI governance frameworks`}
        icon={Scale}
        actions={
          <button onClick={generateReport} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--brand))] text-white text-xs font-medium hover:bg-[hsl(var(--brand-hover))] disabled:opacity-60 transition-colors">
            <Download size={13} />
            {generating ? "Generating..." : "Generate Report"}
          </button>
        }
      />

      {reportReady && (
        <div className="border p-3 flex justify-between items-center" style={{ background: 'hsl(var(--s-ok-bg))', borderColor: 'hsl(var(--s-ok-br))' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))' }} />
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--s-ok-tx))' }}>Compliance Report Ready</p>
              <p className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{enabled.length} frameworks | {totalControls} controls | Score: {overallScore}%</p>
            </div>
          </div>
          <button className="text-[10px] font-medium hover:underline" style={{ color: 'hsl(var(--s-ok-tx))' }}>Download JSON</button>
        </div>
      )}

      <StatCardRow cards={statCards} />

      {/* Overall Governance Score */}
      <div className="border p-4" style={{ background: 'hsl(var(--bg-surface))', borderColor: 'hsl(var(--border))' }}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-semibold" style={{ color: 'hsl(var(--text-3))' }}>AI GOVERNANCE SCORE</h3>
          <span className="text-2xl font-mono font-bold" style={{ color: scoreColor(overallScore) }}>{overallScore}%</span>
        </div>
        <div className="w-full h-1.5 mb-3" style={{ background: 'hsl(var(--bg-sunken))' }}>
          <div className="h-1.5 transition-all duration-700" style={{ width: `${overallScore}%`, background: barBg(overallScore) }} />
        </div>
        <div className="grid grid-cols-5 gap-3 text-center">
          {[{l: "Trust Enforcement", v: 91}, {l: "PII Protection", v: 88}, {l: "Audit Coverage", v: 94}, {l: "HITL Compliance", v: 82}, {l: "Drift Detection", v: 76}].map(c => (
            <div key={c.l}>
              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--text-4))' }}>{c.l}</p>
              <div className="w-full h-1" style={{ background: 'hsl(var(--bg-sunken))' }}>
                <div className="h-1" style={{ width: `${c.v}%`, background: barBg(c.v) }} />
              </div>
              <p className="text-[10px] font-mono font-bold mt-0.5" style={{ color: scoreColor(c.v) }}>{c.v}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {frameworks.map(fw => {
          const sb = statusBadgeStyle[fw.status] || statusFallback;
          return (
          <div key={fw.id} className="transition-all border" style={{
            background: 'hsl(var(--bg-surface))',
            borderColor: fw.enabled ? 'hsl(var(--brand) / 0.25)' : 'hsl(var(--border))',
            opacity: fw.enabled ? 1 : 0.55,
          }}>
            <div className="p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{fw.flag}</span>
                  <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-1))' }}>{fw.name}</span>
                </div>
                <button onClick={() => toggle(fw.id)} className="w-8 h-4 relative transition-colors" style={{ background: fw.enabled ? 'hsl(var(--brand))' : 'hsl(var(--border-mid))' }}>
                  <div className="w-3 h-3 bg-white absolute top-0.5 transition-all" style={{ left: fw.enabled ? '17px' : '2px' }} />
                </button>
              </div>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 uppercase tracking-wider border" style={{ background: sb.bg, color: sb.tx, borderColor: sb.br }}>{fw.status}</span>
              <div className="mt-2">
                <div className="flex justify-between items-end">
                  <span className="text-xl font-mono font-bold" style={{ color: scoreColor(fw.score) }}>{fw.score}%</span>
                  <span className="text-[10px] font-mono" style={{ color: 'hsl(var(--text-4))' }}>{fw.passing}/{fw.total}</span>
                </div>
                <div className="w-full h-1 mt-1.5" style={{ background: 'hsl(var(--bg-sunken))' }}>
                  <div className="h-1 transition-all" style={{ width: `${fw.score}%`, background: barBg(fw.score) }} />
                </div>
                <p className="text-[9px] mt-1.5 font-mono" style={{ color: 'hsl(var(--text-4))' }}>Evidence: {fw.lastEvidence}</p>
              </div>
              <button onClick={() => setSelectedFw(fw.id === selectedFw ? null : fw.id)}
                className="flex items-center gap-1 text-[10px] font-medium mt-1.5 hover:underline" style={{ color: 'hsl(var(--brand))' }}>
                Evidence <ChevronDown size={9} className={`transition-transform ${selectedFw === fw.id ? "rotate-180" : ""}`} />
              </button>
              {selectedFw === fw.id && (
                <div className="mt-1.5 p-2 text-[10px] space-y-1" style={{ background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))' }}>
                  <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5" style={{ background: 'hsl(var(--s-ok-tx))' }} /> Trust score monitoring: Active</p>
                  <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5" style={{ background: fw.score > 80 ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--s-wn-tx))' }} /> PII detection: {fw.score > 80 ? "Passing" : "Needs review"}</p>
                  <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5" style={{ background: 'hsl(var(--s-ok-tx))' }} /> Audit chain integrity: Verified</p>
                  <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5" style={{ background: fw.enabled ? 'hsl(var(--s-ok-tx))' : 'hsl(var(--text-4))' }} /> Evidence auto-collection: {fw.enabled ? "Enabled" : "Disabled"}</p>
                </div>
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
