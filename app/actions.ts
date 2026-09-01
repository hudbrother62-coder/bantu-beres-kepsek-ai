'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type {
  ActionState,
  AttendanceEntry,
  GenerationContent,
  PlanningItem,
  SchoolContext,
} from '@/lib/types';

const authSchema = z.object({
  email: z.email('Masukkan alamat email yang valid.'),
  password: z.string().min(6, 'Password minimal 6 karakter.').max(72),
});

const signupSchema = authSchema.extend({
  principalName: z.string().trim().min(2, 'Nama kepala sekolah wajib diisi.').max(180),
  phone: z.string().trim().max(30).optional(),
  schoolName: z.string().trim().min(3, 'Nama sekolah wajib diisi.').max(180),
  npsn: z.string().trim().max(20).optional(),
  level: z.enum(['TK', 'SD', 'SMP', 'SMA', 'SMK']),
  status: z.enum(['Negeri', 'Swasta']),
  academicYear: z.string().trim().regex(/^\d{4}\/\d{4}$/, 'Gunakan format 2026/2027.'),
});

const profileSchema = z.object({
  principalName: z.string().trim().min(2).max(180),
  principalPhone: z.string().trim().max(30),
  schoolName: z.string().trim().min(3).max(180),
  npsn: z.string().trim().max(20),
  level: z.enum(['TK', 'SD', 'SMP', 'SMA', 'SMK']),
  status: z.enum(['Negeri', 'Swasta']),
  academicYear: z.string().trim().regex(/^\d{4}\/\d{4}$/),
  address: z.string().trim().max(500),
  village: z.string().trim().max(120),
  district: z.string().trim().max(120),
  city: z.string().trim().max(120),
  province: z.string().trim().max(120),
  postalCode: z.string().trim().max(10),
  email: z.string().trim().max(180),
  phone: z.string().trim().max(30),
  website: z.string().trim().max(220),
  vision: z.string().trim().max(2000),
  mission: z.string().trim().max(4000),
  goals: z.string().trim().max(4000),
  studentCount: z.coerce.number().int().min(0).max(100_000),
  teacherCount: z.coerce.number().int().min(0).max(10_000),
  staffCount: z.coerce.number().int().min(0).max(10_000),
  rombelCount: z.coerce.number().int().min(0).max(5_000),
  strengths: z.string().max(4000),
  challenges: z.string().max(4000),
  priorities: z.string().max(4000),
  raporNotes: z.string().max(6000),
});

const planningItemSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(2).max(240),
  category: z.enum(['Program Sekolah', 'Kinerja', 'Supervisi', 'Sosialisasi', 'Lainnya']),
  owner: z.string().trim().max(180),
  startDate: z.string().max(20),
  endDate: z.string().max(20),
  output: z.string().trim().max(500),
  status: z.enum(['Direncanakan', 'Berjalan', 'Selesai', 'Tertunda']),
  notes: z.string().trim().max(1000),
});

const attendanceSchema = z.object({
  id: z.string().min(1).max(100),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  teacherTotal: z.number().int().min(0).max(10_000),
  present: z.number().int().min(0).max(1_000_000),
  sick: z.number().int().min(0).max(1_000_000),
  leave: z.number().int().min(0).max(1_000_000),
  absent: z.number().int().min(0).max(1_000_000),
  notes: z.string().max(1000),
});

const qualityIndicatorSchema = z.object({
  name: z.string().trim().min(2).max(240),
  score: z.number().min(0).max(100).nullable(),
  trend: z.enum(['Naik', 'Tetap', 'Turun', 'Belum diisi']),
  note: z.string().trim().max(1000),
});

function fieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function lines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)
    .slice(0, 30);
}

function friendlyAuthError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'Email atau password tidak cocok.';
  if (lower.includes('email not confirmed')) return 'Email belum dikonfirmasi. Periksa kotak masuk Anda.';
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk.';
  }
  if (lower.includes('rate limit') || lower.includes('security purposes')) {
    return 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.';
  }
  return 'Permintaan autentikasi belum berhasil. Silakan coba kembali.';
}

