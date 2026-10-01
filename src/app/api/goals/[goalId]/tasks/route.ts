import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskWorkspaceId } from '@/lib/task-workspace';

export async function POST(
  request: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { goalId } = params;
    const { taskId } = (await request.json()) as { taskId?: string };

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId obbligatorio' },
        { status: 400 }
      );
    }

    const { data: goal } = await supabase
      .from('goals')
      .select('workspace_id')
      .eq('id', goalId)
      .single();

    if (!goal) {
      return NextResponse.json({ error: 'Goal non trovato' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', goal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const taskWorkspaceId = await getTaskWorkspaceId(supabase, taskId);

    if (!taskWorkspaceId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    if (taskWorkspaceId !== goal.workspace_id) {
      return NextResponse.json(
        { error: 'Il task non appartiene a questo workspace' },
        { status: 403 }
      );
    }

    const { data: link, error } = await supabase
      .from('task_goals')
      .insert({
        goal_id: goalId,
        task_id: taskId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Il task è già collegato a questo goal' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error('Link task to goal error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore collegamento task al goal',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { goalId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { goalId } = params;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId obbligatorio come query parameter' },
        { status: 400 }
      );
    }

    const { data: goal } = await supabase
      .from('goals')
      .select('workspace_id')
      .eq('id', goalId)
      .single();

    if (!goal) {
      return NextResponse.json({ error: 'Goal non trovato' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', goal.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { error } = await supabase
      .from('task_goals')
      .delete()
      .eq('goal_id', goalId)
      .eq('task_id', taskId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlink task from goal error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore scollegamento task dal goal',
      },
      { status: 500 }
    );
  }
}
