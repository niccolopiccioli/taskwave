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
      .from('labels')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ labels: data ?? [] });
  } catch (error) {
    console.error('List labels error:', error);
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
      color?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('labels')
      .insert({
        workspace_id: params.id,
        name: body.name.trim(),
        color: body.color || '#6366f1',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ label: data });
  } catch (error) {
    console.error('Create label error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore creazione etichetta' },
      { status: 500 }
    );
  }
}
