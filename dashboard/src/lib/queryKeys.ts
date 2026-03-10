export const QK = {
  // PROXY MODULE
  overview: ["proxy", "overview"] as const,
  trustScore: ["proxy", "trust-score"] as const,
  auditLog: (page: number, filters: object) =>
    ["proxy", "audit-log", page, filters] as const,
  hitlQueue: (status: string) => ["proxy", "hitl", status] as const,
  hitlItem: (id: string) => ["proxy", "hitl", id] as const,
  modelInventory: ["proxy", "models"] as const,
  model: (id: string) => ["proxy", "models", id] as const,
  complianceStatus: ["proxy", "compliance", "status"] as const,
  complianceFramework: (id: string) =>
    ["proxy", "compliance", id] as const,
  circuitBreaker: ["proxy", "circuit-breaker"] as const,
  apiKeys: ["proxy", "api-keys"] as const,

  // EVALS MODULE
  evalRuns: (page: number) => ["evals", "runs", page] as const,
  evalRun: (id: string) => ["evals", "runs", id] as const,
  evalDatasets: ["evals", "datasets"] as const,
  evalDataset: (id: string) => ["evals", "datasets", id] as const,
  evalMetrics: ["evals", "metrics"] as const,
  evalMetricRun: (id: string) => ["evals", "metrics", id] as const,
  evalTechniques: ["evals", "techniques"] as const,
  evalArena: ["evals", "arena"] as const,

  // SECURITY MODULE
  securityPosture: ["security", "posture"] as const,
  campaigns: (page: number) =>
    ["security", "campaigns", page] as const,
  campaign: (id: string) => ["security", "campaigns", id] as const,
  scanJobs: ["security", "scans"] as const,
  scanJob: (id: string) => ["security", "scans", id] as const,
  modelAudits: ["security", "audits"] as const,
  modelAudit: (id: string) => ["security", "audits", id] as const,
  frameworkScores: ["security", "frameworks"] as const,
  framework: (id: string) => ["security", "frameworks", id] as const,
  vulnerabilities: (page: number, severity: string) =>
    ["security", "vulns", page, severity] as const,

  // TASKS (cross-module)
  tasks: (filters: object) => ["tasks", filters] as const,
  task: (id: string) => ["tasks", id] as const,

  // NOTIFICATIONS (cross-module)
  notifications: ["notifications"] as const,
  unreadCount: ["notifications", "unread"] as const,

  // CISO AGGREGATES
  cisoPosture: ["ciso", "posture"] as const,
  cisoDeployments: ["ciso", "deployments"] as const,
  boardReportData: (config: object) =>
    ["ciso", "report", config] as const,
} as const;
