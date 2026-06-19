import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSafeWebhookUrl } from '@/lib/url-security';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data, error } = await supabase
      .from('workspace_webhooks')
      .select('id, url, events, active, created_at')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ webhooks: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { url, events } = (await request.json()) as { url?: string; events?: string[] };
    if (!url?.trim()) return NextResponse.json({ error: 'URL obbligatorio' }, { status: 400 });

    if (!isSafeWebhookUrl(url)) {
      return NextResponse.json(
        { error: 'URL non consentito. Usa un indirizzo http/https pubblico.' },
        { status: 400 }
      );
    }

    const allowedEvents = ['task.created', 'task.updated', 'task.moved', 'task.deleted'];
    const safeEvents = (events || ['task.created', 'task.updated', 'task.moved']).filter((e) =>
      allowedEvents.includes(e)
    );

    const { data, error } = await supabase
      .from('workspace_webhooks')
      .insert({
        workspace_id: params.id,
        url: url.trim(),
        events: safeEvents.length ? safeEvents : ['task.created', 'task.updated', 'task.moved'],
        created_by: user.id,
      })
      .select('id, url, secret, events, active, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { auditLog } = await import('@/lib/audit');
    await auditLog(supabase, params.id, 'webhook.created', 'webhook', data.id, { url: data.url });

    return NextResponse.json({ webhook: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
