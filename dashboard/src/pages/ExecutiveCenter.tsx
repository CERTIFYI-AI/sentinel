// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// TRANSITIONAL SHIM — the Executive Center was folded into the CISO Dashboard
// (./ciso/CisoDashboard.tsx, "Executive Metrics" tab) per the approved IA
// restructure. Its fabricated metrics (risk-score trend, fine exposure,
// invented action items) were replaced there with real queries and honest
// empty states. Redirects /executive-center → /ciso?tab=metrics. Delete this
// file when the nav agent retires the /executive-center route in App.tsx.

import { Navigate } from 'react-router-dom';

export default function ExecutiveCenterRedirect() {
  return <Navigate to="/ciso?tab=metrics" replace />;
}
