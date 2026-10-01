import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyStepUpCookie } from '@/lib/step-up';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      applyStepUpCookie(response);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
