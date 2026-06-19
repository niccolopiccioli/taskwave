import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = (await request.json()) as {
      notify_email?: boolean;
      notify_assigned?: boolean;
      notify_comments?: boolean;
      notify_moves?: boolean;
    };

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...(body.notify_email !== undefined ? { notify_email: body.notify_email } : {}),
        ...(body.notify_assigned !== undefined ? { notify_assigned: body.notify_assigned } : {}),
        ...(body.notify_comments !== undefined ? { notify_comments: body.notify_comments } : {}),
        ...(body.notify_moves !== undefined ? { notify_moves: body.notify_moves } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('notify_email, notify_assigned, notify_comments, notify_moves')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ preferences: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
