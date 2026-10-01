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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId obbligatorio' },
        { status: 400 }
      );
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const emptyReport = {
      total_hours: 0,
      per_user: [] as Array<{
        user_id: string;
        name: string;
        hours: number;
      }>,
      per_day: [] as Array<{ date: string; hours: number }>,
    };

    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (!boards?.length) {
      return NextResponse.json(emptyReport);
    }

    const { data: columns } = await supabase
      .from('columns')
      .select('id')
      .in(
        'board_id',
        boards.map((b) => b.id)
      );

    if (!columns?.length) {
      return NextResponse.json(emptyReport);
    }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id')
      .in(
        'column_id',
        columns.map((c) => c.id)
      );

    if (!tasks?.length) {
      return NextResponse.json(emptyReport);
    }

    const taskIds = tasks.map((t) => t.id);

    let query = supabase.from('time_entries').select('*').in('task_id', taskIds);

    if (dateFrom) {
      query = query.gte('started_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('started_at', dateTo);
    }

    const { data: entries, error } = await query;

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

    let totalSeconds = 0;
    const userSeconds = new Map<string, number>();
    const daySeconds = new Map<string, number>();

    for (const entry of entries || []) {
      const duration = entry.duration_seconds || 0;
      totalSeconds += duration;

      userSeconds.set(
        entry.user_id,
        (userSeconds.get(entry.user_id) || 0) + duration
      );

      const day = entry.started_at.slice(0, 10);
      daySeconds.set(day, (daySeconds.get(day) || 0) + duration);
    }

    const total_hours = Math.round((totalSeconds / 3600) * 100) / 100;

    const per_user = Array.from(userSeconds.entries())
      .map(([userId, seconds]) => {
        const profile = profileMap.get(userId);
        return {
          user_id: userId,
          name:
            profile?.full_name || profile?.email || 'Sconosciuto',
          hours: Math.round((seconds / 3600) * 100) / 100,
        };
      })
      .sort((a, b) => b.hours - a.hours);

    const per_day = Array.from(daySeconds.entries())
      .map(([date, seconds]) => ({
        date,
        hours: Math.round((seconds / 3600) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      total_hours,
      per_user,
      per_day,
    });
  } catch (error) {
    console.error('Time report error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore generazione report',
      },
      { status: 500 }
    );
  }
}
