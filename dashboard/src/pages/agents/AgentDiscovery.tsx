// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TRANSITIONAL SHIM — Agent Discovery was consolidated into the single Agents
// page (./Agents.tsx) per the approved IA restructure. This re-export keeps the
// /agents route rendering the merged page until App.tsx (owned by the nav
// agent) imports ./Agents directly, after which this file should be deleted.

export { isShadowAgent } from './Agents'
export { default } from './Agents'
