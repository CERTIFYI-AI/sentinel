// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the AzureCredentials dataclass in
// sentinel/integrations/azure/adapter.py — the backend validates the submitted
// shape against it, so a mismatch here is a 400, not a silent misconfiguration.
//
// The catalogue slug is `microsoft_azure`, not `azure`; it is the id-space the
// integration_catalog row and the Python registry both key on.

import type { IntegrationConfig } from '../types'

export const AzureConfig: IntegrationConfig = {
  id: 'microsoft_azure',
  category: 'cloud',
  name: 'Microsoft Azure',
  description:
    'Subscription security posture: Conditional Access MFA policies, Owner role '
    + 'sprawl, storage anonymous access and TLS, managed-disk encryption, NSG '
    + 'exposure, Key Vault purge protection, activity-log export and Defender '
    + 'for Cloud plans.',
  logoUrl: '/integrations/azure.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/azure',
  authMethod: 'service_account',
  credentialFields: [
    {
      id: 'tenant_id',
      label: 'Directory (tenant) ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText: 'Entra ID → Overview → Tenant ID.',
    },
    {
      id: 'client_id',
      label: 'Application (client) ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'Entra ID → App registrations → your app → Overview. Grant it the '
        + 'Reader role on the subscription; every call Sentinel makes is a GET.',
    },
    {
      id: 'client_secret',
      label: 'Client secret',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'App registration → Certificates & secrets → New client secret. Note '
        + 'its expiry: an expired secret shows up as a failed sync, not silently.',
    },
    {
      id: 'subscription_id',
      label: 'Subscription ID',
      type: 'text',
      required: true,
      placeholder: '00000000-0000-0000-0000-000000000000',
      helpText:
        'Checks run against this subscription only. Connect each subscription '
        + 'separately so a finding always names the scope it observed.',
    },
  ],
  // Must stay a subset of CHECK_CATEGORIES in sentinel/integrations/base.py —
  // these drive the control mapping shown on the connect screen.
  checkCategories: [
    'mfa_enforcement',
    'least_privilege',
    'access_control',
    'encryption_in_transit',
    'encryption_at_rest',
    'network_security',
    'secret_management',
    'audit_logging',
    'vulnerability_management',
  ],
}
