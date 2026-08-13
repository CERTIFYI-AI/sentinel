# Circuit Breaker

The Sentinel circuit breaker is a four-level escalation cascade that determines what happens when a response falls below your configured trust score thresholds.

## State Machine

```
Request → Trust Score evaluated
     |
     ├── score >= 0.90 → L0: PASS → Response delivered
     |
     ├── score 0.80–0.90 → L1: CROSS-CHECK → N independent verifications
     |     ├── all agree → Response delivered
     |     └── disagreement → escalate to L2
     |
     ├── score 0.70–0.80 → L2: REGENERATE → Retry with stronger model
     |     ├── new score >= threshold → Response delivered
     |     └── still below threshold → escalate to L3
     |
     └── score < 0.70 → L3: HITL → Human review queue
           ├── operator approves → Response delivered
           └── operator rejects → Error returned to caller
```

## Level Definitions

### L0: Pass-Through
- **Condition**: `trust_score >= trust_score_block_threshold` (default: 0.85)
- **Action**: Response forwarded immediately with Sentinel headers
- **Latency added**: 0ms
- **Audit event**: `circuit_breaker.l0_pass`

### L1: Cross-Check
- **Condition**: `cross_check_trigger_threshold <= trust_score < trust_score_block_threshold`
- **Action**: N independent LLM calls verify the response
- **Latency added**: ~200–400ms
- **Config**: `cross_check.n_checks: 3`
- **Audit event**: `circuit_breaker.l1_cross_check`

### L2: Regeneration
- **Condition**: Cross-check fails, or `trust_score < cross_check_trigger_threshold`
- **Action**: Request resent to a stronger model (configured in `circuit_breaker.upgrade_model`)
- **Latency added**: ~500ms–1.5s
- **Config**: `circuit_breaker.upgrade_model: gpt-4o`
- **Audit event**: `circuit_breaker.l2_regenerate`

### L3: Human-in-the-Loop (HITL)
- **Condition**: Regeneration fails, or `trust_score < 0.70`
- **Action**: Response queued for human review in dashboard
- **Caller receives**: `503` with `Retry-After` header pointing to poll endpoint
- **Audit event**: `circuit_breaker.l3_hitl_escalation`

## Configuration

```yaml
# configs/sentinel.yaml
circuit_breaker:
  trust_score_block_threshold: 0.85
  cross_check_trigger_threshold: 0.80
  cross_check:
    n_checks: 3
    model: gpt-4o-mini
  upgrade_model: gpt-4o
  hitl:
    enabled: true
    queue: postgres  # or redis
    max_wait_seconds: 300
```

## Debugging

Every escalation is logged with a full trace:

```bash
# View recent escalations
python scripts/query_audit_log.py --event circuit_breaker.l3_hitl_escalation --last 24h

# View trust score distribution
python scripts/run_eval.py --report trust_score_distribution
```

In the dashboard, navigate to **Monitoring > Circuit Breaker** to see:
- L0/L1/L2/L3 distribution over time
- Average latency added per level
- HITL queue depth and resolution time

## Tuning Thresholds

| Use Case | Recommended `block_threshold` | Reasoning |
|----------|------------------------------|-----------|
| Healthcare / Clinical | 0.92 | High-stakes decisions |
| Financial advice | 0.90 | Regulatory liability |
| Customer support | 0.85 | Default |
| Internal tooling | 0.80 | Lower stakes |
| Experimentation | 0.70 | Development only |

## Related Documents

- [Trust Score](trust-score.md)
- [Troubleshooting](../getting-started/troubleshooting.md)
- [Architecture](../architecture/overview.md)
