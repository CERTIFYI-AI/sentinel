# Security Intelligence Module

## Overview

The Security Intelligence Module is a comprehensive security monitoring, threat detection, and vulnerability management suite integrated into the Sentinel AI Governance platform. It provides real-time visibility into security posture across all AI/LLM operations.

## Module Architecture

```
dashboard/src/pages/security/
|-- SecurityOverview.tsx    # Main dashboard with KPIs and metrics
|-- ThreatFeed.tsx          # Real-time threat intelligence feed
|-- ScanCenter.tsx          # Automated security scanning
|-- AttackSurface.tsx       # Endpoint and asset mapping
|-- VulnTracker.tsx         # Vulnerability lifecycle management
|-- RedTeamLab.tsx          # Adversarial testing workspace
|-- PolicyFirewall.tsx      # Security policy rule engine
|-- KeysVault.tsx           # API key and secrets management
```

## Pages

### 1. Security Overview (`SecurityOverview.tsx`)

Central dashboard providing at-a-glance security metrics.

**Features:**
- Security score with color-coded status (0-100)
- Active threat counter with severity breakdown
- Vulnerability summary by status (open, in-progress, resolved)
- Compliance percentage tracker
- Recent security events timeline
- Quick action navigation cards to all sub-modules

**Key Metrics:**
- Overall Security Score
- Active Threats Count
- Open Vulnerabilities
- Policy Compliance Rate
- Scan Coverage Percentage
- Mean Time to Remediation

---

### 2. Threat Feed (`ThreatFeed.tsx`)

Real-time threat intelligence aggregation and monitoring.

**Features:**
- Live threat feed with severity indicators (Critical/High/Medium/Low)
- Source tracking (internal detection, external feeds, manual reports)
- Threat category classification
- Status workflow (Active, Investigating, Mitigated, Resolved)
- Search and filter by severity, source, status
- One-click investigate action
- Stat cards showing threat distribution

**Data Model:**
```typescript
interface Threat {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  source: string;
  status: string;
  detectedAt: string;
  category: string;
}
```

---

### 3. Scan Center (`ScanCenter.tsx`)

Automated security scan management and results tracking.

**Features:**
- Scan history table with status indicators
- Multiple scan types: Full Scan, Quick Scan, API Scan, Model Scan
- Target specification (endpoints, models, APIs)
- Findings count per scan with severity breakdown
- Duration tracking
- New Scan trigger button
- Filter by scan type and status

**Scan Types:**
| Type | Description | Typical Duration |
|------|-------------|------------------|
| Full Scan | Comprehensive security audit | 45-90 min |
| Quick Scan | Rapid vulnerability check | 5-15 min |
| API Scan | REST/GraphQL endpoint testing | 15-30 min |
| Model Scan | LLM prompt injection testing | 20-40 min |

---

### 4. Attack Surface (`AttackSurface.tsx`)

Endpoint and asset inventory with risk assessment.

**Features:**
- Endpoint registry with risk scoring
- Asset type categorization (API, Model, Database, Service)
- Exposure level indicators (Public, Internal, Restricted)
- Last assessed date tracking
- Risk score visualization (0-100)
- Endpoint detail expansion
- Add new endpoint form

**Risk Levels:**
- **Critical (80-100):** Immediate action required
- **High (60-79):** Priority remediation needed
- **Medium (40-59):** Scheduled review recommended
- **Low (0-39):** Acceptable risk level

---

### 5. Vulnerability Tracker (`VulnTracker.tsx`)

Full lifecycle vulnerability management.

**Features:**
- Vulnerability inventory with CVSS scoring
- Status workflow: Open -> In Progress -> Resolved -> Closed
- Severity classification with color coding
- Affected component tracking
- Discovery and due date management
- Assignee tracking
- Bulk status updates
- Export functionality

**Status Workflow:**
```
Open --> In Progress --> Resolved --> Closed
  |                        |
  +--- Reopened <----------+
```

---

### 6. Red Team Lab (`RedTeamLab.tsx`)

Adversarial testing and simulation environment.

**Features:**
- Test campaign management
- Attack simulation categories:
  - Prompt Injection
  - Data Exfiltration
  - Model Manipulation
  - Jailbreak Attempts
  - PII Extraction
- Success/failure rate tracking
- Finding severity assessment
- Campaign scheduling
- Detailed test reports

**Test Statuses:**
- Running: Active test in progress
- Completed: Test finished with results
- Scheduled: Pending execution
- Failed: Test encountered errors

---

### 7. Policy Firewall (`PolicyFirewall.tsx`)

Security policy rule engine for AI governance.

**Features:**
- Policy rule CRUD operations
- Rule types: Block, Allow, Monitor, Rate Limit
- Priority ordering
- Enable/disable toggle
- Trigger count tracking
- Last triggered timestamp
- Category grouping (Input Validation, Output Filtering, Access Control, Data Protection)
- Rule testing and simulation

**Rule Schema:**
```typescript
interface PolicyRule {
  id: string;
  name: string;
  type: 'Block' | 'Allow' | 'Monitor' | 'Rate Limit';
  category: string;
  priority: number;
  enabled: boolean;
  triggers: number;
  lastTriggered: string;
}
```

---

### 8. Keys Vault (`KeysVault.tsx`)

API key and secrets lifecycle management.

**Features:**
- Key inventory with masked display
- Key status management (Active, Expired, Revoked)
- Service/provider association
- Creation and expiration date tracking
- Usage statistics (request counts)
- One-click key rotation
- Revocation workflow
- Generate new key form
- Permission scope assignment

**Security Features:**
- Keys displayed in masked format (first 8 chars visible)
- Automatic expiration alerts
- Usage anomaly detection
- Rotation reminders
- Audit trail for all key operations

---

## Navigation & Routing

All security pages are accessible via the sidebar navigation under the "Security" section. Routes are configured in `App.tsx`:

```
/security                  -> SecurityOverview
/security/threats          -> ThreatFeed
/security/scans            -> ScanCenter
/security/attack-surface   -> AttackSurface
/security/vulnerabilities  -> VulnTracker
/security/red-team         -> RedTeamLab
/security/policies         -> PolicyFirewall
/security/keys             -> KeysVault
```

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Routing:** React Router v6
- **Styling:** Tailwind CSS with dark theme support
- **State:** React hooks (useState, useEffect)
- **Icons:** Lucide React
- **Charts:** CSS-based progress bars and indicators

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
cd dashboard
npm install
npm run dev
```

### Build
```bash
npm run build
```

## Integration Points

| Module | Integrates With | Purpose |
|--------|----------------|--------|
| ThreatFeed | Sentinel API | Real-time threat data |
| ScanCenter | Scanner Engine | Automated assessments |
| VulnTracker | JIRA/GitHub Issues | Ticket sync |
| PolicyFirewall | Proxy Engine | Rule enforcement |
| KeysVault | Secret Manager | Key storage backend |
| RedTeamLab | Test Runner | Attack simulations |

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.