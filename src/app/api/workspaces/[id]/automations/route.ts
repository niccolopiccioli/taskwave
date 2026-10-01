import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';

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

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    const isOwner = workspace?.owner_id === user.id;

    if (!membership && !isOwner) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ rules: data ?? [] });
  } catch (error) {
    console.error('List automations error:', error);
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

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    const isOwner = workspace?.owner_id === user.id;

    if (!membership && !isOwner) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const body = (await request.json()) as {
      name?: string;
      trigger_event?: string;
      conditions?: Record<string, unknown>;
      actions?: Record<string, unknown>[];
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }

    if (!body.trigger_event) {
      return NextResponse.json({ error: 'trigger_event obbligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('automation_rules')
      .insert({
        workspace_id: params.id,
        name: body.name.trim(),
        trigger_event: body.trigger_event,
        conditions: (body.conditions || {}) as Json,
        actions: (body.actions || []) as Json,
        enabled: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ rule: data });
  } catch (error) {
    console.error('Create automation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore creazione automazione' },
      { status: 500 }
    );
  }
}
