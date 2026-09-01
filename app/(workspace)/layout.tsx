import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { requireWorkspace } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const workspace = await requireWorkspace();
  return (
    <Suspense fallback={<div className="app-loading">Menyiapkan workspace…</div>}>
      <AppShell schoolName={workspace.school.name} principalName={workspace.profile.principal_name} email={workspace.email}>
        {children}
      </AppShell>
    </Suspense>
  );
}
