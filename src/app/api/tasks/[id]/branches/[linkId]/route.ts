import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; linkId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const { data: link } = await supabase
      .from('task_branch_links')
      .select('id, task_id')
      .eq('id', params.linkId)
      .eq('task_id', params.id)
      .single();

    if (!link) {
      return NextResponse.json({ error: 'Collegamento branch non trovato' }, { status: 404 });
    }

    const { error } = await supabase
      .from('task_branch_links')
      .delete()
      .eq('id', params.linkId)
      .eq('task_id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete task branch link error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nella rimozione del collegamento' },
      { status: 500 }
    );
  }
}
