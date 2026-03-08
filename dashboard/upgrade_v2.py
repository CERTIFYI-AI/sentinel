import os
S='/workspaces/sentinel/dashboard/src'
def w(p,c):
  fp=os.path.join(S,p)
  os.makedirs(os.path.dirname(fp),exist_ok=True)
  open(fp,'w').write(c)
  print('wrote',p)

print('=== UPGRADE V2 ===')

# 1. main.tsx - ensure light mode default
w('main.tsx',r'''
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App/></React.StrictMode>
);
'''.lstrip())

print('=== 1. main.tsx done ===')

# 2. App.tsx with correct import paths
w('App.tsx', r'''
import {BrowserRouter,Routes,Route,Navigate,Outlet} from "react-router-dom";
import {ThemeProvider} from "./context/ThemeContext";
import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import AuditLog from "./pages/AuditLog";
import HitlQueue from "./pages/HitlQueue";
import IncidentLog from "./pages/IncidentLog";
import Compliance from "./pages/ComplianceDashboard";
import Evidence from "./pages/EvidenceVault";
import PolicyEditor from "./pages/PolicyEditor";
import GapAnalysis from "./pages/GapAnalysis";
import Models from "./pages/ModelInventory";
import ModelLifecycle from "./pages/ModelLifecycle";
import RiskMatrix from "./pages/RiskMatrix";
import Vendors from "./pages/Vendors";
import Benchmark from "./pages/Benchmark";
import Evals from "./pages/evals/EvalRunWizard";
import MetricStudio from "./pages/evals/MetricStudio";
import Datasets from "./pages/Datasets";
import MultiTurn from "./pages/evals/MultiTurnEditor";
import Proxy from "./pages/proxy/ActivityTimeline";
import DependencyGraph from "./pages/proxy/DependencyGraph";
import Tasks from "./pages/tasks/TaskBoard";
import Remediation from "./pages/Remediation";
import ExportCenter from "./pages/ExportCenter";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";

function Layout(){
  return(
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden">
      <Sidebar/>
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <Outlet/>
      </main>
    </div>
  );
}

export default function App(){
  return(
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout/>}>
            <Route index element={<Navigate to="/overview" replace/>}/>
            <Route path="/overview" element={<Overview/>}/>
            <Route path="/audit-log" element={<AuditLog/>}/>
            <Route path="/hitl-queue" element={<HitlQueue/>}/>
            <Route path="/incident-log" element={<IncidentLog/>}/>
            <Route path="/compliance" element={<Compliance/>}/>
            <Route path="/evidence" element={<Evidence/>}/>
            <Route path="/policy-editor" element={<PolicyEditor/>}/>
            <Route path="/gap-analysis" element={<GapAnalysis/>}/>
            <Route path="/models" element={<Models/>}/>
            <Route path="/model-lifecycle" element={<ModelLifecycle/>}/>
            <Route path="/risk-matrix" element={<RiskMatrix/>}/>
            <Route path="/vendors" element={<Vendors/>}/>
            <Route path="/benchmark" element={<Benchmark/>}/>
            <Route path="/evals" element={<Evals/>}/>
            <Route path="/metric-studio" element={<MetricStudio/>}/>
            <Route path="/datasets" element={<Datasets/>}/>
            <Route path="/multiturn" element={<MultiTurn/>}/>
            <Route path="/proxy" element={<Proxy/>}/>
            <Route path="/dependency-graph" element={<DependencyGraph/>}/>
            <Route path="/tasks" element={<Tasks/>}/>
            <Route path="/remediation" element={<Remediation/>}/>
            <Route path="/export" element={<ExportCenter/>}/>
            <Route path="/notifications" element={<Notifications/>}/>
            <Route path="/settings" element={<Settings/>}/>
            <Route path="*" element={<Navigate to="/overview" replace/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
'''.lstrip())
print('=== 2. App.tsx done ===')
