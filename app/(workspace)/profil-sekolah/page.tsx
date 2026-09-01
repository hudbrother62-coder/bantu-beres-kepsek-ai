import { SchoolProfileForm } from '@/components/school-profile-form';
import { requireWorkspace } from '@/lib/data';

export const metadata = { title: 'Profil Sekolah' };

export default async function SchoolProfilePage() {
  return <SchoolProfileForm workspace={await requireWorkspace()} />;
}
