import { QualityContextManager } from '@/components/quality-context-manager';
import { requireWorkspace } from '@/lib/data';
import type { SchoolContext } from '@/lib/types';

export const metadata = { title: 'Mutu & PBD' };

export default async function QualityPage() {
  const workspace = await requireWorkspace();
  const context = workspace.school.school_context as SchoolContext;
  return <QualityContextManager
    initialIndicators={Array.isArray(context.raporIndicators) ? context.raporIndicators : []}
    initialNotes={context.raporNotes || ''}
    strengths={Array.isArray(context.strengths) ? context.strengths : []}
    challenges={Array.isArray(context.challenges) ? context.challenges : []}
    priorities={Array.isArray(context.priorities) ? context.priorities : []}
  />;
}
