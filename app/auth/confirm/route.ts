import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') || '/dashboard';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';
  const supabase = await createClient();

  let verified = false;
  if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    verified = !result.error;
  }

  const destination = request.nextUrl.clone();
  destination.pathname = verified ? next : '/login';
  destination.search = verified ? '' : '?error=confirmation';
  return NextResponse.redirect(destination);
}
