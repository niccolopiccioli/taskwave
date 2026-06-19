const FROM = 'TaskFlow Pro <onboarding@resend.dev>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendResendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY non configurata');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data.message === 'string' ? data.message : 'Invio email fallito';
    throw new Error(message);
  }

  return data;
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
<tr><td style="color:#71717a;font-size:12px;padding-top:24px;text-align:center;">TaskFlow Pro — Kanban per team</td></tr>
</table></td></tr></table></body></html>`;
}
