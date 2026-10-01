import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; connectionId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    const isOwner = workspace?.owner_id === user.id;
    const isAdmin = member?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Solo admin o proprietari possono rimuovere connessioni' },
        { status: 403 }
      );
    }

    const { data: connection } = await supabase
      .from('git_connections')
      .select('id, provider, repo_full_name')
      .eq('id', params.connectionId)
      .eq('workspace_id', params.id)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connessione non trovata' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('git_connections')
      .delete()
      .eq('id', params.connectionId)
      .eq('workspace_id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    const { auditLog } = await import('@/lib/audit');
    await auditLog(supabase, params.id, 'git.connection.deleted', 'git_connection', params.connectionId, {
      provider: connection.provider,
      repo: connection.repo_full_name,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete git connection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella rimozione della connessione' },
      { status: 500 }
    );
  }
}
