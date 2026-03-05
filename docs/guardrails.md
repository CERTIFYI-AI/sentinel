# Guardrails Reference

Sentinel ships with six built-in guardrails that form the verification pipeline. Each guardrail runs independently and produces a score between 0.0 and 1.0.

## Pipeline Overview

```
Request -> [Prompt Injection] -> [Toxicity] -> [PII Detection] -> [Factuality] -> [Hallucination] -> [Bias] -> Verdict
```

Guardrails can run in parallel (`GUARDRAIL_PARALLEL=true`) or sequentially. In fail-fast mode, the pipeline stops at the first `BLOCK` violation.

---

## 1. Toxicity Detection

**Type**: Local classifier model
**Model**: `unitary/toxic-bert` (default)
**Latency**: ~30-80ms
**Memory**: ~800MB

Detects harmful, offensive, or inappropriate content across categories:
- Hate speech
- Harassment
- Self-harm content
- Sexual content
- Violence
- Threat

**Score interpretation**: Higher = more toxic. A score of 0.0 means no toxicity detected.

**Configuration**:
```yaml
guardrail: toxicity
threshold: 0.3        # Scores above this trigger the action
config:
  categories: [hate_speech, harassment, violence]
```

---

## 2. Factuality Check

**Type**: LLM-as-judge
**Model**: Configurable (default: `gpt-4o-mini`)
**Latency**: ~200-500ms
**Cost**: LLM API call per check

Verifies factual accuracy by having a second LLM evaluate the response. Optionally uses RAG context as reference material.

**Score interpretation**: Higher = more factual. A score of 1.0 means fully verified.

**Configuration**:
```yaml
guardrail: factuality
threshold: 0.7        # Scores below this trigger the action
config:
  reference_sources: true
  model: gpt-4o
```

---

## 3. PII Detection

**Type**: Regex + NER hybrid
**Model**: Built-in patterns + spaCy NER
**Latency**: ~5-20ms
**Memory**: Minimal

Detects personally identifiable information using regex patterns for structured data (emails, SSNs, credit cards) and NER for names and addresses.

**Supported entities**:
- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- Physical addresses
- Person names
- IP addresses

**Score interpretation**: 0.0 = no PII found, 1.0 = PII detected.

**Configuration**:
```yaml
guardrail: pii_detection
threshold: 0.0        # Any PII triggers action
config:
  entities: [email, phone, ssn, credit_card]
  redaction_char: "*"
```

---

## 4. Hallucination Detection

**Type**: LLM-as-judge
**Model**: Configurable (default: `gpt-4o-mini`)
**Latency**: ~200-500ms
**Cost**: LLM API call per check

Detects fabricated claims, invented citations, false statistics, and unsupported assertions.

**Score interpretation**: Higher = more hallucinated. A score of 0.0 means no hallucination detected.

**Configuration**:
```yaml
guardrail: hallucination
threshold: 0.5
config:
  check_citations: true
  check_statistics: true
  check_entities: true
```

---

## 5. Bias Detection

**Type**: Local classifier
**Model**: Custom fine-tuned model
**Latency**: ~30-60ms
**Memory**: ~400MB

Detects biased or discriminatory content across protected attributes.

**Protected attributes**:
- Gender
- Race/ethnicity
- Age
- Disability
- Religion
- Sexual orientation
- Nationality

**Score interpretation**: Higher = more biased.

**Configuration**:
```yaml
guardrail: bias
threshold: 0.3
config:
  protected_attributes: [gender, race, age, disability]
```

---

## 6. Prompt Injection Detection

**Type**: Local classifier
**Model**: Custom trained classifier
**Latency**: ~10-30ms
**Memory**: ~200MB

Detects prompt injection, jailbreak attempts, and prompt leaking in user inputs.

**Detection patterns**:
- Instruction override attempts
- Role-play exploits
- Encoding-based bypasses
- Context manipulation
- System prompt extraction

**Score interpretation**: Higher = more likely injection.

**Configuration**:
```yaml
guardrail: prompt_injection
threshold: 0.5
config:
  check_input: true
  check_output: false
```

---

## Writing Custom Guardrails

Create a new guardrail by implementing the `BaseGuardrail` interface:

```python
# sentinel/guardrails/custom_guardrail.py
from sentinel.guardrails.base import BaseGuardrail, GuardrailResult

class CustomGuardrail(BaseGuardrail):
    name = "custom_check"
    description = "My custom guardrail"

    async def initialize(self) -> None:
        """Load models or resources."""
        pass

    async def check(
        self,
        prompt: str,
        response: str,
        context: dict | None = None
    ) -> GuardrailResult:
        """Run the guardrail check."""
        score = 0.0  # Your logic here
        return GuardrailResult(
            guardrail=self.name,
            passed=score < self.threshold,
            score=score,
            details="Check passed"
        )
```

Register it in `sentinel/proxy.py`:

```python
from sentinel.guardrails.custom_guardrail import CustomGuardrail

PIPELINE = [
    # ... existing guardrails ...
    CustomGuardrail(threshold=0.5),
]
```

## Performance Summary

| Guardrail | Type | Avg Latency | Memory | Cost |
|-----------|------|-------------|--------|------|
| Toxicity | Local model | 50ms | 800MB | Free |
| Factuality | LLM judge | 350ms | Minimal | API call |
| PII Detection | Regex+NER | 12ms | Minimal | Free |
| Hallucination | LLM judge | 350ms | Minimal | API call |
| Bias | Local model | 45ms | 400MB | Free |
| Prompt Injection | Local model | 20ms | 200MB | Free |
