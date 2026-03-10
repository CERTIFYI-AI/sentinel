import { useNavigate } from 'react-router-dom';
import { deterministicScore, scoreLabel } from '../../lib/compliance/heatmapUtils';

interface Deployment {
  model: string;
  type: string;
  risk: 'Critical' | 'High' | 'Medium' | 'Low';
  lastScan: string;
  findings: number;
  status: 'Protected' | 'Scanning' | 'At Risk';
}

const FRAMEWORKS = [
  'NIST AI RMF', 'OWASP LLM Top 10', 'OWASP Agentic', 'OWASP API',
  'MITRE ATLAS', 'ISO 42001', 'EU AI Act', 'DoD AI Ethics',
] as const;

const DEPLOYMENTS: Deployment[] = [
  { model: 'GPT-4o', type: 'Chat', risk: 'Low', lastScan: '2025-03-08', findings: 3, status: 'Protected' },
  { model: 'Claude 3.5 Sonnet', type: 'Agent', risk: 'Medium', lastScan: '2025-03-07', findings: 7, status: 'Protected' },
  { model: 'Llama 3.1 70B', type: 'Completion', risk: 'High', lastScan: '2025-03-05', findings: 14, status: 'At Risk' },
  { model: 'Mistral Large', type: 'RAG', risk: 'Medium', lastScan: '2025-03-06', findings: 5, status: 'Scanning' },
  { model: 'GPT-4o-mini', type: 'Classification', risk: 'Low', lastScan: '2025-03-08', findings: 1, status: 'Protected' },
  { model: 'Custom FinBERT', type: 'Embedding', risk: 'Critical', lastScan: '2025-03-02', findings: 22, status: 'At Risk' },
  { model: 'Gemini 1.5 Pro', type: 'Multi-modal', risk: 'Medium', lastScan: '2025-03-04', findings: 9, status: 'Scanning' },
  { model: 'DeepSeek-V3', type: 'Code Gen', risk: 'High', lastScan: '2025-03-03', findings: 16, status: 'At Risk' },
];

const SPARKLINE = [3, 5, 4, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19, 18, 20];

function riskClass(risk: string): string {
  switch (risk) {
    case 'Critical': return 'bg-[var(--fail-bg)] text-[var(--fail-text)] border border-[var(--fail-border)]';
    case 'High': return 'bg-[var(--fail-bg)] text-[var(--fail-text)] border border-[var(--fail-border)]';
    case 'Medium': return 'bg-[var(--warn-bg)] text-[var(--warn-text)] border border-[var(--warn-border)]';
    case 'Low': return 'bg-[var(--pass-bg)] text-[var(--pass-text)] border border-[var(--pass-border)]';
    default: return '';
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'Protected': return 'bg-[var(--pass-bg)] text-[var(--pass-text)] border border-[var(--pass-border)]';
    case 'Scanning': return 'bg-[var(--warn-bg)] text-[var(--warn-text)] border border-[var(--warn-border)]';
    case 'At Risk': return 'bg-[var(--fail-bg)] text-[var(--fail-text)] border border-[var(--fail-border)]';
    default: return '';
  }
}

