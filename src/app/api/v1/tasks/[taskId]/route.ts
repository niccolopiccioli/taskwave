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
  return { supabase, workspaceId: (keyRows[0] as { workspace_id: string | null }).workspace_id };
}

async function taskInWorkspace(
  supabase: ReturnType<typeof createClient<Database>>,
  taskId: string,
  workspaceId: string
) {
  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, column_id, assignee_id, priority, due_date, position')
    .eq('id', taskId)
    .single();
  if (!task) return null;

  const { data: column } = await supabase
    .from('columns')
    .select('board_id')
    .eq('id', task.column_id)
    .single();
  if (!column) return null;

  const { data: board } = await supabase
    .from('boards')
    .select('workspace_id')
    .eq('id', column.board_id)
    .single();

  if (!board || board.workspace_id !== workspaceId) return null;
  return task;
}

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const ctx = await getAuthContext(request);
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const task = await taskInWorkspace(ctx.supabase, params.taskId, ctx.workspaceId);
  if (!task) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });

  return NextResponse.json({ task });
}

export async function PATCH(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const ctx = await getAuthContext(request);
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const existing = await taskInWorkspace(ctx.supabase, params.taskId, ctx.workspaceId);
  if (!existing) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });

  const body = (await request.json()) as {
    title?: string;
    priority?: 'low' | 'medium' | 'high';
    assignee_id?: string | null;
    due_date?: string | null;
  };

  const { data, error } = await ctx.supabase
    .from('tasks')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.taskId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ task: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  const ctx = await getAuthContext(request);
  if (!ctx?.workspaceId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const existing = await taskInWorkspace(ctx.supabase, params.taskId, ctx.workspaceId);
  if (!existing) return NextResponse.json({ error: 'Task non trovato' }, { status: 404 });

  const { error } = await ctx.supabase.from('tasks').delete().eq('id', params.taskId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
