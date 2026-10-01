import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskWorkspaceId } from '@/lib/task-workspace';

async function checkWorkspaceAccess(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  return !!membership || workspace?.owner_id === userId;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const workspaceId = await getTaskWorkspaceId(supabase, params.id);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    if (!(await checkWorkspaceAccess(supabase, user.id, workspaceId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { data: blocking, error: blockingErr } = await supabase
      .from('task_dependencies')
      .select('*, depends_on:depends_on_id(id, title, priority, column_id, due_date, completed_at)')
      .eq('task_id', params.id);

    if (blockingErr) {
      return NextResponse.json({ error: blockingErr.message }, { status: 400 });
    }

    const { data: blockedBy, error: blockedByErr } = await supabase
      .from('task_dependencies')
      .select('*, blocked_task:task_id(id, title, priority, column_id, due_date, completed_at)')
      .eq('depends_on_id', params.id);

    if (blockedByErr) {
      return NextResponse.json({ error: blockedByErr.message }, { status: 400 });
    }

    return NextResponse.json({
      blocking: blocking ?? [],
      blocked_by: blockedBy ?? [],
    });
  } catch (error) {
    console.error('List dependencies error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
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

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = (await request.json()) as {
      dependsOnId?: string;
      depType?: string;
    };

    if (!body.dependsOnId) {
      return NextResponse.json({ error: 'dependsOnId obbligatorio' }, { status: 400 });
    }

    if (body.dependsOnId === params.id) {
      return NextResponse.json(
        { error: 'Un task non può dipendere da sé stesso' },
        { status: 400 }
      );
    }

    const workspaceId = await getTaskWorkspaceId(supabase, params.id);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    if (!(await checkWorkspaceAccess(supabase, user.id, workspaceId))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const dependsOnWorkspaceId = await getTaskWorkspaceId(supabase, body.dependsOnId);
    if (!dependsOnWorkspaceId || dependsOnWorkspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'Il task di dipendenza non appartiene allo stesso workspace' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('task_dependencies')
      .select('id')
      .eq('task_id', params.id)
      .eq('depends_on_id', body.dependsOnId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Questa dipendenza esiste già' },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: params.id,
        depends_on_id: body.dependsOnId,
        dep_type: body.depType || 'blocks',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ dependency: data });
  } catch (error) {
    console.error('Add dependency error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
