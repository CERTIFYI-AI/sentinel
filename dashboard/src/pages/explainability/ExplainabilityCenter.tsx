// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// TRANSITIONAL SHIM — this seed-mock Explainability Center was superseded by
// the real explainability profiles module (./ExplainabilityProfileList.tsx at
// /explainability, backed by explainability_profiles) per the approved IA
// restructure. Redirects /explainability/center → /explainability. Delete this
// file when the nav agent retires the /explainability/center route in App.tsx.

import { Navigate } from 'react-router-dom';

export default function ExplainabilityCenterRedirect() {
  return <Navigate to="/explainability" replace />;
}
