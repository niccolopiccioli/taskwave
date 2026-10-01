import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { taskId } = (await request.json()) as { taskId?: string };

    if (!taskId) {
      return NextResponse.json(
        { error: 'ID task obbligatorio' },
        { status: 400 }
      );
    }

    const { data: task } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    const { data: running } = await supabase
      .from('time_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_running', true)
      .maybeSingle();

    if (running) {
      return NextResponse.json(
        {
          error:
            'Hai già un timer in esecuzione. Fermalo prima di avviarne un altro.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert({
        task_id: taskId,
        user_id: user.id,
        started_at: now,
        is_running: true,
        description: '',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Start timer error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Errore avvio timer',
      },
      { status: 500 }
    );
  }
}
