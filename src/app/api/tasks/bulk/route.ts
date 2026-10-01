import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskWorkspaceId } from '@/lib/task-workspace';
import type { TaskPriority } from '@/lib/database.types';

type BulkAction =
  | 'move'
  | 'assign'
  | 'setPriority'
  | 'setDueDate'
  | 'addLabel'
  | 'archive'
  | 'delete';

interface BulkPayload {
  taskIds?: string[];
  action?: string;
  payload?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = (await request.json()) as BulkPayload;

    if (!body.taskIds?.length) {
      return NextResponse.json({ error: 'taskIds obbligatorio' }, { status: 400 });
    }

    if (!body.action) {
      return NextResponse.json({ error: 'action obbligatoria' }, { status: 400 });
    }

    const taskIds = body.taskIds;
    const action = body.action as BulkAction;
    const payload = body.payload || {};

    const validActions: BulkAction[] = [
      'move',
      'assign',
      'setPriority',
      'setDueDate',
      'addLabel',
      'archive',
      'delete',
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Azione non valida' }, { status: 400 });
    }

    const workspaceIds = new Set<string>();
    for (const taskId of taskIds) {
      const wsId = await getTaskWorkspaceId(supabase, taskId);
      if (!wsId) {
        return NextResponse.json(
          { error: `Task ${taskId} non trovato` },
          { status: 404 }
        );
      }
      workspaceIds.add(wsId);
    }

    for (const wsId of Array.from(workspaceIds)) {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', wsId)
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', wsId)
        .single();

      const isOwner = workspace?.owner_id === user.id;

      if (!membership && !isOwner) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
      }
    }

    let affectedCount = 0;

    switch (action) {
      case 'move': {
        const columnId = payload.columnId as string | undefined;
        if (!columnId) {
          return NextResponse.json({ error: 'columnId obbligatorio' }, { status: 400 });
        }

        const { error } = await supabase
          .from('tasks')
          .update({ column_id: columnId, updated_at: new Date().toISOString() })
          .in('id', taskIds);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        affectedCount = taskIds.length;
        break;
      }

      case 'assign': {
        const userId = payload.userId as string | null;
        const { error } = await supabase
          .from('tasks')
          .update({ assignee_id: userId ?? null, updated_at: new Date().toISOString() })
          .in('id', taskIds);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        affectedCount = taskIds.length;
        break;
      }

      case 'setPriority': {
        const priority = payload.priority as string | undefined;
        if (!priority || !['low', 'medium', 'high'].includes(priority)) {
          return NextResponse.json({ error: 'Priorità non valida' }, { status: 400 });
        }

        const { error } = await supabase
          .from('tasks')
          .update({ priority: priority as TaskPriority, updated_at: new Date().toISOString() })
          .in('id', taskIds);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        affectedCount = taskIds.length;
        break;
      }

      case 'setDueDate': {
        const dueDate = payload.dueDate as string | null | undefined;
        const { error } = await supabase
          .from('tasks')
          .update({ due_date: dueDate ?? null, updated_at: new Date().toISOString() })
          .in('id', taskIds);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        affectedCount = taskIds.length;
        break;
      }

      case 'addLabel': {
        const labelId = payload.labelId as string | undefined;
        if (!labelId) {
          return NextResponse.json({ error: 'labelId obbligatorio' }, { status: 400 });
        }

        const rows = taskIds.map((taskId) => ({
          task_id: taskId,
          label_id: labelId,
        }));

        const { error } = await supabase
          .from('task_labels')
          .upsert(rows, { onConflict: 'task_id,label_id' });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        affectedCount = taskIds.length;
        break;
      }

      case 'archive': {
        const { error } = await supabase
          .from('tasks')
          .update({ updated_at: new Date().toISOString() })
          .in('id', taskIds);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        affectedCount = taskIds.length;
        break;
      }

      case 'delete': {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .in('id', taskIds);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        affectedCount = taskIds.length;
        break;
      }
    }

    return NextResponse.json({ affectedCount });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore operazione bulk' },
      { status: 500 }
    );
  }
}
