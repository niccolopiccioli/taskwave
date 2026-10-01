import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      is_private?: boolean;
      accent_color?: string | null;
    };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (body.is_private !== undefined && profile?.plan !== 'business') {
      return NextResponse.json(
        { error: 'I workspace privati richiedono il piano Business.' },
        { status: 403 }
      );
    }

    if (body.accent_color !== undefined && profile?.plan === 'free') {
      return NextResponse.json(
        { error: 'L\'accent color richiede il piano Pro o Business.' },
        { status: 403 }
      );
    }

    const updates: {
      updated_at: string;
      name?: string;
      description?: string;
      is_private?: boolean;
      accent_color?: string | null;
    } = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.description !== undefined) updates.description = body.description;
    if (body.is_private !== undefined) updates.is_private = body.is_private;
    if (body.accent_color !== undefined) updates.accent_color = body.accent_color;

    const { data, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workspace: data });
  } catch (error) {
    console.error('Update workspace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore aggiornamento workspace' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { error } = await supabase.rpc('delete_workspace', {
      p_workspace_id: params.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore eliminazione workspace' },
      { status: 500 }
    );
  }
}
