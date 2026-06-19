import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function hashKey(key: string) {
  return createHash('sha256').update(key).digest('hex');
}

async function getAuthContext(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: keyRows } = await supabase.rpc('validate_api_key', {
    p_key_hash: hashKey(authHeader.slice(7)),
  });

  if (!keyRows?.length) return null;
  const row = keyRows[0] as { workspace_id: string | null };
  if (!row.workspace_id) return null;

  return { supabase, workspaceId: row.workspace_id };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAuthContext(request);
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  if (params.id !== ctx.workspaceId) {
    return NextResponse.json({ error: 'Workspace non autorizzato' }, { status: 403 });
  }

  const { supabase } = ctx;
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id, role, joined_at')
    .eq('workspace_id', params.id);

  const withProfiles = await Promise.all(
    (members || []).map(async (member) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', member.user_id)
        .single();
      return { ...member, profile };
    })
  );

  return NextResponse.json({ members: withProfiles });
}
