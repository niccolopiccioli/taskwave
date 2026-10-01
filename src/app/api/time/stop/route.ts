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

    const { entryId } = (await request.json()) as { entryId?: string };

    if (!entryId) {
      return NextResponse.json(
        { error: 'ID entry obbligatorio' },
        { status: 400 }
      );
    }

    const { data: entry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (!entry) {
      return NextResponse.json(
        { error: 'Timer non trovato' },
        { status: 404 }
      );
    }

    if (!entry.is_running) {
      return NextResponse.json(
        { error: 'Questo timer è già stato fermato' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const durationSeconds = Math.floor(
      (new Date(now).getTime() - new Date(entry.started_at).getTime()) / 1000
    );

    const { data: updated, error } = await supabase
      .from('time_entries')
      .update({
        ended_at: now,
        is_running: false,
        duration_seconds: durationSeconds,
      })
      .eq('id', entryId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('Stop timer error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Errore arresto timer',
      },
      { status: 500 }
    );
  }
}
