import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .from('task_branch_links')
      .select('id, task_id, connection_id, branch_name, pr_number, pr_status, created_at')
      .eq('task_id', params.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ branches: data ?? [] });
  } catch (error) {
    console.error('List task branches error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel recupero dei branch collegati' },
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

    const { connection_id, branch_name } = (await request.json()) as {
      connection_id?: string;
      branch_name?: string;
    };

    if (!connection_id || !branch_name?.trim()) {
      return NextResponse.json(
        { error: 'ID connessione e nome branch obbligatori' },
        { status: 400 }
      );
    }

    const { data: connection } = await supabase
      .from('git_connections')
      .select('id')
      .eq('id', connection_id)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Connessione Git non trovata' }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from('task_branch_links')
      .select('id')
      .eq('task_id', params.id)
      .eq('connection_id', connection_id)
      .eq('branch_name', branch_name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Questo branch è già collegato al task' },
        { status: 409 }
      );
    }

    const { data: link, error } = await supabase
      .from('task_branch_links')
      .insert({
        task_id: params.id,
        connection_id,
        branch_name: branch_name.trim(),
        pr_status: 'open',
      })
      .select('id, task_id, connection_id, branch_name, pr_number, pr_status, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ branch: link }, { status: 201 });
  } catch (error) {
    console.error('Create task branch link error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore nel collegamento del branch' },
      { status: 500 }
    );
  }
}
