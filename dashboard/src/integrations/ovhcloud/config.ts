// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OvhcloudCredentials dataclass in
// sentinel/integrations/ovhcloud/adapter.py

import type { IntegrationConfig } from '../types'

export const OvhcloudConfig: IntegrationConfig = {
  id: 'ovhcloud',
  category: 'cloud',
  name: 'OVHcloud',
  description:
    'Public Cloud posture: non-expiring API credentials, Object Storage '
    + 'containers with public read access, and Block Storage volumes with '
    + 'no snapshot.',
  logoUrl: '/integrations/ovhcloud.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/ovhcloud',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'application_key',
      label: 'Application key',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••',
      helpText: 'The Application Key from an OVHcloud API application (api.ovh.com/createApp).',
    },
    {
      id: 'application_credential',
      label: 'Application credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The Application Secret paired with the application key above.',
    },
    {
      id: 'consumer_credential',
      label: 'Consumer credential',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText: 'The Consumer Key authorized with GET access to /me and /cloud/project on this application.',
    },
    {
      id: 'api_endpoint',
      label: 'API endpoint',
      type: 'url',
      required: false,
      placeholder: 'https://eu.api.ovh.com/1.0',
      helpText: 'Regional OVHcloud API base URL. Defaults to the EU endpoint; use ca.api.ovh.com or api.us.ovhcloud.com for other regions.',
    },
  ],
  checkCategories: [
    'access_control',
    'network_security',
    'backup_recovery',
  ],
}
