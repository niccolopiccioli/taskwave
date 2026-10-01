import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: { id: string; goalId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { id: workspaceId, goalId } = params;

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !goal) {
      return NextResponse.json({ error: 'Goal non trovato' }, { status: 404 });
    }

    const { data: children } = await supabase
      .from('goals')
      .select('*')
      .eq('parent_id', goalId)
      .order('created_at', { ascending: true });

    const { data: taskLinks } = await supabase
      .from('task_goals')
      .select('task_id')
      .eq('goal_id', goalId);

    let linkedTasks: Array<{ id: string; title: string }> = [];
    if (taskLinks?.length) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title')
        .in(
          'id',
          taskLinks.map((l) => l.task_id)
        );
      linkedTasks = tasks || [];
    }

    return NextResponse.json({
      goal: {
        ...goal,
        children: children || [],
        tasks: linkedTasks,
      },
    });
  } catch (error) {
    console.error('Get goal error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore caricamento goal',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; goalId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { id: workspaceId, goalId } = params;

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      type?: 'objective' | 'key_result';
      status?: 'active' | 'completed' | 'cancelled' | 'archived';
      parent_id?: string | null;
      target_value?: number;
      current_value?: number;
      unit?: string;
      owner_id?: string | null;
      due_date?: string | null;
    };

    const updates: {
      updated_at: string;
      title?: string;
      description?: string;
      type?: 'objective' | 'key_result';
      status?: 'active' | 'completed' | 'cancelled' | 'archived';
      parent_id?: string | null;
      target_value?: number;
      current_value?: number;
      unit?: string;
      owner_id?: string | null;
      due_date?: string | null;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.status !== undefined) updates.status = body.status;
    if (body.parent_id !== undefined) updates.parent_id = body.parent_id;
    if (body.target_value !== undefined) updates.target_value = body.target_value;
    if (body.current_value !== undefined) updates.current_value = body.current_value;
    if (body.unit !== undefined) updates.unit = body.unit;
    if (body.owner_id !== undefined) updates.owner_id = body.owner_id;
    if (body.due_date !== undefined) updates.due_date = body.due_date;

    const { data: goal, error } = await supabase
      .from('goals')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updates as any)
      .eq('id', goalId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Update goal error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore aggiornamento goal',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; goalId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { id: workspaceId, goalId } = params;

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('workspace_id', workspaceId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete goal error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore eliminazione goal',
      },
      { status: 500 }
    );
  }
}
