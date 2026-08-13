# Glossary

Domain-specific terminology used throughout Sentinel documentation.

## A

**Audit Chain**
The append-only log of all Sentinel events. Each entry contains a SHA-256 hash of the previous entry, creating a tamper-evident chain. Any modification to a historical entry invalidates all subsequent hashes.

**Audit Entry**
A single record in the audit log representing one request/response cycle, including trust score, PII events, circuit breaker state, and cost.

## C

**Circuit Breaker**
The four-level escalation system (L0–L3) that determines what action to take when a response's trust score falls below configured thresholds. See [circuit-breaker.md](circuit-breaker.md).

**Claims**
Factual assertions extracted from an LLM response by the verifier. Each claim is checked individually against the golden source.

**Cross-Check**
L1 circuit breaker action. N independent LLM calls are made to verify the original response. Agreement increases confidence; disagreement triggers escalation.

## E

**Entailment**
An NLI (Natural Language Inference) relationship where a premise logically implies a hypothesis. Sentinel uses entailment scoring to determine whether golden source documents support LLM response claims.

**EU AI Act**
The European Union Artificial Intelligence Act (Regulation 2024/1689). Sentinel maps to the requirements for high-risk AI systems, particularly Articles 9 (risk management), 10 (data governance), 13 (transparency), and 14 (human oversight).

## G

**Golden Source**
Your verified knowledge base stored in pgvector. Sentinel retrieves relevant documents and checks LLM responses against these trusted documents.

## H

**Hash Chain**
See *Audit Chain*.

**Hallucination**
A response from an LLM that contains factual claims not supported by (or contradicted by) the golden source documents.

**HITL (Human-in-the-Loop)**
L3 circuit breaker level. A human operator reviews the response before it is delivered to the caller.

## I

**ISO 42001**
ISO/IEC 42001:2023 — the first international standard for AI Management Systems. Sentinel maps its controls to this standard's clauses, particularly Clause 8 (Operation) and Clause 9 (Performance evaluation).

## N

**NLI (Natural Language Inference)**
A machine learning task that determines whether a hypothesis is entailed by, contradicted by, or neutral with respect to a premise. Sentinel uses NLI to verify LLM response claims against golden source passages.

**N-Cross-Check**
The process of sending N independent verification requests to assess consensus on a claim's accuracy.

## P

**PII (Personally Identifiable Information)**
Information that can identify an individual. Sentinel uses Microsoft Presidio to detect and mask PII before it reaches LLM providers.

**Presidio**
Microsoft's open-source PII detection and anonymization framework. Used by Sentinel's sanitizer layer.

**Proxy**
Sentinel's OpenAI-compatible HTTP proxy layer. Applications send requests to `http://localhost:8000/v1/chat/completions` instead of directly to OpenAI.

## R

**RAG (Retrieval-Augmented Generation)**
The technique of retrieving relevant documents from a knowledge base and including them as context when prompting an LLM. Sentinel uses RAG for golden source retrieval during fact-checking.

**Regeneration**
L2 circuit breaker action. The original request is resent to a stronger/different model to produce a higher-quality response.

## S

**Sanitizer**
Sentinel's first processing layer. Detects and masks PII, checks for prompt injection patterns, and validates request structure before forwarding to the LLM.

**Semantic Drift**
A trust score component measuring how far the LLM response has diverged in meaning from the original query intent.

**SOC 2**
Service Organization Control 2 — an auditing framework for service providers. Sentinel maps to the Trust Services Criteria, particularly Processing Integrity (PI) and Availability (A) criteria.

## T

**Trust Score**
A 0.0–1.0 composite score representing the factual reliability of an LLM response. Composed of RAG entailment (40%), N-cross-check agreement (30%), PII cleanliness (15%), and semantic drift (15%). See [trust-score.md](trust-score.md).

## V

**Verifier**
Sentinel's second processing layer. Retrieves relevant golden source documents, runs NLI entailment checks, performs N-cross-checks, and produces the trust score.

**pgvector**
A PostgreSQL extension for storing and querying vector embeddings. Sentinel uses pgvector to store document embeddings for semantic similarity search during RAG retrieval.
