import { MessageSquareCode } from 'lucide-react';
import { ModuleSkeleton } from '../components/ModuleSkeleton';
export default function Page() {
  return <ModuleSkeleton title="Prompt Registry" description="Version-controlled system prompt governance and approval workflow." icon={MessageSquareCode} />;
}
