import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/layout/Layout';

// Overview
import Overview from './pages/Overview';
import SecurityOverview from './pages/security/SecurityOverview';

// Threat Intelligence
import ThreatFeed from './pages/security/ThreatFeed';
import AttackSurface from './pages/security/AttackSurface';
import VulnTracker from './pages/security/VulnTracker';
import ScanCenter from './pages/security/ScanCenter';

// Security Ops
import RedTeamLab from './pages/security/RedTeamLab';
import PolicyFirewall from './pages/security/PolicyFirewall';
import KeysVault from './pages/security/KeysVault';

// Compliance
import Compliance from './pages/Compliance';
import AuditLog from './pages/AuditLog';
import Evidence from './pages/Evidence';
import GapAnalysis from './pages/GapAnalysis';
import PolicyEditor from './pages/PolicyEditor';

// AI Governance
import Models from './pages/models/Models';
import ModelLifecycle from './pages/models/ModelLifecycle';
import Evals from './pages/evals/Evals';
import Datasets from './pages/Datasets';
import MetricStudio from './pages/MetricStudio';
import Benchmark from './pages/Benchmark';
import MultiTurn from './pages/MultiTurn';
import Proxy from './pages/Proxy';
import DependencyGraph from './pages/DependencyGraph';

// Risk
import RiskMatrix from './pages/RiskMatrix';
import IncidentLog from './pages/IncidentLog';
import Remediation from './pages/Remediation';
import RemediationTracker from './pages/RemediationTracker';

// Operations
import HitlQueue from './pages/HitlQueue';
import Tasks from './pages/Tasks';
import ExportCenter from './pages/ExportCenter';
import Notifications from './pages/Notifications';
import Vendors from './pages/Vendors';

// Settings & Auth
import Settings from './pages/Settings';
import Signup from './pages/Signup';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Navigate to="/overview" replace />} />
                <Route path="/overview" element={<Overview />} />
                <Route path="/security-overview" element={<SecurityOverview />} />

                {/* Threat Intelligence */}
                <Route path="/threat-feed" element={<ThreatFeed />} />
                <Route path="/attack-surface" element={<AttackSurface />} />
                <Route path="/vuln-tracker" element={<VulnTracker />} />
                <Route path="/scan-center" element={<ScanCenter />} />

                {/* Security Ops */}
                <Route path="/red-team-lab" element={<RedTeamLab />} />
                <Route path="/policy-firewall" element={<PolicyFirewall />} />
                <Route path="/keys-vault" element={<KeysVault />} />

                {/* Compliance */}
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/hitl-queue" element={<HitlQueue />} />
                <Route path="/incident-log" element={<IncidentLog />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/evidence" element={<Evidence />} />
                <Route path="/policy-editor" element={<PolicyEditor />} />
                <Route path="/gap-analysis" element={<GapAnalysis />} />

                {/* AI Governance */}
                <Route path="/models" element={<Models />} />
                <Route path="/model-lifecycle" element={<ModelLifecycle />} />
                <Route path="/risk-matrix" element={<RiskMatrix />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/benchmark" element={<Benchmark />} />
                <Route path="/evals" element={<Evals />} />
                <Route path="/metric-studio" element={<MetricStudio />} />
                <Route path="/datasets" element={<Datasets />} />
                <Route path="/multiturn" element={<MultiTurn />} />
                <Route path="/proxy" element={<Proxy />} />
                <Route path="/dependency-graph" element={<DependencyGraph />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/remediation" element={<Remediation />} />
                <Route path="/remediation-tracker" element={<RemediationTracker />} />
                <Route path="/export" element={<ExportCenter />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="/signup" element={<Signup />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}