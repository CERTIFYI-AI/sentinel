# Training & Awareness

**Route:** `/training` · **Service:** `trainingService.ts`

## Purpose
Deliver, track, and evidence mandatory training (security, privacy, AI ethics, role-based) with completion attestations.

## Data honesty (V8, 2026-08)
The page reads the real org-scoped `training_courses` table only. The service
previously returned a fabricated seed catalogue whenever the table was empty
or the query failed; it now returns `[]` on empty (honest empty state) and
**throws** on failure (real error state with retry). A course with no measured
completion renders `—`, never a 0% bar, and a missing due date is `—`, never
"overdue". Writes throw — the save toast fires only after the write resolves.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.6.3 | Information security awareness, education, training |
| SOC 2 CC1.4 | Attracts, develops, retains competent individuals |
| ISO/IEC 42001 7.2–7.3 | Competence and awareness |
| NIST SP 800-50 / 800-181 NICE | Security awareness |
| GDPR Art.39(1)(b) | DPO training oversight |
| HIPAA §164.530(b) | Workforce training |

## Campaigns
Role-based assignment, quiz + scoring, SCORM/xAPI interoperability, overdue escalation, acknowledgement hashed to evidence.
