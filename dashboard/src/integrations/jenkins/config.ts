// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the JenkinsCredentials dataclass in
// sentinel/integrations/jenkins/adapter.py

import type { IntegrationConfig } from '../types'

export const JenkinsConfig: IntegrationConfig = {
  id: 'jenkins',
  category: 'cicd',
  name: 'Jenkins',
  description:
    'Build-server security posture: credential-store hygiene, plugin '
    + 'vulnerability posture, and build-log secret-leakage risk.',
  logoUrl: '/integrations/jenkins.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/jenkins',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'base_url',
      label: 'Jenkins URL',
      type: 'url',
      required: true,
      placeholder: 'https://jenkins.example.com',
      helpText: 'The base URL of the Jenkins controller to monitor.',
    },
    {
      id: 'username',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'sentinel-reader',
      helpText: 'The Jenkins user the API token below belongs to.',
    },
    {
      id: 'api_credential',
      label: 'API token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A Jenkins API token (from the user’s Configure page) with '
        + 'Overall/Read and Credentials/View permission.',
    },
  ],
  checkCategories: [
    'secret_management',
    'vulnerability_management',
    'change_management',
  ],
}
