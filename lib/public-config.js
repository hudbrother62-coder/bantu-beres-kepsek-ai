// The Supabase URL and publishable key are intentionally safe for browser use.
// Database and Storage access remain protected by Supabase Row Level Security.
export const SUPABASE_URL = "https://kbzcowzhvejhmmbyikqd.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_21lmUR24NXos7Ix0jt74aQ_BMf6aXJE";

export function publicSupabaseSettings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;
  return { url: url.replace(/\/$/, ""), key };
}
