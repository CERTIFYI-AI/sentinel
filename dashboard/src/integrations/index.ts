// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Registry of providers with a connect form (shipped or in-progress
// adapters). The browsable catalog of all catalogued products comes from the
// integration_catalog table — do not mirror it here.
//
// Each id must match a slug in sentinel/integrations/registry.py. The server
// is the authority on what can be connected; this registry only decides which
// fields the form collects, and a provider present here but absent there gets
// a 400 at connect time rather than a broken row.

import type { IntegrationConfig } from './types'
import { GithubConfig } from './github/config'
import { AwsConfig } from './aws/config'
import { AzureConfig } from './azure/config'
import { OktaConfig } from './okta/config'
import { EntraConfig, EntraGccHighConfig } from './entra/config'
import { IntuneConfig, IntuneGccHighConfig } from './intune/config'

export type { IntegrationConfig, CredentialField, IntegrationCategory, AuthMethod } from './types'

export const INTEGRATIONS: IntegrationConfig[] = [
  GithubConfig,
  AwsConfig,
  AzureConfig,
  OktaConfig,
  EntraConfig,
  EntraGccHighConfig,
  IntuneConfig,
  IntuneGccHighConfig,
]

export function getIntegrationConfig(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS.find((i) => i.id === id)
}