export default function SecurityHome() {
  const navigate = useNavigate();
  const riskScore = deterministicScore('overall-risk', 70, 95);
  const riskLevel = scoreLabel(riskScore);
  const activeDeployments = DEPLOYMENTS.length;
  const criticalVulns = 4;
  const highVulns = 12;
  const mediumVulns = 23;
  const maxSparkline = 20;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Outfit' }}>Security Posture</h1>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium border border-[var(--border)] rounded-md hover:bg-[var(--brand-subtle)] transition-colors"
          style={{ fontFamily: 'Outfit' }}
        >
          Export Board Report
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk Score */}
        <div className="border border-[var(--border)] rounded-lg p-5">
          <p className="text-sm font-medium" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>Overall Risk Score</p>
          <p className="text-4xl font-bold mt-2" style={{
            fontFamily: 'Outfit',
            color: riskLevel === 'pass' ? 'var(--pass)' : riskLevel === 'warn' ? 'var(--warn)' : 'var(--fail)'
          }}>{riskScore}</p>
          <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded ${riskLevel === 'pass' ? 'bg-[var(--pass-bg)] text-[var(--pass-text)]' : riskLevel === 'warn' ? 'bg-[var(--warn-bg)] text-[var(--warn-text)]' : 'bg-[var(--fail-bg)] text-[var(--fail-text)]'}`}
            style={{ fontFamily: 'Outfit' }}>{riskLevel === 'pass' ? 'Healthy' : riskLevel === 'warn' ? 'Needs Attention' : 'Critical'}</span>
        </div>

        {/* Active Deployments */}
        <div className="border border-[var(--border)] rounded-lg p-5">
          <p className="text-sm font-medium" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>Active Deployments</p>
          <p className="text-4xl font-bold mt-2" style={{ fontFamily: 'Outfit', color: 'var(--foreground)' }}>{activeDeployments}</p>
          <div className="flex items-end gap-px mt-3 h-6">
            {SPARKLINE.map((v, i) => (
              <div key={i} className="flex-1 bg-[var(--brand)]" style={{ height: `${(v / maxSparkline) * 100}%`, opacity: 0.5 + (i / SPARKLINE.length) * 0.5, borderRadius: '1px' }} />
            ))}
          </div>
          <p className="text-xs mt-1" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>Last 30 days</p>
        </div>

        {/* Open Vulnerabilities */}
        <div className="border border-[var(--border)] rounded-lg p-5">
          <p className="text-sm font-medium" style={{ fontFamily: 'Outfit', color: 'var(--muted-foreground)' }}>Open Vulnerabilities</p>
          <p className="text-4xl font-bold mt-2" style={{ fontFamily: 'Outfit', color: 'var(--foreground)' }}>{criticalVulns + highVulns + mediumVulns}</p>
          <div className="flex gap-2 mt-3">
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--fail-bg)] text-[var(--fail-text)] border border-[var(--fail-border)]" style={{ fontFamily: 'Outfit' }}>{criticalVulns} Critical</span>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--fail-bg)] text-[var(--fail-text)] border border-[var(--fail-border)]" style={{ fontFamily: 'Outfit' }}>{highVulns} High</span>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--warn-bg)] text-[var(--warn-text)] border border-[var(--warn-border)]" style={{ fontFamily: 'Outfit' }}>{mediumVulns} Medium</span>
          </div>
        </div>
      </div>

      {/* Framework Alignment Strip */}
      <div className="border border-[var(--border)] rounded-lg p-4">
        <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Outfit' }}>Framework Alignment</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {FRAMEWORKS.map((fw) => {
            const score = deterministicScore(fw);
            const level = scoreLabel(score);
            return (
              <div key={fw} className={`border rounded-md p-3 text-center ${
                level === 'pass' ? 'border-[var(--pass-border)] bg-[var(--pass-bg)]' :
                level === 'warn' ? 'border-[var(--warn-border)] bg-[var(--warn-bg)]' :
                'border-[var(--fail-border)] bg-[var(--fail-bg)]'
              }`}>
                <p className="text-xs font-medium truncate" style={{ fontFamily: 'Outfit' }}>{fw}</p>
                <p className="text-lg font-bold mt-1" style={{
                  fontFamily: 'Outfit',
                  color: level === 'pass' ? 'var(--pass-text)' : level === 'warn' ? 'var(--warn-text)' : 'var(--fail-text)'
                }}>{score}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deployment Security Table */}
      <div className="border border-[var(--border)] rounded-lg">
        <div className="p-4 border-b border-[var(--border)]">
          <p className="text-sm font-semibold" style={{ fontFamily: 'Outfit' }}>Deployment Security</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'Outfit' }}>
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Model Name</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Type</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Risk Level</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Last Scan</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Findings</th>
                <th className="text-left p-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {DEPLOYMENTS.map((d) => (
                <tr key={d.model} className="border-b border-[var(--border)] hover:bg-[var(--brand-subtle)] transition-colors cursor-pointer" onClick={() => navigate('/security/scanner')}>
                  <td className="p-3 font-medium">{d.model}</td>
                  <td className="p-3" style={{ color: 'var(--muted-foreground)' }}>{d.type}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 text-xs font-medium rounded ${riskClass(d.risk)}`}>{d.risk}</span></td>
                  <td className="p-3" style={{ color: 'var(--muted-foreground)' }}>{d.lastScan}</td>
                  <td className="p-3 font-medium">{d.findings}</td>
                  <td className="p-3"><span className={`px-2 py-0.5 text-xs font-medium rounded ${statusClass(d.status)}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}