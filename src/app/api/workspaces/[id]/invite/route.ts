import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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
          error: 'Gli inviti al team richiedono il piano Pro o Business. Passa a /pricing per fare upgrade.',
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
    const inviteUrl = `${appUrl}/invite/${token}`;

    const service = await createServiceClient();
    const { data: inviteeProfile } = await service
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    let inAppNotified = false;
    if (inviteeProfile?.id) {
      const { error: notifyError } = await service.rpc('create_notification', {
        p_user_id: inviteeProfile.id,
        p_type: 'invited',
        p_title: `Invito a ${workspace.name}`,
        p_message: `${inviterName} ti ha invitato nel workspace. Apri TaskWave per accettare.`,
        p_task_id: null,
        p_workspace_id: workspaceId,
      });
      inAppNotified = !notifyError;
    }

    const hasAccount = !!inviteeProfile?.id;
    const message = hasAccount
      ? inAppNotified
        ? `${normalizedEmail} ha già un account TaskWave: riceverà una notifica in-app e vedrà l'invito in dashboard.`
        : `${normalizedEmail} ha già un account: vedrà l'invito in dashboard al prossimo accesso.`
      : `Invito creato. Condividi il link con ${normalizedEmail} — dovrà registrarsi con questa email per accettare.`;

    return NextResponse.json({
      ok: true,
      inviteUrl,
      hasAccount,
      inAppNotified,
      message,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Errore durante la creazione dell\'invito',
      },
      { status: 500 }
    );
  }
}
