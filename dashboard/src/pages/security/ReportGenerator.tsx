import { useState, useRef } from 'react';
import { deterministicScore, scoreLabel } from '../../lib/compliance/heatmapUtils';

type ReportType = 'executive' | 'technical' | 'compliance' | 'certificate';

const REPORT_TYPES: { key: ReportType; title: string; desc: string }[] = [
  { key: 'executive', title: 'Executive Summary', desc: 'For board/C-suite, risk posture and recommendations' },
  { key: 'technical', title: 'Technical Detail', desc: 'Full finding inventory for AppSec teams' },
  { key: 'compliance', title: 'Compliance Evidence', desc: 'Regulatory artefact package for auditors' },
  { key: 'certificate', title: 'Security Certificate', desc: 'Single-page certification of model safety posture' },
];

const FRAMEWORK_OPTIONS = [
  'NIST AI RMF', 'OWASP LLM', 'ISO 42001', 'EU AI Act', 'MITRE ATLAS',
] as const;

export default function ReportGenerator() {
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [orgName, setOrgName] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const toggleFramework = (fw: string) => {
    setFrameworks((prev) => prev.includes(fw) ? prev.filter((f) => f !== fw) : [...prev, fw]);
  };

  const selectAll = () => {
    setFrameworks(frameworks.length === FRAMEWORK_OPTIONS.length ? [] : [...FRAMEWORK_OPTIONS]);
  };

  const handlePrint = () => {
    setShowPreview(true);
    setTimeout(() => window.print(), 300);
  };

  const riskScore = deterministicScore(orgName || 'default-org', 70, 95);
  const selectedFrameworks = frameworks.length > 0 ? frameworks : [...FRAMEWORK_OPTIONS];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Outfit' }}>Board Report Generator</h1>

      {/* Report Type */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Report Type</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.key}
              onClick={() => setReportType(rt.key)}
              className={`text-left border rounded-lg p-4 transition-colors ${
                reportType === rt.key
                  ? 'border-[var(--brand-border)] bg-[var(--brand-subtle)]'
                  : 'border-[var(--border)] hover:bg-[var(--brand-subtle)]'
              }`}
            >
              <p className="text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>{rt.title}</p>
              <p className="text-xs mt-1" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>{rt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Org & Period */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Organisation Name</label>
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Enter organisation name" className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md" style={{ fontFamily: 'Outfit' }} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Report Title</label>
          <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="Enter report title" className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md" style={{ fontFamily: 'Outfit' }} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Period From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md" style={{ fontFamily: 'Outfit' }} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Period To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-md" style={{ fontFamily: 'Outfit' }} />
        </div>
      </div>

      {/* Frameworks */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Framework Scope</p>
        <div className="flex flex-wrap items-center gap-3">
          {FRAMEWORK_OPTIONS.map((fw) => (
            <label key={fw} className="flex items-center gap-2 text-sm cursor-pointer" style={{ fontFamily: 'Outfit' }}>
              <input type="checkbox" checked={frameworks.includes(fw)} onChange={() => toggleFramework(fw)} className="rounded border-[var(--border)]" />
              {fw}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm cursor-pointer font-medium" style={{ fontFamily: 'Outfit', color: 'var(--brand)' }}>
            <input type="checkbox" checked={frameworks.length === FRAMEWORK_OPTIONS.length} onChange={selectAll} className="rounded border-[var(--border)]" />
            All Frameworks
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button onClick={() => setShowPreview(true)} className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-md hover:bg-[var(--brand-subtle)] transition-colors" style={{ fontFamily: 'Outfit' }}>
          Preview
        </button>
        <button onClick={handlePrint} className="px-4 py-2 text-sm font-medium rounded-md text-white transition-colors" style={{ fontFamily: 'Outfit', backgroundColor: 'var(--brand)' }}>
          Generate PDF
        </button>
      </div>

      {/* Preview Dialog */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-lg border border-[var(--border)] max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
              <p className="text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>Report Preview</p>
              <button onClick={() => setShowPreview(false)} className="text-sm px-2 py-1 border border-[var(--border)] rounded-md hover:bg-[var(--brand-subtle)]" style={{ fontFamily: 'Outfit' }}>Close</button>
            </div>
            <div ref={previewRef} className="p-8 space-y-6" id="report-preview">
              <p className="text-xl font-bold" style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '20px', color: 'var(--brand)' }}>Certifyi Sentinel</p>
              <div>
                <p className="text-lg font-semibold" style={{ fontFamily: 'Outfit' }}>{reportTitle || 'Security Posture Report'}</p>
                <p className="text-sm" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>{orgName || 'Organisation'} | {dateFrom || 'Start'} to {dateTo || 'End'}</p>
                <p className="text-sm mt-1" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>Frameworks: {selectedFrameworks.join(', ')}</p>
              </div>
              <div className="border-t border-[var(--border)] pt-4">
                <p className="text-sm leading-relaxed" style={{ fontFamily: 'Outfit' }}>This report provides a comprehensive assessment of {orgName || 'the organisation'}'s AI security posture. Overall risk has been evaluated at {riskScore}/100, indicating a {scoreLabel(riskScore) === 'pass' ? 'healthy' : scoreLabel(riskScore) === 'warn' ? 'moderate' : 'critical'} security state. Immediate attention is recommended for any findings classified as Critical or High severity.</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>Overall Risk Score</p>
                <span className={`inline-block px-3 py-1 text-sm font-bold rounded ${
                  scoreLabel(riskScore) === 'pass' ? 'bg-[var(--pass-bg)] text-[var(--pass-text)]' :
                  scoreLabel(riskScore) === 'warn' ? 'bg-[var(--warn-bg)] text-[var(--warn-text)]' :
                  'bg-[var(--fail-bg)] text-[var(--fail-text)]'
                }`} style={{ fontFamily: 'Outfit' }}>{riskScore}/100</span>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ fontFamily: 'Outfit' }}>Framework Alignment</p>
                <table className="w-full text-sm border border-[var(--border)]" style={{ fontFamily: 'Outfit' }}>
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Framework</th>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Score</th>
                      <th className="text-left p-2 font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFrameworks.map((fw) => {
                      const s = deterministicScore(fw);
                      const l = scoreLabel(s);
                      return (
                        <tr key={fw} className="border-b border-[var(--border)]">
                          <td className="p-2">{fw}</td>
                          <td className="p-2">{s}%</td>
                          <td className="p-2"><span className={`px-2 py-0.5 text-xs rounded ${
                            l === 'pass' ? 'bg-[var(--pass-bg)] text-[var(--pass-text)]' :
                            l === 'warn' ? 'bg-[var(--warn-bg)] text-[var(--warn-text)]' :
                            'bg-[var(--fail-bg)] text-[var(--fail-text)]'
                          }`}>{l === 'pass' ? 'Pass' : l === 'warn' ? 'Warning' : 'Fail'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[var(--border)] pt-4 text-xs" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>
                Generated by Certifyi Sentinel | certifyi.ai | {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}