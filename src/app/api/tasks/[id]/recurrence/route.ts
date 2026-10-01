import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskWorkspaceId } from '@/lib/task-workspace';

export async function POST(
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

    const { data: task } = await supabase
      .from('tasks')
      .select('recurrence_rule, completed_at')
      .eq('id', params.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    if (!task.recurrence_rule) {
      return NextResponse.json(
        { error: 'Questo task non ha una regola di ricorrenza' },
        { status: 400 }
      );
    }

    const { data: newTaskId, error } = await supabase.rpc('generate_next_recurrence', {
      p_task_id: params.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ nextTaskId: newTaskId });
  } catch (error) {
    console.error('Generate recurrence error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore generazione ricorrenza' },
      { status: 500 }
    );
  }
}
