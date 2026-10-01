import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chatCompletion, logAiInteraction } from '@/lib/ai/deepseek';
import { getAiDailyLimit, hasFeature } from '@/lib/plans';
import { captureException } from '@/lib/monitoring';

interface ChatRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
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

    const body = (await request.json()) as ChatRequest;
    const { messages, workspaceId } = body;

    if (!messages?.length || !workspaceId) {
      return NextResponse.json(
        { error: 'messages e workspaceId sono obbligatori' },
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

    const { data: usageData, error: usageError } = await supabase.rpc(
      'get_ai_daily_limit',
      { p_user_id: user.id }
    );

    if (!usageError && usageData != null) {
      const usedToday = limit - (typeof usageData === 'number' ? usageData : limit);
      if (usedToday >= limit) {
        return NextResponse.json(
          { error: `Limite giornaliero di ${limit} richieste AI raggiunto. Riprova domani.` },
          { status: 429 }
        );
      }
    }

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name, description')
      .eq('id', workspaceId)
      .single();

    const { data: boards } = await supabase
      .from('boards')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .limit(10);

    let contextPrompt = `L'utente sta lavorando nel workspace "${workspace?.name || 'Sconosciuto'}". `;

    if (boards?.length) {
      contextPrompt += `Board disponibili: ${boards.map((b) => b.name).join(', ')}. `;
    }

    contextPrompt +=
      'Aiuta l\'utente con domande su task, project management e organizzazione del lavoro. Rispondi in italiano, in modo conciso e utile.';

    const systemMessages = [
      { role: 'system' as const, content: contextPrompt },
      ...messages,
    ];

    const response = await chatCompletion(systemMessages);

    await logAiInteraction({
      workspaceId,
      feature: 'chat',
    });

    return NextResponse.json({ content: response });
  } catch (error) {
    await captureException(error, { route: '/api/ai/chat' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore AI' },
      { status: 500 }
    );
  }
}
