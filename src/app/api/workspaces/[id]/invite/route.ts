import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendResendEmail, workspaceInviteEmailHtml } from '@/lib/email/resend';
import { checkRateLimit } from '@/lib/rate-limit-request';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!checkRateLimit(request, 'workspace-invite', 10, 60_000)) {
      return NextResponse.json({ error: 'Troppe richieste. Riprova tra un minuto.' }, { status: 429 });
    }

    const workspaceId = params.id;
    const { email } = (await request.json()) as { email?: string };

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan === 'free') {
      return NextResponse.json(
        {
          error: 'Gli inviti email richiedono il piano Pro o Business. Passa a /pricing per fare upgrade.',
        },
        { status: 403 }
      );
    }

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json({ error: 'Workspace non trovato' }, { status: 404 });
    }

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Un membro del team';

    const { data: inviteResult, error: rpcError } = await supabase.rpc('invite_member_by_email', {
      p_workspace_id: workspaceId,
      p_email: normalizedEmail,
    });

    if (!rpcError) {
      const { auditLog } = await import('@/lib/audit');
      await auditLog(supabase, workspaceId, 'member.invited', 'invitation', undefined, {
        email: normalizedEmail,
      });
    }

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    const token = (inviteResult as { token?: string } | null)?.token;
    if (!token) {
      return NextResponse.json({ error: 'Impossibile creare l\'invito' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const actionUrl = `${appUrl}/invite/${token}`;

    await sendResendEmail({
      to: normalizedEmail,
      subject: `Invito al workspace ${workspace.name} su TaskWave`,
      html: workspaceInviteEmailHtml({
        workspaceName: workspace.name,
        inviterName,
        actionUrl,
      }),
    });

    return NextResponse.json({
      emailSent: true,
      message: 'Invito inviato. L\'utente dovrà accettare per entrare nel team.',
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Errore durante l\'invio dell\'invito',
      },
      { status: 500 }
    );
  }
}
