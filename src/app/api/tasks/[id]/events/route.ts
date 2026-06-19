import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { handleTaskEvent, type TaskEventPayload } from '@/lib/task-events';
import { getTaskWorkspaceId } from '@/lib/task-workspace';

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

    const body = (await request.json()) as Omit<TaskEventPayload, 'actorId'>;
    if (!body.type || !body.workspaceId) {
      return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
    }

    const taskWorkspaceId = await getTaskWorkspaceId(supabase, params.id);
    if (!taskWorkspaceId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    if (taskWorkspaceId !== body.workspaceId) {
      return NextResponse.json({ error: 'Workspace non valido per questo task' }, { status: 403 });
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('id, assignee_id, title')
      .eq('id', params.id)
      .single();

    if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });

    const serviceClient = await createServiceClient();
    await handleTaskEvent(serviceClient, params.id, {
      ...body,
      actorId: user.id,
      taskTitle: body.taskTitle || task.title,
      assigneeId: body.assigneeId ?? task.assignee_id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
