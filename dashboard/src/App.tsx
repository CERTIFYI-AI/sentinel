// @ts-nocheck
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const queryClient = new QueryClient()
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { TenantProvider } from './context/TenantContext';
import React from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { PageSkeleton } from './components/ui/PageSkeleton';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import CommandPalette from './components/CommandPalette';
import { useRealtimeEvents } from './hooks/useRealtimeEvents';
import { useRealtimeInvalidation } from './hooks/useRealtimeInvalidation';
import { useAuthStore } from './store/authStore';
import { initSessionGuard, destroySessionGuard } from './lib/sessionGuard';

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
const QualityMetrics = lazy(() => import('./pages/evals/QualityMetrics'));
const EvalTechniques = lazy(() => import('./pages/evals/EvalTechniques'));
const ComplianceControls = lazy(() => import('./pages/compliance/ComplianceControls'));
const EvidenceHub = lazy(() => import('./pages/compliance/EvidenceHub'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const PolicyManagement = lazy(() => import('./pages/PolicyManagement'));
const RiskMatrix = lazy(() => import('./pages/RiskMatrix'));
const Overview = lazy(() => import('./pages/Overview'));
const Policies = lazy(() => import('./pages/Policies'));
const RiskRegister = lazy(() => import('./pages/RiskRegister'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const AuditLogExplorer = lazy(() => import('./pages/AuditLogExplorer'));
const Benchmark = lazy(() => import('./pages/Benchmark'));
const Datasets = lazy(() => import('./pages/Datasets'));
const EvidenceVault = lazy(() => import('./pages/EvidenceVault'));
const ExportCenter = lazy(() => import('./pages/ExportCenter'));
const GapAnalysis = lazy(() => import('./pages/GapAnalysis'));
const HitlQueue = lazy(() => import('./pages/HitlQueue'));
const IncidentLog = lazy(() => import('./pages/IncidentLog'));
const ModelInventory = lazy(() => import('./pages/ModelInventory'));
const ModelInventoryPage = lazy(() => import('./pages/models/ModelInventoryPage'));
const ModelLifecycle = lazy(() => import('./pages/ModelLifecycle'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PolicyEditor = lazy(() => import('./pages/PolicyEditor'));
const Remediation = lazy(() => import('./pages/Remediation'));
const RemediationTracker = lazy(() => import('./pages/RemediationTracker'));
const Settings = lazy(() => import('./pages/Settings'));
const SsoProviders = lazy(() => import('./pages/settings/SsoProviders'));
const Vendors = lazy(() => import('./pages/Vendors'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

const TrustEngineDashboard = lazy(() => import('./pages/trust-engine/TrustEngineDashboard'));
const LiveTraceFeed = lazy(() => import('./pages/trust-engine/LiveTraceFeed'));
const GuardrailActivity = lazy(() => import('./pages/trust-engine/GuardrailActivity'));
const Reporting = lazy(() => import("./pages/reporting/Reporting"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CostTokenDashboard = lazy(() => import('./pages/trust-engine/CostTokenDashboard'));
const FallbackLog = lazy(() => import('./pages/trust-engine/FallbackLog'));
const ToolCallMonitor = lazy(() => import('./pages/trust-engine/ToolCallMonitor'));
const TrustConfig = lazy(() => import('./pages/trust-engine/TrustConfig'));
const AccessControlOverview = lazy(() => import('./pages/rbac/AccessControlOverview'));
const RolesPage = lazy(() => import('./pages/rbac/RolesPage'));
const UsersPage = lazy(() => import('./pages/rbac/UsersPage'));
const DepartmentsPage = lazy(() => import('./pages/rbac/DepartmentsPage'));
const AgentDiscovery = lazy(() => import('./pages/agents/AgentDiscovery'));
const ShadowAI = lazy(() => import('./pages/agents/ShadowAI'));
const AgentDetail = lazy(() => import('./pages/agents/AgentDetail'));
const VendorRegistry = lazy(() => import('./pages/vendors/VendorRegistry'));
const VendorDetail = lazy(() => import('./pages/vendors/VendorDetail'));
const VendorQuestionnaire = lazy(() => import('./pages/vendors/VendorQuestionnaire'));
const VendorAssessments = lazy(() => import('./pages/vendors/VendorAssessments'));
const VendorSLAPage = lazy(() => import('./pages/vendors/VendorSLA'));
const TPRMWorkspace = lazy(() => import('./pages/vendors/TPRMWorkspace'));
const HITLReviewCenter = lazy(() => import('./pages/hitl/HITLReviewCenter'));
const HITLDetail = lazy(() => import('./pages/hitl/HITLDetail'));
const AiAdvisor = lazy(() => import('./pages/AiAdvisor'))
const PolicyTemplates = lazy(() => import('./pages/PolicyTemplates'))
const BiasAuditWizard = lazy(() => import('./pages/bias-audits/BiasAuditWizard'));
const BiasAuditResults = lazy(() => import('./pages/bias-audits/BiasAuditResults'));
const ControlsList = lazy(() => import('./pages/Controls'));
const ControlDetail = lazy(() => import('./pages/controls/ControlDetail'));
const DatasetRegistry = lazy(() => import('./pages/datasets/DatasetRegistry'));
const DatasetDetail = lazy(() => import('./pages/datasets/DatasetDetail'));
const EvidenceSyncEngine = lazy(() => import('./pages/evidence/EvidenceSyncEngine'));
const RegRadar = lazy(() => import('./pages/governance/RegRadar'));
const RegDetail = lazy(() => import('./pages/governance/RegDetail'));
const Frameworks = lazy(() => import('./pages/Frameworks'));


const UseCasePage = lazy(() => import('./pages/use-cases/UseCasePage'));
const ExplainabilityCenterNew = lazy(() => import('./pages/explainability/ExplainabilityCenter'));
const ConformityAssessmentNew = lazy(() => import('./pages/conformity/ConformityAssessment'));
const DataGovernancePage = lazy(() => import('./pages/data-governance/DataGovernancePage'));
const StakeholderNotifications = lazy(() => import('./pages/notifications/StakeholderNotifications'));
const ExplainabilityCenter = lazy(() => import('./pages/ExplainabilityCenter'));
const ConformityAssessment = lazy(() => import('./pages/ConformityAssessment'));
const IncidentWorkflow = lazy(() => import('./pages/IncidentWorkflow'));
const RiskDetail = lazy(() => import('./pages/risk/RiskDetail'));
const ModelDetail = lazy(() => import('./pages/models/ModelDetail'));
const PolicyDetail = lazy(() => import('./pages/policies/PolicyDetail'));

// ── New Sidebar Modules ─────────────────────────────────────────────────────
const AIImpactAssessments = lazy(() => import('./pages/AIImpactAssessments'));
const AuditTrail = lazy(() => import('./pages/AuditTrail'));
const ApprovalWorkflows = lazy(() => import('./pages/ApprovalWorkflows'));

// ── New Enterprise Modules ──────────────────────────────────────────────────
const AuditManagement = lazy(() => import('./pages/audits/AuditManagement'));
const RiskRegisterNew = lazy(() => import('./pages/risk/RiskRegisterNew'));
const ExceptionManagement = lazy(() => import('./pages/exceptions/ExceptionManagement'));
const TrainingAwareness = lazy(() => import('./pages/training/TrainingAwareness'));
const DocumentManagement = lazy(() => import('./pages/documents/DocumentManagement'));
const BusinessContinuity = lazy(() => import('./pages/continuity/BusinessContinuity'));
const ComplianceCalendar = lazy(() => import('./pages/calendar/ComplianceCalendar'));
const BenchmarkingMaturity = lazy(() => import('./pages/maturity/BenchmarkingMaturity'));
const ImportSampleData = lazy(() => import('./pages/ImportSampleData'));
const Tasks = lazy(() => import('./pages/Tasks'));
const PromptRegistryPage = lazy(() => import('./pages/PromptRegistry'));

// ── New Modules (19 pages) ──────────────────────────────────────────────────
const DsrManagement = lazy(() => import('./pages/DsrManagement'));
const RedTeamFindings = lazy(() => import('./pages/RedTeamFindings'));
const ConsentManagement = lazy(() => import('./pages/ConsentManagement'));
const FinancialRisk = lazy(() => import('./pages/FinancialRisk'));
const SystemAuditLog = lazy(() => import('./pages/SystemAuditLog'));
const AgentRegistry = lazy(() => import('./pages/AgentRegistry'));
const AgentIAM = lazy(() => import('./pages/AgentIAM'));
const MultiAgentChoreography = lazy(() => import('./pages/MultiAgentChoreography'));
const KillSwitchEvents = lazy(() => import('./pages/KillSwitchEvents'));
const AibomRegistry = lazy(() => import('./pages/AibomRegistry'));
const ProvenanceGraph = lazy(() => import('./pages/ProvenanceGraph'));
const VendorUpload = lazy(() => import('./pages/VendorUpload'));
const SupplyChainAttestations = lazy(() => import('./pages/SupplyChainAttestations'));
const CarbonLedger = lazy(() => import('./pages/CarbonLedger'));
const EnergyEfficiency = lazy(() => import('./pages/EnergyEfficiency'));
const EsgReports = lazy(() => import('./pages/EsgReports'));
const ModelEfficiency = lazy(() => import('./pages/ModelEfficiency'));
const DataLineage = lazy(() => import('./pages/DataLineage'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));

// ── Strategic Moat Features (6 irreplaceable enterprise capabilities) ─────────
const PeerIntelligence = lazy(() => import('./pages/PeerIntelligence'));
const ModelDNA = lazy(() => import('./pages/models/ModelDNA'));
const ComplianceAutopilot = lazy(() => import('./pages/ComplianceAutopilot'));
const NarrativeEngine = lazy(() => import('./pages/NarrativeEngine'));
const KnowledgeGraph = lazy(() => import('./pages/KnowledgeGraph'));
const RegulatoryVelocity = lazy(() => import('./pages/RegulatoryVelocity'));

const RiskIntelligence = lazy(() => import('./pages/RiskIntelligence'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const SupplyChainGraph = lazy(() => import('./pages/SupplyChainGraph'));
const Licensing = lazy(() => import('./pages/admin/Licensing'));
const GovernanceFramework = lazy(() => import('./pages/GovernanceFramework'));
const GovernanceMesh = lazy(() => import('./pages/GovernanceMesh'));
const EvidenceChain = lazy(() => import('./pages/EvidenceChain'));
const EvidenceCustodyExplorer = lazy(() => import('./pages/EvidenceCustodyExplorer'));
const AutomationStudio = lazy(() => import('./pages/AutomationStudio'));

// --- V1 Missing Modules ---
const AssetManagement = lazy(() => import("@/pages/AssetManagement"));
const IGA = lazy(() => import("@/pages/IGA"));
const RoPA = lazy(() => import("@/pages/RoPA"));
const TIA = lazy(() => import("@/pages/TIA"));
const TabletopExercises = lazy(() => import("@/pages/TabletopExercises"));
const RegulatorFilings = lazy(() => import("@/pages/RegulatorFilings"));
const BIA = lazy(() => import("@/pages/BIA"));

// ── 5 Enterprise Command Modules ─────────────────────────────────────────────
const ExecutiveCenter = lazy(() => import('./pages/ExecutiveCenter'));
const ModelRiskCommittee = lazy(() => import('./pages/ModelRiskCommittee'));
const ValueRealization = lazy(() => import('./pages/ValueRealization'));
const ExaminationManager = lazy(() => import('./pages/ExaminationManager'));
const ControlTesting = lazy(() => import('./pages/ControlTesting'));

// ── New GRC Modules ─────────────────────────────────────────────────────────
const CommitteeManagement = lazy(() => import('./pages/committee/CommitteeManagement'));
const ModelValidationLab = lazy(() => import('./pages/validation/ModelValidationLab'));
const PerformanceMonitoring = lazy(() => import('./pages/performance/PerformanceMonitoring'));
const IncidentPlaybooks = lazy(() => import('./pages/incidents/IncidentPlaybooks'));
const EvalResultsViewer = lazy(() => import('./pages/evals/EvalResultsViewer'));
const CisoDashboard = lazy(() => import('./pages/ciso/CisoDashboard'));
const BoardReport = lazy(() => import('./pages/ciso/BoardReport'));

// ── 8 New Regulatory Modules ─────────────────────────────────────────────────
const AIRiskTiering = lazy(() => import('./pages/AIRiskTiering'));
const DPIA = lazy(() => import('./pages/DPIA'));
const TransparencyReports = lazy(() => import('./pages/TransparencyReports'));
const PostMarket = lazy(() => import('./pages/PostMarket'));
const FrameworkMapping = lazy(() => import('./pages/FrameworkMapping'));
const GenAIRisks = lazy(() => import('./pages/GenAIRisks'));
const DataQuality = lazy(() => import('./pages/DataQuality'));
const EthicsReporting = lazy(() => import('./pages/EthicsReporting'));
const EthicsReportingSubmit = lazy(() => import('./pages/EthicsReportingSubmit'));

function Loading() {
  return <PageSkeleton />;
}

/** Redirects authenticated users away from login/signup to the dashboard */
function PublicRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      initSessionGuard();
      return () => destroySessionGuard();
    }
  }, [isAuthenticated]);
  if (isAuthenticated) {
    return <Navigate to="/overview" replace />;
  }
  return <Outlet />;
}

/**
 * ProtectedLayout — wraps all authenticated routes with Sidebar + TopHeader.
 * Mounts real-time hooks (WebSocket + React Query invalidation) once inside.
 */
function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const tenantId = useAuthStore((s) => s.user?.tenantId ?? 'default');

  // Deferred to avoid blocking initial render
  useRealtimeEvents({
    tenantId,
    notifyPrefixes: ['hitl', 'security', 'compliance', 'bias_audit', 'approval'],
  });

  useRealtimeInvalidation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--bg-page))]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
<BrowserRouter>
      <Routes>
        {/* Public routes — no sidebar/header layout */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Suspense fallback={<Loading />}><Login /></Suspense>} />
          <Route path="/signup" element={<Suspense fallback={<Loading />}><Signup /></Suspense>} />
          <Route path="/forgot-password" element={<Suspense fallback={<Loading />}><ForgotPassword /></Suspense>} />
        </Route>

        {/* Fully public — no auth required */}
        <Route path="/ethics-reporting/submit" element={<Suspense fallback={<Loading />}><EthicsReportingSubmit /></Suspense>} />

        {/* Protected routes — with Sidebar + TopHeader layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
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
          <Route path="/evals" element={<QualityMetrics />} />
          <Route path="/evals/quality-metrics" element={<QualityMetrics />} />
          <Route path="/evals/techniques" element={<EvalTechniques />} />
          <Route path="/evals/results" element={<Suspense fallback={<Loading />}><EvalResultsViewer /></Suspense>} />
          <Route path="/evals/benchmark" element={<Benchmark />} />
          <Route path="/evals/datasets" element={<Datasets />} />
          <Route path="/compliance" element={<ComplianceDashboard />} />
          <Route path="/compliance/controls" element={<ComplianceControls />} />
          <Route path="/compliance/evidence" element={<EvidenceHub />} />
          <Route path="/compliance/gap-analysis" element={<GapAnalysis />} />
          <Route path="/compliance/policies" element={<Policies />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/risk" element={<RiskRegister />} />
          <Route path="/risk/matrix" element={<RiskMatrix />} />
          <Route path="/risk/vendors" element={<Vendors />} />
          <Route path="/risk/incidents" element={<IncidentLog />} />
          <Route path="/risk/remediation" element={<Remediation />} />
          <Route path="/models" element={<ModelInventory />} />
          <Route path="/models/inventory" element={<ModelInventoryPage />} />
          <Route path="/models/inventory/:id" element={<ModelDetail />} />
          <Route path="/models/lifecycle" element={<ModelLifecycle />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/audit-log/chain" element={<Suspense fallback={<Loading />}><AuditLogExplorer /></Suspense>} />
          <Route path="/evidence-vault" element={<EvidenceVault />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/hitl-queue" element={<Navigate to="/hitl" replace />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/policy-editor" element={<PolicyEditor />} />
          <Route path="/remediation-tracker" element={<RemediationTracker />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/sso" element={<Suspense fallback={<Loading />}><SsoProviders /></Suspense>} />

          {/* Governance */}
          <Route path="/controls" element={<Navigate to="/compliance/controls" replace />} />
          <Route path="/frameworks" element={<Frameworks />} />
          <Route path="/compliance/frameworks" element={<Frameworks />} />
          <Route path="/reg-radar" element={<RegRadar />} />

          {/* AI Inventory */}
          <Route path="/agents" element={<AgentDiscovery />} />
          <Route path="/agents/shadow-ai" element={<ShadowAI />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/datasets" element={<DatasetRegistry />} />
          <Route path="/datasets/:id" element={<DatasetDetail />} />
          <Route path="/vendors" element={<VendorRegistry />} />
          <Route path="/vendors/assessments" element={<VendorAssessments />} />
          <Route path="/vendors/sla" element={<VendorSLAPage />} />
          <Route path="/vendors/tprm" element={<TPRMWorkspace />} />
          <Route path="/vendors/:id" element={<VendorDetail />} />
          <Route path="/vendors/:id/questionnaire" element={<VendorQuestionnaire />} />

          {/* Risk & Compliance */}
          <Route path="/bias-audits" element={<BiasAuditWizard />} />
          <Route path="/bias-audits/:id" element={<BiasAuditResults />} />
          <Route path="/evidence-sync" element={<EvidenceSyncEngine />} />
          <Route path="/hitl" element={<HITLReviewCenter />} />
          <Route path="/hitl/:id" element={<HITLDetail />} />

          {/* Trust Engine */}
          <Route path="/trust-engine" element={<TrustEngineDashboard />} />
              <Route path="/trust" element={<Navigate to="/trust-engine" replace />} />
          <Route path="/trust-engine/guardrails" element={<GuardrailActivity />} />
          <Route path="/trust-engine/traces" element={<LiveTraceFeed />} />
          <Route path="/trust-engine/costs" element={<CostTokenDashboard />} />
          <Route path="/trust-engine/fallback" element={<FallbackLog />} />
          <Route path="/trust-engine/tools" element={<ToolCallMonitor />} />
          <Route path="/trust-engine/config" element={<TrustConfig />} />

          {/* Administration — Access Control */}
          <Route path="/access-control" element={<AccessControlOverview />} />
          <Route path="/access-control/roles" element={<RolesPage />} />
          <Route path="/access-control/users" element={<UsersPage />} />
          <Route path="/access-control/departments" element={<DepartmentsPage />} />
          <Route path="/ai-advisor" element={<Suspense fallback={null}><AiAdvisor /></Suspense>} />
          <Route path="/compliance/policy-templates" element={<Suspense fallback={null}><PolicyTemplates /></Suspense>} />
          <Route path="/compliance/controls/:id" element={<ControlDetail />} />
              <Route path="/controls/:id" element={<ControlDetail />} />
          <Route path="/reporting" element={<Suspense fallback={<Loading />}><Reporting /></Suspense>} />
          <Route path="/ciso" element={<Suspense fallback={<Loading />}><CisoDashboard /></Suspense>} />
          <Route path="/ciso/report" element={<Suspense fallback={<Loading />}><BoardReport /></Suspense>} />
          <Route path="/risk/register" element={<RiskRegister />} />
          <Route path="/risk/:id" element={<RiskDetail />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/policies/:id" element={<PolicyDetail />} />
          <Route path="/reg-radar/:id" element={<RegDetail />} />
          <Route path="/explainability" element={<ExplainabilityCenterNew />} />
          <Route path="/conformity" element={<ConformityAssessmentNew />} />
          <Route path="/use-cases" element={<UseCasePage />} />
          <Route path="/data-governance" element={<DataGovernancePage />} />
          <Route path="/notifications/regulatory" element={<StakeholderNotifications />} />
          <Route path="/incident-workflow" element={<IncidentWorkflow />} />

          {/* New Sidebar Modules */}
          <Route path="/aiia" element={<AIImpactAssessments />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
          <Route path="/workflows" element={<ApprovalWorkflows />} />

          {/* New Enterprise Modules */}
          <Route path="/audits" element={<AuditManagement />} />
          <Route path="/risks" element={<RiskRegisterNew />} />
          <Route path="/exceptions" element={<ExceptionManagement />} />
          <Route path="/training" element={<TrainingAwareness />} />
          <Route path="/documents" element={<DocumentManagement />} />
          <Route path="/continuity" element={<BusinessContinuity />} />
          <Route path="/calendar" element={<ComplianceCalendar />} />
          <Route path="/maturity" element={<BenchmarkingMaturity />} />
          <Route path="/import-data" element={<ImportSampleData />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/prompt-registry" element={<PromptRegistryPage />} />

          {/* Privacy & Consent */}
          <Route path="/dsr" element={<DsrManagement />} />
          <Route path="/consent-management" element={<ConsentManagement />} />

          {/* Security */}
          <Route path="/red-team-findings" element={<RedTeamFindings />} />

          {/* Risk & Incidents */}
          <Route path="/financial-risk" element={<FinancialRisk />} />

          {/* Compliance */}
          <Route path="/system-audit-log" element={<SystemAuditLog />} />

          {/* Agentic Governance */}
          <Route path="/agent-registry" element={<AgentRegistry />} />
          <Route path="/agent-iam" element={<AgentIAM />} />
          <Route path="/multi-agent" element={<MultiAgentChoreography />} />
          <Route path="/kill-switch" element={<KillSwitchEvents />} />

          {/* AI Supply Chain */}
          <Route path="/aibom" element={<AibomRegistry />} />
          <Route path="/provenance" element={<ProvenanceGraph />} />
          <Route path="/vendor-upload" element={<VendorUpload />} />
          <Route path="/supply-chain" element={<SupplyChainAttestations />} />

          {/* Sustainability & ESG */}
          <Route path="/carbon-ledger" element={<CarbonLedger />} />
          <Route path="/energy-efficiency" element={<EnergyEfficiency />} />
          <Route path="/esg-reports" element={<EsgReports />} />
          <Route path="/model-efficiency" element={<ModelEfficiency />} />

          {/* Evaluations */}
          <Route path="/data-lineage" element={<DataLineage />} />

          {/* Operations */}
          <Route path="/integrations" element={<IntegrationsPage />} />

          {/* 5 Enterprise Command Modules */}
          <Route path="/executive-center" element={<Suspense fallback={<Loading />}><ExecutiveCenter /></Suspense>} />
          <Route path="/mrc" element={<Suspense fallback={<Loading />}><ModelRiskCommittee /></Suspense>} />
          <Route path="/roi" element={<Suspense fallback={<Loading />}><ValueRealization /></Suspense>} />
          <Route path="/examination-manager" element={<Suspense fallback={<Loading />}><ExaminationManager /></Suspense>} />
          <Route path="/control-testing" element={<Suspense fallback={<Loading />}><ControlTesting /></Suspense>} />

          {/* New GRC Modules */}
          <Route path="/committee" element={<Suspense fallback={<Loading />}><CommitteeManagement /></Suspense>} />
          <Route path="/model-validation" element={<Suspense fallback={<Loading />}><ModelValidationLab /></Suspense>} />
          <Route path="/performance-monitoring" element={<Suspense fallback={<Loading />}><PerformanceMonitoring /></Suspense>} />
          <Route path="/incidents/playbooks" element={<Suspense fallback={<Loading />}><IncidentPlaybooks /></Suspense>} />

          {/* 8 New Regulatory Modules */}
          <Route path="/ai-risk-tiering" element={<Suspense fallback={<Loading />}><AIRiskTiering /></Suspense>} />
          <Route path="/dpia" element={<Suspense fallback={<Loading />}><DPIA /></Suspense>} />
          <Route path="/transparency-reports" element={<Suspense fallback={<Loading />}><TransparencyReports /></Suspense>} />
          <Route path="/post-market" element={<Suspense fallback={<Loading />}><PostMarket /></Suspense>} />
          <Route path="/framework-mapping" element={<Suspense fallback={<Loading />}><FrameworkMapping /></Suspense>} />
          <Route path="/genai-risks" element={<Suspense fallback={<Loading />}><GenAIRisks /></Suspense>} />
          <Route path="/data-quality" element={<Suspense fallback={<Loading />}><DataQuality /></Suspense>} />
          <Route path="/ethics-reporting" element={<Suspense fallback={<Loading />}><EthicsReporting /></Suspense>} />

          {/* Strategic Moat Features */}
          <Route path="/peer-intelligence" element={<Suspense fallback={<Loading />}><PeerIntelligence /></Suspense>} />
          <Route path="/models/dna" element={<Suspense fallback={<Loading />}><ModelDNA /></Suspense>} />
          <Route path="/autopilot" element={<Suspense fallback={<Loading />}><ComplianceAutopilot /></Suspense>} />
          <Route path="/narrative-engine" element={<Suspense fallback={<Loading />}><NarrativeEngine /></Suspense>} />
          <Route path="/knowledge-graph" element={<Suspense fallback={<Loading />}><KnowledgeGraph /></Suspense>} />
          <Route path="/reg-velocity" element={<Suspense fallback={<Loading />}><RegulatoryVelocity /></Suspense>} />

          <Route path="/risk-intelligence" element={<Suspense fallback={<Loading />}><RiskIntelligence /></Suspense>} />
          <Route path="/marketplace" element={<Suspense fallback={<Loading />}><Marketplace /></Suspense>} />
          <Route path="/supply-chain/graph" element={<Suspense fallback={<Loading />}><SupplyChainGraph /></Suspense>} />
          <Route path="/admin/licensing" element={<Suspense fallback={<Loading />}><Licensing /></Suspense>} />
          <Route path="/governance-framework" element={<Suspense fallback={<Loading />}><GovernanceFramework /></Suspense>} />
          <Route path="/governance-mesh" element={<Suspense fallback={<Loading />}><GovernanceMesh /></Suspense>} />
          <Route path="/evidence-chain" element={<Suspense fallback={<Loading />}><EvidenceChain /></Suspense>} />
          <Route path="/evidence/custody/:artifactId" element={<Suspense fallback={<Loading />}><EvidenceCustodyExplorer /></Suspense>} />
          <Route path="/automation-studio" element={<Suspense fallback={<Loading />}><AutomationStudio /></Suspense>} />

            {/* V1 Missing Modules */}
            <Route path="/assets" element={<Suspense fallback={<Loading />}><AssetManagement /></Suspense>} />
            <Route path="/iga" element={<Suspense fallback={<Loading />}><IGA /></Suspense>} />
            <Route path="/ropa" element={<Suspense fallback={<Loading />}><RoPA /></Suspense>} />
            <Route path="/tia" element={<Suspense fallback={<Loading />}><TIA /></Suspense>} />
            <Route path="/tabletop" element={<Suspense fallback={<Loading />}><TabletopExercises /></Suspense>} />
            <Route path="/regulator-filings" element={<Suspense fallback={<Loading />}><RegulatorFilings /></Suspense>} />
            <Route path="/bia" element={<Suspense fallback={<Loading />}><BIA /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<Loading />}><NotFound /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
      </TenantProvider>
</QueryClientProvider>
  );
}
