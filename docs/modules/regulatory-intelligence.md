# Regulatory Intelligence (Radar, Velocity)

**Routes:** `/regulatory-radar`, `/regulatory-velocity`, `/regulation` · **Service:** `regulationService.ts`

## Purpose
Monitor new and changing regulations, map to affected controls/assets, and measure organisational time-to-compliance (regulatory velocity).

## Standards Alignment
| Control | Requirement |
|---|---|
| ISO/IEC 27001:2022 A.5.31 | Legal, statutory, regulatory requirements |
| SOC 2 CC3.4 | Changes affecting the system of internal control |
| EU AI Act Art.72 | Post-market monitoring incl. regulatory changes |

## Signals
Official journals, supervisory authority advisories, notified-body bulletins, standards bodies (ISO, NIST, CEN-CENELEC), and peer-intelligence feed.

## Velocity Metric
Median days from regulation publication to closed implementation task, published to Executive Center.
