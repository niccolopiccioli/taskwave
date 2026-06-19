import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type Client = SupabaseClient<Database>;

export async function getTaskWorkspaceId(
  supabase: Client,
  taskId: string
): Promise<string | null> {
  const { data: task } = await supabase
    .from('tasks')
    .select('column_id')
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

  return board?.workspace_id ?? null;
}
