import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit-request';

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 'delete-account', 3, 60_000)) {
      return NextResponse.json({ error: 'Troppe richieste. Riprova tra un minuto.' }, { status: 429 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { error } = await supabase.rpc('delete_user_account', { p_user_id: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore eliminazione' },
      { status: 500 }
    );
  }
}
