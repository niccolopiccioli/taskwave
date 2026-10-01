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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
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

    const { data, error } = await supabase
      .from('saved_filters')
      .select('*')
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ filters: data ?? [] });
  } catch (error) {
    console.error('List saved filters error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_filters')
      .insert({
        workspace_id: params.id,
        user_id: user.id,
        name: body.name.trim(),
        filter_config: (body.filter_config || {}) as Json,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ filter: data });
  } catch (error) {
    console.error('Save filter error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore salvataggio filtro' },
      { status: 500 }
    );
  }
}
