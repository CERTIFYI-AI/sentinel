// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// TRANSITIONAL SHIM — this legacy seed-data remediation page was superseded by
// the Remediation Tracker (./RemediationTracker.tsx at /remediation-tracker)
// per the approved IA restructure. Redirects /risk/remediation →
// /remediation-tracker (query params preserved). Delete this file when the nav
// agent retires the /risk/remediation route in App.tsx.

import { Navigate, useLocation } from "react-router-dom";

export default function RemediationRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/remediation-tracker", search: location.search }} replace />;
}
