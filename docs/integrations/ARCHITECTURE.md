# WS8 — OpenAPI 3.1, Webhooks & Integrations

## Scope
- Canonical OpenAPI 3.1 spec at `openapi/sentinel.yaml` (exported to developers).
- Outbound webhook delivery with HMAC signing + 8-attempt retry schedule.
- 22 server-side integration stubs under `workers/integrations/` — no client-side secrets.

## Endpoints (v1)
`/frameworks`, `/frameworks/{id}`, `/controls`, `/evidence`, `/incidents`,
`/risks`, `/vendors`, `/audit/events`, `/webhooks/subscriptions`.

Every path requires bearer or API-key auth, is org-scoped via RLS, and is
subject to rate limits from WS6.

## Webhook signing
Header: `X-Sentinel-Signature: t=<ts>,v1=<hmac_sha256_hex(ts + "." + body)>`
Receivers MUST:
1. Reject requests where `ts` is older than 5 minutes
2. Compare in constant time

Retry schedule: `[0s, 30s, 5m, 30m, 2h, 6h, 12h, 24h]` → dead-letter on
attempt 9. Receivers MUST respond 2xx within 10s.

## Integrations shipped (22)
| Category        | Integrations                                    |
|-----------------|-------------------------------------------------|
| ChatOps         | Slack, Microsoft Teams                          |
| Ticketing       | Jira, ServiceNow, Zendesk                       |
| Identity        | Okta, Microsoft Entra ID                        |
| Source control  | GitHub, GitLab                                  |
| Cloud           | AWS, Google Cloud, Azure                        |
| Observability   | Splunk, Datadog, PagerDuty                      |
| CRM             | Salesforce, HubSpot                             |
| Docs            | Notion, Confluence                              |
| PM              | Linear, Asana                                   |
| Privacy         | OneTrust                                        |

Each integration exposes an `IntegrationHandler` with a `descriptor` and
optional `notify` / `create_ticket` / `sync_users` / `sync_events` /
`fetch_evidence` / `attest` methods. All calls originate server-side from
Cloudflare Workers; credentials are stored KMS-encrypted in
`integration_credentials` (org-scoped, RLS-protected).

## Security posture
- No client-side secrets, ever.
- All third-party HTTP calls include an `AbortSignal` and a 10s timeout.
- All requests emit an audit event (WS0.3 append-only log).

## Tests
- `openapi-integrations.test.ts` — spec presence, tags, 22 stubs
- `webhook-delivery.test.ts` — HMAC signing, retry schedule, failure capture

## Future work
- Generated TypeScript clients from the OpenAPI spec (post-GA)
- Per-integration contract tests against sandbox endpoints
