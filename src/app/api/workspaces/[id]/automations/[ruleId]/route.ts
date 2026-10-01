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
  { params }: { params: { id: string; ruleId: string } }
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
      enabled?: boolean;
      conditions?: Record<string, unknown>;
      actions?: Record<string, unknown>[];
      name?: string;
      trigger_event?: string;
    };

    const updates: {
      updated_at: string;
      enabled?: boolean;
      conditions?: Json;
      actions?: Json;
      name?: string;
      trigger_event?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.conditions !== undefined) updates.conditions = body.conditions as Json;
    if (body.actions !== undefined) updates.actions = body.actions as Json;
    if (body.name !== undefined) updates.name = body.name;
    if (body.trigger_event !== undefined) updates.trigger_event = body.trigger_event;

    const { data, error } = await supabase
      .from('automation_rules')
      .update(updates)
      .eq('id', params.ruleId)
      .eq('workspace_id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ rule: data });
  } catch (error) {
    console.error('Update automation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore aggiornamento automazione' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; ruleId: string } }
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
      .from('automation_rules')
      .delete()
      .eq('id', params.ruleId)
      .eq('workspace_id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete automation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore eliminazione automazione' },
      { status: 500 }
    );
  }
}
