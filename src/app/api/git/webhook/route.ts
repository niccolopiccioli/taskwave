import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import type { GitConnection, Json } from '@/lib/database.types';

function extractTaskId(branchName: string): string | null {
  const taskMatch = branchName.match(/TASK-([a-f0-9-]+)/i);
  if (taskMatch) return taskMatch[1];
  const taskPathMatch = branchName.match(/task\/([a-f0-9-]+)/i);
  if (taskPathMatch) return taskPathMatch[1];
  const idMatch = branchName.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
  if (idMatch) return idMatch[1];
  return null;
}

async function verifySignature(
  secret: string | null,
  body: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!secret || !signatureHeader) return false;
  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts[1]));
  } catch {
    return expected === parts[1];
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const eventType = headersList.get('x-github-event');
  const signature = headersList.get('x-hub-signature-256');
  const deliveryId = headersList.get('x-github-delivery-id');

  if (!eventType || !deliveryId) {
    return NextResponse.json({ error: 'Intestazioni webhook mancanti' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Payload non valido' }, { status: 400 });
  }

  const repository = payload.repository as { full_name?: string } | undefined;
  const repoFullName = repository?.full_name;

  if (!repoFullName) {
    return NextResponse.json({ error: 'Repository non specificato' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: connections } = await supabase
    .from('git_connections')
    .select('*')
    .eq('repo_full_name', repoFullName)
    .eq('provider', 'github');

  if (!connections?.length) {
    return NextResponse.json({ error: 'Connessione non trovata per questo repository' }, { status: 404 });
  }

  const connection: GitConnection = connections[0];

  const isValid = await verifySignature(
    connection.webhook_secret,
    body,
    signature
  );

  if (!isValid) {
    return NextResponse.json({ error: 'Firma webhook non valida' }, { status: 401 });
  }

  try {
    switch (eventType) {
      case 'push': {
        const ref = payload.ref as string | undefined;
        if (!ref) break;

        const branchName = ref.replace('refs/heads/', '');
        const commits = (payload.commits as Array<{ id: string }>) || [];
        const headSha = (payload.head_commit as { id?: string } | null)?.id || commits[0]?.id || null;

        await supabase.from('git_events').insert({
          connection_id: connection.id,
          event_type: 'push',
          branch_name: branchName,
          commit_sha: headSha,
          payload: payload as Json,
        });

        const taskId = extractTaskId(branchName);
        if (taskId) {
          const { data: existingLink } = await supabase
            .from('task_branch_links')
            .select('id')
            .eq('connection_id', connection.id)
            .eq('branch_name', branchName)
            .maybeSingle();

          if (!existingLink) {
            await supabase.from('task_branch_links').insert({
              task_id: taskId,
              connection_id: connection.id,
              branch_name: branchName,
              pr_status: 'open',
            });
          }
        }
        break;
      }

      case 'pull_request': {
        const pr = payload.pull_request as {
          number?: number;
          title?: string;
          state?: string;
          head?: { ref?: string };
          merged?: boolean;
        } | undefined;

        if (!pr?.number) break;

        const branchName = pr.head?.ref || '';
        const prStatus = pr.merged
          ? 'merged'
          : pr.state === 'closed'
            ? 'closed'
            : 'open';

        const taskId = extractTaskId(branchName);

        await supabase.from('git_events').insert({
          connection_id: connection.id,
          event_type: 'pull_request',
          branch_name: branchName,
          pr_number: pr.number,
          pr_title: pr.title || null,
          pr_status: prStatus,
          commit_sha: (payload.pull_request as { head?: { sha?: string } })?.head?.sha || null,
          payload: payload as Json,
        });

        if (branchName) {
          const { data: existingLinks } = await supabase
            .from('task_branch_links')
            .select('id')
            .eq('connection_id', connection.id)
            .eq('branch_name', branchName);

          if (existingLinks?.length) {
            await supabase
              .from('task_branch_links')
              .update({ pr_number: pr.number, pr_status: prStatus })
              .eq('connection_id', connection.id)
              .eq('branch_name', branchName);
          } else if (taskId) {
            await supabase.from('task_branch_links').insert({
              task_id: taskId,
              connection_id: connection.id,
              branch_name: branchName,
              pr_number: pr.number,
              pr_status: prStatus,
            });
          }
        }
        break;
      }

      default:
        console.info(`Git webhook event non gestito: ${eventType}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Git webhook handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella gestione del webhook' },
      { status: 500 }
    );
  }
}
