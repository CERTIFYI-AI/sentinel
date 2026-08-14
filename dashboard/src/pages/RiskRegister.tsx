// CONSOLIDATED (2026-08-14 IA restructure): the Risk Register now lives at
// pages/risk/RiskRegisterNew.tsx (canonical route: /risks), backed by the real
// org-scoped `risks` table via hooks/useRisksData → services/riskService.
//
// This file is a temporary re-export shim only because App.tsx (owned by the
// nav/routes agent) still lazy-imports it for /risk and /risk/register.
// DELETE this file when those routes are redirected to /risks.
export { default } from './risk/RiskRegisterNew';
