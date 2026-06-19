import { NextResponse } from 'next/server';
import { sendResendEmail, contactFormEmailHtml } from '@/lib/email/resend';
import { CONTACT_EMAIL } from '@/lib/brand';
import { checkRateLimit } from '@/lib/rate-limit-request';
import { captureException } from '@/lib/monitoring';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 'contact-form', 5, 60_000)) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra un minuto.' },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const subject = body.subject?.trim() || 'Messaggio dal sito TaskWave';
    const message = body.message?.trim();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Compila tutti i campi obbligatori.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email non valida.' }, { status: 400 });
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Messaggio troppo lungo.' }, { status: 400 });
    }

    await sendResendEmail({
      to: CONTACT_EMAIL,
      subject: `[TaskWave] ${subject}`,
      html: contactFormEmailHtml({ name, email, subject, message }),
    });

    await sendResendEmail({
      to: email,
      subject: 'Abbiamo ricevuto il tuo messaggio — TaskWave',
      html: `<p>Ciao ${name},</p><p>Grazie per averci scritto. Il team TaskWave risponderà entro 24–48 ore lavorative.</p><p style="color:#71717a;font-size:13px;">TaskWave</p>`,
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    await captureException(error, { route: '/api/contact' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invio non riuscito' },
      { status: 500 }
    );
  }
}
