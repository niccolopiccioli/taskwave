import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { workspaceId } = (await request.json()) as { workspaceId?: string };

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'ID workspace obbligatorio' },
        { status: 400 }
      );
    }

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role, workspace_id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (!workspace || (workspace.owner_id !== user.id && !member)) {
      return NextResponse.json({ error: 'Accesso negato al workspace' }, { status: 403 });
    }

    const { data: template } = await supabase
      .from('published_templates')
      .select('id, name, board_config, downloads, is_public')
      .eq('id', params.templateId)
      .single();

    if (!template) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 });
    }

    const rawConfig = template.board_config as Record<string, unknown>;
    const boardConfig: {
      name?: string;
      columns: Array<{ name: string; tasks: Array<{ title: string; priority?: string }> }>;
    } = { columns: [] };

    if (rawConfig.columns) {
      if (Array.isArray(rawConfig.columns) && rawConfig.columns.length > 0 && typeof rawConfig.columns[0] === 'string') {
        const colNames = rawConfig.columns as string[];
        const seedTasks = (rawConfig.seedTasks as Array<{ title: string; column: number; priority?: string }>) || [];
        boardConfig.columns = colNames.map((name, i) => ({
          name,
          tasks: seedTasks
            .filter((st) => st.column === i)
            .map((st) => ({ title: st.title, priority: st.priority })),
        }));
      } else {
        boardConfig.columns = (rawConfig.columns as Array<{ name: string; tasks?: Array<{ title: string; priority?: string }> }>).map((c) => ({
          name: c.name,
          tasks: c.tasks || [],
        }));
      }
    }

    const boardName = (rawConfig.name as string) || template.name;

    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        workspace_id: workspaceId,
        name: boardName,
        description: `Creato dal template "${template.name}"`,
        default_view: 'kanban',
      })
      .select('id')
      .single();

    if (boardError) {
      return NextResponse.json({ error: boardError.message }, { status: 400 });
    }

    const columns = boardConfig.columns;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const { data: column, error: colError } = await supabase
        .from('columns')
        .insert({
          board_id: board.id,
          name: col.name,
          position: i,
        })
        .select('id')
        .single();

      if (colError) continue;

      const tasks = col.tasks || [];
      for (let j = 0; j < tasks.length; j++) {
        const task = tasks[j];
        await supabase.from('tasks').insert({
          column_id: column!.id,
          title: task.title,
          priority: (task.priority as 'low' | 'medium' | 'high') || 'medium',
          position: j,
          created_by_id: user.id,
          tags: [],
          checklist: [] as Json,
        });
      }
    }

    const serviceClient = await createServiceClient();
    await serviceClient.rpc('increment_template_downloads', {
      p_template_id: params.templateId,
    });

    const { auditLog } = await import('@/lib/audit');
    await auditLog(supabase, workspaceId, 'template.cloned', 'published_template', params.templateId, {
      board_id: board.id,
      template_name: template.name,
    });

    return NextResponse.json({
      ok: true,
      board: { id: board.id, name: boardName },
      message: `Template "${template.name}" clonato con successo`,
    });
  } catch (error) {
    console.error('Clone template error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella clonazione del template' },
      { status: 500 }
    );
  }
}