async function authContext() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === 'string' ? data.claims.sub : null;
  if (error || !userId) redirect('/login');
  return { supabase, userId };
}

async function schoolForUser(userId: string) {
  const supabase = await createClient();
  const result = await supabase
    .from('kepsek_schools')
    .select('id, school_context')
    .eq('owner_user_id', userId)
    .single();
  if (result.error || !result.data) throw new Error('Profil sekolah belum ditemukan.');
  const context =
    result.data.school_context && typeof result.data.school_context === 'object'
      ? (result.data.school_context as SchoolContext)
      : {};
  return { supabase, id: result.data.id as string, context };
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Periksa kembali data masuk.', fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const result = await supabase.auth.signInWithPassword(parsed.data);
  if (result.error) return { ok: false, message: friendlyAuthError(result.error.message) };

  const requestedPath = String(formData.get('next') || '/dashboard');
  const destination = requestedPath.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/dashboard';
  redirect(destination);
}

export async function signupAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    principalName: formData.get('principalName'),
    phone: formData.get('phone'),
    schoolName: formData.get('schoolName'),
    npsn: formData.get('npsn'),
    level: formData.get('level'),
    status: formData.get('status'),
    academicYear: formData.get('academicYear'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Periksa kembali data pendaftaran.', fieldErrors: fieldErrors(parsed.error) };
  }

  const requestHeaders = await headers();
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  const requestOrigin = requestHeaders.get('origin');
  const origin = configuredOrigin || (requestOrigin?.startsWith('http') ? requestOrigin : undefined);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
      data: {
        principal_name: parsed.data.principalName,
        phone: parsed.data.phone || null,
        school_name: parsed.data.schoolName,
        npsn: parsed.data.npsn || null,
        level: parsed.data.level,
        status: parsed.data.status,
        academic_year: parsed.data.academicYear,
      },
    },
  });

  if (error) return { ok: false, message: friendlyAuthError(error.message) };
  if (data.session) redirect('/dashboard');
  redirect('/login?registered=1');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/');
}

export async function saveSchoolProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, message: 'Beberapa bagian profil belum valid.', fieldErrors: fieldErrors(parsed.error) };
  }

  const { supabase, userId } = await authContext();
  const current = await schoolForUser(userId);
  const context: SchoolContext = {
    ...current.context,
    address: parsed.data.address,
    village: parsed.data.village,
    district: parsed.data.district,
    city: parsed.data.city,
    province: parsed.data.province,
    postalCode: parsed.data.postalCode,
    email: parsed.data.email,
    phone: parsed.data.phone,
    website: parsed.data.website,
    vision: parsed.data.vision,
    mission: parsed.data.mission,
    goals: parsed.data.goals,
    studentCount: parsed.data.studentCount,
    teacherCount: parsed.data.teacherCount,
    staffCount: parsed.data.staffCount,
    rombelCount: parsed.data.rombelCount,
    strengths: lines(parsed.data.strengths),
    challenges: lines(parsed.data.challenges),
    priorities: lines(parsed.data.priorities),
    raporNotes: parsed.data.raporNotes,
  };

  const [profileResult, schoolResult] = await Promise.all([
    supabase
      .from('kepsek_profiles')
      .update({ principal_name: parsed.data.principalName, phone: parsed.data.principalPhone || null })
      .eq('user_id', userId),
    supabase
      .from('kepsek_schools')
      .update({
        name: parsed.data.schoolName,
        npsn: parsed.data.npsn || null,
        level: parsed.data.level,
        status: parsed.data.status,
        academic_year: parsed.data.academicYear,
        school_context: context,
      })
      .eq('id', current.id),
  ]);

  if (profileResult.error || schoolResult.error) {
    return { ok: false, message: 'Profil belum dapat disimpan. Silakan coba kembali.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/profil-sekolah');
  revalidatePath('/generator');
  return { ok: true, message: 'Profil sekolah berhasil diperbarui.' };
}

