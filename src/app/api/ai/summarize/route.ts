import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { summarizeActivity, logAiInteraction } from '@/lib/ai/deepseek';
import { getAiDailyLimit, hasFeature } from '@/lib/plans';
import { captureException } from '@/lib/monitoring';

interface SummarizeRequest {
  workspaceId: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = (await request.json()) as SummarizeRequest;
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId e\' obbligatorio' },
        { status: 400 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    const plan = profile?.plan || 'free';

    if (!hasFeature(plan, 'aiAssistant')) {
      return NextResponse.json(
        { error: 'AI Assistant richiede un piano Pro o Business' },
        { status: 403 }
      );
    }

    const limit = getAiDailyLimit(plan);
    const { data: usageData } = await supabase.rpc('get_ai_daily_limit', {
      p_user_id: user.id,
    });

    if (usageData != null && typeof usageData === 'number' && usageData <= 0) {
      return NextResponse.json(
        { error: `Limite giornaliero di ${limit} richieste AI raggiunto. Riprova domani.` },
        { status: 429 }
      );
    }

    const serviceClient = await createServiceClient();

    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .eq('workspace_id', workspaceId);

    if (!boards?.length) {
      return NextResponse.json({ summary: 'Nessuna attivita\' recente nel workspace.' });
    }

    const boardIds = boards.map((b) => b.id);

    const { data: columns } = await serviceClient
      .from('columns')
      .select('id, name')
      .in('board_id', boardIds);

    if (!columns?.length) {
      return NextResponse.json({ summary: 'Nessuna attivita\' recente nel workspace.' });
    }

    const columnIds = columns.map((c) => c.id);

    const { data: tasks } = await serviceClient
      .from('tasks')
      .select('title, created_at, updated_at, column_id, created_by_id')
      .in('column_id', columnIds)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (!tasks?.length) {
      return NextResponse.json({ summary: 'Nessuna attivita\' recente nel workspace.' });
    }

    const userIds = Array.from(new Set(tasks.map((t) => t.created_by_id).filter(Boolean))) as string[];

    const { data: profiles } = userIds.length
      ? await serviceClient.from('profiles').select('id, full_name').in('id', userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name || 'Anonimo']));
    // columns loaded for context, columnMap removed (unused)

    const events = tasks.map((t) => ({
      type: 'task',
      title: t.title,
      user: profileMap.get(t.created_by_id || '') || undefined,
      timestamp: new Date(t.updated_at || t.created_at).toISOString(),
    }));

    const summary = await summarizeActivity(events);

    await logAiInteraction({
      workspaceId,
      feature: 'summarize',
    });

    return NextResponse.json({ summary });
  } catch (error) {
    await captureException(error, { route: '/api/ai/summarize' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore AI' },
      { status: 500 }
    );
  }
}
