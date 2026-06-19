import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';

function hashKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

export async function GET(
  _request: Request,
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'business') {
      return NextResponse.json({ error: 'API keys richiedono il piano Business.' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at')
      .eq('user_id', user.id)
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ keys: data || [] });
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
    const { name } = (await request.json()) as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'business') {
      return NextResponse.json({ error: 'API keys richiedono il piano Business.' }, { status: 403 });
    }

    const rawKey = `tw_${randomBytes(24).toString('hex')}`;
    const prefix = rawKey.slice(0, 12);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        workspace_id: params.id,
        name: name.trim(),
        key_prefix: prefix,
        key_hash: hashKey(rawKey),
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.rpc('log_audit_event', {
      p_workspace_id: params.id,
      p_action: 'api_key.created',
      p_entity_type: 'api_key',
      p_entity_id: data.id,
      p_metadata: { name: name.trim() },
    });

    return NextResponse.json({ key: rawKey, prefix, id: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
