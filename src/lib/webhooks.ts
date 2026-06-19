import { createHmac } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { isSafeWebhookUrl } from '@/lib/url-security';

type Client = SupabaseClient<Database>;

export async function dispatchWorkspaceWebhooks(
  supabase: Client,
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const { data: hooks } = await supabase
    .from('workspace_webhooks')
    .select('id, url, secret, events')
    .eq('workspace_id', workspaceId)
    .eq('active', true);

  if (!hooks?.length) return;

  const body = JSON.stringify({
    event,
    workspace_id: workspaceId,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  await Promise.allSettled(
    hooks
      .filter((hook) => hook.events.includes(event) && isSafeWebhookUrl(hook.url))
      .map(async (hook) => {
        const signature = createHmac('sha256', hook.secret).update(body).digest('hex');
        await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-TaskWave-Event': event,
            'X-TaskWave-Signature': signature,
          },
          body,
        });
      })
  );
}
