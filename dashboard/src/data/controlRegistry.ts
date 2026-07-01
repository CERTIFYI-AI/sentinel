// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Single source of truth for the control registry consumed by the Controls
// Registry list and the Control Detail page — so a row and its detail always
// resolve to the same record. Maps the atomic control library into the seed
// `Control` shape (deterministic demo status while the Supabase table is empty).

import { CONTROLS as SEED_CONTROLS, type Control, type ControlStatus } from './seed';
import { CONTROLS as LIB_CONTROLS, FRAMEWORK_NAME } from './complianceLibrary';

function hashCode(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }

export const LIBRARY_CONTROL_ROWS: Control[] = LIB_CONTROLS.map(c => {
  const h = hashCode(c.code); const m = h % 10;
  const status: ControlStatus = m < 6 ? 'implemented' : m < 8 ? 'partial' : 'planned';
  const score = status === 'implemented' ? 80 + (h % 20) : status === 'partial' ? 50 + (h % 30) : 10 + (h % 30);
  return {
    id: c.code, code: c.code, title: c.name, framework: FRAMEWORK_NAME[c.framework] ?? c.framework,
    clause: c.clause, status, score, owner: '', evidenceCount: h % 6, lastTested: status === 'implemented' ? '2026-06-01' : '',
    description: c.description, testResult: status === 'implemented' ? 'pass' : status === 'partial' ? 'pending' : 'not_tested',
    severity: c.severity, evalType: c.evalType,
  };
});

/** The controls shown in the registry: the full atomic-control library. */
export const REGISTRY_CONTROLS: Control[] = LIBRARY_CONTROL_ROWS;

/** Resolve a control by id/code from the library first, then legacy seed. */
export function findControl(id: string | undefined): Control | undefined {
  if (!id) return undefined;
  return REGISTRY_CONTROLS.find(c => c.id === id || c.code === id) ?? SEED_CONTROLS.find(c => c.id === id);
}
