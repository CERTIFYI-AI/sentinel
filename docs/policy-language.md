# Policy Language Reference

Sentinel uses a declarative YAML-based policy language to define governance rules for AI outputs.

## Policy Structure

Every policy follows this structure:

```yaml
name: <string>           # Human-readable policy name
version: <semver>        # Semantic version (e.g., "1.0.0")
domain: <string>         # Application domain (healthcare, finance, general)
description: <string>    # What this policy enforces
active: <boolean>        # Whether policy is currently active

rules:
  - guardrail: <string>  # Guardrail identifier
    threshold: <float>   # Score threshold (0.0 - 1.0)
    action: <enum>       # Action on violation: BLOCK, FLAG, REDACT, LOG
    config: <object>     # Optional guardrail-specific configuration

metadata:
  compliance: <list>     # Compliance frameworks (ISO 42001, SOC 2, HIPAA)
  owner: <string>        # Policy owner/team
  review_date: <date>    # Next review date
  tags: <list>           # Searchable tags
```

## Actions

| Action | Behavior |
|--------|----------|
| `BLOCK` | Reject the response entirely. Returns error to caller. |
| `FLAG` | Allow response but flag for human review. |
| `REDACT` | Remove or mask offending content, allow remainder. |
| `LOG` | Allow response, log the violation for analytics. |

## Guardrail Types

### Toxicity

Detects harmful, offensive, or inappropriate content.

```yaml
rules:
  - guardrail: toxicity
    threshold: 0.3       # Lower = stricter
    action: BLOCK
    config:
      categories:        # Optional: specific categories
        - hate_speech
        - harassment
        - self_harm
        - sexual_content
        - violence
```

### Factuality

Verifies factual accuracy using LLM-as-judge.

```yaml
rules:
  - guardrail: factuality
    threshold: 0.7       # Higher = stricter
    action: FLAG
    config:
      reference_sources: true   # Use RAG context for verification
      model: gpt-4o            # Override model for this check
```

### PII Detection

Detects personally identifiable information.

```yaml
rules:
  - guardrail: pii_detection
    threshold: 0.0       # Any PII triggers action
    action: REDACT
    config:
      entities:          # PII types to detect
        - email
        - phone
        - ssn
        - credit_card
        - address
        - name
      redaction_char: "*"  # Character for redaction
```

### Hallucination Detection

Detects fabricated or unsupported claims.

```yaml
rules:
  - guardrail: hallucination
    threshold: 0.5
    action: BLOCK
    config:
      check_citations: true
      check_statistics: true
```

### Bias Detection

Detects biased or discriminatory content.

```yaml
rules:
  - guardrail: bias
    threshold: 0.3
    action: FLAG
    config:
      protected_attributes:
        - gender
        - race
        - age
        - disability
        - religion
```

### Prompt Injection

Detects prompt injection attempts in user inputs.

```yaml
rules:
  - guardrail: prompt_injection
    threshold: 0.5
    action: BLOCK
    config:
      check_input: true
      check_output: false
```

---

## Example Policies

### Healthcare Policy

```yaml
name: Healthcare AI Safety
version: "2.0.0"
domain: healthcare
description: Strict safety guardrails for medical AI applications
active: true

rules:
  - guardrail: toxicity
    threshold: 0.1
    action: BLOCK

  - guardrail: factuality
    threshold: 0.95
    action: BLOCK
    config:
      reference_sources: true

  - guardrail: hallucination
    threshold: 0.2
    action: BLOCK

  - guardrail: pii_detection
    threshold: 0.0
    action: REDACT
    config:
      entities: [email, phone, ssn, name, address]

metadata:
  compliance: [HIPAA, FDA]
  owner: medical-compliance-team
  review_date: "2024-06-01"
  tags: [medical, safety, hipaa]
```

### Financial Services Policy

```yaml
name: Financial Compliance
version: "1.5.0"
domain: finance
description: Compliance guardrails for financial AI advisors
active: true

rules:
  - guardrail: factuality
    threshold: 0.9
    action: BLOCK

  - guardrail: bias
    threshold: 0.2
    action: FLAG

  - guardrail: pii_detection
    threshold: 0.0
    action: REDACT
    config:
      entities: [credit_card, ssn, account_number]

  - guardrail: hallucination
    threshold: 0.3
    action: BLOCK

metadata:
  compliance: [SOC2, PCI-DSS]
  owner: fintech-compliance
  review_date: "2024-07-15"
  tags: [finance, compliance, pci]
```

### General Purpose Policy

```yaml
name: Default Safety Policy
version: "1.0.0"
domain: general
description: Baseline safety policy for all AI applications
active: true

rules:
  - guardrail: toxicity
    threshold: 0.3
    action: BLOCK

  - guardrail: prompt_injection
    threshold: 0.5
    action: BLOCK

  - guardrail: pii_detection
    threshold: 0.0
    action: REDACT

  - guardrail: factuality
    threshold: 0.7
    action: FLAG

metadata:
  compliance: [ISO42001]
  owner: platform-team
  tags: [default, baseline]
```

---

## Policy Versioning

Policies use semantic versioning:
- **Major**: Breaking changes to rule logic
- **Minor**: New rules added
- **Patch**: Threshold adjustments

Old versions are retained in the audit log for compliance traceability.

## Policy Evaluation Order

1. Policies are matched by `domain` and `policy_ids` in the request
2. Rules within a policy execute in pipeline order (see `configs/pipeline.yaml`)
3. If any rule triggers a `BLOCK` action, evaluation stops immediately
4. `FLAG` and `LOG` actions do not halt evaluation
5. `REDACT` modifies the response and continues evaluation

## Creating Custom Policies

1. Create a YAML file in `configs/policies/`
2. Follow the schema above
3. Validate: `python -m sentinel.scripts.validate_config --file your_policy.yaml`
4. Load via API: `POST /api/v1/policies` with the YAML content
5. Or restart the service to auto-load from disk
