# Trust Score Reference

The **trust score** is a float in `[0.0, 1.0]` produced by the Sentinel verifier layer for every
LLM response. Higher scores indicate higher factual reliability.

## Computation

The trust score is a weighted composite of three sub-scores:

```
trust_score = (
    0.5 * rag_entailment_score
    + 0.25 * cross_check_agreement
    + 0.25 * semantic_drift_score
)
```

| Sub-score | Description | Weight |
|---|---|---|
| `rag_entailment_score` | NLI entailment of response vs golden source | 50% |
| `cross_check_agreement` | Agreement between primary and fallback LLM | 25% |
| `semantic_drift_score` | Distance from baseline response distribution | 25% |

## Thresholds

| Config Key | Default | Behaviour |
|---|---|---|
| `trust_score_block_threshold` | `0.85` | Responses below this score trigger HITL or regeneration |
| `cross_check_trigger_threshold` | `0.80` | Cross-check is triggered when score drops below this |

## Interpretation

| Score Range | Interpretation | Action |
|---|---|---|
| 0.90 - 1.00 | High confidence | Pass through |
| 0.80 - 0.90 | Moderate confidence | Cross-check triggered |
| 0.70 - 0.80 | Low confidence | Regeneration attempted |
| 0.00 - 0.70 | Very low confidence | HITL escalation |

## Configuration

```yaml
# configs/sentinel.yaml
trust_score_block_threshold: 0.85
cross_check_trigger_threshold: 0.80
```

## API Response

Every response from the proxy includes the trust score:

```json
{
  "choices": [...],
  "sentinel_trust_score": 0.92,
  "sentinel_request_id": "uuid-..."
}
```
