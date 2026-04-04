import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Database, Shield, AlertTriangle, CheckCircle, Search, Download, Plus, Eye, FileText, Lock } from 'lucide-react';

const datasets = [
  { id: 'DS-001', name: 'Customer PII Records', model: 'Fraud Detection v2.1', sensitivity: 'PII', status: 'active', riskLevel: 'critical', records: 245000, lastAudit: '2025-11-15', owner: 'Data Engineering', retention: '7 years', encryption: 'AES-256' },
  { id: 'DS-002', name: 'Patient Health Records', model: 'Clinical NLP v1.4', sensitivity: 'PHI', status: 'active', riskLevel: 'critical', records: 89000, lastAudit: '2025-10-20', owner: 'Healthcare AI', retention: '10 years', encryption: 'AES-256' },
  { id: 'DS-003', name: 'Credit Scoring Features', model: 'Credit Risk v3.0', sensitivity: 'PII', status: 'active', riskLevel: 'high', records: 1200000, lastAudit: '2025-12-01', owner: 'Risk Analytics', retention: '5 years', encryption: 'AES-256' },
  { id: 'DS-004', name: 'Employee Performance Data', model: 'HR Attrition Model', sensitivity: 'internal', status: 'review', riskLevel: 'medium', records: 15000, lastAudit: '2025-08-10', owner: 'People Analytics', retention: '3 years', encryption: 'AES-128' },
  { id: 'DS-005', name: 'Transaction Logs', model: 'AML Detection v2.0', sensitivity: 'confidential', status: 'active', riskLevel: 'high', records: 5400000, lastAudit: '2026-01-05', owner: 'FinCrime Unit', retention: '7 years', encryption: 'AES-256' },
  { id: 'DS-006', name: 'Social Media Sentiment', model: 'Brand Monitor v1.2', sensitivity: 'public', status: 'active', riskLevel: 'low', records: 3200000, lastAudit: '2026-02-14', owner: 'Marketing AI', retention: '2 years', encryption: 'TLS' },
  { id: 'DS-007', name: 'Biometric Auth Logs', model: 'Identity Verify v4.0', sensitivity: 'PII', status: 'archived', riskLevel: 'critical', records: 670000, lastAudit: '2025-06-30', owner: 'Security Ops', retention: '5 years', encryption: 'AES-256' },
  { id: 'DS-008', name: 'Insurance Claims Data', model: 'Claims Triage v2.3', sensitivity: 'PII', status: 'active', riskLevel: 'high', records: 340000, lastAudit: '2025-09-22', owner: 'Underwriting AI', retention: '10 years', encryption: 'AES-256' },
];

const sensitivityColors: Record<string, string> = { PII: 'bg-red-600', PHI: 'bg-purple-600', confidential: 'bg-orange-500', internal: 'bg-yellow-500', public: 'bg-green-500' };
const riskColors: Record<string, string> = { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400' };
const statusColors: Record<string, string> = { active: 'bg-emerald-900 text-emerald-300', review: 'bg-yellow-900 text-yellow-300', archived: 'bg-gray-700 text-foreground' };

export default function DatasetRegistry() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const totalDatasets = datasets.length;
  const piiDatasets = datasets.filter(d => d.sensitivity === 'PII' || d.sensitivity === 'PHI').length;
  const criticalRisk = datasets.filter(d => d.riskLevel === 'critical').length;
  const needsAudit = datasets.filter(d => d.lastAudit < '2026-01-01').length;

  const filtered = datasets.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.id.toLowerCase().includes(search.toLowerCase()) ||
      d.model.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || d.riskLevel === filter || d.status === filter || d.sensitivity === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dataset Registry</h1>
          <p className="text-sm text-muted-foreground">AI training and inference data governance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button size="sm" className="bg-[hsl(var(--brand))] hover:bg-primary/90"><Plus className="h-4 w-4 mr-1" />Register Dataset</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Total Datasets</p><p className="text-2xl font-bold">{totalDatasets}</p></div>
            <Database className="h-8 w-8 text-[hsl(var(--brand))]" />
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">PII/PHI Datasets</p><p className="text-2xl font-bold text-red-400">{piiDatasets}</p></div>
            <Lock className="h-8 w-8 text-red-400" />
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Critical Risk</p><p className="text-2xl font-bold text-orange-400">{criticalRisk}</p></div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-muted-foreground">Needs Re-Audit</p><p className="text-2xl font-bold text-yellow-400">{needsAudit}</p></div>
            <Shield className="h-8 w-8 text-yellow-400" />
          </div>
        </Card>
      </div>

      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search datasets, models..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm">
            <option value="all">All</option>
            <option value="PII">PII</option>
            <option value="PHI">PHI</option>
            <option value="critical">Critical</option>
            <option value="high">High Risk</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-2">ID</th>
                <th className="text-left py-3 px-2">Dataset Name</th>
                <th className="text-left py-3 px-2">Linked Model</th>
                <th className="text-left py-3 px-2">Sensitivity</th>
                <th className="text-left py-3 px-2">Risk Level</th>
                <th className="text-left py-3 px-2">Records</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-left py-3 px-2">Last Audit</th>
                <th className="text-left py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ds => (
                <tr key={ds.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-2 font-mono text-xs">{ds.id}</td>
                  <td className="py-3 px-2">
                    <div className="font-medium">{ds.name}</div>
                    <div className="text-xs text-muted-foreground">{ds.owner} | {ds.encryption}</div>
                  </td>
                  <td className="py-3 px-2 text-xs">{ds.model}</td>
                  <td className="py-3 px-2"><span className={"px-2 py-0.5 rounded text-xs font-medium text-foreground " + (sensitivityColors[ds.sensitivity] || 'bg-gray-500')}>{ds.sensitivity.toUpperCase()}</span></td>
                  <td className="py-3 px-2"><span className={"text-xs font-semibold " + (riskColors[ds.riskLevel] || '')}>{ds.riskLevel.toUpperCase()}</span></td>
                  <td className="py-3 px-2 text-xs">{ds.records.toLocaleString()}</td>
                  <td className="py-3 px-2"><span className={"px-2 py-0.5 rounded text-xs " + (statusColors[ds.status] || '')}>{ds.status}</span></td>
                  <td className="py-3 px-2 text-xs">{ds.lastAudit}</td>
                  <td className="py-3 px-2">
                    <Button size="sm" variant="ghost" onClick={() => navigate('/datasets/' + ds.id)}><Eye className="h-3 w-3 mr-1" />View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
