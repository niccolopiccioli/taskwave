const DEFAULT_FROM = 'TaskWave <onboarding@resend.dev>';

function getFromAddress() {
  return process.env.RESEND_FROM || DEFAULT_FROM;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function sendResendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY non configurata' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: getFromAddress(), to, subject, html }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        typeof data.message === 'string' ? data.message : 'Invio email fallito';
      return { ok: false, error: message };
    }

    return { ok: true, id: typeof data.id === 'string' ? data.id : undefined };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invio email fallito',
    };
  }
}

export function workspaceInviteEmailHtml(opts: {
  workspaceName: string;
  inviterName: string;
  actionUrl: string;
}) {
  const { workspaceName, inviterName, actionUrl } = opts;

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px;">
<tr><td style="color:#fafafa;font-size:20px;font-weight:600;padding-bottom:12px;">Sei invitato in <strong style="color:#2dd4bf;">${workspaceName}</strong></td></tr>
<tr><td style="color:#a1a1aa;font-size:15px;line-height:1.6;padding-bottom:24px;">${inviterName} ti ha invitato nel team. Accetta l'invito per unirti al workspace e collaborare sulle board Kanban.</td></tr>
<tr><td align="center" style="padding-bottom:8px;">
<a href="${actionUrl}" style="display:inline-block;background:#14b8a6;color:#09090b;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;">
Accetta invito
</a></td></tr>
<tr><td style="color:#71717a;font-size:12px;padding-top:24px;text-align:center;">TaskWave — Kanban per team</td></tr>
</table></td></tr></table></body></html>`;
}

export function stepUpOtpEmailHtml(opts: { code: string; expiresMinutes: number }) {
  const { code, expiresMinutes } = opts;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px;">
<tr><td style="color:#fafafa;font-size:20px;font-weight:600;padding-bottom:12px;">Codice di verifica TaskWave</td></tr>
<tr><td style="color:#a1a1aa;font-size:15px;line-height:1.6;padding-bottom:24px;">Per continuare ad usare TaskWave, inserisci questo codice. Scade tra ${expiresMinutes} minuti.</td></tr>
<tr><td align="center" style="padding:16px 0;">
<span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:#2dd4bf;font-family:Courier New,monospace;background:#27272a;padding:16px 28px;border-radius:10px;">${code}</span>
</td></tr>
<tr><td style="color:#71717a;font-size:12px;padding-top:16px;text-align:center;">Non condividerlo con nessuno. Se non hai richiesto tu questo codice, ignora l'email.</td></tr>
</table></td></tr></table></body></html>`;
}

export function contactFormEmailHtml(opts: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const { name, email, subject, message } = opts;
  const safe = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:560px;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:28px;">
<tr><td style="color:#2dd4bf;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding-bottom:8px;">Nuovo messaggio TaskWave</td></tr>
<tr><td style="color:#fafafa;font-size:18px;font-weight:600;padding-bottom:16px;">${safe(subject)}</td></tr>
<tr><td style="color:#a1a1aa;font-size:14px;line-height:1.6;padding-bottom:8px;"><strong style="color:#e4e4e7;">Da:</strong> ${safe(name)} &lt;${safe(email)}&gt;</td></tr>
<tr><td style="color:#e4e4e7;font-size:15px;line-height:1.7;white-space:pre-wrap;padding-top:16px;border-top:1px solid #27272a;">${safe(message)}</td></tr>
</table></td></tr></table></body></html>`;
}
