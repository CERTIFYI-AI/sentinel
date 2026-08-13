# API

How to talk to Sentinel from outside: the HTTP surface of the proxy, the Python
SDK, the machine-readable spec, and the webhook/integration layer.

| Document | What it covers |
|---|---|
| [api-reference.md](api-reference.md) | Full endpoint reference: chat completions, health, dashboard, WebSocket metrics, error format, rate limits, the Security Intelligence endpoints, and the Supabase data-access layer used by the dashboard |
| [sdk-guide.md](sdk-guide.md) | `sentinel.sdk.SentinelClient` usage, plus integrating from any language over plain HTTP |
| [integrations/ARCHITECTURE.md](integrations/ARCHITECTURE.md) | OpenAPI 3.1 surface, HMAC-signed outbound webhooks with retries, and the server-side integration stubs |

## Machine-readable spec

The canonical OpenAPI 3.1 document is [`openapi/sentinel.yaml`](../../openapi/sentinel.yaml)
at the repository root.

## Related

- [Error codes](../reference/error-codes.md)
- [Environment variables](../reference/environment-variables.md)
- [Authentication guide](../guides/auth-guide.md)
