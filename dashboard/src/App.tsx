import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';

// Security pages
const SecurityHome = lazy(() => import('./pages/security/SecurityHome'));
const SecurityOverview = lazy(() => import('./pages/security/SecurityOverview'));
const ThreatFeed = lazy(() => import('./pages/security/ThreatFeed'));
const ScanCenter = lazy(() => import('./pages/security/ScanCenter'));
const AttackSurface = lazy(() => import('./pages/security/AttackSurface'));
const VulnTracker = lazy(() => import('./pages/security/VulnTracker'));
const RedTeamLab = lazy(() => import('./pages/security/RedTeamLab'));
const PolicyFirewall = lazy(() => import('./pages/security/PolicyFirewall'));
const KeysVault = lazy(() => import('./pages/security/KeysVault'));
const ModelArena = lazy(() => import('./pages/security/ModelArena'));
const ReportGenerator = lazy(() => import('./pages/security/ReportGenerator'));

// Eval pages
const QualityMetrics = lazy(() => import('./pages/evals/QualityMetrics'));
const EvalTechniques = lazy(() => import('./pages/evals/EvalTechniques'));

// Compliance pages
const ComplianceControls = lazy(() => import('./pages/compliance/ComplianceControls'));
const EvidenceHub = lazy(() => import('./pages/compliance/EvidenceHub'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));

// Risk pages
const RiskMatrix = lazy(() => import('./pages/RiskMatrix'));

// Top-level pages
const Overview = lazy(() => import('./pages/Overview'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Benchmark = lazy(() => import('./pages/Benchmark'));
const Datasets = lazy(() => import('./pages/Datasets'));
const EvidenceVault = lazy(() => import('./pages/EvidenceVault'));
const ExportCenter = lazy(() => import('./pages/ExportCenter'));
const GapAnalysis = lazy(() => import('./pages/GapAnalysis'));
const HitlQueue = lazy(() => import('./pages/HitlQueue'));
const IncidentLog = lazy(() => import('./pages/IncidentLog'));
const ModelInventory = lazy(() => import('./pages/ModelInventory'));
const ModelLifecycle = lazy(() => import('./pages/ModelLifecycle'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PolicyEditor = lazy(() => import('./pages/PolicyEditor'));
const Remediation = lazy(() => import('./pages/Remediation'));
const RemediationTracker = lazy(() => import('./pages/RemediationTracker'));
const Settings = lazy(() => import('./pages/Settings'));
const Vendors = lazy(() => import('./pages/Vendors'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

function Loading() {
  return <div className="flex items-center justify-center h-64" style={{ fontFamily: 'Outfit' }}><p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading...</p></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Suspense fallback={<Loading />}><Login /></Suspense>} />
        <Route path="/signup" element={<Suspense fallback={<Loading />}><Signup /></Suspense>} />
        <Route path="/*" element={
          <div className="flex min-h-screen bg-white">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <Suspense fallback={<Loading />}>
                <Routes>
                  {/* Dashboard */}
                  <Route path="/" element={<Navigate to="/security" replace />} />
                  <Route path="/overview" element={<Overview />} />

                  {/* Security */}
                  <Route path="/security" element={<SecurityHome />} />
                  <Route path="/security/overview" element={<SecurityOverview />} />
                  <Route path="/security/threats" element={<ThreatFeed />} />
                  <Route path="/security/scans" element={<ScanCenter />} />
                  <Route path="/security/scanner" element={<ScanCenter />} />
                  <Route path="/security/attack-surface" element={<AttackSurface />} />
                  <Route path="/security/vulnerabilities" element={<VulnTracker />} />
                  <Route path="/security/red-team" element={<RedTeamLab />} />
                  <Route path="/security/policies" element={<PolicyFirewall />} />
                  <Route path="/security/keys" element={<KeysVault />} />
                  <Route path="/security/model-arena" element={<ModelArena />} />
                  <Route path="/security/reports" element={<ReportGenerator />} />
                  <Route path="/security/model-auditor" element={<SecurityOverview />} />
                  <Route path="/security/campaigns" element={<ThreatFeed />} />
                  <Route path="/security/frameworks" element={<SecurityHome />} />
                  <Route path="/security/strategy" element={<SecurityHome />} />

                  {/* Evals */}
                  <Route path="/evals" element={<QualityMetrics />} />
                  <Route path="/evals/quality-metrics" element={<QualityMetrics />} />
                  <Route path="/evals/techniques" element={<EvalTechniques />} />
                  <Route path="/evals/results" element={<QualityMetrics />} />
                  <Route path="/evals/benchmark" element={<Benchmark />} />
                  <Route path="/evals/datasets" element={<Datasets />} />

                  {/* Compliance */}
                  <Route path="/compliance" element={<ComplianceDashboard />} />
                  <Route path="/compliance/controls" element={<ComplianceControls />} />
                  <Route path="/compliance/evidence" element={<EvidenceHub />} />
                  <Route path="/compliance/gap-analysis" element={<GapAnalysis />} />

                  {/* Risk */}
                  <Route path="/risk" element={<RiskMatrix />} />
                  <Route path="/risk/matrix" element={<RiskMatrix />} />
                  <Route path="/risk/vendors" element={<Vendors />} />
                  <Route path="/risk/incidents" element={<IncidentLog />} />
                  <Route path="/risk/remediation" element={<Remediation />} />

                  {/* Models */}
                  <Route path="/models" element={<ModelInventory />} />
                  <Route path="/models/inventory" element={<ModelInventory />} />
                  <Route path="/models/lifecycle" element={<ModelLifecycle />} />

                  {/* Operations */}
                  <Route path="/audit-log" element={<AuditLog />} />
                  <Route path="/evidence-vault" element={<EvidenceVault />} />
                  <Route path="/export" element={<ExportCenter />} />
                  <Route path="/hitl-queue" element={<HitlQueue />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/policy-editor" element={<PolicyEditor />} />
                  <Route path="/remediation-tracker" element={<RemediationTracker />} />
                  <Route path="/settings" element={<Settings />} />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/security" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}
