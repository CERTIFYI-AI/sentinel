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

function Loading() {
  return <div className="flex items-center justify-center h-64" style={{ fontFamily: 'Outfit' }}><p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading...</p></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Security */}
              <Route path="/security" element={<SecurityHome />} />
              <Route path="/security/overview" element={<SecurityOverview />} />
              <Route path="/security/threats" element={<ThreatFeed />} />
              <Route path="/security/scans" element={<ScanCenter />} />
              <Route path="/security/attack-surface" element={<AttackSurface />} />
              <Route path="/security/vulnerabilities" element={<VulnTracker />} />
              <Route path="/security/red-team" element={<RedTeamLab />} />
              <Route path="/security/policies" element={<PolicyFirewall />} />
              <Route path="/security/keys" element={<KeysVault />} />
              <Route path="/security/model-arena" element={<ModelArena />} />
              <Route path="/security/reports" element={<ReportGenerator />} />
              <Route path="/security/scanner" element={<ScanCenter />} />
              <Route path="/security/model-auditor" element={<SecurityOverview />} />
              <Route path="/security/campaigns" element={<ThreatFeed />} />
              <Route path="/security/frameworks" element={<SecurityHome />} />
              <Route path="/security/strategy" element={<SecurityHome />} />

              {/* Evals */}
              <Route path="/evals" element={<QualityMetrics />} />
              <Route path="/evals/quality-metrics" element={<QualityMetrics />} />
              <Route path="/evals/techniques" element={<EvalTechniques />} />
              <Route path="/evals/results" element={<QualityMetrics />} />

              {/* Default */}
              <Route path="/" element={<Navigate to="/security" replace />} />
              <Route path="*" element={<Navigate to="/security" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}