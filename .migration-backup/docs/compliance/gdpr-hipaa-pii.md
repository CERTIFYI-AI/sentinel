# GDPR / HIPAA PII Handling

Sentinel uses Microsoft Presidio to detect and mask personally identifiable information (PII) before any data is transmitted to an LLM provider. This document describes the PII controls, configuration options, and compliance mappings.

## What Gets Detected

Sentinel detects the following PII entity types by default:

| Entity Type | Examples | Regulation Relevance |
|-------------|----------|---------------------|
| `EMAIL_ADDRESS` | user@example.com | GDPR Art. 4(1), HIPAA §164.514(b) |
| `PHONE_NUMBER` | +1-555-123-4567 | GDPR Art. 4(1), HIPAA §164.514(b) |
| `PERSON` | John Smith | GDPR Art. 4(1) |
| `LOCATION` | 123 Main St, Sydney | GDPR Art. 4(1), HIPAA §164.514(b) |
| `DATE_TIME` | DOB: 01/01/1985 | HIPAA §164.514(b) |
| `MEDICAL_LICENSE` | MD-12345 | HIPAA §164.514(b) |
| `US_SSN` | 123-45-6789 | GDPR, HIPAA |
| `CREDIT_CARD` | 4111 1111 1111 1111 | GDPR Art. 4(1), PCI DSS |
| `IP_ADDRESS` | 192.168.1.1 | GDPR Art. 4(1) |
| `IBAN_CODE` | GB29 NWBK 6016 1331 9268 19 | GDPR Art. 4(1) |

## How Masking Works

1. Incoming request text is scanned by Presidio Analyzer
2. Detected entities are replaced with typed placeholders: `<EMAIL_ADDRESS>`, `<PERSON>`, etc.
3. The masked request is forwarded to the LLM provider
4. The original (unmasked) text is stored encrypted in the audit log with the sentinel request ID
5. On retrieval, authorised operators can deanonymise using the audit log

## Configuration

```yaml
# configs/sentinel.yaml
pii_detection:
  enabled: true
  entities:
    - EMAIL_ADDRESS
    - PHONE_NUMBER
    - PERSON
    - LOCATION
    - DATE_TIME
    - US_SSN
    - CREDIT_CARD
    - IP_ADDRESS
  score_threshold: 0.7  # Presidio confidence threshold
  language: en
  log_original: false   # Set true only if BAA/DPA permits storage
```

## GDPR Compliance

| GDPR Article | Requirement | Sentinel Implementation |
|-------------|-------------|------------------------|
| Art. 5(1)(c) | Data minimisation | PII stripped before LLM transmission |
| Art. 25 | Data protection by design | PII masking enabled by default |
| Art. 32 | Security of processing | Encrypted audit log storage, TLS in transit |
| Art. 35 | DPIA support | Audit trail provides evidence for DPIA |

## HIPAA Compliance

Sentinel addresses the following HIPAA Safe Harbor de-identification identifiers (§164.514(b)(2)):

- Names → `<PERSON>` mask
- Geographic data → `<LOCATION>` mask
- Dates (except year) → `<DATE_TIME>` mask
- Phone numbers → `<PHONE_NUMBER>` mask
- Email addresses → `<EMAIL_ADDRESS>` mask
- Social security numbers → `<US_SSN>` mask
- Medical record numbers → `<MEDICAL_LICENSE>` mask
- IP addresses → `<IP_ADDRESS>` mask

## Audit Evidence

Every sanitization event is logged:

```json
{
  "sentinel_request_id": "uuid-...",
  "event": "pii_detected",
  "entities_found": ["EMAIL_ADDRESS", "PERSON"],
  "entity_count": 2,
  "masked": true,
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Note: The original PII values are **never** logged unless `log_original: true` is explicitly set and your BAA/DPA permits this.

## Related Documents

- [Audit Log Schema](./audit-log-schema.md)
- [Security Model](../security-model.md)
- [SECURITY.md](../../SECURITY.md)
