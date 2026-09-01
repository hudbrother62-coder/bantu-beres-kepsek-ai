export type SchoolLevel = 'TK' | 'SD' | 'SMP' | 'SMA' | 'SMK';
export type SchoolStatus = 'Negeri' | 'Swasta';

export type PlanningStatus = 'Direncanakan' | 'Berjalan' | 'Selesai' | 'Tertunda';

export interface PlanningItem {
  id: string;
  title: string;
  category: 'Program Sekolah' | 'Kinerja' | 'Supervisi' | 'Sosialisasi' | 'Lainnya';
  owner: string;
  startDate: string;
  endDate: string;
  output: string;
  status: PlanningStatus;
  notes: string;
}

export interface AttendanceEntry {
  id: string;
  month: string;
  teacherTotal: number;
  present: number;
  sick: number;
  leave: number;
  absent: number;
  notes: string;
}

export interface SchoolContext {
  address?: string;
  village?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  email?: string;
  phone?: string;
  website?: string;
  vision?: string;
  mission?: string;
  goals?: string;
  studentCount?: number;
  teacherCount?: number;
  staffCount?: number;
  rombelCount?: number;
  strengths?: string[];
  challenges?: string[];
  priorities?: string[];
  raporNotes?: string;
  raporIndicators?: Array<{
    name: string;
    score: number | null;
    trend: 'Naik' | 'Tetap' | 'Turun' | 'Belum diisi';
    note: string;
  }>;
  planningItems?: PlanningItem[];
  attendance?: AttendanceEntry[];
  theme?: 'light' | 'dark' | 'system';
  [key: string]: unknown;
}

export interface KepsekProfile {
  user_id: string;
  principal_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface KepsekSchool {
  id: string;
  owner_user_id: string;
  name: string;
  npsn: string | null;
  level: SchoolLevel;
  status: SchoolStatus;
  academic_year: string;
  school_context: SchoolContext;
  created_at: string;
  updated_at: string;
}

export interface GenerationContent {
  title: string;
  summary: string;
  body: string;
  qualityChecks: string[];
  warnings: string[];
  mode?: 'ai' | 'template';
  editedAt?: string;
}

export interface KepsekGeneration {
  id: string;
  group_id: string;
  user_id: string;
  school_id: string;
  variant_number: number;
  model: string | null;
  key_slot: number | null;
  status: 'pending' | 'completed' | 'error';
  content: GenerationContent | null;
  error_code: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface KepsekGenerationGroup {
  id: string;
  user_id: string;
  school_id: string;
  document_type: string;
  additional_instruction: string;
  settings: Record<string, unknown>;
  prompt_hash: string | null;
  created_at: string;
  kepsek_generations?: KepsekGeneration[];
}

export interface Workspace {
  userId: string;
  email: string;
  profile: KepsekProfile;
  school: KepsekSchool;
}

export interface ActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
