import { Settings } from 'lucide-react';
import { ModuleSkeleton } from '../components/ModuleSkeleton';
export default function Page() {
  return <ModuleSkeleton title="System" description="Platform administration — users, integrations, API keys, audit log." icon={Settings} />;
}
