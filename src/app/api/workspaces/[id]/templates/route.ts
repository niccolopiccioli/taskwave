import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', params.id)
      .single();

    const isOwner = workspace?.owner_id === user.id;
    const isAdmin = member?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Solo admin o proprietari possono pubblicare template' },
        { status: 403 }
      );
    }

    const { name, description, category, tags, boardId } = (await request.json()) as {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      boardId?: string;
    };

    if (!name?.trim() || !boardId?.trim()) {
      return NextResponse.json(
        { error: 'Nome e ID board obbligatori' },
        { status: 400 }
      );
    }

    const { data: board } = await supabase
      .from('boards')
      .select('id, name, workspace_id')
      .eq('id', boardId)
      .eq('workspace_id', params.id)
      .single();

    if (!board) {
      return NextResponse.json({ error: 'Board non trovata' }, { status: 404 });
    }

    const { data: columns } = await supabase
      .from('columns')
      .select('id, name, position')
      .eq('board_id', board.id)
      .order('position', { ascending: true });

    if (!columns?.length) {
      return NextResponse.json({ error: 'La board non ha colonne' }, { status: 400 });
    }

    const serializedColumns: Array<{
      name: string;
      tasks: Array<{ title: string; priority: string }>;
    }> = [];

    for (const col of columns) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, priority')
        .eq('column_id', col.id)
        .order('position', { ascending: true })
        .limit(50);

      serializedColumns.push({
        name: col.name,
        tasks: (tasks ?? []).map((t) => ({
          title: t.title,
          priority: t.priority,
        })),
      });
    }

    const boardConfig: Json = {
      name: board.name,
      columns: serializedColumns,
    };

    const { data: template, error } = await supabase
      .from('published_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || '',
        category: category?.trim() || 'other',
        tags: tags ?? [],
        icon: 'layout-template',
        board_config: boardConfig,
        author_id: user.id,
        is_verified: false,
        is_public: true,
      })
      .select('id, name, description, category, tags, icon, author_id, downloads, is_verified, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { auditLog } = await import('@/lib/audit');
    await auditLog(supabase, params.id, 'template.published', 'published_template', template.id, {
      template_name: name.trim(),
      board_id: board.id,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Publish template error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella pubblicazione del template' },
      { status: 500 }
    );
  }
}
