import { useState, useCallback } from 'react';
import {
  Database, DownloadSimple, ArrowsClockwise, CheckCircle, XCircle,
  Warning, Spinner, Trash, CaretDown, CaretRight,
  Robot, Shield, ShieldCheck, ChartBar, ClipboardText, Users,
  Lightning, Scan, Target, FileText, GraduationCap, Lifebuoy,
  CalendarBlank, FlowArrow, Wrench, MagnifyingGlass, Lightbulb,
  TreeStructure, Scales, Eye, BellRinging, Gauge, Lock, Briefcase,
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Import existing seed data.
// NOTE: no AUDIT_LOG import — the audit trail is genuinely append-only and
// records real actor actions; seeding fabricated audit events would forge
// the evidence chain, so there is deliberately no "Audit Trail" card here.
import {
  USERS, MODELS, AGENTS, DATASETS, VENDORS, RISKS, BIAS_AUDITS,
  EVIDENCE, CONTROLS, FRAMEWORKS, POLICIES,
  HITL_REVIEWS, REGULATIONS, GUARDRAIL_EVENTS, TRUST_POLICIES,
  HITL_ITEMS, GAPS, ATTACK_SURFACE, TRACES, FALLBACK_LOG,
  USE_CASES, DATA_GOVERNANCE, NOTIFICATION_TEMPLATES,
} from '../data/seed';

// Import extended seed data
import {
  SEED_AUDITS, SEED_AUDIT_FINDINGS, SEED_AI_IMPACT_ASSESSMENTS,
  SEED_EXCEPTIONS, SEED_WORKFLOW_TEMPLATES, SEED_WORKFLOW_INSTANCES,
  SEED_TRAINING_COURSES, SEED_TRAINING_ASSIGNMENTS, SEED_DOCUMENTS,
  SEED_BCP_PLANS, SEED_CALENDAR_EVENTS, SEED_MATURITY_ASSESSMENTS,
  SEED_SECURITY_SCANS, SEED_VULNERABILITIES, SEED_THREATS,
  SEED_RED_TEAM_CAMPAIGNS, SEED_DATA_ASSETS, SEED_EXPLAINABILITY_REPORTS,
  SEED_CONFORMITY_ASSESSMENTS, SEED_INCIDENTS, SEED_REMEDIATION_ITEMS,
  SEED_USERS,
} from '../data/seedData';

// ── Icon mapping ────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  Robot, Shield, ShieldCheck, ChartBar, ClipboardText, Users,
  Lightning, Scan, Target, FileText, GraduationCap, Lifebuoy,
  CalendarBlank, FlowArrow, Wrench, MagnifyingGlass, Lightbulb,
  TreeStructure, Scales, Eye, BellRinging, Gauge, Lock, Briefcase,
  Database, Warning, DownloadSimple, ArrowsClockwise,
};

// ── Category definitions ────────────────────────────────────────────────────────

interface DataCategory {
  key: string;
  label: string;
  count: number;
  icon: string;
  source: 'seed' | 'seedData';
  tableName?: string;
}

interface DataSection {
  title: string;
  icon: string;
  categories: DataCategory[];
}

