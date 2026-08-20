// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the OracleCloudCredentials dataclass in
// sentinel/integrations/oracle_cloud/adapter.py

import type { IntegrationConfig } from '../types'

export const OracleCloudConfig: IntegrationConfig = {
  id: 'oracle_cloud',
  category: 'cloud',
  name: 'Oracle Cloud Infrastructure',
  description:
    'Tenancy posture: user API-signing keys past rotation, Object Storage '
    + 'buckets with public access, and buckets relying on Oracle-managed '
    + 'rather than customer-managed encryption.',
  logoUrl: '/integrations/oracle_cloud.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/oracle_cloud',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'tenancy_id',
      label: 'Tenancy OCID',
      type: 'text',
      required: true,
      placeholder: 'ocid1.tenancy.oc1..aaaaaaaa...',
      helpText: 'The tenancy OCID, found in Profile > Tenancy in the OCI console.',
    },
    {
      id: 'user_id',
      label: 'User OCID',
      type: 'text',
      required: true,
      placeholder: 'ocid1.user.oc1..aaaaaaaa...',
      helpText: 'The OCID of the user whose API key is registered below. This user needs an Identity read policy in the root compartment.',
    },
    {
      id: 'key_fingerprint',
      label: 'API key fingerprint',
      type: 'text',
      required: true,
      placeholder: 'aa:bb:cc:dd:ee:ff:...',
      helpText: 'The fingerprint shown after adding the API key under this user\'s API Keys.',
    },
    {
      id: 'private_key_credential',
      label: 'API private key (PEM)',
      type: 'password',
      required: true,
      placeholder: '-----BEGIN PRIVATE KEY-----',
      helpText: 'The unencrypted PEM private key paired with the fingerprint above. Generated when the API key was added; never transmitted to Oracle.',
    },
    {
      id: 'region',
      label: 'Region',
      type: 'text',
      required: false,
      placeholder: 'us-ashburn-1',
      helpText: 'OCI region identifier to query. Defaults to us-ashburn-1.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'network_security',
    'encryption_at_rest',
  ],
}
