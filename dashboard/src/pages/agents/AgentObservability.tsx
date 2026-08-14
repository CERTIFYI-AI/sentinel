// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TRANSITIONAL SHIM — the old Agent Observability page displayed fabricated
// telemetry and was folded into the single Agents page (./Agents.tsx,
// Observability tab — honest state linking to the real Trust Engine surfaces).
// Redirects /agents/observability → /agents?tab=observability. Delete this
// file when the nav agent retires the /agents/observability route in App.tsx.

import { Navigate } from 'react-router-dom'

export default function AgentObservabilityRedirect() {
  return <Navigate to="/agents?tab=observability" replace />
}
