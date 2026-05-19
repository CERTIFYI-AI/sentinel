# Model Inventory Guide

The Model Inventory page (`/models`) gives you a live view of every LLM provider configured for your tenant, their circuit breaker state, and comparative performance metrics.

## Understanding Model Roles

| Role | Meaning |
|------|---------|
| Primary | Receives all requests by default. Only one primary per tenant. |
| Fallback | Receives requests when the primary circuit breaker is OPEN, or when Level 2 (UPGRADE) intervention triggers. |
| Evaluation | Receives no production traffic. Used for A/B testing via the Test feature. |
| Disabled | Configured but inactive. Not used in any request routing. |

## Circuit Breaker States

| State | Meaning | What happens |
|-------|---------|-------------|
| CLOSED | Healthy | Normal routing |
| OPEN | Failing | Requests skip this provider, routed to fallback |
| HALF_OPEN | Recovering | One test request allowed through; if it fails, back to OPEN |

The failure threshold and window are configurable in Settings > Trust & Safety.

## Adding a Model

1. Click **Add Model** (top right)
2. Select your provider (OpenAI, Anthropic, Azure, Local, Custom)
3. Enter the model name (e.g. `gpt-4o-mini`) and your API key
4. Select a role
5. Click **Test Connection** to verify the key and model are reachable
6. Click **Save Model**

API keys are stored encrypted at rest. They are never returned by any API endpoint after initial save.

## Comparing Models

Select 2-4 models using the checkboxes on each card. A comparison drawer appears at the bottom of the screen showing 7-day average trust score, P95 latency, cost per 1,000 tokens, request volume, and circuit breaker state.

The winner in each metric row is highlighted. Use this to make informed decisions about which model to promote to primary.

## Resetting a Circuit Breaker

1. Find the model card with OPEN or HALF_OPEN state
2. Click the **Reset** button
3. The circuit breaker moves to HALF_OPEN
4. The next request will test the connection
5. If it succeeds: moves to CLOSED. If it fails: moves back to OPEN

> **Warning:** Do not reset a circuit breaker before confirming the upstream issue is resolved.

## Testing a Model

Click **Test** on any model card to open the Test sheet. Enter a prompt (or use a preset). The request goes through the full Sentinel pipeline (PII masking, LLM call, verification, circuit breaker). Results show the trust score, component scores, intervention level, latency, and the actual response text.

Use this to:
- Validate a newly added model before setting it as primary
- Debug why a specific prompt is getting a low trust score
- Confirm PII masking is working for your use case
