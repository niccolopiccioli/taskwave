import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { captureException } from '@/lib/monitoring';

interface InteractionsRequest {
  workspaceId: string;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServiceClient();

    const body = (await request.json()) as InteractionsRequest;
    const { workspaceId, feature, promptTokens, completionTokens, model } = body;

    if (!workspaceId || !feature) {
      return NextResponse.json(
        { error: 'workspaceId e feature sono obbligatori' },
        { status: 400 }
      );
    }

    const { data: user, error: authError } = await supabase.auth.getUser();
    const userId = user?.user?.id;

    if (authError || !userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { error } = await supabase.from('ai_interactions').insert({
      user_id: userId,
      workspace_id: workspaceId,
      feature,
      model: model || 'deepseek-chat',
      prompt_tokens: promptTokens || 0,
      completion_tokens: completionTokens || 0,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await captureException(error, { route: '/api/ai/interactions' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel logging' },
      { status: 500 }
    );
  }
}
