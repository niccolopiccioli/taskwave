import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';

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
  { params }: { params: { id: string; filterId: string } }
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
      filter_config?: Record<string, unknown>;
    };

    const updates: {
      updated_at: string;
      name?: string;
      filter_config?: Json;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (body.name !== undefined) updates.name = body.name;
    if (body.filter_config !== undefined) updates.filter_config = body.filter_config as Json;

    const { data: existing } = await supabase
      .from('saved_filters')
      .select('id, user_id')
      .eq('id', params.filterId)
      .eq('workspace_id', params.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Filtro non trovato' }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Puoi modificare solo i tuoi filtri salvati' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('saved_filters')
      .update(updates)
      .eq('id', params.filterId)
      .eq('workspace_id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ filter: data });
  } catch (error) {
    console.error('Update saved filter error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore aggiornamento filtro' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; filterId: string } }
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

    const { error } = await supabase
      .from('saved_filters')
      .delete()
      .eq('id', params.filterId)
      .eq('workspace_id', params.id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete saved filter error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore eliminazione filtro' },
      { status: 500 }
    );
  }
}
