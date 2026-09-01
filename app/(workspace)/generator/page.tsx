import { GeneratorStudio } from '@/components/generator-studio';
import { requireWorkspace } from '@/lib/data';
import { getDocumentDefinition } from '@/lib/document-catalog';
import type { SchoolContext } from '@/lib/types';

export const metadata = { title: 'Generator AI' };

export default async function GeneratorPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [workspace, params] = await Promise.all([requireWorkspace(), searchParams]);
  const context = workspace.school.school_context as SchoolContext;
  const profileReady = Boolean(context.vision && context.priorities?.length && context.address);
  const initialType = params.type && getDocumentDefinition(params.type) ? params.type : 'ksp';
  return <GeneratorStudio initialType={initialType} profileReady={profileReady} />;
}
