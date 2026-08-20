// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the TwilioCredentials dataclass in
// sentinel/integrations/twilio/adapter.py

import type { IntegrationConfig } from '../types'

export const TwilioConfig: IntegrationConfig = {
  id: 'twilio',
  category: 'collaboration',
  name: 'Twilio',
  description:
    'Access-review and data-location posture from the Twilio REST API: '
    + 'dormant subaccounts, insecure voice/SMS webhook transport, and '
    + 'reliance on scoped API keys versus the full-access Auth Token.',
  logoUrl: '/integrations/twilio.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/twilio',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'account_sid',
      label: 'Account SID',
      type: 'text',
      required: true,
      placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      helpText: 'The Account SID from the Twilio Console dashboard.',
    },
    {
      id: 'auth_credential',
      label: 'Auth Token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The primary Auth Token paired with the Account SID above, used for HTTP Basic auth.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'encryption_in_transit',
    'access_control',
  ],
}