const DATA_SECTIONS: DataSection[] = [
  {
    title: 'AI Governance',
    icon: 'Robot',
    categories: [
      { key: 'models', label: 'AI Models', count: MODELS.length, icon: 'Robot', source: 'seed' },
      { key: 'agents', label: 'Agents', count: AGENTS.length, icon: 'Eye', source: 'seed' },
      { key: 'trust_policies', label: 'Trust Policies', count: TRUST_POLICIES.length, icon: 'Gauge', source: 'seed' },
      { key: 'traces', label: 'Trust Traces', count: TRACES.length, icon: 'Lightning', source: 'seed' },
      { key: 'guardrail_events', label: 'Guardrail Events', count: GUARDRAIL_EVENTS.length, icon: 'Shield', source: 'seed' },
      { key: 'bias_audits', label: 'Bias Audits', count: BIAS_AUDITS.length, icon: 'Scales', source: 'seed' },
      { key: 'use_cases', label: 'Use Cases', count: USE_CASES.length, icon: 'Briefcase', source: 'seed' },
      { key: 'explainability_reports', label: 'Explainability Reports', count: SEED_EXPLAINABILITY_REPORTS.length, icon: 'TreeStructure', source: 'seedData' },
      { key: 'conformity_assessments', label: 'Conformity Assessments', count: SEED_CONFORMITY_ASSESSMENTS.length, icon: 'ShieldCheck', source: 'seedData' },
      { key: 'data_assets', label: 'Data Assets', count: SEED_DATA_ASSETS.length, icon: 'Database', source: 'seedData' },
      { key: 'data_governance', label: 'Data Governance', count: DATA_GOVERNANCE.length, icon: 'Database', source: 'seed' },
    ],
  },
  {
    title: 'Compliance',
    icon: 'ShieldCheck',
    categories: [
      { key: 'frameworks', label: 'Frameworks', count: FRAMEWORKS.length, icon: 'ChartBar', source: 'seed' },
      { key: 'controls', label: 'Controls', count: CONTROLS.length, icon: 'ShieldCheck', source: 'seed' },
      { key: 'policies', label: 'Policies', count: POLICIES.length, icon: 'FileText', source: 'seed' },
      { key: 'evidence', label: 'Evidence', count: EVIDENCE.length, icon: 'Eye', source: 'seed' },
      // No 'Audit Trail' card: audit_log is append-only and must only ever
      // contain real actor actions — seeding fake audit events would forge it.
      { key: 'audits', label: 'Audits', count: SEED_AUDITS.length, icon: 'ClipboardText', source: 'seedData' },
      { key: 'audit_findings', label: 'Audit Findings', count: SEED_AUDIT_FINDINGS.length, icon: 'MagnifyingGlass', source: 'seedData' },
      { key: 'documents', label: 'Documents', count: SEED_DOCUMENTS.length, icon: 'FileText', source: 'seedData' },
      { key: 'calendar_events', label: 'Calendar Events', count: SEED_CALENDAR_EVENTS.length, icon: 'CalendarBlank', source: 'seedData' },
      { key: 'regulations', label: 'Regulations', count: REGULATIONS.length, icon: 'Scales', source: 'seed' },
      { key: 'gaps', label: 'Gap Analysis', count: GAPS.length, icon: 'Target', source: 'seed' },
    ],
  },
  {
    title: 'Risk & Incidents',
    icon: 'Warning',
    categories: [
      { key: 'risks', label: 'Risks', count: RISKS.length, icon: 'Warning', source: 'seed' },
      { key: 'incidents', label: 'Incidents', count: SEED_INCIDENTS.length, icon: 'Lightning', source: 'seedData' },
      { key: 'exceptions', label: 'Exceptions', count: SEED_EXCEPTIONS.length, icon: 'Warning', source: 'seedData' },
      { key: 'remediation_items', label: 'Remediation Items', count: SEED_REMEDIATION_ITEMS.length, icon: 'Wrench', source: 'seedData' },
      { key: 'ai_impact_assessments', label: 'AI Impact Assessments', count: SEED_AI_IMPACT_ASSESSMENTS.length, icon: 'MagnifyingGlass', source: 'seedData' },
      { key: 'bcp_plans', label: 'BCP Plans', count: SEED_BCP_PLANS.length, icon: 'Lifebuoy', source: 'seedData' },
    ],
  },
  {
    title: 'Security',
    icon: 'Shield',
    categories: [
      { key: 'security_scans', label: 'Scans', count: SEED_SECURITY_SCANS.length, icon: 'Scan', source: 'seedData' },
      { key: 'vulnerabilities', label: 'Vulnerabilities', count: SEED_VULNERABILITIES.length, icon: 'Warning', source: 'seedData' },
      { key: 'threats', label: 'Threats', count: SEED_THREATS.length, icon: 'Lightning', source: 'seedData' },
      { key: 'red_team_campaigns', label: 'Red Team Campaigns', count: SEED_RED_TEAM_CAMPAIGNS.length, icon: 'Target', source: 'seedData' },
      { key: 'attack_surface', label: 'Attack Surface', count: ATTACK_SURFACE.length, icon: 'Scan', source: 'seed' },
    ],
  },
  {
    title: 'Operations',
    icon: 'FlowArrow',
    categories: [
      { key: 'hitl_reviews', label: 'HITL Reviews', count: HITL_REVIEWS.length, icon: 'Eye', source: 'seed' },
      { key: 'hitl_items', label: 'HITL Items', count: HITL_ITEMS.length, icon: 'Eye', source: 'seed' },
      { key: 'vendors', label: 'Vendors', count: VENDORS.length, icon: 'Briefcase', source: 'seed' },
      { key: 'workflow_templates', label: 'Workflow Templates', count: SEED_WORKFLOW_TEMPLATES.length, icon: 'FlowArrow', source: 'seedData' },
      { key: 'workflow_instances', label: 'Workflow Instances', count: SEED_WORKFLOW_INSTANCES.length, icon: 'ArrowsClockwise', source: 'seedData' },
      { key: 'notification_templates', label: 'Notification Templates', count: NOTIFICATION_TEMPLATES.length, icon: 'BellRinging', source: 'seed' },
      { key: 'fallback_log', label: 'Fallback Log', count: FALLBACK_LOG.length, icon: 'ArrowsClockwise', source: 'seed' },
    ],
  },
  {
    title: 'Organization',
    icon: 'Users',
    categories: [
      { key: 'users', label: 'Users', count: USERS.length + SEED_USERS.length, icon: 'Users', source: 'seed' },
      { key: 'training_courses', label: 'Training Courses', count: SEED_TRAINING_COURSES.length, icon: 'GraduationCap', source: 'seedData' },
      { key: 'training_assignments', label: 'Training Assignments', count: SEED_TRAINING_ASSIGNMENTS.length, icon: 'Users', source: 'seedData' },
      { key: 'maturity_assessments', label: 'Maturity Assessments', count: SEED_MATURITY_ASSESSMENTS.length, icon: 'ChartBar', source: 'seedData' },
      { key: 'datasets', label: 'Datasets', count: DATASETS.length, icon: 'Database', source: 'seed' },
    ],
  },
];

