import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const workspaceId = url.searchParams.get('workspaceId');
    const priority = url.searchParams.get('priority') || undefined;
    const assigneeId = url.searchParams.get('assigneeId') || undefined;
    const dueBefore = url.searchParams.get('dueBefore') || undefined;
    const dueAfter = url.searchParams.get('dueAfter') || undefined;
    const limit = url.searchParams.get('limit')
      ? parseInt(url.searchParams.get('limit')!, 10)
      : undefined;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId obbligatorio' }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const isOwner = workspace?.owner_id === user.id;

    if (!membership && !isOwner) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('search_workspace_tasks', {
      p_workspace_id: workspaceId,
      p_query: q,
      p_priority: priority,
      p_assignee_id: assigneeId,
      p_due_before: dueBefore,
      p_due_after: dueAfter,
      p_limit: limit ?? 50,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ results: data ?? [] });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore durante la ricerca' },
      { status: 500 }
    );
  }
}
