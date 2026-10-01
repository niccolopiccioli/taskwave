import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
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

    if (!workspace || (workspace.owner_id !== user.id && !member)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('git_connections')
      .select('id, provider, repo_full_name, webhook_id, created_at')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ connections: data ?? [] });
  } catch (error) {
    console.error('List git connections error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel recupero delle connessioni' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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
        { error: 'Solo admin o proprietari possono connettere repository' },
        { status: 403 }
      );
    }

    const { provider, repo_full_name } = (await request.json()) as {
      provider?: string;
      repo_full_name?: string;
    };

    if (!provider?.trim() || !repo_full_name?.trim()) {
      return NextResponse.json(
        { error: 'Provider e nome repository obbligatori' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo_full_name.trim())) {
      return NextResponse.json(
        { error: 'Formato repository non valido. Usa owner/repo' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('git_connections')
      .select('id')
      .eq('workspace_id', params.id)
      .eq('provider', provider.trim())
      .eq('repo_full_name', repo_full_name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Questo repository è già connesso al workspace' },
        { status: 409 }
      );
    }

    const { data: connection, error } = await supabase
      .from('git_connections')
      .insert({
        workspace_id: params.id,
        provider: provider.trim(),
        repo_full_name: repo_full_name.trim(),
        access_token_encrypted: 'placeholder',
        created_by: user.id,
      })
      .select('id, provider, repo_full_name, webhook_id, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { auditLog } = await import('@/lib/audit');
    await auditLog(supabase, params.id, 'git.connection.created', 'git_connection', connection.id, {
      provider: provider.trim(),
      repo: repo_full_name.trim(),
    });

    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    console.error('Create git connection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella connessione del repository' },
      { status: 500 }
    );
  }
}
