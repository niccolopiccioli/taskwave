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

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const taskId = searchParams.get('taskId');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (workspaceId) {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
      }
    }

    let query = supabase
      .from('time_entries')
      .select('*, tasks!inner(title)');

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('user_id', user.id);
    }

    if (dateFrom) {
      query = query.gte('started_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('started_at', dateTo);
    }

    if (workspaceId) {
      const { data: boards } = await supabase
        .from('boards')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (!boards?.length) {
        return NextResponse.json({ entries: [] });
      }

      const { data: columns } = await supabase
        .from('columns')
        .select('id')
        .in(
          'board_id',
          boards.map((b) => b.id)
        );

      if (!columns?.length) {
        return NextResponse.json({ entries: [] });
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .in(
          'column_id',
          columns.map((c) => c.id)
        );

      if (!tasks?.length) {
        return NextResponse.json({ entries: [] });
      }

      query = query.in(
        'task_id',
        tasks.map((t) => t.id)
      );
    }

    const { data: entries, error } = await query.order('started_at', {
      ascending: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const userIds = Array.from(
      new Set((entries || []).map((e) => e.user_id))
    );
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    );

    const enriched = (entries || []).map((entry) => ({
      ...entry,
      user_name:
        profileMap.get(entry.user_id)?.full_name ||
        profileMap.get(entry.user_id)?.email ||
        'Sconosciuto',
    }));

    return NextResponse.json({ entries: enriched });
  } catch (error) {
    console.error('Get time entries error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore caricamento time entries',
      },
      { status: 500 }
    );
  }
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

    const { taskId, startedAt, endedAt, description } = (await request.json()) as {
      taskId?: string;
      startedAt?: string;
      endedAt?: string;
      description?: string;
    };

    if (!taskId || !startedAt || !endedAt) {
      return NextResponse.json(
        { error: 'taskId, startedAt e endedAt sono obbligatori' },
        { status: 400 }
      );
    }

    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
    );

    if (durationSeconds < 0) {
      return NextResponse.json(
        {
          error:
            'La data di fine deve essere successiva a quella di inizio',
        },
        { status: 400 }
      );
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        task_id: taskId,
        user_id: user.id,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
        is_running: false,
        description: description || '',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Create time entry error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore creazione time entry',
      },
      { status: 500 }
    );
  }
}
