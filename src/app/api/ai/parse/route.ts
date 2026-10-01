import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseNaturalLanguage, logAiInteraction } from '@/lib/ai/deepseek';
import { getAiDailyLimit, hasFeature } from '@/lib/plans';
import { captureException } from '@/lib/monitoring';

interface ParseRequest {
  input: string;
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

    const body = (await request.json()) as ParseRequest;
    const { input, workspaceId } = body;

    if (!input?.trim() || !workspaceId) {
      return NextResponse.json(
        { error: 'input e workspaceId sono obbligatori' },
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

    const parsed = await parseNaturalLanguage(input);

    await logAiInteraction({
      workspaceId,
      feature: 'parse',
    });

    return NextResponse.json(parsed);
  } catch (error) {
    await captureException(error, { route: '/api/ai/parse' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore AI' },
      { status: 500 }
    );
  }
}
