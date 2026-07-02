// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Seed for GenAI Risk Profiles — hooks fall back to these when the tenant
// table is empty (moved out of the page when persistence was added).

import type { GenAIRiskProfile } from '../types/trustEngine'

export const GENAI_RISK_SEED: GenAIRiskProfile[] = [
  { id: 'GRP-001', model: 'Loan Approval Assistant', riskCategory: 'Confabulation (Hallucination)', riskNumber: 1, severity: 'Critical', guardrails: 'Hallucination Guard (TP-003)', guardrailCoverage: 'Partial', mitigationStatus: 'Partial', owner: 'Maria Santos', created: '2026-01-15' },
  { id: 'GRP-002', model: 'Loan Approval Assistant', riskCategory: 'Harmful Content', riskNumber: 4, severity: 'High', guardrails: 'Toxicity Filter (TP-002)', guardrailCoverage: 'Implemented', mitigationStatus: 'Implemented', owner: 'Maria Santos', created: '2026-01-15' },
  { id: 'GRP-003', model: 'Customer Service Chatbot', riskCategory: 'Human-AI Confusion', riskNumber: 9, severity: 'Medium', guardrails: 'None', guardrailCoverage: 'None', mitigationStatus: 'Not Addressed', owner: 'Sarah Chen', created: '2026-02-01' },
  { id: 'GRP-004', model: 'Loan Approval Assistant', riskCategory: 'Intellectual Property', riskNumber: 5, severity: 'Medium', guardrails: 'Data Boundary (TP-004)', guardrailCoverage: 'Partial', mitigationStatus: 'Partial', owner: 'James Patel', created: '2026-02-10' },
  { id: 'GRP-005', model: 'Credit Risk Scorer', riskCategory: 'Data Poisoning', riskNumber: 7, severity: 'High', guardrails: 'None', guardrailCoverage: 'None', mitigationStatus: 'Under Review', owner: 'David Kim', created: '2026-02-20' },
  { id: 'GRP-006', model: 'Loan Approval Assistant', riskCategory: 'Dual Use Risk', riskNumber: 10, severity: 'High', guardrails: 'Policy Firewall', guardrailCoverage: 'Partial', mitigationStatus: 'Partial', owner: 'Sarah Chen', created: '2026-03-01' },
  { id: 'GRP-007', model: 'Fraud Detection Engine', riskCategory: 'Bias/Discrimination', riskNumber: 3, severity: 'Critical', guardrails: 'Demographic Masking (GR-006)', guardrailCoverage: 'Implemented', mitigationStatus: 'Implemented', owner: 'Maria Santos', created: '2026-03-10' },
  { id: 'GRP-008', model: 'Loan Approval Assistant', riskCategory: 'Cybersecurity', riskNumber: 6, severity: 'High', guardrails: 'Prompt Injection Firewall (GR-002)', guardrailCoverage: 'Implemented', mitigationStatus: 'Implemented', owner: 'David Kim', created: '2026-03-15' },
]
