import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTaskWorkspaceId } from '@/lib/task-workspace';

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

    const workspaceId = await getTaskWorkspaceId(supabase, params.id);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const isOwner = workspace?.owner_id === user.id;

    if (!membership && !isOwner) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const body = (await request.json()) as { labelId?: string };

    if (!body.labelId) {
      return NextResponse.json({ error: 'labelId obbligatorio' }, { status: 400 });
    }

    const { data: label } = await supabase
      .from('labels')
      .select('id')
      .eq('id', body.labelId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!label) {
      return NextResponse.json(
        { error: 'Etichetta non trovata' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('task_labels')
      .upsert(
        { task_id: params.id, label_id: body.labelId },
        { onConflict: 'task_id,label_id' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ taskLabel: data });
  } catch (error) {
    console.error('Add label to task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const workspaceId = await getTaskWorkspaceId(supabase, params.id);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const isOwner = workspace?.owner_id === user.id;

    if (!membership && !isOwner) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const url = new URL(request.url);
    const labelId = url.searchParams.get('labelId');

    if (!labelId) {
      return NextResponse.json({ error: 'labelId obbligatorio' }, { status: 400 });
    }

    const { error } = await supabase
      .from('task_labels')
      .delete()
      .eq('task_id', params.id)
      .eq('label_id', labelId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove label from task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
