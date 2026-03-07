import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/dashboard/Sidebar";
import { TopBar } from "./components/dashboard/TopBar";
import { ThemeProvider } from "./components/theme-provider";
import Overview from "./pages/Overview";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import AuditLog from "./pages/AuditLog";
import HitlQueue from "./pages/HitlQueue";
import ModelInventory from "./pages/ModelInventory";
import Settings from "./pages/Settings";
import RiskMatrix from "./pages/RiskMatrix";
import EvidenceVault from "./pages/EvidenceVault";
import RemediationTracker from "./pages/RemediationTracker";
import PolicyEditor from "./pages/PolicyEditor";
import IncidentLog from "./pages/IncidentLog";
import Benchmark from "./pages/Benchmark";
import ExportCenter from "./pages/ExportCenter";
import Notifications from "./pages/Notifications";

function ProtectedLayout() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="sentinel-theme">
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedLayout />}>
            <Route path="/overview" element={<Overview />} />
            <Route path="/compliance" element={<ComplianceDashboard />} />
            <Route path="/audit-log" element={<AuditLog />} />
            <Route path="/hitl-queue" element={<HitlQueue />} />
            <Route path="/models" element={<ModelInventory />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/risk-matrix" element={<RiskMatrix />} />
            <Route path="/evidence" element={<EvidenceVault />} />
            <Route path="/remediation" element={<RemediationTracker />} />
            <Route path="/policies" element={<PolicyEditor />} />
            <Route path="/incidents" element={<IncidentLog />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="/exports" element={<ExportCenter />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
