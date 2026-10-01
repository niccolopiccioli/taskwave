import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMaxGoals, hasFeature } from '@/lib/plans';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const workspaceId = params.id;

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = supabase
      .from('goals')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type as 'objective' | 'key_result');
    }
    if (status) {
      query = query.eq(
        'status',
        status as 'active' | 'completed' | 'cancelled' | 'archived'
      );
    }

    const { data: goals, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('Get goals error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore caricamento goals',
      },
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

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const workspaceId = params.id;

    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile && !hasFeature(profile.plan, 'goals')) {
      return NextResponse.json(
        {
          error:
            'La gestione degli obiettivi richiede il piano Pro o Business.',
        },
        { status: 403 }
      );
    }

    const maxGoals = getMaxGoals(profile?.plan || 'free');
    if (maxGoals !== Infinity) {
      const { count } = await supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

      if (count !== null && count >= maxGoals) {
        return NextResponse.json(
          {
            error: `Limite di ${maxGoals} obiettivi raggiunto per il tuo piano.`,
          },
          { status: 403 }
        );
      }
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      type?: 'objective' | 'key_result';
      parent_id?: string | null;
      target_value?: number;
      due_date?: string | null;
    };

    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Titolo obbligatorio' },
        { status: 400 }
      );
    }

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        workspace_id: workspaceId,
        title: body.title.trim(),
        description: body.description || '',
        type: body.type || 'objective',
        parent_id: body.parent_id || null,
        target_value: body.target_value || 0,
        current_value: 0,
        unit: '',
        due_date: body.due_date || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Create goal error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errore creazione goal',
      },
      { status: 500 }
    );
  }
}
