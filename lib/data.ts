import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type {
  KepsekGenerationGroup,
  KepsekProfile,
  KepsekSchool,
  SchoolContext,
  SchoolLevel,
  SchoolStatus,
  Workspace,
} from '@/lib/types';

const levels = new Set<SchoolLevel>(['TK', 'SD', 'SMP', 'SMA', 'SMK']);
const statuses = new Set<SchoolStatus>(['Negeri', 'Swasta']);

function normalizedContext(value: unknown): SchoolContext {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as SchoolContext)
    : {};
}

async function getIdentity() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null;
  const email = typeof data?.claims?.email === 'string' ? data.claims.email : '';

  if (error || !userId) redirect('/login');
  return { supabase, userId, email };
}

export async function requireWorkspace(): Promise<Workspace> {
  const { supabase, userId, email } = await getIdentity();

  const [profileResult, schoolResult] = await Promise.all([
    supabase.from('kepsek_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('kepsek_schools').select('*').eq('owner_user_id', userId).maybeSingle(),
  ]);

  let profile = profileResult.data as KepsekProfile | null;
  let school = schoolResult.data as KepsekSchool | null;

  if (!profile || !school) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) redirect('/login');

    const metadata = userData.user.user_metadata ?? {};
    const principalName =
      typeof metadata.principal_name === 'string' && metadata.principal_name.trim()
        ? metadata.principal_name.trim()
        : 'Kepala Sekolah';
    const schoolName =
      typeof metadata.school_name === 'string' && metadata.school_name.trim()
        ? metadata.school_name.trim()
        : 'Sekolah Saya';
    const level = levels.has(metadata.level as SchoolLevel) ? (metadata.level as SchoolLevel) : 'SD';
    const status = statuses.has(metadata.status as SchoolStatus)
      ? (metadata.status as SchoolStatus)
      : 'Negeri';

    if (!profile) {
      const insertedProfile = await supabase
        .from('kepsek_profiles')
        .insert({
          user_id: userId,
          principal_name: principalName,
          phone: typeof metadata.phone === 'string' ? metadata.phone : null,
        })
        .select('*')
        .single();
      if (insertedProfile.error) throw new Error('Profil kepala sekolah belum dapat dibuat.');
      profile = insertedProfile.data as KepsekProfile;
    }

    if (!school) {
      const insertedSchool = await supabase
        .from('kepsek_schools')
        .insert({
          owner_user_id: userId,
          name: schoolName,
          npsn: typeof metadata.npsn === 'string' && metadata.npsn ? metadata.npsn : null,
          level,
          status,
          academic_year:
            typeof metadata.academic_year === 'string' ? metadata.academic_year : '2026/2027',
          school_context: {},
        })
        .select('*')
        .single();
      if (insertedSchool.error) throw new Error('Profil sekolah belum dapat dibuat.');
      school = insertedSchool.data as KepsekSchool;
    }
  }

  school.school_context = normalizedContext(school.school_context);
  return { userId, email, profile, school };
}

export async function getRecentDocumentGroups(limit = 6) {
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const result = await supabase
    .from('kepsek_generation_groups')
    .select('*, kepsek_generations(*)')
    .eq('user_id', workspace.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (result.error) throw new Error('Pustaka dokumen belum dapat dimuat.');

  const groups = (result.data ?? []) as KepsekGenerationGroup[];
  groups.forEach((group) => {
    group.kepsek_generations = (group.kepsek_generations ?? []).sort(
      (a, b) => b.variant_number - a.variant_number,
    );
  });
  return { workspace, groups };
}

export async function getAllDocumentGroups() {
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const result = await supabase
    .from('kepsek_generation_groups')
    .select('*, kepsek_generations(*)')
    .eq('user_id', workspace.userId)
    .order('created_at', { ascending: false });

  if (result.error) throw new Error('Pustaka dokumen belum dapat dimuat.');
  const groups = (result.data ?? []) as KepsekGenerationGroup[];
  groups.forEach((group) => {
    group.kepsek_generations = (group.kepsek_generations ?? []).sort(
      (a, b) => b.variant_number - a.variant_number,
    );
  });
  return { workspace, groups };
}

export function getAiConfiguration() {
  const keyCount = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean).length;

  return {
    keyCount,
    primaryModel: process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.7-flash',
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite',
  };
}
