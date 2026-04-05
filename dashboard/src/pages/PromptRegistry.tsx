import { ChatTeardropText } from '@phosphor-icons/react';
import { ModuleSkeleton } from '../components/ModuleSkeleton';
export default function Page() {
  return <ModuleSkeleton title="Prompt Registry" description="Version-controlled system prompt governance and approval workflow." icon={ChatTeardropText} />;
}
