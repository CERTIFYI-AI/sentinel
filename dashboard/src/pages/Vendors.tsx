// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// TRANSITIONAL SHIM — this legacy seed-data vendors page was superseded by the
// real, backend-driven Vendor Registry (./vendors/VendorRegistry.tsx) per the
// approved IA restructure. Redirects /risk/vendors → /vendors (query params
// preserved). Delete this file when the nav agent retires the /risk/vendors
// route in App.tsx.

import { Navigate, useLocation } from "react-router-dom";

export default function VendorsRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/vendors", search: location.search }} replace />;
}
