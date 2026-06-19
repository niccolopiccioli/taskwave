import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getClientIp, hashIp, privacyCookieHeader } from '@/lib/privacy/ip';
import { sendResendEmail } from '@/lib/email/resend';
import { checkRateLimit } from '@/lib/rate-limit-request';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 'privacy-opt-out', 5, 60_000)) {
      return NextResponse.json({ error: 'Troppe richieste. Riprova tra un minuto.' }, { status: 429 });
    }

    const body = (await request.json()) as {
      email?: string;
      sessionOnly?: boolean;
    };

    const ip = getClientIp(request);
    const ipHash = ip ? hashIp(ip) : null;

    if (body.sessionOnly) {
      const response = NextResponse.json({ ok: true, mode: 'session' });
      response.headers.append('Set-Cookie', privacyCookieHeader());
      response.cookies.set('tw_cookie_consent', 'essential', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
      if (ipHash) {
        const service = await createServiceClient();
        await service.rpc('upsert_privacy_by_ip_hash', {
          p_ip_hash: ipHash,
          p_analytics_opt_out: true,
          p_marketing_opt_out: true,
          p_ip_tracking_opt_out: true,
          p_source: 'session',
        });
      }
      return response;
    }

    if (!body.email?.trim()) {
      return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const service = await createServiceClient();
    const { data: reqRow, error } = await service
      .from('privacy_requests')
      .insert({
        email,
        user_id: user?.id ?? null,
        request_type: 'opt_out',
        ip_hash: ipHash,
        metadata: { ip_tracking: true, analytics: true, marketing: true },
      })
      .select('id, token')
      .single();

    if (error || !reqRow) {
      return NextResponse.json({ error: error?.message || 'Errore richiesta' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const confirmUrl = `${appUrl}/api/privacy/confirm/${reqRow.token}`;

    await sendResendEmail({
      to: email,
      subject: 'Conferma opt-out privacy TaskWave',
      html: `<p>Clicca per confermare l'opt-out dal tracciamento IP e analytics:</p><p><a href="${confirmUrl}">Conferma opt-out</a></p><p>ID richiesta: ${reqRow.id}</p>`,
    });

    return NextResponse.json({
      ok: true,
      requestId: reqRow.id,
      message: 'Controlla la tua email per confermare.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
