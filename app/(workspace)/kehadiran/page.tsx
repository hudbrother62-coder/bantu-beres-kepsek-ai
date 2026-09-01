import { AttendanceManager } from '@/components/attendance-manager';
import { requireWorkspace } from '@/lib/data';
import type { AttendanceEntry, SchoolContext } from '@/lib/types';

export const metadata = { title: 'Kehadiran Guru' };

export default async function AttendancePage() {
  const workspace = await requireWorkspace();
  const context = workspace.school.school_context as SchoolContext;
  const items = Array.isArray(context.attendance) ? context.attendance as AttendanceEntry[] : [];
  return <AttendanceManager initialItems={items} teacherCount={Number(context.teacherCount) || 0} />;
}
