// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// TRANSITIONAL SHIM — the ROI & Value Realization page was folded into the
// CISO Dashboard (./ciso/CisoDashboard.tsx, "ROI & Value" tab) per the
// approved IA restructure. Its fabricated economics (fine avoidance, ROI
// curves, automation savings, TCO comparisons) had no backing data and were
// replaced with an honest state. Redirects /roi → /ciso?tab=roi. Delete this
// file when the nav agent retires the /roi route in App.tsx.

import { Navigate } from 'react-router-dom';

export default function ValueRealizationRedirect() {
  return <Navigate to="/ciso?tab=roi" replace />;
}