export async function savePlanningItemsAction(items: PlanningItem[]): Promise<ActionState> {
  const parsed = z.array(planningItemSchema).max(120).safeParse(items);
  if (!parsed.success) return { ok: false, message: 'Data program kerja belum valid.' };
  const { userId } = await authContext();
  const { supabase, id, context } = await schoolForUser(userId);
  const result = await supabase
    .from('kepsek_schools')
    .update({ school_context: { ...context, planningItems: parsed.data } })
    .eq('id', id);
  if (result.error) return { ok: false, message: 'Program kerja belum dapat disimpan.' };
  revalidatePath('/program-kerja');
  revalidatePath('/kinerja');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Program kerja berhasil disimpan.' };
}

export async function saveAttendanceAction(items: AttendanceEntry[]): Promise<ActionState> {
  const parsed = z.array(attendanceSchema).max(60).safeParse(items);
  if (!parsed.success) return { ok: false, message: 'Ringkasan kehadiran belum valid.' };
  const { userId } = await authContext();
  const { supabase, id, context } = await schoolForUser(userId);
  const sorted = parsed.data.toSorted((a, b) => b.month.localeCompare(a.month));
  const result = await supabase
    .from('kepsek_schools')
    .update({ school_context: { ...context, attendance: sorted } })
    .eq('id', id);
  if (result.error) return { ok: false, message: 'Data kehadiran belum dapat disimpan.' };
  revalidatePath('/kehadiran');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Ringkasan kehadiran berhasil disimpan.' };
}

export async function saveQualityIndicatorsAction(
  indicators: SchoolContext['raporIndicators'],
  raporNotes: string,
): Promise<ActionState> {
  const parsed = z.object({
    indicators: z.array(qualityIndicatorSchema).max(30),
    raporNotes: z.string().trim().max(6000),
  }).safeParse({ indicators: indicators ?? [], raporNotes });
  if (!parsed.success) return { ok: false, message: 'Indikator mutu belum valid.' };

  const { userId } = await authContext();
  const { supabase, id, context } = await schoolForUser(userId);
  const result = await supabase
    .from('kepsek_schools')
    .update({
      school_context: {
        ...context,
        raporIndicators: parsed.data.indicators,
        raporNotes: parsed.data.raporNotes,
      },
    })
    .eq('id', id);
  if (result.error) return { ok: false, message: 'Data mutu belum dapat disimpan.' };
  revalidatePath('/analisis-mutu');
  revalidatePath('/dashboard');
  revalidatePath('/generator');
  return { ok: true, message: 'Data mutu dan PBD berhasil disimpan.' };
}

export async function saveGenerationContentAction(
  generationId: string,
  body: string,
): Promise<ActionState> {
  if (!z.uuid().safeParse(generationId).success || body.trim().length < 20 || body.length > 200_000) {
    return { ok: false, message: 'Isi dokumen belum valid.' };
  }
  const { supabase, userId } = await authContext();
  const current = await supabase
    .from('kepsek_generations')
    .select('content')
    .eq('id', generationId)
    .eq('user_id', userId)
    .single();
  if (current.error || !current.data?.content) {
    return { ok: false, message: 'Versi dokumen tidak ditemukan.' };
  }

  const content = current.data.content as GenerationContent;
  const result = await supabase
    .from('kepsek_generations')
    .update({ content: { ...content, body: body.trim(), editedAt: new Date().toISOString() } })
    .eq('id', generationId)
    .eq('user_id', userId);
  if (result.error) return { ok: false, message: 'Perubahan dokumen belum dapat disimpan.' };
  revalidatePath('/dokumen');
  return { ok: true, message: 'Perubahan dokumen tersimpan.' };
}
