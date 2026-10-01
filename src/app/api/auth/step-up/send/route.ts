import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-request';
import {
  generateOtpCode,
  hashOtpCode,
  isStepUpOtpEnabled,
  OTP_TTL_SEC,
  applyStepUpCookie,
  clearStepUpCookie,
} from '@/lib/step-up';
import { sendResendEmail, stepUpOtpEmailHtml } from '@/lib/email/resend';

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

  if (!user?.email) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  if (!checkRateLimit(request, 'step-up-send', 3, 60_000)) {
    return NextResponse.json(
      { error: 'Troppi tentativi. Riprova tra un minuto.' },
      { status: 429 }
    );
  }

  const service = await createServiceClient();
  const code = generateOtpCode();
  const codeHash = hashOtpCode(code, user.id);
  const expiresAt = new Date(Date.now() + OTP_TTL_SEC * 1000).toISOString();

  await service.from('step_up_otp_challenges').delete().eq('user_id', user.id);

  const { error: insertError } = await service.from('step_up_otp_challenges').insert({
    user_id: user.id,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: 'Impossibile generare il codice' }, { status: 500 });
  }

  const emailResult = await sendResendEmail({
    to: user.email,
    subject: 'Il tuo codice TaskWave',
    html: stepUpOtpEmailHtml({ code, expiresMinutes: Math.floor(OTP_TTL_SEC / 60) }),
  });

  if (!emailResult.ok) {
    return NextResponse.json(
      {
        error: emailResult.error,
        hint: 'Configura RESEND_FROM con un dominio verificato per inviare OTP a qualsiasi email.',
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'Codice inviato',
    email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
  });
}

/** Grant step-up window right after password login (no OTP required) */
export async function PUT() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  applyStepUpCookie(response);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearStepUpCookie(response);
  return response;
}
