import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";
import Sidebar from "./components/Sidebar";

// Lazy-loaded pages for code splitting
const Overview = lazy(() => import("./pages/Overview"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const HitlQueue = lazy(() => import("./pages/HitlQueue"));
const IncidentLog = lazy(() => import("./pages/IncidentLog"));
const Compliance = lazy(() => import("./pages/ComplianceDashboard"));
const Evidence = lazy(() => import("./pages/EvidenceVault"));
const PolicyEditor = lazy(() => import("./pages/PolicyEditor"));
const GapAnalysis = lazy(() => import("./pages/GapAnalysis"));
const Models = lazy(() => import("./pages/ModelInventory"));
const ModelLifecycle = lazy(() => import("./pages/ModelLifecycle"));
const RiskMatrix = lazy(() => import("./pages/RiskMatrix"));
const Vendors = lazy(() => import("./pages/Vendors"));
const Benchmark = lazy(() => import("./pages/Benchmark"));
const Evals = lazy(() => import("./pages/evals/EvalRunWizard"));
const MetricStudio = lazy(() => import("./pages/evals/MetricStudio"));
const Datasets = lazy(() => import("./pages/Datasets"));
const MultiTurn = lazy(() => import("./pages/evals/MultiTurnEditor"));
const Proxy = lazy(() => import("./pages/proxy/ActivityTimeline"));
const DependencyGraph = lazy(() => import("./pages/proxy/DependencyGraph"));
const Tasks = lazy(() => import("./pages/tasks/TaskBoard"));
const Remediation = lazy(() => import("./pages/Remediation"));
const ExportCenter = lazy(() => import("./pages/ExportCenter"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));

// Security Intelligence pages
const SecurityOverview = lazy(() => import("./pages/security/SecurityOverview"));
const ThreatFeed = lazy(() => import("./pages/security/ThreatFeed"));
const ScanCenter = lazy(() => import("./pages/security/ScanCenter"));
const AttackSurface = lazy(() => import("./pages/security/AttackSurface"));
const RedTeamLab = lazy(() => import("./pages/security/RedTeamLab"));
const PolicyFirewall = lazy(() => import("./pages/security/PolicyFirewall"));
const VulnTracker = lazy(() => import("./pages/security/VulnTracker"));
const KeysVault = lazy(() => import("./pages/security/KeysVault"));

function PageLoader() {
  return <LoadingSpinner label="Loading page..." className="min-h-screen" />;
}

function Layout() {
  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

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
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/hitl-queue" element={<HitlQueue />} />
                <Route path="/incident-log" element={<IncidentLog />} />
                <Route path="/compliance" element={<Compliance />} />
                <Route path="/evidence" element={<Evidence />} />
                <Route path="/policy-editor" element={<PolicyEditor />} />
                <Route path="/gap-analysis" element={<GapAnalysis />} />
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
                <Route path="/export" element={<ExportCenter />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                {/* Security Intelligence */}
                <Route path="/security" element={<SecurityOverview />} />
                <Route path="/security/threat-feed" element={<ThreatFeed />} />
                <Route path="/security/scan-center" element={<ScanCenter />} />
                <Route path="/security/attack-surface" element={<AttackSurface />} />
                <Route path="/security/red-team" element={<RedTeamLab />} />
                <Route path="/security/policy-firewall" element={<PolicyFirewall />} />
                <Route path="/security/vuln-tracker" element={<VulnTracker />} />
                <Route path="/security/keys-vault" element={<KeysVault />} />
                <Route path="*" element={<Navigate to="/overview" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
