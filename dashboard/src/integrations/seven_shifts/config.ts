// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the SevenShiftsCredentials dataclass in
// sentinel/integrations/seven_shifts/adapter.py.
// Note: the catalogue slug is the literal string "7shifts" (id below) even
// though this directory and the Python module are named seven_shifts,
// because Python/TS module names cannot start with a digit.

import type { IntegrationConfig } from '../types'

export const SevenShiftsConfig: IntegrationConfig = {
  id: '7shifts',
  category: 'hr',
  name: '7shifts',
  description:
    'Joiner-mover-leaver evidence from 7shifts: terminated-staff '
    + 'deactivation, manager assignment coverage, and employment record '
    + 'change history for access-review and offboarding compliance.',
  logoUrl: '/integrations/7shifts.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/7shifts',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API access token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API access token from 7shifts > Company Settings > API Access with read access to users and the company audit log.',
    },
  ],
  checkCategories: [
    'access_control',
    'hr_controls',
    'audit_logging',
  ],
}
