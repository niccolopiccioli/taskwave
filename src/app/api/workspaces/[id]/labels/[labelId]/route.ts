import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function checkAccess(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single();

  return !!membership || workspace?.owner_id === userId;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; labelId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    if (!(await checkAccess(supabase, user.id, params.id))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      color?: string;
    };

    const updates: { name?: string; color?: string } = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.color !== undefined) updates.color = body.color;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('labels')
      .update(updates)
      .eq('id', params.labelId)
      .eq('workspace_id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ label: data });
  } catch (error) {
    console.error('Update label error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore aggiornamento etichetta' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; labelId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    if (!(await checkAccess(supabase, user.id, params.id))) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    await supabase
      .from('task_labels')
      .delete()
      .eq('label_id', params.labelId);

    const { error } = await supabase
      .from('labels')
      .delete()
      .eq('id', params.labelId)
      .eq('workspace_id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete label error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore eliminazione etichetta' },
      { status: 500 }
    );
  }
}
