import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function hashKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

async function getAuthContext(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: keyRows } = await supabase.rpc('validate_api_key', {
    p_key_hash: hashKey(authHeader.slice(7)),
  });

  if (!keyRows?.length) return null;
  const row = keyRows[0] as { workspace_id: string | null };
  if (!row.workspace_id) return null;

  return { supabase, workspaceId: row.workspace_id };
}

export async function GET(
  request: Request,
  { params }: { params: { boardId: string } }
) {
  const ctx = await getAuthContext(request);
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const { supabase } = ctx;
  const { data: board } = await supabase
    .from('boards')
    .select('id, name, description, workspace_id, created_at')
    .eq('id', params.boardId)
    .single();

  if (!board) return NextResponse.json({ error: 'Board non trovata' }, { status: 404 });

  const { data: columns } = await supabase
    .from('columns')
    .select('id, name, position')
    .eq('board_id', params.boardId)
    .order('position');

  const columnIds = (columns || []).map((c) => c.id);
  let tasks: unknown[] = [];

  if (columnIds.length) {
    const { data } = await supabase
      .from('tasks')
      .select('id, title, priority, column_id, assignee_id, due_date, position, created_at')
      .in('column_id', columnIds)
      .order('position');
    tasks = data ?? [];
  }

  return NextResponse.json({ board, columns: columns ?? [], tasks });
}
