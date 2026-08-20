// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the VouchCyberInsuranceCredentials dataclass in
// sentinel/integrations/vouch_cyber_insurance/adapter.py

import type { IntegrationConfig } from '../types'

export const VouchCyberInsuranceConfig: IntegrationConfig = {
  id: 'vouch_cyber_insurance',
  category: 'security',
  name: 'Vouch Cyber Insurance',
  description:
    'Cyber-insurance policy signals: coverage-limit adequacy, claims/'
    + 'incident history, and renewal-date proximity from the Vouch '
    + 'policyholder portal.',
  logoUrl: '/integrations/vouch_cyber_insurance.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/vouch_cyber_insurance',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_key',
      label: 'API key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'A Bearer API token from the Vouch policyholder portal with read access to policies and claims.',
    },
  ],
  checkCategories: [
    'vendor_management',
    'incident_response',
  ],
}
