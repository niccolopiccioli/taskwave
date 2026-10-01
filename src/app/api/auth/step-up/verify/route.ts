import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-request';
import { hashOtpCode, applyStepUpCookie, isStepUpOtpEnabled } from '@/lib/step-up';

export async function POST(request: Request) {
  if (!isStepUpOtpEnabled()) {
    return NextResponse.json(
      { error: 'Verifica OTP temporaneamente disabilitata.' },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  if (!checkRateLimit(request, 'step-up-verify', 10, 60_000)) {
    return NextResponse.json({ error: 'Troppi tentativi' }, { status: 429 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'Inserisci un codice a 6 cifre' }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: challenge } = await service
    .from('step_up_otp_challenges')
    .select('id, code_hash, expires_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!challenge) {
    return NextResponse.json({ error: 'Nessun codice attivo. Richiedine uno nuovo.' }, { status: 400 });
  }

  if (new Date(challenge.expires_at) < new Date()) {
    await service.from('step_up_otp_challenges').delete().eq('id', challenge.id);
    return NextResponse.json({ error: 'Codice scaduto. Richiedine uno nuovo.' }, { status: 400 });
  }

  const expected = hashOtpCode(code, user.id);
  if (expected !== challenge.code_hash) {
    return NextResponse.json({ error: 'Codice non valido' }, { status: 400 });
  }

  await service.from('step_up_otp_challenges').delete().eq('user_id', user.id);

  const response = NextResponse.json({ ok: true });
  applyStepUpCookie(response);
  return response;
}
