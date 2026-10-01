import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { entryId: string } }
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
      description?: string;
      started_at?: string;
      ended_at?: string;
    };

    const { entryId } = params;

    const { data: existing } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Time entry non trovata' },
        { status: 404 }
      );
    }

    const updates: {
      description?: string;
      started_at?: string;
      ended_at?: string;
      duration_seconds?: number;
    } = {};
    if (body.description !== undefined) updates.description = body.description;
    if (body.started_at !== undefined) updates.started_at = body.started_at;
    if (body.ended_at !== undefined) updates.ended_at = body.ended_at;

    const newStarted = body.started_at || existing.started_at;
    const newEnded = body.ended_at || existing.ended_at;
    if (newStarted && newEnded) {
      updates.duration_seconds = Math.floor(
        (new Date(newEnded).getTime() - new Date(newStarted).getTime()) / 1000
      );
    }

    const { data: entry, error } = await supabase
      .from('time_entries')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updates as any)
      .eq('id', entryId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Update time entry error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore aggiornamento time entry',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { entryId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { entryId } = params;

    const { data: existing } = await supabase
      .from('time_entries')
      .select('id')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Time entry non trovata' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete time entry error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore eliminazione time entry',
      },
      { status: 500 }
    );
  }
}
