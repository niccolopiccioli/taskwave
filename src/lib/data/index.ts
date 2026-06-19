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

export async function updateProfile(
  supabase: Client,
  updates: { full_name?: string }
): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
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

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({ name, description, owner_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return workspace;
}

export async function inviteMemberByEmail(
  _supabase: Client,
  workspaceId: string,
  email: string
) {
  const response = await fetch(`/api/workspaces/${workspaceId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Impossibile inviare l\'invito');
  }

  return data as { emailSent: boolean; message: string };
}

export async function listWorkspaceInvitations(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/invitations`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile caricare gli inviti');
  return data.invitations as Array<{
    id: string;
    email: string;
    status: string;
    created_at: string;
    expires_at: string;
  }>;
}

export async function cancelWorkspaceInvitation(workspaceId: string, invitationId: string) {
  const response = await fetch(
    `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
    { method: 'DELETE' }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile annullare l\'invito');
  return data;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile rimuovere il membro');
  return data;
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: 'admin' | 'member'
) {
  const response = await fetch(`/api/workspaces/${workspaceId}/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile aggiornare il ruolo');
  return data;
}

export async function leaveWorkspace(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/leave`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile uscire dal workspace');
  return data;
}

export async function updateWorkspaceApi(
  workspaceId: string,
  updates: {
    name?: string;
    description?: string;
    is_private?: boolean;
    accent_color?: string | null;
  }
) {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile aggiornare il workspace');
  return data.workspace;
}

export async function deleteWorkspaceApi(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile eliminare il workspace');
  return data;
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

      const tasksWithDetails = await Promise.all(
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

          const { data: comments } = await supabase
            .from('comments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at');

          const commentsWithProfiles = await Promise.all(
            (comments || []).map(async (c) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', c.user_id)
                .single();
              return { ...c, profile: profile || undefined };
            })
          );

          const { data: attachments } = await supabase
            .from('task_attachments')
            .select('*')
            .eq('task_id', task.id)
            .order('created_at');

          return {
            ...task,
            assignee,
            comments: commentsWithProfiles,
            attachments: attachments || [],
          };
        })
      );

      return { ...column, tasks: tasksWithDetails };
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

export async function updateTask(
  supabase: Client,
  taskId: string,
  updates: {
    title?: string;
    description?: string;
    priority?: TaskPriority;
    due_date?: string | null;
    assignee_id?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function addComment(supabase: Client, taskId: string, content: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non autenticato');

  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: user.id, content })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createColumn(supabase: Client, boardId: string, name: string) {
  const { data: existing } = await supabase
    .from('columns')
    .select('position')
    .eq('board_id', boardId)
    .order('position', { ascending: false })
    .limit(1);

  const position = existing?.length ? existing[0].position + 1 : 0;

  const { data, error } = await supabase
    .from('columns')
    .insert({ board_id: boardId, name, position })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateColumnName(supabase: Client, columnId: string, name: string) {
  const { data, error } = await supabase
    .from('columns')
    .update({ name })
    .eq('id', columnId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function logAuditEvent(
  supabase: Client,
  workspaceId: string,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await supabase.rpc('log_audit_event', {
    p_workspace_id: workspaceId,
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId || null,
    p_metadata: (metadata || {}) as Record<string, never>,
  });
  if (error) throw new Error(error.message);
}

export async function getAuditLog(supabase: Client, workspaceId: string, limit = 50) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const withActors = await Promise.all(
    (data || []).map(async (entry) => {
      if (!entry.actor_id) return { ...entry, actor: null };
      const { data: actor } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', entry.actor_id)
        .single();
      return { ...entry, actor };
    })
  );

  return withActors;
}

export async function getWorkspaceAnalytics(supabase: Client, workspaceId: string) {
  const stats = await getWorkspaceStats(supabase, workspaceId);
  const { data: boards } = await supabase
    .from('boards')
    .select('id, name, created_at')
    .eq('workspace_id', workspaceId);

  const weeklyDone: number[] = [0, 0, 0, 0];
  const now = new Date();

  if (boards?.length) {
    const boardIds = boards.map((b) => b.id);
    const { data: columns } = await supabase
      .from('columns')
      .select('id, name')
      .in('board_id', boardIds);

    const doneColumnIds = (columns || [])
      .filter((c) => {
        const n = c.name.toLowerCase();
        return n.includes('fatto') || n.includes('done');
      })
      .map((c) => c.id);

    if (doneColumnIds.length) {
      const { data: doneTasks } = await supabase
        .from('tasks')
        .select('updated_at')
        .in('column_id', doneColumnIds);

      for (const task of doneTasks || []) {
        const daysAgo = Math.floor(
          (now.getTime() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysAgo < 28) {
          const weekIndex = Math.min(3, Math.floor(daysAgo / 7));
          weeklyDone[3 - weekIndex]++;
        }
      }
    }
  }

  return {
    ...stats,
    weeklyDone,
    completionRate: stats.total ? Math.round((stats.done / stats.total) * 100) : 0,
  };
}

export function exportWorkspaceCsv(stats: {
  total: number;
  inProgress: number;
  done: number;
  boardCount: number;
  completionRate?: number;
}, workspaceName: string) {
  const rows = [
    ['Workspace', workspaceName],
    ['Task totali', String(stats.total)],
    ['In progresso', String(stats.inProgress)],
    ['Completati', String(stats.done)],
    ['Board', String(stats.boardCount)],
    ['Tasso completamento', `${stats.completionRate ?? 0}%`],
    ['Esportato il', new Date().toISOString()],
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${workspaceName.replace(/\s+/g, '-').toLowerCase()}-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function createApiKey(workspaceId: string, name: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile creare API key');
  return data as { key: string; prefix: string; id: string };
}

export async function listApiKeys(workspaceId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/api-keys`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile caricare API keys');
  return data.keys as Array<{ id: string; name: string; key_prefix: string; created_at: string }>;
}

export async function revokeApiKey(workspaceId: string, keyId: string) {
  const response = await fetch(`/api/workspaces/${workspaceId}/api-keys/${keyId}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile revocare API key');
  return data;
}

export async function createGuestLink(boardId: string) {
  const response = await fetch(`/api/boards/${boardId}/guest-link`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Impossibile creare guest link');
  return data as { url: string; token: string };
}

export async function uploadTaskAttachment(taskId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`/api/tasks/${taskId}/attachments`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Upload fallito');
  return data.attachment;
}
