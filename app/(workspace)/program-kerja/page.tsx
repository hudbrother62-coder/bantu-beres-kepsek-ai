import { ProgramPlanner } from '@/components/program-planner';
import { requireWorkspace } from '@/lib/data';
import type { PlanningItem, SchoolContext } from '@/lib/types';

export const metadata = { title: 'Program Kerja' };

export default async function ProgramPage() {
  const workspace = await requireWorkspace();
  const context = workspace.school.school_context as SchoolContext;
  const items = Array.isArray(context.planningItems) ? context.planningItems as PlanningItem[] : [];
  return <ProgramPlanner initialItems={items} defaultOwner={workspace.profile.principal_name} />;
}