// ── Component ───────────────────────────────────────────────────────────────────

type ImportStatus = 'idle' | 'importing' | 'imported' | 'error';

interface CategoryState {
  status: ImportStatus;
  error?: string;
}

export default function ImportSampleData() {
  const [categoryStates, setCategoryStates] = useState<Record<string, CategoryState>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(
    DATA_SECTIONS.map((s) => s.title)
  );
  const [isImportingAll, setIsImportingAll] = useState(false);

  const connected = isSupabaseConfigured();

  const totalCategories = DATA_SECTIONS.reduce((sum, s) => sum + s.categories.length, 0);
  const totalRecords = DATA_SECTIONS.reduce(
    (sum, s) => sum + s.categories.reduce((cs, c) => cs + c.count, 0),
    0
  );
  const importedCount = Object.values(categoryStates).filter(
    (s) => s.status === 'imported'
  ).length;

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title]
    );
  };

  const importCategory = useCallback(
    async (key: string) => {
      setCategoryStates((prev) => ({ ...prev, [key]: { status: 'importing' } }));

      try {
        if (connected && supabase) {
          // Supabase insert
          const tableMap: Record<string, { table: string; data: unknown[] }> = {
            audits: { table: 'audits', data: SEED_AUDITS },
            audit_findings: { table: 'audit_findings', data: SEED_AUDIT_FINDINGS },
            ai_impact_assessments: { table: 'ai_impact_assessments', data: SEED_AI_IMPACT_ASSESSMENTS },
            exceptions: { table: 'exceptions', data: SEED_EXCEPTIONS },
            workflow_templates: { table: 'workflow_templates', data: SEED_WORKFLOW_TEMPLATES },
            workflow_instances: { table: 'workflow_instances', data: SEED_WORKFLOW_INSTANCES },
            training_courses: { table: 'training_courses', data: SEED_TRAINING_COURSES },
            training_assignments: { table: 'training_assignments', data: SEED_TRAINING_ASSIGNMENTS },
            documents: { table: 'documents', data: SEED_DOCUMENTS },
            bcp_plans: { table: 'bcp_plans', data: SEED_BCP_PLANS },
            calendar_events: { table: 'compliance_calendar', data: SEED_CALENDAR_EVENTS },
            maturity_assessments: { table: 'maturity_assessments', data: SEED_MATURITY_ASSESSMENTS },
            security_scans: { table: 'security_scans', data: SEED_SECURITY_SCANS },
            vulnerabilities: { table: 'security_vulnerabilities', data: SEED_VULNERABILITIES },
            threats: { table: 'security_threats', data: SEED_THREATS },
            red_team_campaigns: { table: 'red_team_campaigns', data: SEED_RED_TEAM_CAMPAIGNS },
            data_assets: { table: 'data_assets', data: SEED_DATA_ASSETS },
            explainability_reports: { table: 'explainability_reports', data: SEED_EXPLAINABILITY_REPORTS },
            conformity_assessments: { table: 'conformity_assessments', data: SEED_CONFORMITY_ASSESSMENTS },
            incidents: { table: 'incidents', data: SEED_INCIDENTS },
            remediation_items: { table: 'remediation_items', data: SEED_REMEDIATION_ITEMS },
          };

          const mapping = tableMap[key];
          if (!mapping) {
            // Never fake success: a category without a table mapping writes
            // nothing, so "Imported" would be a lie. Surface it per-card.
            throw new Error('No database table is mapped for this category — nothing was imported.');
          }
          const { error } = await supabase.from(mapping.table).upsert(mapping.data as Record<string, unknown>[], { onConflict: 'id' });
          if (error) throw error;
        } else {
          // No backend → nothing can be written. Say so instead of simulating.
          throw new Error('Supabase is not configured — nothing was imported.');
        }

        setCategoryStates((prev) => ({ ...prev, [key]: { status: 'imported' } }));
        toast.success(`Imported ${key.replace(/_/g, ' ')}`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setCategoryStates((prev) => ({
          ...prev,
          [key]: { status: 'error', error: msg },
        }));
        toast.error(`Failed to import ${key.replace(/_/g, ' ')}: ${msg}`);
        return false;
      }
    },
    [connected]
  );

  const importAll = useCallback(async () => {
    setIsImportingAll(true);
    const allKeys = DATA_SECTIONS.flatMap((s) => s.categories.map((c) => c.key));
    let ok = 0;
    let failed = 0;
    for (const key of allKeys) {
      (await importCategory(key)) ? ok++ : failed++;
    }
    setIsImportingAll(false);
    // Honest summary — success toast only when every category actually wrote.
    if (failed === 0) toast.success(`All ${ok} sample data categories imported.`);
    else toast.error(`Imported ${ok} of ${allKeys.length} categories — ${failed} failed (see per-card errors).`);
  }, [importCategory]);

  const resetAll = useCallback(async () => {
    setCategoryStates({});
    toast.success('Import state reset. Data cleared from local state.');
  }, []);

  const getIcon = (name: string) => {
    const IconComp = ICONS[name];
    return IconComp ? <IconComp size={18} weight="duotone" /> : <Database size={18} weight="duotone" />;
  };

  const statusBadge = (state?: CategoryState) => {
    if (!state || state.status === 'idle') return null;
    if (state.status === 'importing')
      return (
        <Badge variant="outline" className="text-xs gap-1 border-[hsl(var(--s-in-br))] text-[hsl(var(--s-in-tx))]">
          <Spinner size={12} className="animate-spin" /> Importing
        </Badge>
      );
    if (state.status === 'imported')
      return (
        <Badge variant="outline" className="text-xs gap-1 border-[hsl(var(--s-ok-br))] text-[hsl(var(--s-ok-tx))]">
          <CheckCircle size={12} weight="fill" /> Imported
        </Badge>
      );
    if (state.status === 'error')
      return (
        <Badge variant="outline" className="text-xs gap-1 border-[hsl(var(--s-er-br))] text-[hsl(var(--s-er-tx))]">
          <XCircle size={12} weight="fill" /> Error
        </Badge>
      );
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
            Import Sample Data
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Populate Sentinel with realistic enterprise demo data for Acme Financial Corp.
            {!connected && (
              <span className="ml-2 text-[hsl(var(--s-wn-tx))]">(Local mode — Supabase not configured)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Trash size={14} /> Reset All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Sample Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear the import state. If connected to Supabase, existing records will
                  remain in the database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetAll}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={importAll}
            disabled={isImportingAll}
            className="gap-1.5 bg-[hsl(var(--s-ok-tx))] hover:bg-[hsl(var(--s-ok-tx))] text-[hsl(var(--bg-surface))]"
          >
            {isImportingAll ? (
              <Spinner size={14} className="animate-spin" />
            ) : (
              <DownloadSimple size={14} weight="bold" />
            )}
            {isImportingAll ? 'Importing...' : 'Import All Sample Data'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{totalCategories}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Data Categories</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-[hsl(var(--foreground))]">{totalRecords}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Total Records</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-[hsl(var(--s-ok-tx))]">{importedCount}</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Categories Imported</div>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-[hsl(var(--s-ok-tx))]' : 'bg-[hsl(var(--s-wn-tx))]'}`}
              />
              <div className="text-sm font-medium text-[hsl(var(--foreground))]">
                {connected ? 'Supabase Connected' : 'Local Mode'}
              </div>
            </div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {connected ? 'Data persists to cloud' : 'Data stored in-memory only'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Sections */}
      <div className="space-y-4">
        {DATA_SECTIONS.map((section) => {
          const isExpanded = expandedSections.includes(section.title);
          const sectionImported = section.categories.filter(
            (c) => categoryStates[c.key]?.status === 'imported'
          ).length;
          const SectionIcon = ICONS[section.icon] || Database;

          return (
            <Card
              key={section.title}
              className="bg-[hsl(var(--card))] border-[hsl(var(--border))]"
            >
              <CardHeader
                className="cursor-pointer select-none pb-3"
                onClick={() => toggleSection(section.title)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <CaretDown size={16} className="text-[hsl(var(--muted-foreground))]" />
                    ) : (
                      <CaretRight size={16} className="text-[hsl(var(--muted-foreground))]" />
                    )}
                    <SectionIcon
                      size={20}
                      weight="duotone"
                      className="text-[hsl(var(--s-ok-tx))]"
                    />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {section.categories.length} categories
                    </Badge>
                    {sectionImported > 0 && (
                      <Badge variant="outline" className="text-xs border-[hsl(var(--s-ok-br))] text-[hsl(var(--s-ok-tx))]">
                        {sectionImported}/{section.categories.length} imported
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">
                    {section.categories.reduce((s, c) => s + c.count, 0)} records
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {section.categories.map((cat) => {
                      const state = categoryStates[cat.key];
                      const isImporting = state?.status === 'importing';
                      const isImported = state?.status === 'imported';

                      return (
                        <div
                          key={cat.key}
                          className={`
                            flex items-center justify-between p-3 rounded-lg border transition-colors
                            ${isImported
                              ? 'border-[hsl(var(--s-ok-br))] bg-[hsl(var(--s-ok-tx))]'
                              : 'border-[hsl(var(--border))] bg-[hsl(var(--card))]'
                            }
                            ${state?.status === 'error' ? 'border-[hsl(var(--s-er-br))] bg-[hsl(var(--s-er-tx))]' : ''}
                          `}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-[hsl(var(--muted-foreground))]">
                              {getIcon(cat.icon)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                                {cat.label}
                              </div>
                              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                                {cat.count} records
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {statusBadge(state)}
                            {!isImported && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  importCategory(cat.key);
                                }}
                                disabled={isImporting || isImportingAll}
                                className="h-7 px-2 text-xs"
                              >
                                {isImporting ? (
                                  <Spinner size={12} className="animate-spin" />
                                ) : (
                                  <DownloadSimple size={12} />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Section error details */}
                  {section.categories.some((c) => categoryStates[c.key]?.status === 'error') && (
                    <div className="mt-3 p-3 rounded-lg bg-[hsl(var(--s-er-tx))] border border-[hsl(var(--s-er-br))]">
                      <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--s-er-tx))] mb-1">
                        <XCircle size={14} weight="fill" /> Import Errors
                      </div>
                      {section.categories
                        .filter((c) => categoryStates[c.key]?.status === 'error')
                        .map((c) => (
                          <div key={c.key} className="text-xs text-[hsl(var(--s-er-tx))] ml-5">
                            {c.label}: {categoryStates[c.key]?.error}
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info footer */}
      <Card className="bg-[hsl(var(--card))] border-[hsl(var(--border))]">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Warning size={20} weight="duotone" className="text-[hsl(var(--s-wn-tx))] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              <p className="font-medium text-[hsl(var(--foreground))] mb-1">About Sample Data</p>
              <p>
                This data represents a realistic enterprise deployment for{' '}
                <strong>Acme Financial Corp</strong>, a Fortune 500 financial services company using
                AI across credit scoring, fraud detection, customer service, and compliance. All
                data is fictional and internally consistent — model IDs, user references, framework
                mappings, and dates are cross-linked.
              </p>
              {!connected && (
                <p className="mt-2 text-[hsl(var(--s-wn-tx))]">
                  Configure <code className="px-1 py-0.5 bg-[hsl(var(--muted))] rounded text-xs">VITE_SUPABASE_URL</code> and{' '}
                  <code className="px-1 py-0.5 bg-[hsl(var(--muted))] rounded text-xs">VITE_SUPABASE_ANON_KEY</code> in your{' '}
                  <code className="px-1 py-0.5 bg-[hsl(var(--muted))] rounded text-xs">.env.local</code> to persist data to Supabase.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
