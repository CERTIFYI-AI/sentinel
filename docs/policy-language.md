# Policy Language Reference

> **Level:** 20-minute deep dive. Read this before writing custom governance rules or editing `sentinel.yaml`.

Sentinel policies operate at two layers: a **YAML configuration file** (`configs/sentinel.yaml`) that sets thresholds and detection parameters, and a **Python rule engine** (`sentinel/rules.py`) that evaluates requests and responses against composable rules.

---

## Configuration Layer — `sentinel.yaml`

The YAML file is the primary way to tune Sentinel without writing code. It is loaded at startup from `configs/sentinel.yaml` and can be mounted read-only into Docker containers.

### Top-Level Structure

```yaml
sentinel:
  version: "1.0"

  # Trust & verification thresholds
  trust_score_threshold: 0.85
  injection_block_threshold: 0.78
  cross_check_trigger_threshold: 0.80
  fallback_model: "gpt-4o"

  # Circuit breaker
  circuit_breaker:
    open_threshold: 5
    window_seconds: 60

  # Human-in-the-loop
  hitl:
    queue_name: "sentinel-hitl"
    canned_response: "Let me verify the details..."

  # PII detection
  pii:
    entities: ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", ...]
    custom_patterns: []

  # Golden source (RAG)
  golden_source:
    similarity_threshold: 0.72
    top_k: 3

  # Semantic drift
  semantic_drift:
    alert_threshold_sigma: 2.0
    block_threshold_sigma: 3.5

  # LLM providers
  providers:
    primary:
      name: "openai"
      model: "gpt-4o-mini"
      api_key: "${OPENAI_API_KEY}"
    fallback:
      name: "anthropic"
      model: "claude-3-5-haiku-20241022"
      api_key: "${ANTHROPIC_API_KEY}"
```

Environment variables can be referenced with `${VAR_NAME}` syntax. All YAML values can also be overridden via environment variables using the `SENTINEL_` prefix (handled by `pydantic-settings`).

### Threshold Tuning Guide

| Parameter | Default | Effect of Raising | Effect of Lowering |
|-----------|---------|-------------------|--------------------|
| `trust_score_threshold` | 0.85 | More responses escalated to HITL | More responses pass through unchecked |
| `injection_block_threshold` | 0.78 | Fewer false-positive blocks | More prompts blocked (stricter) |
| `cross_check_trigger_threshold` | 0.80 | Fewer cross-checks (saves cost) | More cross-checks (higher accuracy) |
| `golden_source.similarity_threshold` | 0.72 | Fewer evidence matches, lower recall | More noise in evidence, higher recall |
| `semantic_drift.alert_threshold_sigma` | 2.0 | Fewer drift alerts | Earlier drift warnings |

---

## Rule Engine Layer — `sentinel/rules.py`

The policy engine evaluates requests and responses against a chain of `Rule` objects. This layer handles governance logic that goes beyond threshold tuning.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Rule** | Abstract base class. Receives text + context, returns `PolicyViolation` or `None` |
| **PolicyEngine** | Loads built-in rules from config, runs them sequentially, aggregates violations |
| **PolicyViolation** | Data object with `rule_id`, `rule_name`, `severity`, `message`, `details` |
| **PolicyResult** | Final verdict: `action` (ALLOW/FLAG/BLOCK), list of violations, evaluation time |
| **Severity** | Enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| **PolicyAction** | Enum: `ALLOW`, `FLAG`, `BLOCK` |

### Rule Interface

Every rule implements a single async method:

```python
class Rule(ABC):
    rule_id: str = ""
    rule_name: str = ""
    severity: Severity = Severity.MEDIUM
    enabled: bool = True

    @abstractmethod
    async def evaluate(
        self, text: str, context: Dict[str, Any]
    ) -> Optional[PolicyViolation]:
        ...
```

The `context` dict contains `request_id` and `phase` (either `"request"` or `"response"`).

### Built-in Rules

Sentinel ships four rules that are auto-registered based on `PolicyConfig`:

| Rule | ID | Registered When | Phase |
|------|----|-----------------|-------|
| `PromptInjectionRule` | `builtin.prompt_injection` | Always | Request |
| `PIIDetectionRule` | `builtin.pii_detection` | `pii_detection=True` | Both |
| `BlockedTopicRule` | `builtin.blocked_topic` | `blocked_topics` is non-empty | Request |
| `MaxTokenGuardRule` | `builtin.max_token_guard` | Always | Request |

### Action Resolution

After all rules run, the engine determines the final action:

```
if no violations        → ALLOW
if strict_mode OR any CRITICAL violation → BLOCK
if max severity is HIGH → FLAG
else                    → ALLOW
```

`FLAG` means the request proceeds but the violation is logged to the audit trail. `BLOCK` returns an error to the caller.

### Writing Custom Rules

```python
from sentinel.rules import Rule
from sentinel.models import PolicyViolation, Severity

class RegulatedAdviceRule(Rule):
    """Block prompts asking for regulated financial advice."""
    rule_id = "custom.regulated_advice"
    rule_name = "Regulated Advice Detection"
    severity = Severity.HIGH

    _phrases = [
        "should i invest",
        "buy or sell",
        "financial advice",
    ]

    async def evaluate(self, text, context):
        text_lower = text.lower()
        for phrase in self._phrases:
            if phrase in text_lower:
                return PolicyViolation(
                    rule_id=self.rule_id,
                    rule_name=self.rule_name,
                    severity=self.severity,
                    message=f"Regulated advice request: '{phrase}'",
                    details={"phrase": phrase},
                )
        return None
```

Register the rule with the engine:

```python
engine = PolicyEngine(config)
engine.register_rule(RegulatedAdviceRule(), phase="request")
# phase options: "request", "response", "both"
```

---

## PolicyConfig Reference

The `PolicyConfig` class controls which built-in rules are active:

| Field | Type | Default | Effect |
|-------|------|---------|--------|
| `max_prompt_length` | `int` | `10000` | Not currently wired to MaxTokenGuardRule (uses 50k chars) |
| `blocked_topics` | `list[str]` | `[]` | Substring list for `BlockedTopicRule` |
| `content_policy_enabled` | `bool` | `True` | Master toggle for the policy engine |

Set via environment variables with the `SENTINEL_POLICY_` prefix:

```bash
export SENTINEL_POLICY_BLOCKED_TOPICS='["competitor-x", "internal-project"]'
export SENTINEL_POLICY_CONTENT_POLICY_ENABLED=true
```

---

## PII Custom Patterns

The `sentinel.yaml` file supports custom regex patterns for domain-specific PII:

```yaml
pii:
  custom_patterns:
    - name: "MRN"
      regex: "MRN[:\\s]*\\d{6,10}"
      score: 0.9
    - name: "NPI"
      regex: "\\b\\d{10}\\b"
      score: 0.7
```

These patterns extend the default Presidio/regex detectors and are matched during the sanitizer stage.

---

## Industry Presets

The `sentinel.yaml` file includes commented examples for stricter configurations:

**Healthcare (HIPAA)**:
- `trust_score_threshold: 0.90` — stricter factual accuracy
- `injection_block_threshold: 0.70` — more aggressive injection blocking
- Additional PII entities: `MEDICAL_LICENSE`, `MEDICAL_RECORD`
- Custom patterns for MRN and NPI numbers

To activate a preset, uncomment the relevant section in `sentinel.yaml` and restart Sentinel.
