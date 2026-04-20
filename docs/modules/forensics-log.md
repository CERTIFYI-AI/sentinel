# Forensics & Incident Log

**Routes:** `/incident-log`, `/incident-workflow`, `/incidents` · **Service:** `incidentService.ts`

## Purpose
Structured forensic collection and chain-of-custody during incident response; complements Incident Management and Regulator Filing modules.

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27037 / 27041 / 27042 | Digital evidence, investigation, analysis |
| NIST SP 800-86 | Forensic techniques |
| ISO/IEC 27035 | Incident management |
| EU AI Act Art.12 | Automatic logs retained appropriately |

## Features
Evidence hashing on capture, custody handoff log, timeline reconstruction from `audit_log` + `live_traces`, export with cryptographic manifest.
