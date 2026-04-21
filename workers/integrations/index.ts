// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
// NOTE: Auto-generated scaffold — server-side only. No client-side secrets.

import slack from "./slack";
import msteams from "./msteams";
import jira from "./jira";
import servicenow from "./servicenow";
import okta from "./okta";
import azure_ad from "./azure_ad";
import github from "./github";
import gitlab from "./gitlab";
import aws from "./aws";
import gcp from "./gcp";
import azure from "./azure";
import splunk from "./splunk";
import datadog from "./datadog";
import pagerduty from "./pagerduty";
import zendesk from "./zendesk";
import salesforce from "./salesforce";
import hubspot from "./hubspot";
import notion from "./notion";
import linear from "./linear";
import asana from "./asana";
import confluence from "./confluence";
import onetrust from "./onetrust";
import type { IntegrationHandler } from "./types";

export const INTEGRATIONS: Readonly<Record<string, IntegrationHandler>> = {
  slack,
  msteams,
  jira,
  servicenow,
  okta,
  azure_ad,
  github,
  gitlab,
  aws,
  gcp,
  azure,
  splunk,
  datadog,
  pagerduty,
  zendesk,
  salesforce,
  hubspot,
  notion,
  linear,
  asana,
  confluence,
  onetrust,
};

export const INTEGRATION_IDS = Object.keys(INTEGRATIONS) as readonly string[];

export function getIntegration(id: string): IntegrationHandler | undefined {
  return INTEGRATIONS[id];
}
