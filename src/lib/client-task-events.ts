export type ClientTaskEventType = 'assigned' | 'moved' | 'commented' | 'created' | 'updated' | 'deleted';

export interface ClientTaskEventPayload {
  type: ClientTaskEventType;
  workspaceId: string;
  taskTitle?: string;
  assigneeId?: string | null;
  fromColumn?: string;
  toColumn?: string;
  commentPreview?: string;
}

export async function emitTaskEvent(taskId: string, payload: ClientTaskEventPayload) {
  try {
    await fetch(`/api/tasks/${taskId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking side effects
  }
}
