import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import Models from './pages/Models';
import Controls from './pages/Controls';
import Datasets from './pages/Datasets';
import Agents from './pages/Agents';
import Vendors from './pages/Vendors';
import Security from './pages/Security';
import BiasAudits from './pages/BiasAudits';
import Compliance from './pages/Compliance';
import TrustEngine from './pages/TrustEngine';
import ShadowAI from './pages/ShadowAI';
import RegRadar from './pages/RegRadar';
import Approvals from './pages/Approvals';
import Evals from './pages/Evals';
import Evidence from './pages/Evidence';
import Observability from './pages/Observability';
import Events from './pages/Events';
import AuditLogs from './pages/AuditLogs';
import CISO from './pages/CISO';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/models" element={<Models />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/security" element={<Security />} />
          <Route path="/bias-audits" element={<BiasAudits />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/trust-engine" element={<TrustEngine />} />
          <Route path="/shadow-ai" element={<ShadowAI />} />
          <Route path="/reg-radar" element={<RegRadar />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/evals" element={<Evals />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/observability" element={<Observability />} />
          <Route path="/events" element={<Events />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/ciso" element={<CISO />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
