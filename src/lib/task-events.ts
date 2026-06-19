import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, NotificationType } from '@/lib/database.types';
import { auditLog } from '@/lib/audit';
import { dispatchWorkspaceWebhooks } from '@/lib/webhooks';
import { sendResendEmail } from '@/lib/email/resend';

type Client = SupabaseClient<Database>;

export type TaskEventType = 'assigned' | 'moved' | 'commented' | 'created' | 'updated' | 'deleted';

export interface TaskEventPayload {
  type: TaskEventType;
  workspaceId: string;
  actorId: string;
  taskTitle?: string;
  assigneeId?: string | null;
  fromColumn?: string;
  toColumn?: string;
  commentPreview?: string;
}

async function shouldNotify(
  supabase: Client,
  userId: string,
  pref: 'notify_assigned' | 'notify_comments' | 'notify_moves' | 'notify_email'
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('notify_assigned, notify_comments, notify_moves, notify_email')
    .eq('id', userId)
    .single();
  if (!data) return false;
  return Boolean(data[pref]);
}

async function maybeSendEmail(
  supabase: Client,
  userId: string,
  subject: string,
  html: string
) {
  if (!(await shouldNotify(supabase, userId, 'notify_email'))) return;
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();
  if (!profile?.email) return;
  try {
    await sendResendEmail({ to: profile.email, subject, html });
  } catch {
    // non-blocking
  }
}

async function createNotification(
  supabase: Client,
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  taskId: string,
  workspaceId: string
) {
  await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_task_id: taskId,
    p_workspace_id: workspaceId,
  });
}

export async function handleTaskEvent(
  supabase: Client,
  taskId: string,
  payload: TaskEventPayload
) {
  const { type, workspaceId, actorId, taskTitle = 'Task', assigneeId } = payload;

  const webhookEvent =
    type === 'moved'
      ? 'task.moved'
      : type === 'created'
        ? 'task.created'
        : type === 'deleted'
          ? 'task.deleted'
          : 'task.updated';

  await auditLog(supabase, workspaceId, `task.${type}`, 'task', taskId, {
    taskTitle,
    ...payload,
  });

  await dispatchWorkspaceWebhooks(supabase, workspaceId, webhookEvent, {
    task_id: taskId,
    ...payload,
  });

  if (type === 'assigned' && assigneeId && assigneeId !== actorId) {
    if (await shouldNotify(supabase, assigneeId, 'notify_assigned')) {
      await createNotification(
        supabase,
        assigneeId,
        'assigned',
        'Task assegnato',
        `Sei stato assegnato a "${taskTitle}"`,
        taskId,
        workspaceId
      );
      await maybeSendEmail(
        supabase,
        assigneeId,
        `Task assegnato: ${taskTitle}`,
        `<p>Sei stato assegnato al task <strong>${taskTitle}</strong>.</p>`
      );
    }
  }

  if (type === 'moved' && assigneeId && assigneeId !== actorId) {
    if (await shouldNotify(supabase, assigneeId, 'notify_moves')) {
      await createNotification(
        supabase,
        assigneeId,
        'moved',
        'Task spostato',
        `"${taskTitle}" è stato spostato${payload.toColumn ? ` in ${payload.toColumn}` : ''}`,
        taskId,
        workspaceId
      );
      await maybeSendEmail(
        supabase,
        assigneeId,
        `Task spostato: ${taskTitle}`,
        `<p>Il task <strong>${taskTitle}</strong> è stato spostato${payload.toColumn ? ` in ${payload.toColumn}` : ''}.</p>`
      );
    }
  }

  if (type === 'commented' && assigneeId && assigneeId !== actorId) {
    if (await shouldNotify(supabase, assigneeId, 'notify_comments')) {
      await createNotification(
        supabase,
        assigneeId,
        'commented',
        'Nuovo commento',
        payload.commentPreview || `Nuovo commento su "${taskTitle}"`,
        taskId,
        workspaceId
      );
      await maybeSendEmail(
        supabase,
        assigneeId,
        `Nuovo commento: ${taskTitle}`,
        `<p>Nuovo commento su <strong>${taskTitle}</strong>: ${payload.commentPreview || ''}</p>`
      );
    }
  }
}
