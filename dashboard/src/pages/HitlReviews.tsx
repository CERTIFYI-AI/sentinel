import { UserCheck } from 'lucide-react';
import { ModuleSkeleton } from '../components/ModuleSkeleton';
export default function Page() {
  return <ModuleSkeleton title="HITL Reviews" description="Human-in-the-Loop review queue for AI output validation." icon={UserCheck} />;
}
