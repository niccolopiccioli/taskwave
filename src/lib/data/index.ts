import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  Profile,
  WorkspaceWithMembers,
  BoardWithColumns,
  TaskPriority,
} from '@/lib/database.types';

type Client = SupabaseClient<Database>;

const DEFAULT_COLUMNS = ['Da Fare', 'In Progress', 'Fatto'];

export async function getProfile(supabase: Client): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) return null;
  return data;
}

export async function getWorkspaces(
  supabase: Client
): Promise<WorkspaceWithMembers[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id);

  if (!memberships?.length) return [];

  const workspaceIds = memberships.map((m) => m.workspace_id);

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('*')
    .in('id', workspaceIds)
    .order('created_at', { ascending: false });

  if (!workspaces) return [];

  const result: WorkspaceWithMembers[] = [];

  for (const ws of workspaces) {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', ws.id);

    const membersWithProfiles = await Promise.all(
      (members || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', member.user_id)
          .single();
        return { ...member, profile: profile! };
      })
    );

    result.push({ ...ws, members: membersWithProfiles.filter((m) => m.profile) });
  }

  return result;
}

export async function createWorkspace(
  supabase: Client,
  name: string,
  description = ''
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  // #region agent log
  fetch('http://127.0.0.1:7830/ingest/287043ce-c603-431d-889d-2f262003b458', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7e0774' },
    body: JSON.stringify({
      sessionId: '7e0774',
      runId: 'workspace-create',
      hypothesisId: 'H1-H3',
      location: 'lib/data/index.ts:createWorkspace:before-insert',
      message: 'Creating workspace',
      data: { hasUser: true, userIdPrefix: user.id.slice(0, 8) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name, description, owner_id: user.id })
    .select()
    .single();

  // #region agent log
  fetch('http://127.0.0.1:7830/ingest/287043ce-c603-431d-889d-2f262003b458', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '7e0774' },
    body: JSON.stringify({
      sessionId: '7e0774',
      runId: 'workspace-create',
      hypothesisId: 'H2-H6',
      location: 'lib/data/index.ts:createWorkspace:after-insert',
      message: 'Workspace insert result',
      data: {
        ok: !error,
        errorCode: error?.code ?? null,
        errorMessage: error?.message ?? null,
        hasWorkspace: Boolean(workspace?.id),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (error) throw new Error(error.message);

  return workspace;
}

export async function inviteMemberByEmail(
  supabase: Client,
  workspaceId: string,
  email: string
) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (profileError || !profile) {
    throw new Error('Utente non trovato. Deve registrarsi prima.');
  }

  const { error } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: profile.id,
    role: 'member',
  });

  if (error) {
    if (error.code === '23505') throw new Error('Utente già membro del workspace.');
    throw new Error(error.message);
  }
}

export async function getBoards(supabase: Client, workspaceId: string) {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const boards = data || [];
  const withColumns = await Promise.all(
    boards.map(async (board) => {
      const { data: columns } = await supabase
        .from('columns')
        .select('id, name')
        .eq('board_id', board.id);
      return { ...board, columns: columns || [] };
    })
  );

  return withColumns;
}

export async function createBoard(
  supabase: Client,
  workspaceId: string,
  name: string,
  description = ''
) {
  const { data: board, error } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name, description })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const columnInserts = DEFAULT_COLUMNS.map((colName, index) => ({
    board_id: board.id,
    name: colName,
    position: index,
  }));

  await supabase.from('columns').insert(columnInserts);

  return board;
}

export async function getBoardWithColumns(
  supabase: Client,
  boardId: string
): Promise<BoardWithColumns | null> {
  const { data: board, error } = await supabase
    .from('boards')
    .select('*')
    .eq('id', boardId)
    .single();

  if (error || !board) return null;

  const { data: columns } = await supabase
    .from('columns')
    .select('*')
    .eq('board_id', boardId)
    .order('position');

  const columnsWithTasks = await Promise.all(
    (columns || []).map(async (column) => {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('column_id', column.id)
        .order('position');

      const tasksWithAssignee = await Promise.all(
        (tasks || []).map(async (task) => {
          let assignee = null;
          if (task.assignee_id) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', task.assignee_id)
              .single();
            assignee = data;
          }
          return { ...task, assignee };
        })
      );

      return { ...column, tasks: tasksWithAssignee };
    })
  );

  return { ...board, columns: columnsWithTasks };
}

export async function createTask(
  supabase: Client,
  columnId: string,
  title: string,
  priority: TaskPriority = 'medium'
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('column_id', columnId)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing?.length ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      column_id: columnId,
      title,
      priority,
      position,
      created_by_id: user?.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function moveTask(
  supabase: Client,
  taskId: string,
  targetColumnId: string
) {
  const { data: existing } = await supabase
    .from('tasks')
    .select('position')
    .eq('column_id', targetColumnId)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing?.length ? existing[0].position + 1 : 0;

  const { error } = await supabase
    .from('tasks')
    .update({ column_id: targetColumnId, position })
    .eq('id', taskId);

  if (error) throw new Error(error.message);
}

export async function getWorkspaceStats(supabase: Client, workspaceId: string) {
  const { data: boards } = await supabase
    .from('boards')
    .select('id')
    .eq('workspace_id', workspaceId);

  if (!boards?.length) {
    return { total: 0, inProgress: 0, done: 0, boardCount: 0 };
  }

  const boardIds = boards.map((b) => b.id);
  const { data: columns } = await supabase
    .from('columns')
    .select('id, name, board_id')
    .in('board_id', boardIds);

  if (!columns?.length) {
    return { total: 0, inProgress: 0, done: 0, boardCount: boards.length };
  }

  const columnIds = columns.map((c) => c.id);
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, column_id')
    .in('column_id', columnIds);

  const columnMap = new Map(columns.map((c) => [c.id, c.name.toLowerCase()]));
  let inProgress = 0;
  let done = 0;

  for (const task of tasks || []) {
    const colName = columnMap.get(task.column_id) || '';
    if (colName.includes('progress') || colName.includes('corso')) inProgress++;
    if (colName.includes('fatto') || colName.includes('done')) done++;
  }

  return {
    total: tasks?.length || 0,
    inProgress,
    done,
    boardCount: boards.length,
  };
}
