// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TRANSITIONAL SHIM — Shadow AI Detection was consolidated into the single
// Agents page (./Agents.tsx, Shadow AI tab) per the approved IA restructure.
// Redirects /agents/shadow-ai → /agents?tab=shadow. Delete this file when the
// nav agent retires the /agents/shadow-ai route in App.tsx.

import { Navigate, useLocation } from 'react-router-dom'

export default function ShadowAIRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.set('tab', 'shadow')
  return <Navigate to={{ pathname: '/agents', search: `?${params.toString()}` }} replace />
}
