import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function hashKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

async function validateApiKey(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'API key mancante' }, { status: 401 }) };
  }

  const apiKey = authHeader.slice(7);
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: keyRows, error: keyError } = await supabase.rpc('validate_api_key', {
    p_key_hash: hashKey(apiKey),
  });

  if (keyError || !keyRows?.length) {
    return { error: NextResponse.json({ error: 'API key non valida' }, { status: 401 }) };
  }

  const row = keyRows[0] as { user_id: string; workspace_id: string | null };
  if (!row.workspace_id) {
    return { error: NextResponse.json({ error: 'Workspace non associato' }, { status: 400 }) };
  }

  return { supabase, workspaceId: row.workspace_id, userId: row.user_id };
}

export async function GET(request: Request) {
  try {
    const auth = await validateApiKey(request);
    if ('error' in auth && auth.error) return auth.error;

    const { supabase, workspaceId } = auth as {
      supabase: ReturnType<typeof createClient<Database>>;
      workspaceId: string;
    };

    const url = new URL(request.url);
    const resource = url.searchParams.get('include');

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id, name, description, created_at')
      .eq('id', workspaceId)
      .single();

    const result: Record<string, unknown> = { workspace };

    if (resource === 'boards') {
      const { data: boards } = await supabase
        .from('boards')
        .select('id, name, description, created_at')
        .eq('workspace_id', workspaceId);
      result.boards = boards ?? [];
    }

    if (resource === 'members') {
      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id, role, joined_at')
        .eq('workspace_id', workspaceId);
      result.members = members ?? [];
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore' },
      { status: 500 }
    );
  }
}
