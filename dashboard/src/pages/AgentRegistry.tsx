// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// TRANSITIONAL SHIM — the Agent Registry page was consolidated into the single
// Agents page (./agents/Agents.tsx, Registry tab is the primary view) per the
// approved IA restructure. Redirects /agent-registry → /agents, preserving
// deep-link params (?open=<id>, ?agent=<q>). Delete this file when the nav
// agent retires the /agent-registry route in App.tsx.

import { Navigate, useLocation } from 'react-router-dom'

export default function AgentRegistryRedirect() {
  const location = useLocation()
  return <Navigate to={{ pathname: '/agents', search: location.search }} replace />
}
