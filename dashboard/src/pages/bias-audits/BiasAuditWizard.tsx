// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// RETIRED — the legacy guided wizard duplicated the Bias Audits module on a
// mock in-memory dataset (`biasauditwizard_table`, fabricated random scores),
// which violates the platform contract (never fake success, no invented
// data). Creation and editing live in BiasAuditForm on the canonical
// `bias_audits` table. This stub only redirects old deep links.

import { Navigate } from 'react-router-dom'

export default function BiasAuditWizard() {
  return <Navigate to="/bias-audits" replace />
}
