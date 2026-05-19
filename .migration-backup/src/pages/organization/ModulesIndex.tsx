import { useOrgModule, OrgModule } from '@/lib/supabase/useOrgModule';
import { useOrg } from '@/lib/auth/useOrg';

const MODULES: { key: OrgModule; label: string }[] = [
  { key: 'departments',      label: 'Departments' },
  { key: 'roles',            label: 'Roles' },
  { key: 'committees',       label: 'Committees' },
  { key: 'training_courses', label: 'Training Courses' },
  { key: 'bcp_plans',        label: 'BCP Plans' },
  { key: 'ethics_reports',   label: 'Ethics Reports' },
  { key: 'assets',           label: 'Assets' },
  { key: 'identities',       label: 'Identities' },
  { key: 'bia_processes',    label: 'BIA Processes' },
  { key: 'risk_register',    label: 'Risk Register' },
  { key: 'ai_models',        label: 'AI Models' },
  { key: 'tasks',            label: 'Tasks' },
];

function ModuleCard({ m }: { m: typeof MODULES[number] }) {
  const { orgId } = useOrg();
  const { rows, loading, error } = useOrgModule(m.key, orgId);
  return (
    <div className="rounded-xl border p-4 shadow-sm">
      <div className="flex justify-between">
        <h3 className="font-semibold">{m.label}</h3>
        <span className="text-sm text-gray-500">{loading ? '…' : rows.length}</span>
      </div>
      {error && <p className="text-red-600 text-xs">{error.message}</p>}
    </div>
  );
}

export default function ModulesIndex() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
      {MODULES.map(m => <ModuleCard key={m.key} m={m} />)}
    </div>
  );
}
