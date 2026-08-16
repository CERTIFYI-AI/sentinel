// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// RETIRED — this page rendered seed-file audits (`data/seed`) rather than the
// canonical `bias_audits` table. The real record view is BiasAuditDetail at
// /bias-audits/record/:id; old /bias-audits/:id links deep-link into the list.

import { Navigate, useParams } from 'react-router-dom'

export default function BiasAuditResults() {
  const { id } = useParams()
  return <Navigate to={`/bias-audits?open=${encodeURIComponent(id ?? '')}`} replace />
}
