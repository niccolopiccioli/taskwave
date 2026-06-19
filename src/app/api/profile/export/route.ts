import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, joined_at')
      .eq('user_id', user.id);

    const workspaceIds = (memberships || []).map((m) => m.workspace_id);
    let workspaces: unknown[] = [];
    let boards: unknown[] = [];
    let tasks: unknown[] = [];

    if (workspaceIds.length) {
      const { data: ws } = await supabase.from('workspaces').select('*').in('id', workspaceIds);
      workspaces = ws || [];

      const { data: b } = await supabase.from('boards').select('*').in('workspace_id', workspaceIds);
      boards = b || [];

      if (b?.length) {
        const { data: cols } = await supabase
          .from('columns')
          .select('id')
          .in(
            'board_id',
            b.map((x) => x.id)
          );
        if (cols?.length) {
          const { data: t } = await supabase
            .from('tasks')
            .select('id, title, priority, due_date, column_id, created_at')
            .in(
              'column_id',
              cols.map((c) => c.id)
            );
          tasks = t || [];
        }
      }
    }

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      profile,
      memberships,
      workspaces,
      boards,
      tasks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore export' },
      { status: 500 }
    );
  }
}
